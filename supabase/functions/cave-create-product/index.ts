import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Crée un produit dans SumUp/Tiller DEPUIS l'app Cave.
 *
 * ⚠️ TUYAUTERIE INTÉRIMAIRE : l'API tokenisée SumUp est read-only sur le catalogue,
 * donc on passe par le formulaire web du back-office (`/product/create`), authentifié
 * par une session `PHPSESSID`. Quand SumUp ouvrira le scope `catalog/write`, on
 * remplacera SEULEMENT le corps de createInSumUp() par l'appel API — l'app ne bouge pas.
 *
 * La session vit dans tiller_tokens (id='web_session', colonne access_token).
 * Thibault la pose/rafraîchit (SQL). Elle expire -> la fonction renvoie session_expired.
 *
 * POST body JSON: { name, price, category?, color?, costPrice? }
 */
const V2WEB = "https://app.tillersystems.com";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/148 Safari/537.36";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

async function getSession(): Promise<string | null> {
  const { data } = await supabase.from("tiller_tokens").select("access_token").eq("id", "web_session").maybeSingle();
  return data?.access_token || null;
}

function firstOption(html: string, sel: string): string {
  const block = html.match(new RegExp(`<select[^>]*name="product\\[${sel}\\]".*?</select>`, "is"));
  if (!block) return "";
  const selected = block[0].match(/<option[^>]*value="([^"]*)"[^>]*selected/i);
  if (selected) return selected[1];
  const opts = [...block[0].matchAll(/<option[^>]*value="([^"]*)"[^>]*>/gi)].map((m) => m[1]).filter(Boolean);
  return opts[0] || "";
}

// === LE SEUL bloc à remplacer le jour où on a l'API catalog/write ===
async function createInSumUp(session: string, p: { name: string; price: number; category: string; color: string; costPrice: number }) {
  const cookie = `PHPSESSID=${session}`;
  // 1) formulaire de création -> token CSRF + valeurs par défaut des selects
  const formRes = await fetch(`${V2WEB}/product/new/popin?category=${encodeURIComponent(p.category)}`, {
    headers: { Cookie: cookie, "User-Agent": UA, "X-Requested-With": "XMLHttpRequest" },
  });
  const formHtml = await formRes.text();
  if (formRes.url.includes("new.tillersystems.com") || formRes.url.includes("/login") || formHtml.length < 500) {
    return { ok: false, reason: "session_expired" };
  }
  const tokenM = formHtml.match(/name="product\[_token\]"\s+value="([^"]+)"/);
  if (!tokenM) return { ok: false, reason: "no_csrf_token" };
  const fields: Record<string, string> = {
    "product[name]": p.name, "product[sku]": "", "product[color]": p.color,
    "product[price]": String(p.price), "product[costPrice]": String(p.costPrice),
    "product[terminalName]": p.name,
    "product[category]": p.category,
    "product[tax]": firstOption(formHtml, "tax"),
    "product[featureType]": firstOption(formHtml, "featureType"),
    "product[unitMeasure]": firstOption(formHtml, "unitMeasure"),
    "product[printer]": firstOption(formHtml, "printer"),
    "product[printer2]": firstOption(formHtml, "printer2"),
    "product[description]": "", "product[terminalDescription]": "",
    "product[_token]": tokenM[1],
  };
  const body = Object.entries(fields).filter(([, v]) => v !== "").map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  const res = await fetch(`${V2WEB}/product/create`, {
    method: "POST", redirect: "manual",
    headers: { Cookie: cookie, "User-Agent": UA, "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const txt = await res.text();
  // succès = redirection vers la liste ; échec form = ré-affiche le form avec has-error
  if (/has-error|help-block|invalid-feedback/.test(txt)) {
    const errs = [...txt.matchAll(/(?:has-error|help-block|invalid-feedback)[^>]*>([^<]{2,80})/g)].map((m) => m[1].trim());
    return { ok: false, reason: "validation_error", errors: errs.slice(0, 6) };
  }
  return { ok: true, status: res.status };
}
// ====================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const session = await getSession();
    if (!session) return new Response(JSON.stringify({ ok: false, reason: "no_session", hint: "Poser PHPSESSID dans tiller_tokens(id='web_session')" }), { status: 503, headers: cors });

    const b = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const name = (b.name || "").trim();
    if (!name) return new Response(JSON.stringify({ ok: false, reason: "missing_name" }), { status: 400, headers: cors });
    const params = {
      name,
      price: Number(b.price || 0),                  // le formulaire back-office attend des EUROS
      costPrice: Number(b.costPrice || 0),
      category: String(b.category || "4740004"),    // défaut : catégorie courante
      color: b.color || "#2AB688",
    };
    const r = await createInSumUp(session, params);

    // Auto-mapping : si wine_id fourni, on attend que le webhook synchronise le produit,
    // on récupère son tiller_product_id, et on le lie au vin (-> le stock décomptera).
    let tillerProductId: number | null = null;
    let mapped = false;
    if (r.ok && b.wine_id) {
      for (let i = 0; i < 6 && !tillerProductId; i++) {
        await new Promise((res) => setTimeout(res, 2000));
        const { data } = await supabase.from("cave_tiller_catalog").select("tiller_product_id")
          .eq("name", name).eq("is_active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle();
        if (data?.tiller_product_id) tillerProductId = data.tiller_product_id;
      }
      if (tillerProductId) {
        const { error: mErr } = await supabase.from("cave_tiller_mapping")
          .insert({ wine_id: b.wine_id, tiller_product_id: tillerProductId, tiller_product_name: name, is_au_verre: false });
        mapped = !mErr;
      }
    }

    const code = r.ok ? 200 : (r.reason === "session_expired" || r.reason === "no_session" ? 503 : 422);
    return new Response(JSON.stringify({ ...r, name, tiller_product_id: tillerProductId, mapped }, null, 2), { status: code, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: cors });
  }
});
