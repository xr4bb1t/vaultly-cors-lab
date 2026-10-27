# Vaultly — a self-hosted CORS CTF

A deliberately-vulnerable neobank for learning CORS misconfigurations hands-on.
**Six conditions, two flags each (12 total)**: a *checkpoint* when you get a
cross-origin read working, and the real *exploit* flag when you steal the
**victim's** data via a browser PoC delivered to a headless bot.

It's built to feel like a real app, not a quiz — endpoints aren't labelled, you
recon the API, and each misconfigured endpoint nudges you with a hint toward the
exploit.

> ⚠️ **Authorised learning only.** Everything here is intentionally broken; run it
> on your own machine, never anywhere reachable.

---

## Quick start

```bash
git clone https://github.com/<YOUR_USER>/vaultly-cors-lab.git
cd vaultly-cors-lab
sudo tee -a /etc/hosts < setup/hosts.txt      # add lab hostnames
sudo docker compose up --build                # start everything
```

Then open **Burp's browser** (Intercept off) — no cert hassle — and go to
`https://app.vaultly.lab`. Full steps, including plain-browser cert trust, are in
**[INSTALL.md](INSTALL.md)**. PoC templates are in **[POCS.md](POCS.md)**.

Entry points:
- `https://app.vaultly.lab` — dashboard (sign in `player` / `player123`)
- `https://api.vaultly.lab` — the API you attack (start at `/robots.txt`)
- `https://ctf.vaultly.lab` — scoreboard (submit flags under your handle)
- `https://evil.lab` — exploit server + collector (`/log`)

---

## Architecture

```
  you (Burp browser) ─┐        ┌──────────────────────────────┐
  attacker PoC ───────┴──────► │  Caddy proxy (TLS + routing)  │
   app.vaultly.lab   dashboard │                               │
   api.vaultly.lab   vuln API ◄┤   ← flags live here
   status.vaultly.lab XSS (chain)                              │
   legacy.vaultly.lab insecure http                            │
   ctf.vaultly.lab   scoreboard + deliver ──► bot (headless victim)
   evil.lab + *.evil.lab  exploit server + collector
```

Services (Node/Express; bot is Playwright): `caddy`, `api`, `attacker`, `bot`,
`scoreboard`. The six broken origin-validators are in
[`api/cors-rules.js`](api/cors-rules.js) — that file *is* the curriculum.

---

## The six conditions

Endpoints are realistic and unlabelled — you discover them by recon. For
reference (instructors), the mapping is:

| Condition | Vulnerable endpoint | Attacker origin for the exploit |
|---|---|---|
| Reflects any origin | `/api/v2/wallet/balance` | `https://evil.lab/e` |
| Trusts `null` | `/api/v2/statements` | sandboxed iframe on `evil.lab` |
| Substring / prefix match | `/api/v2/transfers/pending` | `https://vaultly.lab.evil.lab/e` |
| Weak regex (unescaped dot) | `/api/v2/cards` | `https://vaultlyxlab.evil.lab/e` |
| Blanket subdomain trust | `/api/v2/developer/keys` | XSS on `status.vaultly.lab` |
| Insecure http origin | `/api/v2/account/profile` | `http://legacy.vaultly.lab/e` |

Several other endpoints (`/api/v2/notifications`, `/support/tickets`, `/health`…)
are **correctly** configured — dead ends that teach the contrast. Recon with the
lists in [`wordlists/`](wordlists/).

---

## Graded / anti-copy mode

By default every student gets the same flags. To make flags unique per student
(so a copied flag won't validate under someone else's handle), launch with a seed:

```bash
LAB_SEED="roll_2025_0417" sudo -E docker compose up --build
```

Verify a submitted flag belongs to a student:
```bash
node tools/verify-flag.js roll_2025_0417 "VAULTLY{...__tag}"
```

See INSTALL.md §8 for the full graded workflow.

---

## Admin answer key

<details><summary>Spoilers — the 12 base flags (per-student seeding adds a __tag suffix)</summary>

```
Reflected origin   VAULTLY{bhai_origin_bhi_check_kar_le}        VAULTLY{wallet_gaya_chai_peene_nahi}
null origin        VAULTLY{null_matlab_safe_nahi_hota_bhai}     VAULTLY{iframe_mein_ghuske_statement_le_gaya}
Substring match    VAULTLY{startswith_dekhke_trust_kar_liya}    VAULTLY{domain_ke_aage_chuna_laga_gaya}
Weak regex         VAULTLY{regex_bhai_dot_to_escape_karleta}    VAULTLY{api_key_gaya_regex_so_gaya}
Subdomain + XSS    VAULTLY{trusted_subdomain_ka_trust_issues}   VAULTLY{xss_ne_cors_se_setting_kar_li}
Insecure http      VAULTLY{http_pe_bharosa_waah_bhai_waah}      VAULTLY{network_wale_bhaiya_maal_le_gaye}
```
</details>

---

## Everyday commands

```bash
sudo docker compose up -d        # start in background
sudo docker compose down         # stop + remove
sudo docker compose logs -f api  # tail a service
```

## What's verified vs. your machine

All service code is syntax-checked and the six validators + API responses are
unit/boot-tested. The full `docker compose up` (image builds, Caddy's local CA,
the bot's third-party-cookie behaviour) depends on your environment — INSTALL.md
documents the two knobs (CA trust, 3p cookies) if anything needs a nudge.
