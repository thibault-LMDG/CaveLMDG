import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const clientId = Deno.env.get("SUMUP_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("SUMUP_CLIENT_SECRET") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const redirectUri = "https://lmdg-dashboard.vercel.app/api/tiller-callback";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  async function getToken() {
    const { data: tokenRow } = await supabase.from("tiller_tokens").select("*").eq("id", "main").single();
    if (!tokenRow?.access_token) return null;
    if (new Date() > new Date(tokenRow.expires_at)) {
      const params = new URLSearchParams({ grant_type: "refresh_token", client_id: clientId, client_secret: clientSecret, refresh_token: tokenRow.refresh_token });
      const res = await fetch("https://oauth.api.tiller.systems/oauth2/token", { method: "POST", headers: { "Content-type": "application/x-www-form-urlencoded" }, body: params.toString() });
      const d = await res.json();
      if (d.access_token) {
        const expiresAt = new Date(Date.now() + (d.expires_in || 3600) * 1000).toISOString();
        await supabase.from("tiller_tokens").upsert({ id: "main", access_token: d.access_token, refresh_token: d.refresh_token || tokenRow.refresh_token, expires_in: d.expires_in, expires_at: expiresAt, updated_at: new Date().toISOString() });
        return d.access_token;
      }
      return null;
    }
    return tokenRow.access_token;
  }

  // LOGIN — scopes limités à ce que SumUp autorise réellement pour ce client.
  // catalog/read & store/read NE SONT PAS activés -> provoquaient `invalid_scope` et cassaient la re-connexion.
  if (action === "login") {
    const scopes = "order/read order/write";
    return new Response(null, { status: 302, headers: { Location: `https://oauth.api.tiller.systems/login?client_id=${clientId}&response_type=code&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}` } });
  }

  // CALLBACK
  if (action === "callback") {
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    if (error) return new Response(`Erreur: ${error}`, { headers: { "Content-Type": "text/html" } });
    if (!code) return new Response(`Pas de code`, { headers: { "Content-Type": "text/html" } });
    const params = new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code });
    const tokenRes = await fetch("https://oauth.api.tiller.systems/oauth2/token", { method: "POST", headers: { "Content-type": "application/x-www-form-urlencoded" }, body: params.toString() });
    const tokenData = await tokenRes.json();
    if (tokenData.access_token) {
      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();
      await supabase.from("tiller_tokens").upsert({ id: "main", access_token: tokenData.access_token, refresh_token: tokenData.refresh_token, token_type: "Bearer", expires_in: tokenData.expires_in, expires_at: expiresAt, scope: tokenData.scope || "order/read order/write", updated_at: new Date().toISOString() });
      return new Response(`<html><body style="font-family:sans-serif;text-align:center;margin:40px;"><h1 style="color:green;">Connexion Tiller reussie!</h1><p>Scopes: ${tokenData.scope || 'non specifie'}</p><p>Token stocke. Expire dans ${tokenData.expires_in}s.</p></body></html>`, { headers: { "Content-Type": "text/html" } });
    }
    return new Response(`Erreur token: ${JSON.stringify(tokenData)}`, { headers: { "Content-Type": "text/html" } });
  }

  // REFRESH
  if (action === "refresh") {
    const token = await getToken();
    return new Response(JSON.stringify({ success: !!token }), { headers: { "Content-Type": "application/json" } });
  }

  // STATUS
  if (action === "status") {
    const { data: tokenRow } = await supabase.from("tiller_tokens").select("expires_at, scope, updated_at").eq("id", "main").single();
    if (!tokenRow) return new Response(JSON.stringify({ status: "no_token" }), { headers: { "Content-Type": "application/json" } });
    const exp = new Date(tokenRow.expires_at);
    const isExpired = new Date() > exp;
    return new Response(JSON.stringify({ status: isExpired ? "expired" : "valid", scope: tokenRow.scope, expires_at: tokenRow.expires_at, minutes_remaining: isExpired ? 0 : Math.round((exp.getTime() - Date.now()) / 60000) }), { headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ actions: ["login", "callback", "refresh", "status"] }), { headers: { "Content-Type": "application/json" } });
});
