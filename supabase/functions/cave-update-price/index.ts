import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Met à jour le PRIX d'un produit existant dans SumUp/Tiller DEPUIS l'app Cave.
 *
 * Même tuyauterie intérimaire que cave-create-product : l'API SumUp est read-only sur le
 * catalogue, donc on passe par le formulaire web du back-office (édition produit),
 * authentifié par la session PHPSESSID (tiller_tokens id='web_session').
 *
 * Stratégie SÛRE : on récupère le formulaire d'édition du produit, on renvoie TOUS ses
 * champs tels quels en ne modifiant QUE product[price] (préserve catégorie/TVA/imprimante/…).
 *
 * POST body JSON: { tiller_product_id, price, dryRun? }
 *   dryRun=true  -> inspecte (session + structure du form) sans rien soumettre.
 */
const V2WEB = "https://app.tillersystems.com";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/148 Safari/537.36";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

async function getSession(): Promise<string | null> {
  const { data } = await supabase.from("tiller_tokens").select("access_token").eq("id", "web_session").maybeSingle();
  return data?.access_token || null;
}

function looksLikeLogin(url: string, html: string): boolean {
  return url.includes("new.tillersystems.com") || url.includes("/login") || html.length < 500 || /name="_username"/.test(html);
}

// Récupère le formulaire d'édition d'un produit (essaie les URLs candidates du back-office).
async function fetchEditForm(session: string, id: number) {
  const cookie = `PHPSESSID=${session}`;
  const candidates = [`/product/${id}/edit/popin`, `/product/${id}/edit`, `/product/${id}`];
  for (const path of candidates) {
    const res = await fetch(`${V2WEB}${path}`, { headers: { Cookie: cookie, "User-Agent": UA, "X-Requested-With": "XMLHttpRequest" } });
    const html = await res.text();
    if (looksLikeLogin(res.url, html)) return { ok: false as const, reason: "session_expired", tried: path };
    if (/product\[_token\]/.test(html) && /product\[price\]/.test(html)) {
      return { ok: true as const, path, url: res.url, html };
    }
  }
  return { ok: false as const, reason: "edit_form_not_found" };
}

// Parse tous les champs product[...] du formulaire (inputs, selects sélectionnés, textareas).
function parseForm(html: string): { action: string; fields: Record<string, string> } {
  const formM = html.match(/<form\b[^>]*action="([^"]+)"[^>]*>([\s\S]*?)<\/form>/i);
  const action = formM ? formM[1] : "";
  const scope = formM ? formM[0] : html;
  const fields: Record<string, string> = {};
  for (const m of scope.matchAll(/<input\b[^>]*>/gi)) {
    const tag = m[0];
    const name = (tag.match(/name="(product\[[^"]+\])"/) || [])[1];
    if (!name) continue;
    const type = ((tag.match(/type="([^"]+)"/) || [])[1] || "text").toLowerCase();
    if (type === "checkbox" || type === "radio") { if (/\bchecked\b/i.test(tag)) fields[name] = (tag.match(/value="([^"]*)"/) || ["", ""])[1]; continue; }
    fields[name] = (tag.match(/value="([^"]*)"/) || ["", ""])[1];
  }
  for (const m of scope.matchAll(/<select\b[^>]*name="(product\[[^"]+\])"[^>]*>([\s\S]*?)<\/select>/gi)) {
    const name = m[1], body = m[2];
    const sel = body.match(/<option[^>]*value="([^"]*)"[^>]*\bselected\b/i);
    fields[name] = sel ? sel[1] : ((body.match(/<option[^>]*value="([^"]*)"/i) || ["", ""])[1]);
  }
  for (const m of scope.matchAll(/<textarea\b[^>]*name="(product\[[^"]+\])"[^>]*>([\s\S]*?)<\/textarea>/gi)) {
    fields[m[1]] = m[2].replace(/^\s+|\s+$/g, "");
  }
  return { action, fields };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const session = await getSession();
    if (!session) return new Response(JSON.stringify({ ok: false, reason: "no_session" }), { status: 503, headers: cors });

    const b = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const id = Number(b.tiller_product_id || 0);
    const price = Number(b.price);
    const dryRun = !!b.dryRun;
    if (!id) return new Response(JSON.stringify({ ok: false, reason: "missing_tiller_product_id" }), { status: 400, headers: cors });
    if (!dryRun && !(price > 0)) return new Response(JSON.stringify({ ok: false, reason: "missing_price" }), { status: 400, headers: cors });

    const form = await fetchEditForm(session, id);
    if (!form.ok) return new Response(JSON.stringify(form), { status: form.reason === "session_expired" ? 503 : 422, headers: cors });

    const { action, fields } = parseForm(form.html);
    const currentPrice = fields["product[price]"];
    const fieldNames = Object.keys(fields);

    if (dryRun) {
      const snapshot = Object.fromEntries(Object.entries(fields).filter(([k]) => k !== "product[_token]"));
      return new Response(JSON.stringify({
        ok: true, dryRun: true, session_valid: true, edit_path: form.path, final_url: form.url,
        action, current_price: currentPrice, field_names: fieldNames, snapshot,
        has_token: !!fields["product[_token]"], has_category: !!fields["product[category]"],
        has_tax: !!fields["product[tax]"], has_printer: !!fields["product[printer]"],
      }, null, 2), { status: 200, headers: cors });
    }

    if (!fields["product[_token]"]) return new Response(JSON.stringify({ ok: false, reason: "no_csrf_token" }), { status: 422, headers: cors });
    if (!action) return new Response(JSON.stringify({ ok: false, reason: "no_form_action" }), { status: 422, headers: cors });

    const before = currentPrice;
    fields["product[price]"] = String(price);
    // On ne renvoie pas les champs fichier/média (upload) — sinon risque d'effacer l'image.
    const body = Object.entries(fields)
      .filter(([k]) => !k.includes("[media]") && !k.endsWith("[file]"))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
    const actionUrl = action.startsWith("http") ? action : `${V2WEB}${action}`;
    const res = await fetch(actionUrl, {
      method: "POST", redirect: "manual",
      headers: { Cookie: `PHPSESSID=${session}`, "User-Agent": UA, "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const txt = await res.text();
    if (/has-error|help-block|invalid-feedback/.test(txt)) {
      const errs = [...txt.matchAll(/(?:has-error|help-block|invalid-feedback)[^>]*>([^<]{2,80})/g)].map((m) => m[1].trim());
      return new Response(JSON.stringify({ ok: false, reason: "validation_error", errors: errs.slice(0, 6), price_before: before }), { status: 422, headers: cors });
    }
    return new Response(JSON.stringify({ ok: true, tiller_product_id: id, price_before: before, price_after: price, status: res.status }, null, 2), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: cors });
  }
});
