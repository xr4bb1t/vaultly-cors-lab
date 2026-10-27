// ============================================================================
//  data.js  —  users, sessions, secrets, hints, and the 12 flags
//  Realistic neobank surface: endpoints are NOT labelled c1..c6. Students
//  discover which ones are misconfigured. Each challenge has a HINT engine
//  ("you're warm -> now try this") and the real flag only drops on full
//  exploitation as the victim.
// ============================================================================
const crypto = require('crypto');

// --- Anti-copy: optional per-student flag seed ------------------------------
// Set LAB_SEED (e.g. a roll number) in docker-compose to make every flag
// carry a short per-student tag, so a copied flag won't match another student.
// Empty seed => plain flags (works out of the box).
function applySeed(flag) {
  const s = process.env.LAB_SEED || '';
  if (!s) return flag;
  const tag = crypto.createHmac('sha256', s).update(flag).digest('hex').slice(0, 6);
  return flag.replace(/}$/, `__${tag}}`);
}

const USERS = {
  player: { user: 'player', pass: 'player123', name: 'You (Analyst)' },
  victim: { user: 'victim', pass: 'sup3r-s3cret-v1ct1m', name: 'Dana Mercer' },
};
const SESSIONS = {
  tok_player_7f3a: 'player',
  tok_victim_9b21: 'victim', // the bot injects exactly this cookie value
};
function userFromToken(token) {
  const u = SESSIONS[token];
  return u ? USERS[u] : null;
}

// Base flags (your custom names). applySeed() tags them per student if enabled.
const BASE = {
  c1: { detect: 'VAULTLY{bhai_origin_bhi_check_kar_le}',
        exploit: 'VAULTLY{wallet_gaya_chai_peene_nahi}' },
  c2: { detect: 'VAULTLY{null_matlab_safe_nahi_hota_bhai}',
        exploit: 'VAULTLY{iframe_mein_ghuske_statement_le_gaya}' },
  c3: { detect: 'VAULTLY{startswith_dekhke_trust_kar_liya}',
        exploit: 'VAULTLY{domain_ke_aage_chuna_laga_gaya}' },
  c4: { detect: 'VAULTLY{regex_bhai_dot_to_escape_karleta}',
        exploit: 'VAULTLY{api_key_gaya_regex_so_gaya}' },
  c5: { detect: 'VAULTLY{trusted_subdomain_ka_trust_issues}',
        exploit: 'VAULTLY{xss_ne_cors_se_setting_kar_li}' },
  c6: { detect: 'VAULTLY{http_pe_bharosa_waah_bhai_waah}',
        exploit: 'VAULTLY{network_wale_bhaiya_maal_le_gaye}' },
};
const FLAGS = {};
for (const k of Object.keys(BASE)) {
  FLAGS[k] = { detect: applySeed(BASE[k].detect), exploit: applySeed(BASE[k].exploit) };
}

// Progressive hints — shown when a student reaches an accepted-origin read but
// hasn't exploited yet. This is the "achha try — ab ye kar" nudge.
const HINTS = {
  c1: "Nice — this endpoint trusts ANY origin you send. But a header isn't impact. Can you make a logged-in victim's browser read this with their cookies? Host a page on evil.lab that does fetch(..., {credentials:'include'}).",
  c2: "Arbitrary origins are rejected here… but one 'origin' isn't really a site. What has the Origin value 'null'? A sandboxed iframe. Build your PoC inside one.",
  c3: "Rejected? This filter just checks whether our domain appears SOMEWHERE in your origin. Put our domain somewhere on a host you actually control.",
  c4: "Warm. The validator is a regex that forgot to escape a character. A '.' in regex matches… anything. Craft a look-alike host that satisfies it.",
  c5: "Only genuine *.vaultly.lab origins are trusted — you can't register one. Unless a trusted subdomain hands you JavaScript execution. Have you looked at status.vaultly.lab?",
  c6: "https origins are matched strictly. But is https the ONLY scheme on the allowlist? Check what a forgotten legacy origin is allowed to do.",
};

// Per-challenge data. `teaser` = benign/demo data returned on a cross-origin
// read. `secret` = the victim-bound data that carries Flag 2.
const CHALLENGE_DATA = {
  c1: { teaser: { currency: 'USD', tier: 'demo' },
        secret: { account: 'VLT-8841-0092', balance_usd: 184203.55, wallet: '0xDANA...beef' } },
  c2: { teaser: { export_formats: ['json', 'csv'] },
        secret: { month: '2026-09', lines: ['ACH -$2,400 rent', 'CARD -$89 groceries'] } },
  c3: { teaser: { pending_count: 0 },
        secret: { pending: ['$12,000 -> ACME LLC', '$3,400 -> J. Reed'] } },
  c4: { teaser: { card_art: 'default' },
        secret: { primary_card: '4418 2931 0044 7781', exp: '09/29' } },
  c5: { teaser: { docs: 'https://status.vaultly.lab' },
        secret: { api_key: 'sk_live_vaultly_4f91a7c2e8', scopes: ['transfers', 'cards'] } },
  c6: { teaser: { marketing_opt_in: false },
        secret: { email: 'dana.mercer@vaultly.lab', ssn_last4: '7781' } },
};

module.exports = { applySeed, USERS, SESSIONS, userFromToken, FLAGS, HINTS, CHALLENGE_DATA };
