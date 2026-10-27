// ============================================================================
//  bot/bot.js  —  THE VICTIM
//  A headless Chromium that carries Dana Mercer's session and visits whatever
//  URL you deliver from the scoreboard. If your PoC works, its credentialed
//  cross-origin read succeeds and the loot lands in your collector.
//
//  Note: real CORS enforcement is LEFT ON (we never pass --disable-web-security).
//  Only certificate errors are ignored, because the lab uses Caddy's local CA.
// ============================================================================
const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

// The bot will only visit hosts inside the lab (prevents it being used as an
// open SSRF proxy to the internet).
const IN_LAB = /(^|\.)(vaultly\.lab|evil\.lab)$/i;

app.post('/deliver', async (req, res) => {
  const url = (req.body && req.body.url) || '';
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return res.status(400).json({ ok: false, error: 'invalid URL' });
  }
  if (!IN_LAB.test(host)) {
    return res.status(400).json({ ok: false, error: `out-of-lab host blocked: ${host}` });
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--ignore-certificate-errors',
        // keep third-party SameSite=None cookies flowing (that's the attack path)
        '--disable-features=TrackingProtection3pcd',
      ],
    });
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });

    // Inject the victim session cookie, scoped to the API host. Every /secret
    // read targets api.vaultly.lab, so this one cookie covers all six challenges.
    await ctx.addCookies([
      {
        name: 'vlt_session',
        value: 'tok_victim_9b21',
        url: 'https://api.vaultly.lab',
        secure: true,
        httpOnly: true,
        sameSite: 'None',
      },
    ]);

    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(4000); // give the PoC time to fetch + exfiltrate
    await browser.close();
    return res.json({ ok: true, visited: url });
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get('/', (_req, res) =>
  res.json({ service: 'vaultly-victim-bot', deliver: 'POST /deliver { "url": "..." }' })
);

const PORT = process.env.PORT || 6000;
app.listen(PORT, () => console.log(`[bot] victim bot on :${PORT}`));
