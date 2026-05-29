/**
 * Polymerch ← Shopify (live read via the Storefront API)
 * ───────────────────────────────────────────────────────────────────────────
 * This is the bridge that makes the shop reflect edits made in Shopify Admin.
 * On every page load, shop.html and product.html call fetchShopifyProducts()
 * which pulls the live catalog (titles, prices, images, variants, what's
 * published) straight from Shopify and normalizes each product into the SAME
 * shape the site already uses (see js/products.js). So editing a product in
 * Shopify → the change shows up on the next page load. No redeploy needed.
 *
 * The Storefront API token below is PUBLIC and read-only by design — it is
 * safe to ship in client-side JS (that's what Shopify intends it for).
 *
 * HOW TO GET THE TOKEN:
 *   Shopify Admin → Settings → Apps and sales channels → Develop apps →
 *   (your app) → API credentials → "Storefront API access token".
 *   Also make sure, under "Configure Storefront API scopes", that
 *   `unauthenticated_read_product_listings` is enabled, and that the products
 *   are published to this app's sales channel (or the Online Store channel).
 * ───────────────────────────────────────────────────────────────────────────
 */

const SHOPIFY_STORE_DOMAIN     = 'polyshop-7483.myshopify.com';
const SHOPIFY_STOREFRONT_TOKEN = '';          // ← paste public Storefront token here
const SHOPIFY_API_VERSION      = '2024-10';

/**
 * Per-product presentation data that doesn't live in Shopify (size-guide
 * tables, curated display order, special CSS hooks). Keyed by handle.
 */
const PRODUCT_SUPPLEMENTS = {
  'royal-slides': {
    sizeGuide: [
      { us: '6',  eu: '38',    uk: '5.5',  cm: '24' },
      { us: '7',  eu: '39',    uk: '6.5',  cm: '25' },
      { us: '8',  eu: '40–41', uk: '7.5',  cm: '26' },
      { us: '9',  eu: '42',    uk: '8.5',  cm: '27' },
      { us: '10', eu: '43',    uk: '9.5',  cm: '28' },
      { us: '11', eu: '44–45', uk: '10.5', cm: '29' },
      { us: '12', eu: '46',    uk: '11.5', cm: '30' },
      { us: '13', eu: '47',    uk: '12.5', cm: '31' },
    ],
  },
  'tarot-tote': { cardClass: 'card-tarot-tote' },
};

/** Curated display order (matches the original hand-built grid). Handles not
 *  listed here (e.g. products newly added in Shopify) fall to the end. */
const PRODUCT_ORDER = [
  'black-quarter-zip', 'gray-quarter-zip', 'polymarket-hoodie', 'white-track-set',
  'navy-track-set', 'royal-slides', 'human-intelligence-tee', 'corduroy-cap',
  'tarot-hoodie', 'blue-sweat-set', 'white-long-sleeve', 'black-long-sleeve',
  'navy-zip-jacket', 'black-tote', 'newspaper-tote', 'tarot-tote', 'magic-8-ball',
  'cable-knit-socks', 'pm-soccer-jersey-ls', 'pm-soccer-jersey-ss', 'pm-siberia-thermal',
];

const PRODUCTS_QUERY = `
  query Products {
    products(first: 100) {
      edges {
        node {
          handle
          title
          description
          productType
          tags
          availableForSale
          options { name values }
          images(first: 12) { edges { node { url } } }
          variants(first: 100) {
            edges {
              node {
                id
                availableForSale
                price { amount currencyCode }
                image { url }
                selectedOptions { name value }
              }
            }
          }
        }
      }
    }
  }`;

let _shopifyProductsPromise = null;   // in-memory cache for this page load only

/** gid://shopify/ProductVariant/123 → "123" (numeric ID the draft-order API wants). */
function gidToNumericId(gid) {
  return (gid || '').split('/').pop() || null;
}

