#!/usr/bin/env node
/**
 * sync-tiller-session — maintient la session web du back-office SumUp/Tiller.
 *
 * Le back-office (app.tillersystems.com) n'a pas d'API d'écriture sur le catalogue :
 * les fonctions cave-create-product / cave-update-price / cave-verify-product /
 * tiller-catalog-categorize s'authentifient avec le cookie PHPSESSID stocké dans
 * tiller_tokens(id='web_session'). Ce cookie expirait sans prévenir et devait être
 * reposé à la main en SQL.
 *
 * Ici, la session vit dans le Chrome dédié du mini (CDP 9222), où Thibault s'est
 * connecté une fois. Le script :
 *   1. ouvre un onglet sur le back-office (ça garde la session vivante côté Symfony),
 *   2. relit le PHPSESSID courant dans ce Chrome,
 *   3. vérifie qu'il est encore valide (pas de redirection vers le login SSO),
 *   4. le recopie dans Supabase si la valeur a changé.
 *
 * La valeur du cookie n'est jamais affichée ni journalisée.
 *
 * Usage : node scripts/sync-tiller-session.cjs [--check]
 *   --check : diagnostic seul, aucune écriture en base.
 *
 * Env (dans ~/dev/secrets.env) :
 *   CAVE_SUPABASE_URL, CAVE_SUPABASE_SERVICE_ROLE_KEY
 *   CHROME_CDP_URL (défaut http://127.0.0.1:9222)
 */

const BACKOFFICE = 'https://app.tillersystems.com/';
const COOKIE_NAME = 'PHPSESSID';
const CDP = process.env.CHROME_CDP_URL || 'http://127.0.0.1:9222';
const CHECK_ONLY = process.argv.includes('--check');

const log = (...a) => console.log(new Date().toISOString(), ...a);

function fail(code, message) {
  log('ECHEC:', message);
  process.exit(code);
}

async function cdp(path, init) {
  const res = await fetch(CDP + path, init);
  if (!res.ok) throw new Error(`CDP ${path} -> ${res.status}`);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

/** Ouvre un onglet sur le back-office, attend le chargement, le referme. */
async function touchBackoffice() {
  let target;
  try {
    target = await cdp(`/json/new?${encodeURIComponent(BACKOFFICE)}`, { method: 'PUT' });
  } catch {
    target = await cdp(`/json/new?${encodeURIComponent(BACKOFFICE)}`, { method: 'POST' });
  }
  await new Promise((r) => setTimeout(r, 6000));
  if (target && target.id) await cdp(`/json/close/${target.id}`).catch(() => {});
}

/** Lit le PHPSESSID du back-office dans le Chrome dédié (niveau navigateur). */
async function readCookie() {
  const { webSocketDebuggerUrl } = await cdp('/json/version');
  const ws = new WebSocket(webSocketDebuggerUrl);
  const cookies = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout CDP')), 10000);
    ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: 'Storage.getCookies', params: {} }));
    ws.onerror = () => { clearTimeout(timer); reject(new Error('websocket CDP injoignable')); };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== 1) return;
      clearTimeout(timer);
      ws.close();
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result.cookies || []);
    };
  });
  return cookies.find((c) => c.name === COOKIE_NAME && /(^|\.)tillersystems\.com$/.test(c.domain.replace(/^\./, '.')));
}

/** Une session valide sert la page ; une session morte renvoie vers le SSO. */
async function isSessionAlive(value) {
  const res = await fetch(BACKOFFICE, {
    headers: { cookie: `${COOKIE_NAME}=${value}`, 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    redirect: 'manual',
  });
  const location = res.headers.get('location') || '';
  if (res.status >= 300 && res.status < 400) {
    if (/new\.tillersystems\.com|\/login|sumup/i.test(location)) return false;
  }
  return res.status === 200 || (res.status >= 300 && res.status < 400);
}

async function currentStored(url, key) {
  const res = await fetch(`${url}/rest/v1/tiller_tokens?id=eq.web_session&select=access_token`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`lecture Supabase ${res.status}`);
  const rows = await res.json();
  return rows[0] ? rows[0].access_token : null;
}

async function store(url, key, value) {
  const res = await fetch(`${url}/rest/v1/tiller_tokens?id=eq.web_session`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify({ access_token: value, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`écriture Supabase ${res.status} ${await res.text()}`);
}

(async () => {
  const url = process.env.CAVE_SUPABASE_URL;
  const key = process.env.CAVE_SUPABASE_SERVICE_ROLE_KEY;
  if (!CHECK_ONLY && (!url || !key)) fail(1, 'CAVE_SUPABASE_URL ou CAVE_SUPABASE_SERVICE_ROLE_KEY manquant');

  await touchBackoffice().catch((e) => log('note: onglet de rafraîchissement non ouvert (', e.message, ')'));

  const cookie = await readCookie().catch((e) => fail(1, `lecture du cookie impossible: ${e.message}`));
  if (!cookie) {
    fail(2, `aucun ${COOKIE_NAME} dans le Chrome dédié. Connecte-toi à ${BACKOFFICE} dans cette fenêtre, puis relance.`);
  }
  log(`cookie trouvé (${cookie.value.length} caractères)`);

  const alive = await isSessionAlive(cookie.value);
  if (!alive) {
    fail(2, `session expirée côté SumUp. Reconnecte-toi à ${BACKOFFICE} dans le Chrome dédié, puis relance.`);
  }
  log('session valide côté back-office');

  if (CHECK_ONLY) { log('mode --check : rien écrit'); return; }

  const stored = await currentStored(url, key);
  if (stored === cookie.value) { log('Supabase déjà à jour'); return; }
  await store(url, key, cookie.value);
  log('Supabase mis à jour (tiller_tokens.web_session)');
})().catch((e) => fail(1, e.message));
