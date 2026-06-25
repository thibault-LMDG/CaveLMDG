import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Vérifie qu'un produit a bien été ajouté MANUELLEMENT dans SumUp, conforme (nom, catégorie, prix),
 * puis le lie au vin. Sinon renvoie la liste précise des écarts.
 * Sert au flux de récupération guidé (popup) quand la création auto a échoué.
 *
 * POST { wine_id, name, price, category_name }
 * -> { ok:true, mapped:true }  |  { ok:false, issues:[...], found:bool }
 */
const V2WEB = "https://app.tillersystems.com";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/148 Safari/537.36";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const CAT_IDS: Record<string, number> = { "Blancs New": 5187020, "Rouges New": 5187023, "Rose New": 5187022, "Bulles New": 5187021, "Vin Verre": 4739833 };
const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

function decode(s: string) { return s.replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&eacute;/g, "é").replace(/&egrave;/g, "è"); }
function norm(s: string) { return decode(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim(); }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { data: sess } = await supabase.from("tiller_tokens").select("access_token").eq("id", "web_session").maybeSingle();
    const session = sess?.access_token;
    if (!session) return new Response(JSON.stringify({ ok: false, reason: "no_session", issues: ["Session SumUp absente — préviens un admin"] }), { status: 503, headers: cors });

    const b = await req.json().catch(() => ({}));
    const name = String(b.name || "").trim();
    const price = Number(b.price || 0);
    const categoryName = String(b.category_name || "");
    if (!name || !categoryName) return new Response(JSON.stringify({ ok: false, issues: ["Données manquantes (nom/catégorie)"] }), { status: 400, headers: cors });

    const issues: string[] = [];

    // 1) Existence + prix + id : via le catalogue (alimenté par le webhook). On laisse un court délai au webhook.
    let row: { tiller_product_id: number; price: number; is_active: boolean } | null = null;
    for (let i = 0; i < 4 && !row; i++) {
      if (i) await new Promise((r) => setTimeout(r, 2000));
      const { data } = await supabase.from("cave_tiller_catalog")
        .select("tiller_product_id, price, is_active").eq("name", name).eq("is_active", true)
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (data) row = data as any;
    }
    if (!row) {
      return new Response(JSON.stringify({ ok: false, found: false, issues: [
        `Produit « ${name} » introuvable en caisse. Vérifie que le nom est collé EXACTEMENT, puis réessaie.`,
      ] }), { headers: cors });
    }

    // 2) Catégorie : le produit apparaît-il dans la liste de la catégorie attendue ?
    const catId = CAT_IDS[categoryName];
    if (catId) {
      const res = await fetch(`${V2WEB}/inventory/category/list/${catId}`, { headers: { Cookie: `PHPSESSID=${session}`, "User-Agent": UA, "X-Requested-With": "XMLHttpRequest" } });
      const html = await res.text();
      if (res.url.includes("new.tillersystems.com") || res.url.includes("/login")) {
        return new Response(JSON.stringify({ ok: false, reason: "session_expired", issues: ["Session SumUp expirée — préviens un admin"] }), { status: 503, headers: cors });
      }
      const names = [...html.matchAll(/data-product-name="([^"]*)"/g)].map((m) => norm(m[1]));
      if (!names.includes(norm(name))) issues.push(`Le produit existe mais PAS dans la catégorie « ${categoryName} » — déplace-le dans la bonne catégorie.`);
    }

    // 3) Prix
    if (price > 0 && Math.abs((row.price ?? 0) - price) > 0.001) {
      issues.push(`Prix attendu ${price.toFixed(2)} € mais ${Number(row.price).toFixed(2)} € en caisse — corrige le prix.`);
    }

    if (issues.length > 0) return new Response(JSON.stringify({ ok: false, found: true, issues }), { headers: cors });

    // 4) Tout est conforme -> on lie (upsert mapping)
    const { data: existing } = await supabase.from("cave_tiller_mapping").select("id").eq("wine_id", b.wine_id).maybeSingle();
    if (existing) await supabase.from("cave_tiller_mapping").update({ tiller_product_id: row.tiller_product_id, tiller_product_name: name }).eq("id", existing.id);
    else await supabase.from("cave_tiller_mapping").insert({ wine_id: b.wine_id, tiller_product_id: row.tiller_product_id, tiller_product_name: name, is_au_verre: false });

    return new Response(JSON.stringify({ ok: true, mapped: true, tiller_product_id: row.tiller_product_id }), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, issues: ["Erreur de vérification : " + String(e)] }), { status: 500, headers: cors });
  }
});
