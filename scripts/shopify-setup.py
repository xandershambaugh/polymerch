#!/usr/bin/env python3
"""
Polymerch → Shopify Product Import (Python version)
Run: python3 scripts/shopify-setup.py
"""
import json, time, urllib.request, urllib.error, os, sys, re

DOMAIN = os.environ.get('SHOPIFY_STORE_DOMAIN')
TOKEN  = os.environ.get('SHOPIFY_ADMIN_TOKEN')
if not DOMAIN or not TOKEN:
    sys.exit(
        'ERROR: set both env vars first, e.g.\n\n'
        '  SHOPIFY_STORE_DOMAIN=yourstore.myshopify.com \\\n'
        '  SHOPIFY_ADMIN_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxx \\\n'
        '  python3 scripts/shopify-setup.py\n'
    )
API_VERSION = '2024-04'
BASE = f'https://{DOMAIN}/admin/api/{API_VERSION}'
HEADERS = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': TOKEN,
}

APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
SHOE_SIZES    = ['6', '7', '8', '9', '10', '11', '12', '13']

PRODUCTS = [
  {'id':'black-quarter-zip',    'title':'Black Quarter-Zip',             'sku_prefix':'BQZ','vendor':'Polymarket','product_type':'Sweatshirt','tags':'cotton-fleece,unisex,quarter-zip','body_html':'100% Cotton Fleece — Unisex',       'variants':[{'size':s} for s in APPAREL_SIZES]},
  {'id':'gray-quarter-zip',     'title':'Gray Quarter-Zip',              'sku_prefix':'GQZ','vendor':'Polymarket','product_type':'Sweatshirt','tags':'cotton-fleece,unisex,quarter-zip','body_html':'100% Cotton Fleece — Unisex',       'variants':[{'size':s} for s in APPAREL_SIZES]},
  {'id':'polymarket-hoodie',    'title':'Polymarket Hoodie',             'sku_prefix':'PMH','vendor':'Polymarket','product_type':'Hoodie',     'tags':'cotton-fleece,unisex,hoodie',     'body_html':'100% Cotton Fleece — Unisex',
   'variants':[{'color':c,'size':s} for c in ['GRAY','NAVY','CHARCOAL'] for s in APPAREL_SIZES]},
  {'id':'white-track-set',      'title':'White Track Set',               'sku_prefix':'WTS','vendor':'Polymarket','product_type':'Track Set',  'tags':'poly-blend,unisex,track-set',     'body_html':'Poly Blend — Jacket + Pants — Unisex','variants':[{'size':s} for s in APPAREL_SIZES]},
  {'id':'navy-track-set',       'title':'Navy Track Set',                'sku_prefix':'NTS','vendor':'Polymarket','product_type':'Track Set',  'tags':'poly-blend,unisex,track-set',     'body_html':'Poly Blend — Jacket + Pants — Unisex','variants':[{'size':s} for s in APPAREL_SIZES]},
  {'id':'royal-slides',         'title':'Royal Slides',                  'sku_prefix':'RSL','vendor':'Polymarket','product_type':'Footwear',   'tags':'woad-dyed,unisex,slides',         'body_html':'Woad-Dyed Cotton — Unisex',        'variants':[{'size':s} for s in SHOE_SIZES]},
  {'id':'human-intelligence-tee','title':'Human Intelligence Tee',       'sku_prefix':'HIT','vendor':'Polymarket','product_type':'T-Shirt',    'tags':'cotton,unisex,tee',               'body_html':'100% Cotton — Unisex',             'variants':[{'size':s} for s in APPAREL_SIZES]},
  {'id':'corduroy-cap',         'title':'Corduroy Cap',                  'sku_prefix':'CRC','vendor':'Polymarket','product_type':'Hat',         'tags':'corduroy,one-size,cap',           'body_html':'Corduroy — One Size',
   'variants':[{'color':'NAVY / GOLD','size':'ONE SIZE'},{'color':'BLACK / GOLD','size':'ONE SIZE'},{'color':'NAVY / WHITE','size':'ONE SIZE'},{'color':'BLACK / WHITE','size':'ONE SIZE'}]},
  {'id':'tarot-hoodie',         'title':'Tarot Hoodie',                  'sku_prefix':'TRH','vendor':'Polymarket','product_type':'Hoodie',     'tags':'cotton-fleece,unisex,hoodie',     'body_html':'100% Cotton Fleece — Unisex',       'variants':[{'size':s} for s in APPAREL_SIZES]},
  {'id':'blue-sweat-set',       'title':'Blue Sweat Set',                'sku_prefix':'BSS','vendor':'Polymarket','product_type':'Sweat Set',  'tags':'cotton-fleece,unisex,sweat-set',  'body_html':'100% Cotton Fleece — Hoodie + Pants','variants':[{'size':s} for s in APPAREL_SIZES]},
  {'id':'white-long-sleeve',    'title':'White Long Sleeve',             'sku_prefix':'WLS','vendor':'Polymarket','product_type':'Long Sleeve','tags':'cotton,unisex,long-sleeve',       'body_html':'100% Cotton — Unisex',             'variants':[{'size':s} for s in APPAREL_SIZES]},
  {'id':'black-long-sleeve',    'title':'Black Long Sleeve',             'sku_prefix':'BLS','vendor':'Polymarket','product_type':'Long Sleeve','tags':'cotton,unisex,long-sleeve',       'body_html':'100% Cotton — Unisex',             'variants':[{'size':s} for s in APPAREL_SIZES]},
  {'id':'navy-zip-jacket',      'title':'Navy Zip Jacket',               'sku_prefix':'NZJ','vendor':'Polymarket','product_type':'Jacket',     'tags':'cotton-twill,unisex,jacket',      'body_html':'100% Cotton Twill — Unisex',       'variants':[{'size':s} for s in APPAREL_SIZES]},
  {'id':'black-tote',           'title':'Black Tote',                    'sku_prefix':'BTO','vendor':'Polymarket','product_type':'Tote Bag',   'tags':'canvas,one-size,tote',            'body_html':'Heavyweight Canvas — One Size',    'variants':[{'size':'ONE SIZE'}]},
  {'id':'newspaper-tote',       'title':'Newspaper Tote',                'sku_prefix':'NTO','vendor':'Polymarket','product_type':'Tote Bag',   'tags':'canvas,one-size,tote',            'body_html':'Heavyweight Canvas — One Size',    'variants':[{'size':'ONE SIZE'}]},
  {'id':'tarot-tote',           'title':'Tarot Tote',                    'sku_prefix':'TTO','vendor':'Polymarket','product_type':'Tote Bag',   'tags':'canvas,one-size,tote',            'body_html':'Canvas — One Size',                'variants':[{'size':'ONE SIZE'}]},
  {'id':'magic-8-ball',         'title':'Magic 8-Ball',                  'sku_prefix':'M8B','vendor':'Polymarket','product_type':'Accessory',  'tags':'abs-plastic,one-size',            'body_html':'ABS Plastic — One Size',           'variants':[{'size':'ONE SIZE'}]},
  {'id':'cable-knit-socks',     'title':'Cable Knit Socks',              'sku_prefix':'CKS','vendor':'Polymarket','product_type':'Socks',       'tags':'cotton-blend,one-size,socks',     'body_html':'Cotton Blend — One Size',
   'variants':[{'color':'CREAM','size':'ONE SIZE'},{'color':'NAVY','size':'ONE SIZE'}]},
  {'id':'pm-soccer-jersey-ls',  'title':'PM Soccer Jersey — Long Sleeve','sku_prefix':'JSL','vendor':'Polymarket','product_type':'Jersey',     'tags':'poly-tricot,unisex,jersey',       'body_html':'Poly Tricot — Unisex',             'variants':[{'size':s} for s in APPAREL_SIZES]},
  {'id':'pm-soccer-jersey-ss',  'title':'PM Soccer Jersey — Short Sleeve','sku_prefix':'JSS','vendor':'Polymarket','product_type':'Jersey',    'tags':'poly-tricot,unisex,jersey',       'body_html':'Poly Tricot — Unisex',             'variants':[{'size':s} for s in APPAREL_SIZES]},
  {'id':'pm-siberia-thermal',   'title':'PM Siberia Thermal',            'sku_prefix':'SBT','vendor':'Polymarket','product_type':'Long Sleeve','tags':'cotton-modal,unisex,thermal',     'body_html':'Cotton Modal Blend / Baby Blue — Unisex','variants':[{'size':s} for s in APPAREL_SIZES]},
]

