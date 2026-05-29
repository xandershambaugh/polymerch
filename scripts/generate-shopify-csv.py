#!/usr/bin/env python3
"""
Polymerch -> Shopify CSV generator
==================================
Emits scripts/shopify-products.csv in Shopify's official product-import
format. Upload it via Shopify Admin -> Products -> Import ->
"Upload a Shopify-formatted CSV file".

Images are referenced by their LIVE public URLs on the Vercel site, so
Shopify fetches every image automatically during import. No API token
needed.

Run:  python3 scripts/generate-shopify-csv.py
"""
import csv
import os
import re
import urllib.parse

# Live, publicly-served image host (Shopify pulls images from here on import).
IMG_BASE = "https://polymerch.vercel.app/assets/images/"

APPAREL = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]
SHOE = ["6", "7", "8", "9", "10", "11", "12", "13"]

# Default starting inventory per variant. Change in Shopify any time, or set
# TRACK_INVENTORY = False below to make items always-available (no tracking).
DEFAULT_QTY = 100
TRACK_INVENTORY = True

# Merged catalog: site data (products.js) + Shopify metadata (shopify-setup.py).
# images[0] is the primary/thumbnail. For color products, `colors` maps a
# color name to its specific image (becomes that variant's image in Shopify).
PRODUCTS = [
    {"handle": "black-quarter-zip", "title": "Black Quarter-Zip", "sku": "BQZ",
     "type": "Sweatshirt", "tags": "cotton-fleece,unisex,quarter-zip",
     "body": "100% Cotton Fleece — Unisex", "price": 129,
     "sizes": APPAREL, "images": ["Group 40923.jpg", "Group 40922.jpg"]},
    {"handle": "gray-quarter-zip", "title": "Gray Quarter-Zip", "sku": "GQZ",
     "type": "Sweatshirt", "tags": "cotton-fleece,unisex,quarter-zip",
     "body": "100% Cotton Fleece — Unisex", "price": 129,
     "sizes": APPAREL, "images": ["Group 40924.jpg", "Group 40925.jpg"]},
    {"handle": "polymarket-hoodie", "title": "Polymarket Hoodie", "sku": "PMH",
     "type": "Hoodie", "tags": "cotton-fleece,unisex,hoodie",
     "body": "100% Cotton Fleece — Unisex", "price": 149, "sizes": APPAREL,
     "colors": {"GRAY": "Group 40921.jpg", "NAVY": "Group 40949.jpg",
                "CHARCOAL": "Group 40951.jpg"},
     "images": ["Group 40921.jpg", "Group 40949.jpg", "Group 40951.jpg"]},
    {"handle": "white-track-set", "title": "White Track Set", "sku": "WTS",
     "type": "Track Set", "tags": "poly-blend,unisex,track-set",
     "body": "Poly Blend — Jacket + Pants — Unisex", "price": 298,
     "sizes": APPAREL, "images": ["Group 40926.jpg", "Group 40927.jpg"]},
    {"handle": "navy-track-set", "title": "Navy Track Set", "sku": "NTS",
     "type": "Track Set", "tags": "poly-blend,unisex,track-set",
     "body": "Poly Blend — Jacket + Pants — Unisex", "price": 298,
     "sizes": APPAREL, "images": ["Group 40928.jpg", "Group 40929.jpg"]},
    {"handle": "royal-slides", "title": "Royal Slides", "sku": "RSL",
     "type": "Footwear", "tags": "woad-dyed,unisex,slides",
     "body": "Woad-Dyed Cotton — Unisex", "price": 129,
     "sizes": SHOE, "images": ["Group 40930.jpg"]},
    {"handle": "human-intelligence-tee", "title": "Human Intelligence Tee",
     "sku": "HIT", "type": "T-Shirt", "tags": "cotton,unisex,tee",
     "body": "100% Cotton — Unisex", "price": 69,
     "sizes": APPAREL, "images": ["Group 40932.jpg"]},
    {"handle": "corduroy-cap", "title": "Corduroy Cap", "sku": "CRC",
     "type": "Hat", "tags": "corduroy,one-size,cap",
     "body": "Corduroy — One Size", "price": 49,
     "colors_only": ["NAVY / GOLD", "BLACK / GOLD", "NAVY / WHITE", "BLACK / WHITE"],
     "images": ["Group 40933.jpg"]},
    {"handle": "tarot-hoodie", "title": "Tarot Hoodie", "sku": "TRH",
     "type": "Hoodie", "tags": "cotton-fleece,unisex,hoodie",
     "body": "100% Cotton Fleece — Unisex", "price": 159,
     "sizes": APPAREL, "images": ["Group 40934.jpg", "Group 40935.jpg"]},
    {"handle": "blue-sweat-set", "title": "Blue Sweat Set", "sku": "BSS",
     "type": "Sweat Set", "tags": "cotton-fleece,unisex,sweat-set",
     "body": "100% Cotton Fleece — Hoodie + Pants", "price": 258,
     "sizes": APPAREL, "images": ["Group 40937.jpg", "Group 40936.jpg"]},
    {"handle": "white-long-sleeve", "title": "White Long Sleeve", "sku": "WLS",
     "type": "Long Sleeve", "tags": "cotton,unisex,long-sleeve",
     "body": "100% Cotton — Unisex", "price": 89,
     "sizes": APPAREL, "images": ["Group 40938.jpg", "Group 40939.jpg"]},
    {"handle": "black-long-sleeve", "title": "Black Long Sleeve", "sku": "BLS",
     "type": "Long Sleeve", "tags": "cotton,unisex,long-sleeve",
     "body": "100% Cotton — Unisex", "price": 89,
     "sizes": APPAREL, "images": ["Group 40940.jpg", "Group 40941.jpg"]},
    {"handle": "navy-zip-jacket", "title": "Navy Zip Jacket", "sku": "NZJ",
     "type": "Jacket", "tags": "cotton-twill,unisex,jacket",
     "body": "100% Cotton Twill — Unisex", "price": 249,
     "sizes": APPAREL, "images": ["Group 40942.jpg"]},
    {"handle": "black-tote", "title": "Black Tote", "sku": "BTO",
     "type": "Tote Bag", "tags": "canvas,one-size,tote",
     "body": "Heavyweight Canvas — One Size", "price": 69,
     "images": ["Group 40950.jpg"]},
    {"handle": "newspaper-tote", "title": "Newspaper Tote", "sku": "NTO",
     "type": "Tote Bag", "tags": "canvas,one-size,tote",
     "body": "Heavyweight Canvas — One Size", "price": 79,
     "images": ["Group 40943.jpg"]},
    {"handle": "tarot-tote", "title": "Tarot Tote", "sku": "TTO",
     "type": "Tote Bag", "tags": "canvas,one-size,tote",
     "body": "Canvas — One Size", "price": 89,
     "images": ["Group 40945.jpg"]},
    {"handle": "magic-8-ball", "title": "Magic 8-Ball", "sku": "M8B",
     "type": "Accessory", "tags": "abs-plastic,one-size",
     "body": "ABS Plastic — One Size", "price": 39,
     "images": ["Group 40946.jpg"]},
    {"handle": "cable-knit-socks", "title": "Cable Knit Socks", "sku": "CKS",
     "type": "Socks", "tags": "cotton-blend,one-size,socks",
     "body": "Cotton Blend — One Size", "price": 29,
     "colors_only": ["CREAM", "NAVY"], "images": ["Group 40948.jpg"]},
    {"handle": "pm-soccer-jersey-ls", "title": "PM Soccer Jersey — Long Sleeve",
     "sku": "JSL", "type": "Jersey", "tags": "poly-tricot,unisex,jersey",
     "body": "Poly Tricot — Unisex", "price": 189,
     "sizes": APPAREL, "images": ["Group 40993.jpg"]},
    {"handle": "pm-soccer-jersey-ss", "title": "PM Soccer Jersey — Short Sleeve",
     "sku": "JSS", "type": "Jersey", "tags": "poly-tricot,unisex,jersey",
     "body": "Poly Tricot — Unisex", "price": 169,
     "sizes": APPAREL, "images": ["Group 40994.png"]},
    {"handle": "pm-siberia-thermal", "title": "PM Siberia Thermal", "sku": "SBT",
     "type": "Long Sleeve", "tags": "cotton-modal,unisex,thermal",
     "body": "Cotton Modal Blend / Baby Blue — Unisex", "price": 109,
     "sizes": APPAREL, "images": ["image-1779834199871.webp"]},
]

