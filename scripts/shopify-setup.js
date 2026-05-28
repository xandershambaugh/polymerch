#!/usr/bin/env node
/**
 * Polymerch → Shopify Product Import Script
 * ──────────────────────────────────────────
 * Creates all products + variants in your Shopify store and prints
 * the variant IDs you need to paste into js/shopify.js.
 *
 * USAGE:
 *   SHOPIFY_STORE_DOMAIN=yourstore.myshopify.com \
 *   SHOPIFY_ADMIN_TOKEN=shpat_xxxx \
 *   node scripts/shopify-setup.js
 *
 * REQUIRED API SCOPES (when creating your Shopify app):
 *   write_products, read_products,
 *   write_inventory, read_inventory,
 *   write_draft_orders, write_orders, read_orders,
 *   write_shipping, read_shipping
 */

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN  = process.env.SHOPIFY_ADMIN_TOKEN;

if (!DOMAIN || !TOKEN) {
  console.error('Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_TOKEN env vars first.');
  process.exit(1);
}

const API_VERSION = '2024-04';
const BASE = `https://${DOMAIN}/admin/api/${API_VERSION}`;
const HEADERS = {
  'Content-Type': 'application/json',
  'X-Shopify-Access-Token': TOKEN,
};

// ── Product catalog (mirrors js/products.js) ──────────────────────────────────

const APPAREL_SIZES  = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const SHOE_SIZES     = ['6', '7', '8', '9', '10', '11', '12', '13'];

