/**
 * Polymerch Cart
 * Manages a client-side cart stored in sessionStorage.
 * When Shopify is connected, replace proceedToCheckout()
 * with a Shopify Storefront API cart + checkout URL call.
 */

const CART_KEY = 'pm_cart';

function getCart() {
  try { return JSON.parse(sessionStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCart();
  updateCartBadge();
}

function addToCart(item) {
  // item = { id, name, price, size, image }
  const cart = getCart();
  const existing = cart.find(c => c.id === item.id && c.size === item.size);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  saveCart(cart);
  openCart();
}

function removeFromCart(id, size) {
  const cart = getCart().filter(c => !(c.id === id && c.size === size));
  saveCart(cart);
}

function updateCartBadge() {
  const cart = getCart();
  const count = cart.reduce((sum, c) => sum + (c.qty || 1), 0);
  document.querySelectorAll('#cartCount').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

function renderCart() {
  const cart = getCart();
  const itemsEl = document.getElementById('cartItems');
  const emptyEl = document.getElementById('cartEmpty');
  const footerEl = document.getElementById('cartFooter');
  const subtotalEl = document.getElementById('cartSubtotal');

  if (!itemsEl) return;

  // Clear existing items (keep the empty message node)
  Array.from(itemsEl.querySelectorAll('.cart-item')).forEach(el => el.remove());

  if (cart.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
    if (footerEl) footerEl.style.display = 'none';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  if (footerEl) footerEl.style.display = 'block';

  let total = 0;

  cart.forEach(item => {
    const price = parseFloat(String(item.price).replace(/[^0-9.]/g, ''));
    const lineTotal = price * (item.qty || 1);
    total += lineTotal;

    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      ${item.image
        ? `<img class="cart-item-img" src="${item.image}" alt="${item.name}">`
        : `<div class="cart-item-img" style="background:#f2f2f2;"></div>`}
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-size">SIZE: ${item.size}${item.qty > 1 ? ` &times; ${item.qty}` : ''}</div>
        <div class="cart-item-price">$${lineTotal.toFixed(0)}</div>
      </div>
      <button class="cart-remove-btn" aria-label="Remove">✕</button>
    `;
    div.querySelector('.cart-remove-btn').addEventListener('click', () => {
      removeFromCart(item.id, item.size);
    });
    itemsEl.appendChild(div);
  });

  if (subtotalEl) subtotalEl.textContent = `$${total.toFixed(0)}`;
}

function openCart() {
  document.getElementById('cartDrawer')?.classList.add('open');
  document.getElementById('cartOverlay')?.classList.add('open');
}

function closeCart() {
  document.getElementById('cartDrawer')?.classList.remove('open');
  document.getElementById('cartOverlay')?.classList.remove('open');
}

/**
 * Shopify checkout integration.
 * Replace this with your Storefront API cart→checkout flow.
 * See: https://shopify.dev/docs/api/storefront
 *
 * Minimal example (after Shopify setup):
 *   const { checkoutUrl } = await shopifyCheckoutCreate(lineItems);
 *   window.location.href = checkoutUrl;
 */
function proceedToCheckout() {
  const cart = getCart();
  if (cart.length === 0) return;

  // TODO: Replace with Shopify Storefront API call
  // For now, builds a simple Shopify cart URL using variant IDs
  // Format: /cart/VARIANT_ID:QTY,VARIANT_ID:QTY
  const lineItems = cart.map(item => `${item.shopifyVariantId || '0'}:${item.qty || 1}`).join(',');
  const shopifyStore = 'YOUR-STORE.myshopify.com'; // ← replace with your store

  // Uncomment once Shopify is connected:
  // window.location.href = `https://${shopifyStore}/cart/${lineItems}`;

  alert(`Checkout coming soon!\n\nYour cart:\n${cart.map(i => `• ${i.name} (${i.size}) ×${i.qty}`).join('\n')}`);
}

// Wire up cart toggle buttons
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cartToggle')?.addEventListener('click', openCart);
  document.getElementById('cartClose')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
  renderCart();
  updateCartBadge();
});