# Shopify product-import column order (2024+ template).
COLUMNS = [
    "Handle", "Title", "Body (HTML)", "Vendor", "Product Category", "Type",
    "Tags", "Published", "Option1 Name", "Option1 Value", "Option2 Name",
    "Option2 Value", "Option3 Name", "Option3 Value", "Variant SKU",
    "Variant Grams", "Variant Inventory Tracker", "Variant Inventory Qty",
    "Variant Inventory Policy", "Variant Fulfillment Service", "Variant Price",
    "Variant Requires Shipping", "Variant Taxable", "Image Src",
    "Image Position", "Image Alt Text", "Variant Image", "Variant Weight Unit",
    "Status",
]


def img_url(filename):
    return IMG_BASE + urllib.parse.quote(filename)


def sku_part(value):
    """Clean an option value into a SKU-safe token: 'NAVY / GOLD' -> 'NAVY-GOLD'."""
    return re.sub(r"-+", "-", re.sub(r"[^A-Za-z0-9]+", "-", value)).strip("-").upper()


def blank_row():
    return {c: "" for c in COLUMNS}


def variant_defaults(row, sku, price, variant_img=""):
    row["Variant SKU"] = sku
    row["Variant Grams"] = "227"
    row["Variant Inventory Tracker"] = "shopify" if TRACK_INVENTORY else ""
    row["Variant Inventory Qty"] = str(DEFAULT_QTY) if TRACK_INVENTORY else ""
    row["Variant Inventory Policy"] = "deny"
    row["Variant Fulfillment Service"] = "manual"
    row["Variant Price"] = f"{price:.2f}"
    row["Variant Requires Shipping"] = "TRUE"
    row["Variant Taxable"] = "TRUE"
    row["Variant Weight Unit"] = "lb"
    row["Variant Image"] = variant_img


