/**
 * Polymerch → Shopify Integration
 * ─────────────────────────────────────────────────────────────────
 * This file wires the checkout form submission to a Shopify Draft
 * Order so that fulfillment happens inside Shopify.
 *
 * HOW TO CONNECT:
 * 1. In your Shopify Admin go to:
 *      Apps → Develop apps → Create an app
 *    Grant the "write_draft_orders" + "write_orders" Admin API scopes.
 *    Copy the Admin API access token.
 *
 * 2. Because the Admin API token must stay secret, you need a thin
 *    proxy. The simplest option is a single Vercel serverless function:
 *
 *    /api/create-draft-order.js  ← receives the POST from this file,
 *                                    forwards to Shopify, returns the
 *                                    draft order number.
 *
 *    A ready-made template is in /api/create-draft-order.js.
 *    Set these environment variables in Vercel:
 *      SHOPIFY_STORE_DOMAIN   = yourstore.myshopify.com
 *      SHOPIFY_ADMIN_TOKEN    = shpat_xxxxxxxxxxxxxxxxxxxx
 *
 * 3. Fill in SHOPIFY_VARIANT_IDS below once you have created products
 *    in Shopify and know the numeric variant IDs.
 *    (Admin → Products → <product> → copy the ID from the URL)
 *
 * 4. Set SHOPIFY_CONNECTED = true when you're ready to go live.
 * ─────────────────────────────────────────────────────────────────
 */

const SHOPIFY_CONNECTED  = true;     // live — orders post to the draft-order proxy
const DRAFT_ORDER_PROXY  = '/api/create-draft-order';   // Vercel function URL

/**
 * Map each products.js product ID + size to a Shopify variant ID.
 * Format:  'product-id__SIZE': numericVariantId
 * Example: 'black-quarter-zip__M': 44123456789012
 *
 * Leave empty — the proxy will skip unknown variants gracefully
 * and flag them as "unlinked" in the draft order note.
 */
const SHOPIFY_VARIANT_IDS = {
  // 'black-quarter-zip__XS': 0,
  // 'black-quarter-zip__S':  0,
  // 'black-quarter-zip__M':  0,
  // ... add all variants here
};

/**
 * Build the Shopify line_items array from the sessionStorage cart.
 * Items without a mapped variant are included as custom line items
 * so the draft order still captures everything.
 */
function buildLineItems(cart) {
  return cart.map(item => {
    // Key must match the import script's format exactly:
    //   product-id__COLOR__SIZE  (color omitted for single-color products)
    const key       = [item.id, item.color, item.size].filter(Boolean).join('__');
    // Prefer the live variant ID carried on the cart item (resolved from the
    // Storefront API on the product page); fall back to the static map.
    const variantId = item.shopifyVariantId || SHOPIFY_VARIANT_IDS[key];
    if (variantId) {
      return {
        variant_id: variantId,
        quantity:   item.qty || 1,
        price:      '0.00',   // complimentary
      };
    }
    // Fallback: custom line item (no inventory deduction)
    return {
      title:    `${item.name}${item.color ? ' / ' + item.color : ''}`,
      quantity: item.qty || 1,
      price:    '0.00',
      sku:      item.id,
      properties: [{ name: 'Size', value: item.size }],
    };
  });
}

/**
 * Called from checkout.html after the form validates successfully.
 * Sends cart + customer data to the proxy, which creates a Shopify
 * Draft Order and returns the order number for the confirmation screen.
 *
 * @param {Object} formData  - validated fields from the checkout form
 * @param {Array}  cart      - current cart from getCart()
 * @returns {Promise<string>} - draft order name e.g. "#D1001"
 */
async function createShopifyDraftOrder(formData, cart) {
  if (!SHOPIFY_CONNECTED) {
    console.info('[Shopify] Integration not yet connected — skipping draft order creation.');
    return null;
  }

  const payload = {
    draft_order: {
      line_items: buildLineItems(cart),
      shipping_address: {
        first_name: (formData.clientName || formData.employeeName || '').split(' ')[0],
        last_name:  (formData.clientName || formData.employeeName || '').split(' ').slice(1).join(' '),
        address1:   formData.address1 || '',
        city:       formData.city  || '',
        province:   formData.state || '',
        zip:        formData.zip   || '',
        country:    'US',
      },
      email: formData.clientEmail || formData.employeeEmail || '',
      note: [
        `Order type: ${formData.type === 'client' ? 'VIP Client Gift' : 'Employee'}`,
        `Employee: ${formData.employeeName} — ${formData.employeeDept}`,
        formData.clientName ? `VIP recipient: ${formData.clientName}` : '',
      ].filter(Boolean).join('\n'),
      tags:         'polymerch,complimentary',
      use_customer_default_address: false,
    },
  };

  try {
    const res = await fetch(DRAFT_ORDER_PROXY, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Proxy returned ${res.status}`);
    const json = await res.json();
    return json.draft_order?.name || null;
  } catch (err) {
    console.error('[Shopify] Draft order creation failed:', err);
    return null;
  }
}
