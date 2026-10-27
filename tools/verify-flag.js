#!/usr/bin/env node
// ============================================================================
//  verify-flag.js  —  instructor tool for graded / anti-copy mode
//
//  Usage:
//    node verify-flag.js <student_seed> "<submitted_flag>"
//
//  If you launched the lab with LAB_SEED=<student_seed>, each student's flags
//  carry a unique per-seed tag. This checks whether a submitted flag is valid
//  FOR THAT STUDENT. A flag that validates under Alice's seed but was submitted
//  by Bob is a copy.
// ============================================================================
const crypto = require('crypto');

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

function seeded(base, seed) {
  if (!seed) return base;
  const tag = crypto.createHmac('sha256', seed).update(base).digest('hex').slice(0, 6);
  return base.replace(/}$/, `__${tag}}`);
}

const [seed, submitted] = process.argv.slice(2);
if (!seed || !submitted) {
  console.log('usage: node verify-flag.js <student_seed> "<submitted_flag>"');
  process.exit(1);
}
let hit = null;
for (const [base, label] of Object.entries(BASE)) {
  if (seeded(base, seed) === submitted.trim()) { hit = label; break; }
}
if (hit) console.log(`VALID for seed "${seed}"  ->  ${hit}`);
else console.log(`INVALID for seed "${seed}"  (wrong seed = likely copied from another student, or typo)`);
