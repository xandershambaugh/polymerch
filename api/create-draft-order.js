/**
 * Vercel Serverless Function — Shopify Draft Order Proxy
 * ──────────────────────────────────────────────────────
 * Keeps the Shopify Admin API token out of the browser.
 *
 * Required environment variables (set in Vercel dashboard):
 *   SHOPIFY_STORE_DOMAIN   e.g. "polymarket.myshopify.com"
 *   SHOPIFY_ADMIN_TOKEN    e.g. "shpat_xxxxxxxxxxxxxxxxxxxx"
 */

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_TOKEN } = process.env;
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_TOKEN) {
    return res.status(500).json({ error: 'Shopify env vars not configured' });
  }

  try {
    const shopifyRes = await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/draft_orders.json`,
      {
        method:  'POST',
        headers: {
          'Content-Type':         'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
        },
        body: JSON.stringify(req.body),
      }
    );

    const data = await shopifyRes.json();
    if (!shopifyRes.ok) {
      return res.status(shopifyRes.status).json({ error: data });
    }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
