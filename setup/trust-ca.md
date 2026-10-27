# Trusting the lab's HTTPS certificate

The lab uses HTTPS because the attack needs `SameSite=None; Secure` cookies and
an https-vs-http distinction (C6). Caddy runs its own local Certificate
Authority. You have two options:

## Option A — click through (fastest)
Just visit each https origin once and accept the browser warning:
`https://app.vaultly.lab`, `https://api.vaultly.lab`, `https://ctf.vaultly.lab`,
`https://evil.lab`, `https://vaultly.lab.evil.lab`, `https://vaultlyXlab.evil.lab`.
Credentialed fetches generally still work after you've accepted each origin.

## Option B — trust the root CA (cleanest, no warnings)
After `docker compose up`, pull Caddy's root certificate out of the container
and import it into your OS/browser trust store:

```bash
docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt ./vaultly-root.crt
```

- **macOS:** double-click `vaultly-root.crt` → Keychain → set to "Always Trust".
- **Linux:** `sudo cp vaultly-root.crt /usr/local/share/ca-certificates/vaultly.crt && sudo update-ca-certificates`
- **Windows:** import into "Trusted Root Certification Authorities".
- **Firefox:** import under Settings → Privacy → Certificates → View Certificates → Authorities.

> The victim **bot** already ignores cert errors, so it works either way.
