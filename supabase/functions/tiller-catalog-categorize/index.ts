import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Renseigne cave_tiller_catalog.category_name en balayant les listes de catégories du back-office
 * SumUp (la seule source qui connaît la catégorie ; le détail produit V2 ne la renvoie pas).
 * À lancer ponctuellement ou via cron — corrige les produits créés via webhook (category_name null).
 *
 * Auth : session PHPSESSID dans tiller_tokens(web_session).
 */
const V2WEB = "https://app.tillersystems.com";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/148 Safari/537.36";
const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
// catégories vin (id back-office -> nom catalogue)
const CATS: Record<number, string> = {
  4739833: "Vin Verre", 5187020: "Blancs New", 5187023: "Rouges New", 5187022: "Rose New", 5187021: "Bulles New",
};
const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { data: sess } = await supabase.from("tiller_tokens").select("access_token").eq("id", "web_session").maybeSingle();
    const session = sess?.access_token;
    if (!session) return new Response(JSON.stringify({ ok: false, reason: "no_session" }), { status: 503, headers: cors });

    const result: Record<string, number> = {};
    for (const [catId, catName] of Object.entries(CATS)) {
      const res = await fetch(`${V2WEB}/inventory/category/list/${catId}`, { headers: { Cookie: `PHPSESSID=${session}`, "User-Agent": UA, "X-Requested-With": "XMLHttpRequest" } });
      if (res.url.includes("new.tillersystems.com") || res.url.includes("/login")) {
        return new Response(JSON.stringify({ ok: false, reason: "session_expired" }), { status: 503, headers: cors });
      }
      const html = await res.text();
      const ids = [...new Set([...html.matchAll(/\/product\/(\d+)\/(?:edit\/popin|delete|visibility)/g)].map((m) => parseInt(m[1])))];
      if (ids.length) {
        // ne met à jour que les lignes dont la catégorie diffère, par lots
        for (let i = 0; i < ids.length; i += 100) {
          await supabase.from("cave_tiller_catalog").update({ category_name: catName }).in("tiller_product_id", ids.slice(i, i + 100));
        }
      }
      result[catName] = ids.length;
    }
    return new Response(JSON.stringify({ ok: true, scanned: result }, null, 2), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: cors });
  }
});
