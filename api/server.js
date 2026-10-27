// ============================================================================
//  server.js  —  Vaultly API  (api.vaultly.lab  +  status.vaultly.lab)
//  A realistic neobank API. Six endpoints are CORS-misconfigured; several are
//  not. Nothing is labelled "challenge" — students recon and discover.
//
//  On a cross-origin read that the (broken) rule ACCEPTS:
//    - as the victim  -> sensitive data + Flag 2 (exploit)
//    - otherwise      -> demo data + a checkpoint (Flag 1) + a HINT to exploit
// ============================================================================
const express = require('express');
const cookieParser = require('cookie-parser');
const rules = require('./cors-rules');
const { USERS, SESSIONS, userFromToken, FLAGS, HINTS, CHALLENGE_DATA } = require('./data');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const COOKIE = 'vlt_session';
const APP_ORIGIN = 'https://app.vaultly.lab';

function applyCors(res, decision) {
  res.setHeader('Vary', 'Origin');
  if (decision) {
    res.setHeader('Access-Control-Allow-Origin', decision);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}
function preflight(ruleFn) {
  return (req, res) => {
    const d = ruleFn(req.headers.origin);
    applyCors(res, d);
    if (d) {
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type');
    }
    res.sendStatus(204);
  };
}
const currentUser = (req) => userFromToken(req.cookies[COOKIE]);

// ---- C5 XSS sink on the status vhost ---------------------------------------
app.use((req, res, next) => {
  const host = (req.headers.host || '').split(':')[0];
  if (host === 'status.vaultly.lab') {
    const msg = req.query.msg || 'All systems operational.';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<!doctype html><html><head><title>Vaultly Status</title>
<style>body{font-family:system-ui;background:#0b0f1c;color:#dbe1ee;max-width:640px;margin:60px auto;padding:0 20px}
h1{color:#f3b43a}.card{border:1px solid #243049;border-radius:10px;padding:20px;background:#121a2e}</style></head>
<body><h1>Vaultly — System Status</h1><div class="card"><p>Latest notice:</p><div id="notice">${msg}</div></div>
<p style="color:#6b7691;font-size:13px">status.vaultly.lab &middot; a trusted Vaultly subdomain</p></body></html>`);
  }
  next();
});

// ---- Recon surface ---------------------------------------------------------
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    'User-agent: *\nDisallow: /api/v2/developer/\nDisallow: /api/v2/internal/\nDisallow: /admin/\n'
  );
});
app.get('/api/v2/health', (req, res) => res.json({ status: 'ok', version: '2.4.1' }));
app.get('/api/v2/config', (req, res) =>
  res.json({ brand: 'Vaultly', region: 'IN', features: ['transfers', 'cards', 'rewards'] })
);
app.get('/api/v2/internal/metrics', (req, res) =>
  res.status(403).json({ error: 'forbidden', note: 'internal network only' })
);
// Properly-configured endpoints (exact allowlist) — dead ends that teach contrast.
function strictCors(req, res, next) {
  if (req.headers.origin === APP_ORIGIN) applyCors(res, APP_ORIGIN);
  next();
}
app.get('/api/v2/notifications', strictCors, (req, res) => {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ error: 'auth required' });
  res.json({ unread: 2, items: ['Statement ready', 'New device login'] });
});
app.get('/api/v2/support/tickets', strictCors, (req, res) => {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ error: 'auth required' });
  res.json({ open: 0, tickets: [] });
});

// ---- Auth (legit app surface) ----------------------------------------------
app.options('/api/v2/auth/login', strictCors, (req, res) => {
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(204);
});
app.post('/api/v2/auth/login', strictCors, (req, res) => {
  const { user, pass } = req.body || {};
  const found = Object.values(USERS).find((u) => u.user === user && u.pass === pass);
  if (!found) return res.status(401).json({ ok: false, error: 'bad credentials' });
  const token = Object.keys(SESSIONS).find((t) => SESSIONS[t] === found.user);
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Domain=vaultly.lab; Path=/; Secure; HttpOnly; SameSite=None`);
  res.json({ ok: true, user: found.user, name: found.name });
});
app.get('/api/v2/auth/whoami', strictCors, (req, res) => {
  const u = currentUser(req);
  res.json({ ok: !!u, user: u ? u.user : null, name: u ? u.name : null });
});
app.post('/api/v2/auth/logout', strictCors, (req, res) => {
  res.setHeader('Set-Cookie', `${COOKIE}=; Domain=vaultly.lab; Path=/; Max-Age=0`);
  res.json({ ok: true });
});

// ---- The 6 vulnerable endpoints (realistic paths, no c1..c6 labels) --------
const CONDITIONS = [
  { key: 'c1', path: '/api/v2/wallet/balance' },
  { key: 'c2', path: '/api/v2/statements' },
  { key: 'c3', path: '/api/v2/transfers/pending' },
  { key: 'c4', path: '/api/v2/cards' },
  { key: 'c5', path: '/api/v2/developer/keys' },
  { key: 'c6', path: '/api/v2/account/profile' },
];

CONDITIONS.forEach(({ key, path }) => {
  const ruleFn = rules[key];
  app.options(path, preflight(ruleFn));
  app.get(path, (req, res) => {
    const decision = ruleFn(req.headers.origin);
    applyCors(res, decision);
    const u = currentUser(req);

    // Origin NOT accepted by the browser: return benign data, no flags.
    // (A ?debug param still drops a hint, to reward parameter fuzzing.)
    if (!decision) {
      const out = { resource: path, data: CHALLENGE_DATA[key].teaser };
      if (req.query.debug) out.hint = HINTS[key];
      return res.json(out);
    }

    // Accepted origin + VICTIM session => the prize.
    if (u && u.user === 'victim') {
      return res.json({ resource: path, owner: 'victim', data: CHALLENGE_DATA[key].secret, flag: FLAGS[key].exploit });
    }

    // Accepted origin, not the victim => checkpoint + the "now try this" hint.
    return res.json({
      resource: path,
      data: CHALLENGE_DATA[key].teaser,
      checkpoint: FLAGS[key].detect,
      hint: HINTS[key],
    });
  });
});

// Minimal API index (sparse on purpose — go recon).
app.get(['/', '/api/v2'], (req, res) =>
  res.json({ service: 'vaultly-api', version: '2.4.1', docs: 'see /robots.txt' })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[api] Vaultly API v2 on :${PORT}  (LAB_SEED=${process.env.LAB_SEED ? 'set' : 'off'})`));
