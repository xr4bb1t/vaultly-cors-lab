# Vaultly CORS Lab — Installation (Burp Browser)

Target setup: **clone → `docker compose up` → open Burp's browser → start hacking.**
Tested on Kali. Any Linux/macOS with Docker works; Windows via WSL2.

---

## 0. Prerequisites

- **Docker** + **Docker Compose** (`docker --version`, `docker compose version`)
- **git**
- **Burp Suite** (Community is fine) — we use its built-in browser so there's no
  certificate hassle.

On Kali, Docker is usually a one-liner if you don't have it:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin && sudo systemctl enable --now docker
```

---

## 1. Clone

```bash
git clone https://github.com/<YOUR_USER>/vaultly-cors-lab.git
cd vaultly-cors-lab
```

## 2. Add the lab hostnames

The lab is origin-based, so your machine must resolve the names to localhost:

```bash
sudo tee -a /etc/hosts < setup/hosts.txt
```

(That adds `app.vaultly.lab`, `api.vaultly.lab`, `status.vaultly.lab`,
`legacy.vaultly.lab`, `ctf.vaultly.lab`, `evil.lab`, `vaultly.lab.evil.lab`,
`vaultlyxlab.evil.lab` → all `127.0.0.1`.)

## 3. Start the lab

```bash
sudo docker compose up --build
```

First run builds images (the bot pulls a Playwright image, ~1–2 min). It's ready
when you see all five services log their ports and Caddy report
`certificate obtained successfully`. **Leave this terminal running.**

---

## 4. Open Burp's browser (the easy path — no cert fuss)

1. Launch Burp Suite → **Proxy** tab → set **Intercept is off**.
2. Click **Open Browser** (Burp's embedded Chromium).
3. Browse to the lab. Because Burp proxies and trusts the upstream cert for you,
   there are **no certificate warnings**:
   - Dashboard → `https://app.vaultly.lab` (sign in `player` / `player123`)
   - API → `https://api.vaultly.lab/api/v2/health`
   - Scoreboard → `https://ctf.vaultly.lab`
   - Exploit server → `https://evil.lab`

> Using plain Firefox/Chrome instead? Either accept the warning once per https
> origin, or trust Caddy's CA — see `setup/trust-ca.md`. Burp's browser is simplest.

Everything you browse flows through **Proxy → HTTP history**, and you can
right-click any request → **Send to Repeater** to craft `Origin` probes. That's
your detection workflow.

---

## 5. Smoke test (confirm it's live)

In a second terminal:
```bash
curl -sk https://api.vaultly.lab/api/v2/health
# -> {"status":"ok","version":"2.4.1"}
```

Then in Burp browser, sign in at `https://app.vaultly.lab`. If the dashboard loads
your balance, the whole stack works.

---

## 6. How students play

1. **Recon** the API at `https://api.vaultly.lab` — read `robots.txt`, fuzz paths
   and parameters (see `wordlists/`), find which endpoints are talkative.
2. **Detect** — in Repeater, add an `Origin:` header and watch for it being
   reflected in `Access-Control-Allow-Origin`. A reflected origin + a checkpoint
   token + a hint means you're on the right track.
3. **Exploit** — follow the hint, host a PoC on the exploit server
   (`https://evil.lab`), **deliver** it to the victim from the scoreboard, and read
   the stolen response (with the real flag) in your collector at
   `https://evil.lab/log`. PoC templates are in `POCS.md`.
4. **Submit** flags at `https://ctf.vaultly.lab` under your handle.

---

## 7. Everyday commands

```bash
# stop (from the attached terminal): Ctrl+C
sudo docker compose down          # stop + remove containers
sudo docker compose up            # start again (no rebuild)
sudo docker compose up -d         # start detached (background)
sudo docker compose logs -f api   # tail one service
```

---

## 8. Graded / anti-copy mode (optional, for instructors)

By default flags are the same for everyone. To make each student's flags unique
(so a copied flag won't validate under another student's handle), launch with a
per-student seed:

```bash
LAB_SEED="roll_2025_0417" sudo -E docker compose up --build
```

Each student runs their own lab with their own `LAB_SEED`. When they submit a flag
to a **central** scoreboard you control, verify it belongs to them:

```bash
node tools/verify-flag.js roll_2025_0417 "VAULTLY{wallet_gaya_chai_peene_nahi__a1b2c3}"
# -> VALID for seed "roll_2025_0417"  ->  Reflected origin · EXPLOIT
```

A flag that validates under a different seed than the submitter's = a copy.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Dashboard "network error" | Accept the cert for `https://api.vaultly.lab` (or use Burp browser). |
| `vaultly.lab.evil.lab` won't resolve | Re-add `setup/hosts.txt` to `/etc/hosts`. |
| Ports 80/443 busy | Stop the conflicting service or remap Caddy ports in `docker-compose.yml`. |
| Flag 2 never reaches the collector | Deliver the hostname matching the condition; confirm the PoC fetches the right endpoint. |
