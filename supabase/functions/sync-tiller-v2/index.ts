import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore - Supabase edge runtime global
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } | undefined;

const STORE_ID = 51992;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const clientId = Deno.env.get("SUMUP_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("SUMUP_CLIENT_SECRET") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  async function getToken(): Promise<string | null> {
    const { data: t } = await supabase.from("tiller_tokens").select("*").eq("id", "main").single();
    if (!t?.access_token) return null;
    if (new Date() > new Date(t.expires_at)) {
      const p = new URLSearchParams({ grant_type: "refresh_token", client_id: clientId, client_secret: clientSecret, refresh_token: t.refresh_token });
      const r = await fetch("https://oauth.api.tiller.systems/oauth2/token", { method: "POST", headers: { "Content-type": "application/x-www-form-urlencoded" }, body: p.toString() });
      const d = await r.json();
      if (d.access_token) {
        await supabase.from("tiller_tokens").upsert({ id: "main", access_token: d.access_token, refresh_token: d.refresh_token || t.refresh_token, expires_in: d.expires_in, expires_at: new Date(Date.now() + (d.expires_in || 3600) * 1000).toISOString(), updated_at: new Date().toISOString() });
        return d.access_token;
      }
      return null;
    }
    return t.access_token;
  }

  async function fetchOrdersForDate(token: string, dateStr: string) {
    const all = new Map<string, any>();
    for (let h = 0; h < 24; h++) {
      const from = `${dateStr}T${String(h).padStart(2, "0")}:00:00.000Z`;
      const to = `${dateStr}T${String(h).padStart(2, "0")}:59:59.999Z`;
      try {
        const res = await fetch("https://api.tiller.systems/orders/v3/orders/search", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ closeDate: { from, to }, storeIds: [STORE_ID] }),
        });
        if (res.ok) { const data = await res.json(); for (const o of (data.orders || [])) all.set(o.id, o); }
      } catch { /* skip hour */ }
    }
    return Array.from(all.values());
  }

  // NOUVEAU : fenêtre récente en UN seul appel (pour le temps réel ORDER_CLOSED)
  async function fetchOrdersRecent(token: string, minutes: number) {
    const to = new Date();
    const from = new Date(Date.now() - minutes * 60000);
    try {
      const res = await fetch("https://api.tiller.systems/orders/v3/orders/search", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ closeDate: { from: from.toISOString(), to: to.toISOString() }, storeIds: [STORE_ID] }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.orders || [];
    } catch { return []; }
  }

  // Traitement commun : upsert commandes + insert lignes manquantes (dédup par id ligne)
  async function processOrders(orders: any[], classifMap: Map<string, string>, label: string) {
    if (!orders.length) return { label, orders_api: 0, upserted: 0, products_inserted: 0 };
    const cmdRows = orders.map((order: any) => {
      const dateOuverture = order.openingInformations?.date || null;
      const dateFermeture = order.closingInformations?.date || null;
      let duree = "";
      if (dateOuverture && dateFermeture) {
        const diff = new Date(dateFermeture).getTime() - new Date(dateOuverture).getTime();
        duree = `${String(Math.floor(diff / 3600000)).padStart(2, "0")}:${String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0")}:${String(Math.floor((diff % 60000) / 1000)).padStart(2, "0")}`;
      }
      return {
        tiller_order_id: order.id, date_ouverture: dateOuverture, date_fermeture: dateFermeture,
        nom_commande: order.displayName || "",
        serveur: order.closingInformations?.staff?.name || order.openingInformations?.staff?.name || "INCONNU",
        nb_couverts: order.guestNumber || 0, duree_commande: duree,
        statut: order.status === "CLOSED" ? "CLOSE" : order.status,
        ca_ttc: (order.taxInclAmount || 0) / 100, ca_ht: (order.taxExclAmount || 0) / 100, tva: (order.taxAmount || 0) / 100,
        total_paiements: (order.payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0) / 100, total_pourboires: 0,
      };
    });
    const { data: up, error: upErr } = await supabase.from("commandes").upsert(cmdRows, { onConflict: "tiller_order_id" }).select("id, tiller_order_id");
    if (upErr) return { label, error: upErr.message };
    const idByOrder = new Map((up || []).map((r: any) => [r.tiller_order_id, r.id]));
    const orderIds = orders.map((o: any) => o.id);
    const { data: existingLines } = await supabase.from("lignes_produits").select("tiller_order_id").in("tiller_order_id", orderIds);
    const haveLines = new Set((existingLines || []).map((r: any) => r.tiller_order_id));
    const ligneRows: any[] = [];
    for (const order of orders) {
      if (haveLines.has(order.id)) continue;
      const cid = idByOrder.get(order.id);
      if (!cid) continue;
      for (const item of (order.itemLines || [])) {
        if (item.status !== "ACCEPTED") continue;
        const produit = item.name || "INCONNU";
        ligneRows.push({
          commande_id: cid, tiller_order_id: order.id, produit, quantite: item.quantity || 1,
          prix_unitaire_ttc: (item.unitPrice?.amount || 0) / 100, remises: 0,
          ca_ttc: (item.taxInclAmount || 0) / 100, ca_ht: (item.taxExclAmount || 0) / 100, tva: (item.taxAmount || 0) / 100,
          categorie: classifMap.get(produit) || "AUTRE",
        });
      }
    }
    for (let i = 0; i < ligneRows.length; i += 500) {
      const { error: lErr } = await supabase.from("lignes_produits").insert(ligneRows.slice(i, i + 500));
      if (lErr) return { label, orders_api: orders.length, upserted: up?.length || 0, products_error: lErr.message };
    }
    return { label, orders_api: orders.length, upserted: up?.length || 0, products_inserted: ligneRows.length, orders_with_existing_lines: haveLines.size };
  }

  async function loadClassif() {
    const { data: classifRows } = await supabase.from("produits_classification").select("produit, categorie");
    const classifMap = new Map<string, string>();
    for (const r of (classifRows || [])) classifMap.set(r.produit, r.categorie);
    return classifMap;
  }

  async function syncDate(token: string, dateStr: string, classifMap: Map<string, string>) {
    const orders = await fetchOrdersForDate(token, dateStr);
    return processOrders(orders, classifMap, dateStr);
  }

  async function runSync(dates: string[]) {
    const token = await getToken();
    if (!token) return { error: "No valid Tiller token. Re-auth via /tiller-oauth?action=login" };
    const classifMap = await loadClassif();
    const results: Record<string, any> = {};
    let total = 0;
    for (const d of dates) { const r = await syncDate(token, d, classifMap); results[d] = r; total += r.upserted || 0; }
    try { await supabase.rpc("refresh_stats"); } catch { /* ignore */ }
    try { await supabase.from("sync_log").insert({ source: "tiller-api-v3", derniere_extraction: new Date().toISOString(), nb_records: total, statut: "success", detail: JSON.stringify({ mode: "v2", dates, results }) }); } catch { /* ignore */ }
    return { dates, total_upserted: total, results };
  }

  // NOUVEAU : pull de la fenêtre récente (temps réel)
  async function runRecent(minutes: number) {
    const token = await getToken();
    if (!token) return { error: "No valid Tiller token." };
    const classifMap = await loadClassif();
    const orders = await fetchOrdersRecent(token, minutes);
    const r = await processOrders(orders, classifMap, `recent-${minutes}min`);
    try { await supabase.from("sync_log").insert({ source: "tiller-api-v3-recent", derniere_extraction: new Date().toISOString(), nb_records: r.upserted || 0, statut: "success", detail: JSON.stringify(r) }); } catch { /* ignore */ }
    return r;
  }

  // Mode temps réel : ?minutes=N -> pull de la fenêtre récente, synchrone
  const paramMinutes = url.searchParams.get("minutes");
  if (paramMinutes) {
    const m = Math.min(Math.max(parseInt(paramMinutes) || 30, 1), 240);
    const result = await runRecent(m);
    return new Response(JSON.stringify(result, null, 2), { headers: { ...cors, "Content-Type": "application/json" } });
  }

  const paramDate = url.searchParams.get("date");
  const paramFrom = url.searchParams.get("from");
  const paramTo = url.searchParams.get("to");
  let dates: string[] = [];
  if (paramDate) dates = [paramDate];
  else if (paramFrom && paramTo) {
    const d = new Date(paramFrom + "T00:00:00Z"); const end = new Date(paramTo + "T00:00:00Z");
    while (d <= end) { dates.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  } else {
    const now = new Date();
    for (let i = 2; i >= 0; i--) { const d = new Date(now); d.setUTCDate(d.getUTCDate() - i); dates.push(d.toISOString().slice(0, 10)); }
  }
  if (dates.length > 40) return new Response(JSON.stringify({ error: "Plage trop large (max 40 jours)" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

  const synchronous = !!paramDate || (!!paramFrom && !!paramTo) || url.searchParams.get("sync") === "1";
  if (synchronous) {
    const result = await runSync(dates);
    return new Response(JSON.stringify(result, null, 2), { headers: { ...cors, "Content-Type": "application/json" } });
  }
  const p = runSync(dates);
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(p); else await p;
  return new Response(JSON.stringify({ status: "accepted", mode: "background", dates }), { headers: { ...cors, "Content-Type": "application/json" } });
});