def shopify_request(method, path, body=None):
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        raise Exception(f'{path} → {e.code}: {err}')

def build_options(product):
    has_color = any('color' in v for v in product['variants'])
    has_size  = any('size'  in v for v in product['variants'])
    opts = []
    if has_color: opts.append({'name': 'Color'})
    if has_size:  opts.append({'name': 'Size'})
    return opts

def build_variants(product):
    result = []
    for v in product['variants']:
        sku_parts = [x for x in [product['sku_prefix'], v.get('color'), v.get('size')] if x]
        variant = {
            'option1': v.get('color') or v.get('size'),
            'sku': '-'.join(sku_parts),
            'price': '0.00',
            'inventory_management': 'shopify',
            'inventory_policy': 'deny',
            'fulfillment_service': 'manual',
            'weight': 0.5,
            'weight_unit': 'lb',
            'requires_shipping': True,
            'taxable': True,
        }
        if v.get('color') and v.get('size'):
            variant['option2'] = v['size']
        result.append(variant)
    return result

def run():
    print(f'\nConnecting to {DOMAIN}...\n')
    shopify_request('GET', '/shop.json')
    print('Connected to Shopify\n')

    variant_id_map = {}

    for product in PRODUCTS:
        print(f'  Creating "{product["title"]}"... ', end='', flush=True)
        payload = {
            'product': {
                'title':        product['title'],
                'vendor':       product['vendor'],
                'product_type': product['product_type'],
                'tags':         product['tags'],
                'body_html':    product['body_html'],
                'status':       'draft',
                'options':      build_options(product),
                'variants':     build_variants(product),
            }
        }
        try:
            result = shopify_request('POST', '/products.json', payload)
            created = result['product']
            print(f'✓  ID {created["id"]}  ({len(created["variants"])} variants)')

            for i, v in enumerate(created['variants']):
                src = product['variants'][i]
                key_parts = [product['id']] + [x for x in [src.get('color'), src.get('size')] if x]
                key = '__'.join(key_parts)
                variant_id_map[key] = v['id']

            time.sleep(0.35)  # avoid rate limiting
        except Exception as e:
            print(f'FAILED: {e}')

    # Print the JS block
    print('\n\n' + '='*60)
    print('  Paste into js/shopify.js → SHOPIFY_VARIANT_IDS:')
    print('='*60 + '\n')
    print('const SHOPIFY_VARIANT_IDS = {')
    for key, vid in variant_id_map.items():
        print(f"  '{key}': {vid},")
    print('};\n')

    # Save to JSON
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root  = os.path.dirname(script_dir)
    out_path = os.path.join(script_dir, 'variant-ids.json')
    with open(out_path, 'w') as f:
        json.dump(variant_id_map, f, indent=2)
    print(f'Variant IDs saved to scripts/variant-ids.json\n')
    print(f'Total variants created: {len(variant_id_map)}')

    # ── Auto-wire js/shopify.js: inject variant IDs + flip the live flag ──────
    wire_shopify_js(os.path.join(repo_root, 'js', 'shopify.js'), variant_id_map)


