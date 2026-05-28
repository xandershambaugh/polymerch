/**
 * Vercel Serverless Function — Shopify Draft Order Proxy
 * ──────────────────────────────────────────────────────
 * Keeps the Shopify Admin API token out of the browser.
 *
 * Required environment variables (set in Vercel dashboard):
 *   SHOPIFY_STORE_DOMAIN   e.g. "polymarket.myshopify.com"
 *   SHOPIFY_ADMIN_TOKEN    e.g. "shpat_xxxxxxxxxxxxxxxxxxxx"
 */

const API_VERSION = '2024-04';

export default async function handler(req, res) {
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_TOKEN } = process.env;
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_TOKEN) {
    return res.status(500).json({ error: 'Shopify env vars not configured' });
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
  };
  const base = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}`;

  try {
    // ── 1. Create the draft order ────────────────────────────────────────────
    const shopifyRes = await fetch(`${base}/draft_orders.json`, {
      method:  'POST',
      headers,
      body: JSON.stringify(req.body),
    });

    const data = await shopifyRes.json();
    if (!shopifyRes.ok) {
      return res.status(shopifyRes.status).json({ error: data });
    }

    const draftOrder = data.draft_order;

    // ── 2. Complete the draft order → creates a real Order ──────────────────
    // For complimentary orders, complete immediately so they enter fulfillment.
    const completeRes = await fetch(
      `${base}/draft_orders/${draftOrder.id}/complete.json?payment_pending=false`,
      { method: 'PUT', headers }
    );
    const completeData = await completeRes.json();
    const order = completeData.draft_order; // now has status: completed + order_id

    return res.status(200).json({
      draft_order: draftOrder,
      order_id:    order?.order_id || null,
      order_name:  draftOrder.name,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
