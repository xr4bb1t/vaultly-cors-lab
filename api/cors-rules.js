// ============================================================================
//  cors-rules.js  —  THE HEART OF THE LAB
//  Each function is ONE deliberately-broken origin check, matching the 6
//  conditions from the explainer. Given the incoming `Origin` header, it
//  returns the string to put in Access-Control-Allow-Origin, or null to deny.
//
//  Read these top to bottom — this file *is* the curriculum.
// ============================================================================

const TRUSTED = 'vaultly.lab';           // the "real" trusted base domain
const TRUSTED_APP = 'https://app.vaultly.lab';

// ---------------------------------------------------------------------------
// C1 — REFLECTED ORIGIN (the classic)
// Mistake: echo back whatever Origin asked, no validation at all.
// Any origin on earth is therefore trusted. + credentials = critical.
// ---------------------------------------------------------------------------
function c1(origin) {
  if (!origin) return null;
  return origin;                          // <-- reflects anything. game over.
}

// ---------------------------------------------------------------------------
// C2 — null ORIGIN TRUSTED
// Mistake: allowlist contains the literal string "null" (to support
// file:// / redirects / sandboxed frames). Attacker can FORGE a null origin
// with a sandboxed iframe, so "null" == "allow anyone".
// ---------------------------------------------------------------------------
function c2(origin) {
  const allow = [TRUSTED_APP, 'null'];    // "null" is attacker-reachable
  return allow.includes(origin) ? origin : null;
}

// ---------------------------------------------------------------------------
// C3 — LAZY STRING MATCH (prefix / substring)
// Mistake: "does the origin contain our domain?" via includes()/startsWith.
// Bypass: https://vaultly.lab.evil.lab  (starts with + contains the string)
// ---------------------------------------------------------------------------
function c3(origin) {
  if (!origin) return null;
  // the bug: substring check instead of exact equality
  if (origin.includes(TRUSTED)) return origin;   // "vaultly.lab" anywhere passes
  return null;
}

// ---------------------------------------------------------------------------
// C4 — WEAK REGEX (unescaped dot, no end-anchor)
// Mistake: regex meant to match app.vaultly.lab, but the dots are unescaped
// (. = any char) and there is no $ anchor.
// Bypass: https://vaultlyXlab.evil.lab  ('.' matched by X, substring match)
// ---------------------------------------------------------------------------
function c4(origin) {
  if (!origin) return null;
  // intended to match "https://<sub>.vaultly.lab" but hopelessly broken:
  //   - dots not escaped  ->  '.' matches ANY character
  //   - no ^ or $ anchors ->  matches if the pattern appears ANYWHERE
  const broken = /vaultly.lab/;           // note: NOT /vaultly\.lab$/
  return broken.test(origin) ? origin : null;
}

// ---------------------------------------------------------------------------
// C5 — BLANKET SUBDOMAIN TRUST
// Mistake: trust ANY *.vaultly.lab origin. Looks safe... until one subdomain
// (status.vaultly.lab) has an XSS. The attacker runs their CORS read from
// INSIDE that trusted subdomain. This is the chaining challenge.
// ---------------------------------------------------------------------------
function c5(origin) {
  if (!origin) return null;
  // any https subdomain of vaultly.lab is blindly trusted
  if (/^https:\/\/([a-z0-9-]+\.)*vaultly\.lab$/.test(origin)) return origin;
  return null;
}

// ---------------------------------------------------------------------------
// C6 — INSECURE PROTOCOL TRUSTED
// Mistake: the allowlist includes the http:// version of a subdomain.
// A network-position attacker injects a page on that http origin and reads
// the secure response. Here legacy.vaultly.lab is a forgotten http origin.
// ---------------------------------------------------------------------------
function c6(origin) {
  const allow = [
    'https://app.vaultly.lab',
    'http://legacy.vaultly.lab',          // <-- insecure origin trusted
  ];
  return allow.includes(origin) ? origin : null;
}

module.exports = { c1, c2, c3, c4, c5, c6 };
