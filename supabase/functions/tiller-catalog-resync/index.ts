import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Resync complet (one-shot, relançable) du catalogue Tiller -> cave_tiller_catalog.
 * Parcourt les produits existants, refait GET /products/{id} (V2) et upsert les données fraîches.
 * Produit disparu (403/404) -> is_active=false.
 * Batché via ?offset=&limit= pour rester sous le timeout.
 *   GET .../tiller-catalog-resync?offset=0&limit=150
 */
const V2 = "https://app.tillersystems.com/api";
const PROVIDER_TOKEN = Deno.env.get("TILLER_PROVIDER_TOKEN") || "";
const LOGIN = Deno.env.get("TILLER_LOGIN") || "";
const PASSWORD = Deno.env.get("TILLER_PASSWORD") || "";
const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

async function getRestaurantToken(force = false): Promise<string | null> {
  if (!force) {
    const { data } = await supabase.from("tiller_tokens").select("access_token").eq("id", "v2_restaurant").maybeSingle();
    if (data?.access_token) return data.access_token;
  }
  const res = await fetch(`${V2}/auth`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: LOGIN, password: PASSWORD, provider_token: PROVIDER_TOKEN }) });
  if (!res.ok) return null;
  const d = await res.json();
  if (d?.token) { await supabase.from("tiller_tokens").upsert({ id: "v2_restaurant", access_token: d.token, updated_at: new Date().toISOString() }); return d.token; }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "150"), 250);

  // page d'ids depuis le catalogue existant
  const { data: rows, error } = await supabase.from("cave_tiller_catalog")
    .select("tiller_product_id").order("tiller_product_id", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });

  let rt = await getRestaurantToken();
  let updated = 0, deactivated = 0, failed = 0;
  for (const r of (rows || [])) {
    const id = r.tiller_product_id;
    let res = await fetch(`${V2}/products/${id}?provider_token=${PROVIDER_TOKEN}&restaurant_token=${rt}`);
    if (res.status === 403) { rt = await getRestaurantToken(true); res = await fetch(`${V2}/products/${id}?provider_token=${PROVIDER_TOKEN}&restaurant_token=${rt}`); }
    if (res.status === 200) {
      const p = await res.json();
      if (p?.id) {
        await supabase.from("cave_tiller_catalog").upsert({
          tiller_product_id: p.id, name: p.name ?? "", price: typeof p.price === "number" ? p.price / 100 : null,
          product_type: p.productType ?? null, is_active: true, updated_at: new Date().toISOString(),
        }, { onConflict: "tiller_product_id" });
        updated++;
      } else failed++;
    } else if (res.status === 404 || res.status === 403) {
      await supabase.from("cave_tiller_catalog").update({ is_active: false, updated_at: new Date().toISOString() }).eq("tiller_product_id", id);
      deactivated++;
    } else failed++;
  }
  const done = (rows?.length || 0) < limit;
  return new Response(JSON.stringify({ offset, processed: rows?.length || 0, updated, deactivated, failed, next_offset: done ? null : offset + limit, done }), { headers: cors });
});