/** Normalize one Storefront product node into the site's product shape. */
function normalizeShopifyProduct(node) {
  const variants    = node.variants.edges.map(e => e.node);
  const optionNames = node.options.map(o => o.name);
  const hasColor    = optionNames.includes('Color');
  const sizeOption  = node.options.find(o => o.name === 'Size');

  // Sizes + size type
  let sizes, sizeType;
  if (sizeOption) {
    sizes = sizeOption.values;
    sizeType = sizes.every(s => /^\d+(\.\d+)?$/.test(s)) ? 'shoe' : 'apparel';
  } else {
    sizes = ['ONE SIZE'];
    sizeType = 'one-size';
  }

  // Color variants — image comes from the first variant of each colorway.
  let colorVariants = null;
  if (hasColor) {
    const colorOption = node.options.find(o => o.name === 'Color');
    colorVariants = colorOption.values.map(c => {
      const v = variants.find(x =>
        x.selectedOptions.some(o => o.name === 'Color' && o.value === c));
      const img = v && v.image ? v.image.url : undefined;
      return img ? { name: c, image: img } : { name: c };
    });
  }

  // Product images (de-duped, primary first).
  const images = [];
  node.images.edges.forEach(e => { if (!images.includes(e.node.url)) images.push(e.node.url); });

  // Variant lookup table: every variant by color+size, plus a size→id map
  // (size-only products) to preserve the original shopifyVariants[size] shape.
  const variantList = variants.map(v => {
    const colorOpt = v.selectedOptions.find(o => o.name === 'Color');
    const sizeOpt  = v.selectedOptions.find(o => o.name === 'Size');
    return {
      id: gidToNumericId(v.id),
      gid: v.id,
      color: colorOpt ? colorOpt.value : null,
      size: sizeOpt ? sizeOpt.value : 'ONE SIZE',
      available: v.availableForSale,
    };
  });
  const shopifyVariants = {};
  if (!hasColor) variantList.forEach(v => { shopifyVariants[v.size] = v.id; });

  const supp = PRODUCT_SUPPLEMENTS[node.handle] || {};
  const description = node.description || '';
  const price = parseFloat(variants[0] && variants[0].price ? variants[0].price.amount : '0') || 0;

  return {
    id:           node.handle,
    name:         (node.title || '').toUpperCase(),
    material:     description.toUpperCase(),
    sizing:       (description.split('—').pop() || '').trim().toUpperCase(),
    price,
    sizes,
    sizeType,
    images,
    colorVariants,
    shopifyVariants,
    variants:     variantList,
    available:    node.availableForSale,
    sizeGuide:    supp.sizeGuide || null,
    cardClass:    supp.cardClass || '',
  };
}

/** Sort normalized products by the curated order; unknowns go last (stable). */
function sortByCuratedOrder(products) {
  return products.slice().sort((a, b) => {
    const ia = PRODUCT_ORDER.indexOf(a.id), ib = PRODUCT_ORDER.indexOf(b.id);
    return (ia === -1 ? 1e9 : ia) - (ib === -1 ? 1e9 : ib);
  });
}

/**
 * Fetch + normalize the full catalog from Shopify. Falls back to the local
 * window.PRODUCTS (js/products.js) if the token isn't set or the request fails,
 * so the site never goes blank.
 * @returns {Promise<Array>} normalized products
 */
function fetchShopifyProducts() {
  if (_shopifyProductsPromise) return _shopifyProductsPromise;

  // js/products.js declares `const PRODUCTS` — a global lexical binding, NOT a
  // window property — so reference it by bare name (guarded) rather than window.
  const localFallback = () => sortByCuratedOrder(
    (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS)) ? PRODUCTS : []
  );

  if (!SHOPIFY_STOREFRONT_TOKEN) {
    console.info('[Shopify] No Storefront token set — using local catalog (js/products.js).');
    _shopifyProductsPromise = Promise.resolve(localFallback());
    return _shopifyProductsPromise;
  }

  const url = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
  _shopifyProductsPromise = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query: PRODUCTS_QUERY }),
  })
    .then(r => r.json())
    .then(json => {
      if (json.errors || !json.data || !json.data.products) {
        throw new Error(JSON.stringify(json.errors || 'no data'));
      }
      const products = json.data.products.edges.map(e => normalizeShopifyProduct(e.node));
      if (!products.length) throw new Error('Storefront returned 0 products');
      return sortByCuratedOrder(products);
    })
    .catch(err => {
      console.warn('[Shopify] Live fetch failed, falling back to local catalog:', err);
      return localFallback();
    });

  return _shopifyProductsPromise;
}

/** Convenience: a single product by handle (uses the cached catalog fetch). */
function fetchShopifyProductByHandle(handle) {
  return fetchShopifyProducts().then(all => all.find(p => p.id === handle) || null);
}

if (typeof window !== 'undefined') {
  window.fetchShopifyProducts = fetchShopifyProducts;
  window.fetchShopifyProductByHandle = fetchShopifyProductByHandle;
}
