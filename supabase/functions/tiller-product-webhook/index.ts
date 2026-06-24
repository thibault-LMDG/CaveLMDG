import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore - Supabase edge runtime global
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } | undefined;

/**
 * Webhook produits Tiller/SumUp (API V2) → miroir catalogue `cave_tiller_catalog`.
 *
 * Le webhook V2 envoie seulement { resource_id, type, store_id, resource_url }.
 * On va donc CHERCHER le détail du produit via l'API V2 :
 *   1. /auth (login + password + provider_token)  -> restaurant_token (mis en cache)
 *   2. GET /products/{id}?provider_token=..&restaurant_token=..  -> détail produit
 *   3. upsert dans cave_tiller_catalog (par tiller_product_id)
 *
 * Secrets attendus (Supabase): TILLER_LOGIN, TILLER_PASSWORD, TILLER_PROVIDER_TOKEN
 * (+ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY déjà présents).
 */

const V2 = "https://app.tillersystems.com/api";
const PROVIDER_TOKEN = Deno.env.get("TILLER_PROVIDER_TOKEN") || "";
const LOGIN = Deno.env.get("TILLER_LOGIN") || "";
const PASSWORD = Deno.env.get("TILLER_PASSWORD") || "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

/** restaurant_token V2, mis en cache dans tiller_tokens (id='v2_restaurant'). */
async function getRestaurantToken(force = false): Promise<string | null> {
  if (!force) {
    const { data } = await supabase.from("tiller_tokens").select("access_token").eq("id", "v2_restaurant").maybeSingle();
    if (data?.access_token) return data.access_token;
  }
  const res = await fetch(`${V2}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: LOGIN, password: PASSWORD, provider_token: PROVIDER_TOKEN }),
  });
  if (!res.ok) return null;
  const d = await res.json();
  if (d?.token) {
    await supabase.from("tiller_tokens").upsert({ id: "v2_restaurant", access_token: d.token, updated_at: new Date().toISOString() });
    return d.token;
  }
  return null;
}

/** Détail produit V2 ; re-auth une fois si 403 (token périmé). */
async function fetchProduct(id: string): Promise<any | null> {
  for (const force of [false, true]) {
    const rt = await getRestaurantToken(force);
    if (!rt) continue;
    const res = await fetch(`${V2}/products/${id}?provider_token=${PROVIDER_TOKEN}&restaurant_token=${rt}`);
    if (res.status === 200) return await res.json();
    if (res.status !== 403) return null; // autre erreur : on n'insiste pas
  }
  return null;
}

async function log(statut: string, nb: number, detail: unknown) {
  await supabase.from("sync_log").insert({
    source: "tiller-product-webhook",
    derniere_extraction: new Date().toISOString(),
    nb_records: nb,
    statut,
    detail: typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 8000),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    const type: string = body.type || body.eventType || "";
    const resourceId: string = String(body.resource_id ?? body.resourceId ?? "");

    // --- Suppression : on désactive (jamais de DELETE physique) ---
    if (type === "PRODUCT_DELETED") {
      await supabase.from("cave_tiller_catalog")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("tiller_product_id", parseInt(resourceId));
      await log("success", 1, { type, resourceId });
      return new Response(JSON.stringify({ status: "ok", action: "deactivated", id: resourceId }), { headers: cors });
    }

    // --- Création / modification : on va chercher le détail puis on upsert ---
    if (type === "PRODUCT_CREATED" || type === "PRODUCT_UPDATED") {
      const p = await fetchProduct(resourceId);
      if (!p || !p.id) {
        await log("error", 0, { type, resourceId, reason: "fetch produit échoué" });
        return new Response(JSON.stringify({ status: "error", reason: "fetch failed", id: resourceId }), { status: 502, headers: cors });
      }
      // On n'écrase PAS category_name (préservé s'il existait via l'import CSV).
      const row: Record<string, unknown> = {
        tiller_product_id: p.id,
        name: p.name ?? "",
        price: typeof p.price === "number" ? p.price / 100 : null,
        product_type: p.productType ?? null,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("cave_tiller_catalog").upsert(row, { onConflict: "tiller_product_id" });
      if (error) {
        await log("error", 0, { type, resourceId, error: error.message });
        return new Response(JSON.stringify({ status: "error", error: error.message }), { status: 500, headers: cors });
      }
      await log("success", 1, { type, id: p.id, name: p.name });
      return new Response(JSON.stringify({ status: "ok", action: "upserted", id: p.id, name: p.name }), { headers: cors });
    }

    // --- Commande clôturée : décompte stock EN TEMPS RÉEL ---
    // Pull de la fenêtre récente -> lignes_produits, puis décompte (même dédup que le cron
    // filet de sécurité -> aucun double-décompte). Réponse immédiate, pipeline en arrière-plan.
    if (type === "ORDER_CLOSED") {
      const base = (Deno.env.get("SUPABASE_URL") || "") + "/functions/v1";
      const pipeline = (async () => {
        try {
          await fetch(`${base}/sync-tiller-v2?minutes=30`);   // pull la commande -> lignes_produits
          await fetch(`${base}/sync-tiller-cave?days=1`);     // décompte (dédup lignes_produits.id)
        } catch (_e) { /* le cron 30 min rattrapera */ }
      })();
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(pipeline); else await pipeline;
      await log("success", 1, { type, resourceId, action: "realtime-stock" });
      return new Response(JSON.stringify({ status: "ok", action: "realtime-stock" }), { headers: cors });
    }

    // --- Options / autres events : log seulement pour l'instant ---
    await log("ignored", 0, { type, resourceId });
    return new Response(JSON.stringify({ status: "ignored", type }), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
