import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Sync ventes Tiller -> stock cave, v2.
 * Améliorations vs v1 :
 *  - Matching par tiller_product_id (via cave_tiller_catalog), plus par nom exact.
 *  - Normalisation de sécurité du nom (casse/accents/espaces).
 *  - Coupe par inventaire : on ne décompte JAMAIS une vente antérieure au dernier
 *    mouvement `inventaire` du vin (protège l'inventaire).
 *  - Rapport des produits vendus NON rattachés (réconciliation).
 *  - Mode simulation par défaut. Écriture réelle seulement avec ?live=1.
 *
 *  Params: ?live=1 (écrit) | ?days=14 (fenêtre)
 */
const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();

async function pagedAll(table: string, select: string, filter = "") {
  const out: any[] = []; let from = 0; const SZ = 1000;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + SZ - 1);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < SZ) break;
    from += SZ;
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const live = url.searchParams.get("live") === "1";
  const days = parseInt(url.searchParams.get("days") || "14");

  try {
    // 1. catalogue actif : nom normalisé -> tiller_product_id
    const catalog = await pagedAll("cave_tiller_catalog", "tiller_product_id,name,is_active");
    const nameToId = new Map<string, number>();
    for (const c of catalog) if (c.is_active && c.name) nameToId.set(norm(c.name), c.tiller_product_id);

    // 2. mapping : tiller_product_id -> {wine_id, sale_type}
    const maps = await pagedAll("cave_tiller_mapping", "wine_id,tiller_product_id,tiller_verre_product_id");
    const idToWine = new Map<number, { wine_id: string; sale_type: "btl" | "verre" }>();
    for (const m of maps) {
      if (m.tiller_product_id && m.wine_id) idToWine.set(m.tiller_product_id, { wine_id: m.wine_id, sale_type: "btl" });
      if (m.tiller_verre_product_id && m.wine_id) idToWine.set(m.tiller_verre_product_id, { wine_id: m.wine_id, sale_type: "verre" });
    }

    // 3. verres_par_bouteille
    const wines = await pagedAll("cave_wines", "id,verres_par_bouteille");
    const verres = new Map<string, number>();
    for (const w of wines) verres.set(w.id, w.verres_par_bouteille || 6);

    // 4. coupe par inventaire : dernier mouvement 'inventaire' par vin
    const invs = await pagedAll("cave_stock_movements", "wine_id,created_at,type", "");
    const lastInv = new Map<string, string>();
    for (const mv of invs) {
      if (mv.type === "inventaire" && mv.wine_id) {
        const prev = lastInv.get(mv.wine_id);
        if (!prev || mv.created_at > prev) lastInv.set(mv.wine_id, mv.created_at);
      }
    }

    // 5. ventes déjà synchronisées (dedup)
    const movs = await pagedAll("cave_stock_movements", "commentaire", "");
    const synced = new Set<string>();
    for (const m of movs) if (m.commentaire?.startsWith?.("tiller:")) synced.add(m.commentaire.slice(7));

    // 6. ventes récentes
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const sales: any[] = []; let from = 0;
    while (true) {
      const { data, error } = await supabase.from("lignes_produits")
        .select("id,produit,quantite,created_at").gte("created_at", since)
        .order("created_at", { ascending: true }).range(from, from + 999);
      if (error) throw error;
      sales.push(...(data || []));
      if (!data || data.length < 1000) break;
      from += 1000;
    }

    // 7. traitement
    const toInsert: any[] = [];
    const unmatched = new Map<string, number>();   // produit -> nb (vendu, pas dans catalogue/mapping)
    let skippedCutoff = 0, alreadySynced = 0;
    for (const s of sales) {
      if (synced.has(s.id)) { alreadySynced++; continue; }
      const pid = nameToId.get(norm(s.produit));
      const match = pid ? idToWine.get(pid) : undefined;
      if (!match) { unmatched.set(s.produit, (unmatched.get(s.produit) || 0) + 1); continue; }
      const cut = lastInv.get(match.wine_id);
      if (cut && s.created_at < cut) { skippedCutoff++; continue; }   // vente d'avant l'inventaire
      const qte = s.quantite || 1;
      const dec = match.sale_type === "verre" ? qte / (verres.get(match.wine_id) || 6) : qte;
      toInsert.push({ wine_id: match.wine_id, type: "vente", quantite: -dec,
        commentaire: `tiller:${s.id}`, motif: match.sale_type === "verre" ? `Verre: ${s.produit}` : s.produit });
    }

    let inserted = 0; const errors: string[] = [];
    if (live) {
      for (const row of toInsert) {
        const { error } = await supabase.from("cave_stock_movements").insert(row);
        if (error) errors.push(`${row.motif}: ${error.message}`); else inserted++;
      }
    }

    const unmatchedList = [...unmatched.entries()].sort((a, b) => b[1] - a[1]).map(([produit, n]) => ({ produit, n }));
    return new Response(JSON.stringify({
      mode: live ? "LIVE (écrit)" : "SIMULATION (n'écrit rien)",
      window_days: days, sales_scanned: sales.length, already_synced: alreadySynced,
      would_decrement: toInsert.length, inserted_live: inserted,
      skipped_before_inventory: skippedCutoff,
      unmatched_products: unmatchedList.length, unmatched_top: unmatchedList.slice(0, 25),
      errors: errors.length ? errors.slice(0, 10) : undefined,
    }, null, 2), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
