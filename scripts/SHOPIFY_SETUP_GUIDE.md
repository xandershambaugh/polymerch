# Shopify Integration — Go-Live Checklist

Everything is pre-built. Follow these steps in order.

---

## Step 1 — Create Shopify Store (~5 min)
1. Go to https://shopify.com → Start free trial
2. Store name: `Polymarket Merch` (internal only — customers never see it)
3. Skip all onboarding prompts

---

## Step 2 — Create a Custom App + Get API Token (~10 min)
1. In Shopify Admin → **Settings → Apps and sales channels → Develop apps**
2. Click **Create an app** → name it `Polymerch Integration`
3. Click **Configure Admin API scopes** and enable:
   - `write_products` / `read_products`
   - `write_inventory` / `read_inventory`
   - `write_draft_orders` / `read_draft_orders`
   - `write_orders` / `read_orders`
   - `write_shipping` / `read_shipping`
   - `read_locations`
4. Click **Save** → then **Install app**
5. Copy the **Admin API access token** (shown once — save it somewhere safe)

---

## Step 3 — Configure Tax & Shipping in Shopify (~10 min)
1. **Settings → Taxes and duties** → set your tax regions
2. **Settings → Shipping and delivery** → add shipping zones (or use Shopify Shipping for label printing)
3. **Settings → Locations** → add your warehouse/fulfillment address

---

## Step 4 — Run the Product Import Script (~5 min)
This creates all 21 products with every size/color variant in one shot.

```bash
cd /path/to/polymerch

SHOPIFY_STORE_DOMAIN=yourstore.myshopify.com \
SHOPIFY_ADMIN_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxx \
node scripts/shopify-setup.js
```

The script will print a `SHOPIFY_VARIANT_IDS` block and save it to
`scripts/variant-ids.json`.

---

## Step 5 — Paste Variant IDs (~2 min)
Copy the `SHOPIFY_VARIANT_IDS = { ... }` block printed by the script
and replace the existing one in `js/shopify.js`.

Then flip the switch:
```js
const SHOPIFY_CONNECTED = true;   // ← change false → true
```

---

## Step 6 — Set Vercel Environment Variables (~3 min)
1. Go to https://vercel.com → your `polymerch` project → **Settings → Environment Variables**
2. Add:
   | Name | Value |
   |---|---|
   | `SHOPIFY_STORE_DOMAIN` | `yourstore.myshopify.com` |
   | `SHOPIFY_ADMIN_TOKEN` | `shpat_xxxxxxxxxxxxxxxxxxxx` |
3. Click **Save** → trigger a redeploy (or push any commit)

---

## Step 7 — Push & Test (~10 min)
1. Commit `js/shopify.js` with variant IDs + `SHOPIFY_CONNECTED = true`
2. Push via GitHub Desktop → Vercel auto-deploys
3. Place a test order on https://polymerch.vercel.app
4. Confirm the order appears in Shopify Admin → **Orders**
5. Print a test shipping label from the order page

---

## What Shopify Handles Automatically Once Live
- ✅ Inventory tracking — decrements per variant on every order
- ✅ SKU management — every variant has a generated SKU (e.g. `PMH-NAVY-M`)
- ✅ Order fulfillment queue — all orders appear in Orders tab
- ✅ Shipping labels — print USPS/UPS/FedEx labels directly from order
- ✅ Tax calculation — automatic based on shipping address
- ✅ Email notifications — order confirmation sent to recipient automatically

---

## Inventory Management Going Forward
- Set stock counts per variant: **Products → [product] → Inventory**
- Bulk import inventory CSV: **Products → Import**
- Low-stock alerts: **Settings → Notifications → Low inventory**
