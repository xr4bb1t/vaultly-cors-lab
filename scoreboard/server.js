// ============================================================================
//  scoreboard/server.js  —  ctf.vaultly.lab
//  Validates flags (seed-aware for anti-copy), tracks score per handle, and
//  delivers PoC URLs to the victim bot.
// ============================================================================
const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Must match api/data.js applySeed() exactly.
function applySeed(flag) {
  const s = process.env.LAB_SEED || '';
  if (!s) return flag;
  const tag = crypto.createHmac('sha256', s).update(flag).digest('hex').slice(0, 6);
  return flag.replace(/}$/, `__${tag}}`);
}

const BASE = {
  'VAULTLY{bhai_origin_bhi_check_kar_le}': 'Reflected origin · checkpoint',
  'VAULTLY{wallet_gaya_chai_peene_nahi}': 'Reflected origin · EXPLOIT',
  'VAULTLY{null_matlab_safe_nahi_hota_bhai}': 'null origin · checkpoint',
  'VAULTLY{iframe_mein_ghuske_statement_le_gaya}': 'null origin · EXPLOIT',
  'VAULTLY{startswith_dekhke_trust_kar_liya}': 'Substring match · checkpoint',
  'VAULTLY{domain_ke_aage_chuna_laga_gaya}': 'Substring match · EXPLOIT',
  'VAULTLY{regex_bhai_dot_to_escape_karleta}': 'Weak regex · checkpoint',
  'VAULTLY{api_key_gaya_regex_so_gaya}': 'Weak regex · EXPLOIT',
  'VAULTLY{trusted_subdomain_ka_trust_issues}': 'Subdomain trust · checkpoint',
  'VAULTLY{xss_ne_cors_se_setting_kar_li}': 'Subdomain XSS chain · EXPLOIT',
  'VAULTLY{http_pe_bharosa_waah_bhai_waah}': 'Insecure http origin · checkpoint',
  'VAULTLY{network_wale_bhaiya_maal_le_gaye}': 'Insecure http origin · EXPLOIT',
};
// seeded flag string -> label
const FLAGS = {};
for (const [base, label] of Object.entries(BASE)) FLAGS[applySeed(base)] = label;
const TOTAL = Object.keys(FLAGS).length;

// score per handle (in-memory)
const boards = {}; // handle -> Set

app.post('/submit', (req, res) => {
  const handle = ((req.body && req.body.handle) || '').trim().slice(0, 40);
  const flag = ((req.body && req.body.flag) || '').trim();
  if (!handle) return res.json({ ok: false, msg: 'Enter your handle / roll number first.' });
  if (!(flag in FLAGS)) return res.json({ ok: false, msg: 'Not a valid flag (or wrong seed/handle).' });
  const set = (boards[handle] = boards[handle] || new Set());
  const already = set.has(flag);
  set.add(flag);
  res.json({
    ok: true, label: FLAGS[flag], already,
    score: set.size, total: TOTAL,
    solved: [...set].map((f) => FLAGS[f]).sort(),
  });
});

app.get('/state', (req, res) => {
  const handle = (req.query.handle || '').trim();
  const set = boards[handle] || new Set();
  res.json({ score: set.size, total: TOTAL, solved: [...set].map((f) => FLAGS[f]).sort() });
});

app.post('/deliver', async (req, res) => {
  const url = (req.body && req.body.url) || '';
  try {
    const r = await fetch('http://bot:6000/deliver', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    res.status(r.status).json(await r.json());
  } catch (e) {
    res.status(502).json({ ok: false, error: 'bot unreachable: ' + String(e) });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[scoreboard] on :${PORT}  (LAB_SEED=${process.env.LAB_SEED ? 'set' : 'off'})`));