const PRODUCTS = [
  {
    id: 'black-quarter-zip',
    title: 'Black Quarter-Zip',
    sku_prefix: 'BQZ',
    vendor: 'Polymarket',
    product_type: 'Sweatshirt',
    tags: 'cotton-fleece, unisex, quarter-zip',
    body_html: '100% Cotton Fleece — Unisex',
    variants: APPAREL_SIZES.map(s => ({ size: s })),
  },
  {
    id: 'gray-quarter-zip',
    title: 'Gray Quarter-Zip',
    sku_prefix: 'GQZ',
    vendor: 'Polymarket',
    product_type: 'Sweatshirt',
    tags: 'cotton-fleece, unisex, quarter-zip',
    body_html: '100% Cotton Fleece — Unisex',
    variants: APPAREL_SIZES.map(s => ({ size: s })),
  },
  {
    id: 'polymarket-hoodie',
    title: 'Polymarket Hoodie',
    sku_prefix: 'PMH',
    vendor: 'Polymarket',
    product_type: 'Hoodie',
    tags: 'cotton-fleece, unisex, hoodie',
    body_html: '100% Cotton Fleece — Unisex',
    colors: ['GRAY', 'NAVY', 'CHARCOAL'],
    variants: ['GRAY', 'NAVY', 'CHARCOAL'].flatMap(c =>
      APPAREL_SIZES.map(s => ({ color: c, size: s }))
    ),
  },
  {
    id: 'white-track-set',
    title: 'White Track Set',
    sku_prefix: 'WTS',
    vendor: 'Polymarket',
    product_type: 'Track Set',
    tags: 'poly-blend, unisex, track-set',
    body_html: 'Poly Blend — Jacket + Pants — Unisex',
    variants: APPAREL_SIZES.map(s => ({ size: s })),
  },
  {
    id: 'navy-track-set',
    title: 'Navy Track Set',
    sku_prefix: 'NTS',
    vendor: 'Polymarket',
    product_type: 'Track Set',
    tags: 'poly-blend, unisex, track-set',
    body_html: 'Poly Blend — Jacket + Pants — Unisex',
    variants: APPAREL_SIZES.map(s => ({ size: s })),
  },
  {
    id: 'royal-slides',
    title: 'Royal Slides',
    sku_prefix: 'RSL',
    vendor: 'Polymarket',
    product_type: 'Footwear',
    tags: 'woad-dyed, unisex, slides',
    body_html: 'Woad-Dyed Cotton — Unisex',
    variants: SHOE_SIZES.map(s => ({ size: s })),
  },
  {
    id: 'human-intelligence-tee',
    title: 'Human Intelligence Tee',
    sku_prefix: 'HIT',
    vendor: 'Polymarket',
    product_type: 'T-Shirt',
    tags: 'cotton, unisex, tee',
    body_html: '100% Cotton — Unisex',
    variants: APPAREL_SIZES.map(s => ({ size: s })),
  },
  {
    id: 'corduroy-cap',
    title: 'Corduroy Cap',
    sku_prefix: 'CRC',
    vendor: 'Polymarket',
    product_type: 'Hat',
    tags: 'corduroy, one-size, cap',
    body_html: 'Corduroy — One Size',
    variants: [
      { color: 'NAVY / GOLD', size: 'ONE SIZE' },
      { color: 'BLACK / GOLD', size: 'ONE SIZE' },
      { color: 'NAVY / WHITE', size: 'ONE SIZE' },
      { color: 'BLACK / WHITE', size: 'ONE SIZE' },
    ],
  },
  {
    id: 'tarot-hoodie',
    title: 'Tarot Hoodie',
    sku_prefix: 'TRH',
    vendor: 'Polymarket',
    product_type: 'Hoodie',
    tags: 'cotton-fleece, unisex, hoodie',
    body_html: '100% Cotton Fleece — Unisex',
    variants: APPAREL_SIZES.map(s => ({ size: s })),
  },
  {
    id: 'blue-sweat-set',
    title: 'Blue Sweat Set',
    sku_prefix: 'BSS',
    vendor: 'Polymarket',
    product_type: 'Sweat Set',
    tags: 'cotton-fleece, unisex, sweat-set',
    body_html: '100% Cotton Fleece — Hoodie + Pants — Unisex',
    variants: APPAREL_SIZES.map(s => ({ size: s })),
  },
  {
    id: 'white-long-sleeve',
    title: 'White Long Sleeve',
    sku_prefix: 'WLS',
    vendor: 'Polymarket',
    product_type: 'Long Sleeve',
    tags: 'cotton, unisex, long-sleeve',
    body_html: '100% Cotton — Unisex',
    variants: APPAREL_SIZES.map(s => ({ size: s })),
  },
  {
    id: 'black-long-sleeve',
    title: 'Black Long Sleeve',
    sku_prefix: 'BLS',
    vendor: 'Polymarket',
    product_type: 'Long Sleeve',
    tags: 'cotton, unisex, long-sleeve',
    body_html: '100% Cotton — Unisex',
    variants: APPAREL_SIZES.map(s => ({ size: s })),
  },
  {
    id: 'navy-zip-jacket',
    title: 'Navy Zip Jacket',
    sku_prefix: 'NZJ',
    vendor: 'Polymarket',
    product_type: 'Jacket',
    tags: 'cotton-twill, unisex, jacket',
    body_html: '100% Cotton Twill — Unisex',
    variants: APPAREL_SIZES.map(s => ({ size: s })),
  },
  {
    id: 'black-tote',
    title: 'Black Tote',
    sku_prefix: 'BTO',
    vendor: 'Polymarket',
    product_type: 'Tote Bag',
    tags: 'canvas, one-size, tote',
    body_html: 'Heavyweight Canvas — One Size',
    variants: [{ size: 'ONE SIZE' }],
  },
  {
    id: 'newspaper-tote',
    title: 'Newspaper Tote',
    sku_prefix: 'NTO',
    vendor: 'Polymarket',
    product_type: 'Tote Bag',
    tags: 'canvas, one-size, tote',
    body_html: 'Heavyweight Canvas — One Size',
    variants: [{ size: 'ONE SIZE' }],
  },
  {
    id: 'tarot-tote',
    title: 'Tarot Tote',
    sku_prefix: 'TTO',
    vendor: 'Polymarket',
    product_type: 'Tote Bag',
    tags: 'canvas, one-size, tote',
    body_html: 'Canvas — One Size',
    variants: [{ size: 'ONE SIZE' }],
  },
  {
    id: 'magic-8-ball',
    title: 'Magic 8-Ball',
    sku_prefix: 'M8B',
    vendor: 'Polymarket',
    product_type: 'Accessory',
    tags: 'abs-plastic, one-size',
    body_html: 'ABS Plastic — One Size',
    variants: [{ size: 'ONE SIZE' }],
  },
  {
    id: 'cable-knit-socks',
    title: 'Cable Knit Socks',
    sku_prefix: 'CKS',
    vendor: 'Polymarket',
    product_type: 'Socks',
    tags: 'cotton-blend, one-size, socks',
    body_html: 'Cotton Blend — One Size',
    variants: [
      { color: 'CREAM', size: 'ONE SIZE' },
      { color: 'NAVY', size: 'ONE SIZE' },
    ],
  },
  {
    id: 'pm-soccer-jersey-ls',
    title: 'PM Soccer Jersey — Long Sleeve',
    sku_prefix: 'JSL',
    vendor: 'Polymarket',
    product_type: 'Jersey',
    tags: 'poly-tricot, unisex, jersey',
    body_html: 'Poly Tricot / Collar / Embroidery / Print / Patch / Rib — Unisex',
    variants: APPAREL_SIZES.map(s => ({ size: s })),
  },
  {
    id: 'pm-soccer-jersey-ss',
    title: 'PM Soccer Jersey — Short Sleeve',
    sku_prefix: 'JSS',
    vendor: 'Polymarket',
    product_type: 'Jersey',
    tags: 'poly-tricot, unisex, jersey',
    body_html: 'Poly Tricot / Collar / Embroidery / Print / Patch / Rib — Unisex',
    variants: APPAREL_SIZES.map(s => ({ size: s })),
  },
  {
    id: 'pm-siberia-thermal',
    title: 'PM Siberia Thermal',
    sku_prefix: 'SBT',
    vendor: 'Polymarket',
    product_type: 'Long Sleeve',
    tags: 'cotton-modal, unisex, thermal',
    body_html: 'Cotton Modal Blend / Baby Blue — Unisex',
    variants: APPAREL_SIZES.map(s => ({ size: s })),
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function shopifyPost(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${JSON.stringify(json.errors)}`);
  return json;
}

async function shopifyGet(path) {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${JSON.stringify(json.errors)}`);
  return json;
}

function buildVariants(product) {
  return product.variants.map((v, i) => {
    const skuParts = [product.sku_prefix, v.color, v.size].filter(Boolean);
    return {
      option1: v.color || v.size,
      option2: v.color ? v.size : undefined,
      sku: skuParts.join('-'),
      price: '0.00',
      compare_at_price: null,
      inventory_management: 'shopify',
      inventory_policy: 'deny',
      fulfillment_service: 'manual',
      weight: 0.5,
      weight_unit: 'lb',
      requires_shipping: true,
      taxable: true,
    };
  });
}

function buildOptions(product) {
  const hasColor  = product.variants.some(v => v.color);
  const hasSize   = product.variants.some(v => v.size);
  const opts = [];
  if (hasColor) opts.push({ name: 'Color' });
  if (hasSize)  opts.push({ name: 'Size' });
  return opts;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🔗  Connecting to ${DOMAIN}…\n`);

  // Check connection
  await shopifyGet('/shop.json');
  console.log('✓  Connected to Shopify\n');

  const variantIdMap = {};   // 'product-id__SIZE' or 'product-id__COLOR__SIZE'
  const results = [];

  for (const product of PRODUCTS) {
    process.stdout.write(`  Creating "${product.title}"… `);

    const payload = {
      product: {
        title:        product.title,
        vendor:       product.vendor,
        product_type: product.product_type,
        tags:         product.tags,
        body_html:    product.body_html,
        status:       'draft',   // won't show on storefront — adjust if needed
        options:      buildOptions(product),
        variants:     buildVariants(product),
      },
    };

    try {
      const { product: created } = await shopifyPost('/products.json', payload);
      console.log(`✓  ID ${created.id}  (${created.variants.length} variants)`);

      created.variants.forEach((v, i) => {
        const src = product.variants[i];
        const key = [product.id, src.color, src.size].filter(Boolean).join('__');
        variantIdMap[key] = v.id;
        results.push({
          product: product.title,
          key,
          variantId: v.id,
          sku: v.sku,
        });
      });

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`✗  ${err.message}`);
    }
  }

  // ── Print the SHOPIFY_VARIANT_IDS block to paste into shopify.js ──────────
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Paste this into js/shopify.js → SHOPIFY_VARIANT_IDS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('const SHOPIFY_VARIANT_IDS = {');
  for (const [key, id] of Object.entries(variantIdMap)) {
    console.log(`  '${key}': ${id},`);
  }
  console.log('};\n');

  // ── Also save to scripts/variant-ids.json for safekeeping ────────────────
  const { writeFileSync } = await import('fs');
  writeFileSync(
    new URL('./variant-ids.json', import.meta.url),
    JSON.stringify(variantIdMap, null, 2)
  );
  console.log('✓  Variant IDs also saved to scripts/variant-ids.json\n');

  console.log(`Total variants created: ${results.length}`);
  console.log('\nNext steps:');
  console.log('  1. Paste SHOPIFY_VARIANT_IDS above into js/shopify.js');
  console.log('  2. Set SHOPIFY_CONNECTED = true in js/shopify.js');
  console.log('  3. Set env vars in Vercel dashboard:');
  console.log(`       SHOPIFY_STORE_DOMAIN = ${DOMAIN}`);
  console.log('       SHOPIFY_ADMIN_TOKEN  = <your token>');
  console.log('  4. Push to GitHub → Vercel auto-deploys\n');
}

run().catch(err => {
  console.error('\n✗  Fatal error:', err.message);
  process.exit(1);
});