def build_variant_rows(p):
    """Return (option_names, list of (option_values, sku_suffix, variant_image))."""
    if "colors" in p:  # color (with per-color image) x size
        rows = []
        for color, cimg in p["colors"].items():
            for size in p["sizes"]:
                rows.append(([color, size], f"{sku_part(color)}-{sku_part(size)}", img_url(cimg)))
        return (["Color", "Size"], rows)
    if "colors_only" in p:  # color only, single image
        rows = [([c], sku_part(c), "") for c in p["colors_only"]]
        return (["Color"], rows)
    if "sizes" in p:  # size only
        rows = [([s], sku_part(s), "") for s in p["sizes"]]
        return (["Size"], rows)
    # single one-size variant
    return ([], [(["ONE SIZE"], "OS", "")])


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(script_dir, "shopify-products.csv")

    total_products = total_variants = total_images = 0
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()

        for p in PRODUCTS:
            total_products += 1
            opt_names, variants = build_variant_rows(p)
            images = p["images"]

            for vi, (opt_values, sku_suffix, variant_img) in enumerate(variants):
                total_variants += 1
                row = blank_row()
                row["Handle"] = p["handle"]
                # Product-level fields appear only on the first row.
                if vi == 0:
                    row["Title"] = p["title"]
                    row["Body (HTML)"] = p["body"]
                    row["Vendor"] = "Polymarket"
                    row["Type"] = p["type"]
                    row["Tags"] = p["tags"]
                    row["Published"] = "TRUE"
                    row["Status"] = "active"
                    # First image rides on the first variant row.
                    row["Image Src"] = img_url(images[0])
                    row["Image Position"] = "1"
                    row["Image Alt Text"] = p["title"]
                    total_images += 1
                # Options
                for oi, oname in enumerate(opt_names, start=1):
                    row[f"Option{oi} Name"] = oname
                    row[f"Option{oi} Value"] = opt_values[oi - 1]
                if not opt_names:  # one-size: still needs an option
                    row["Option1 Name"] = "Title"
                    row["Option1 Value"] = "Default Title"
                variant_defaults(row, f"{p['sku']}-{sku_suffix}", p["price"], variant_img)
                writer.writerow(row)

            # Remaining product images go on their own image-only rows.
            for pos, img in enumerate(images[1:], start=2):
                total_images += 1
                row = blank_row()
                row["Handle"] = p["handle"]
                row["Image Src"] = img_url(img)
                row["Image Position"] = str(pos)
                row["Image Alt Text"] = p["title"]
                writer.writerow(row)

    print(f"Wrote {out_path}")
    print(f"  {total_products} products, {total_variants} variants, {total_images} images")


if __name__ == "__main__":
    main()