def wire_shopify_js(path, variant_id_map):
    """Replace the SHOPIFY_VARIANT_IDS block and set SHOPIFY_CONNECTED = true."""
    if not os.path.exists(path):
        print(f'\n(skipped auto-wire — {path} not found)')
        return
    with open(path) as f:
        src = f.read()

    block = 'const SHOPIFY_VARIANT_IDS = {\n'
    for key, vid in variant_id_map.items():
        block += f"  '{key}': {vid},\n"
    block += '};'

    # Replace the existing `const SHOPIFY_VARIANT_IDS = { ... };` block.
    src, n = re.subn(
        r'const SHOPIFY_VARIANT_IDS = \{.*?\};',
        lambda _m: block, src, count=1, flags=re.DOTALL)
    if n == 0:
        print('\n(could not find SHOPIFY_VARIANT_IDS block to replace — paste manually)')
        return

    # Flip the live switch.
    src = re.sub(r'const SHOPIFY_CONNECTED\s*=\s*false',
                 'const SHOPIFY_CONNECTED  = true', src, count=1)

    with open(path, 'w') as f:
        f.write(src)
    print('\n✓ Wired js/shopify.js — variant IDs injected and SHOPIFY_CONNECTED = true')
    print('  Next: set SHOPIFY_STORE_DOMAIN + SHOPIFY_ADMIN_TOKEN in Vercel, then commit & push.')


run()
