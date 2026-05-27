/**
 * Polymerch Cart
 * - Prices are tracked internally for the $1,000 order-value cap.
 * - All price displays show "Complimentary" to the user.
 * - On form submission, createShopifyDraftOrder() fires to create a
 *   $0-charged draft order in Shopify. Configure SHOPIFY_* constants
 *   in js/shopify.js before going live.
 */

const CART_KEY    = 'pm_cart';
const ORDER_LIMIT = 1000;   // internal cap — no single order may exceed this value

// ── Cart state helpers ─────────────────────────────────────────────

function getCart() {
  try { return JSON.parse(sessionStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCart();
  updateCartBadge();
}

/** Returns the internal dollar total of the current cart (never shown to user). */
function cartTotal(cart) {
  cart = cart || getCart();
  return cart.reduce((sum, item) => {
    const p = parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0;
    return sum + p * (item.qty || 1);
  }, 0);
}

// ── Add / remove ───────────────────────────────────────────────────

function addToCart(item) {
  const cart  = getCart();
  const price = parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0;
  const existing = cart.find(c =>
    c.id === item.id && c.size === item.size && (c.color || '') === (item.color || '')
  );

  // Calculate what the new total would be after adding
  const addedPrice  = existing ? price : price;   // same unit price either way
  const newTotal    = cartTotal(cart) + addedPrice;

  if (newTotal > ORDER_LIMIT) {
    openCart();
    // Render so the warning becomes visible
    saveCart(cart);
    showCartLimitWarning();
    return;
  }

  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  saveCart(cart);
  openCart();
}

function removeFromCart(id, size, color) {
  const cart = getCart().filter(c =>
    !(c.id === id && c.size === size && (c.color || '') === (color || ''))
  );
  saveCart(cart);
}

// ── Badge ──────────────────────────────────────────────────────────

function updateCartBadge() {
  const cart  = getCart();
  const count = cart.reduce((sum, c) => sum + (c.qty || 1), 0);
  document.querySelectorAll('#cartCount').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

// ── Limit warning ──────────────────────────────────────────────────

function showCartLimitWarning() {
  const el = document.getElementById('cartLimitWarning');
  if (el) el.style.display = 'block';
}

function hideCartLimitWarning() {
  const el = document.getElementById('cartLimitWarning');
  if (el) el.style.display = 'none';
}

// ── Render cart drawer ─────────────────────────────────────────────

function renderCart() {
  const cart      = getCart();
  const itemsEl   = document.getElementById('cartItems');
  const emptyEl   = document.getElementById('cartEmpty');
  const footerEl  = document.getElementById('cartFooter');
  const subtotalEl = document.getElementById('cartSubtotal');

  if (!itemsEl) return;

  Array.from(itemsEl.querySelectorAll('.cart-item')).forEach(el => el.remove());

  if (cart.length === 0) {
    if (emptyEl)   emptyEl.style.display   = 'block';
    if (footerEl)  footerEl.style.display  = 'none';
    hideCartLimitWarning();
    return;
  }

  if (emptyEl)  emptyEl.style.display  = 'none';
  if (footerEl) footerEl.style.display = 'block';

  cart.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      ${item.image
        ? `<img class="cart-item-img" src="${item.image}" alt="${item.name}">`
        : `<div class="cart-item-img" style="background:#f2f2f2;"></div>`}
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        ${item.color ? `<div class="cart-item-meta">COLOR: ${item.color}</div>` : ''}
        <div class="cart-item-meta">SIZE: ${item.size}${item.qty > 1 ? ` &times; ${item.qty}` : ''}</div>
        <div class="cart-item-price">Complimentary</div>
      </div>
      <button class="cart-remove-btn" aria-label="Remove">✕</button>
    `;
    div.querySelector('.cart-remove-btn').addEventListener('click', () => {
      removeFromCart(item.id, item.size, item.color);
    });
    itemsEl.appendChild(div);
  });

  // Show "Complimentary" as subtotal — internal total used only for cap
  if (subtotalEl) subtotalEl.textContent = 'Complimentary';

  // Re-evaluate limit warning after every render
  if (cartTotal(cart) >= ORDER_LIMIT) {
    showCartLimitWarning();
  } else {
    hideCartLimitWarning();
  }
}

// ── Open / close ───────────────────────────────────────────────────

function openCart() {
  document.getElementById('cartDrawer')?.classList.add('open');
  document.getElementById('cartOverlay')?.classList.add('open');
}

function closeCart() {
  document.getElementById('cartDrawer')?.classList.remove('open');
  document.getElementById('cartOverlay')?.classList.remove('open');
}

// ── Cart intake form ───────────────────────────────────────────────

function showCartForm(type) {
  const btnRow = document.getElementById('cartBtnRow');
  const panel  = document.getElementById('cartIntakePanel');
  if (!btnRow || !panel) return;
  btnRow.style.display = 'none';

  const clientFields = `
    <div class="ci-field"><label>Employee Name</label><input type="text" name="employeeName" placeholder="Full name" required></div>
    <div class="ci-field"><label>Employee Department</label><input type="text" name="employeeDept" placeholder="e.g. Marketing, Partnerships" required></div>
    <div class="ci-field"><label>VIP Client Name</label><input type="text" name="clientName" placeholder="e.g. Logan Paul" required></div>
    <div class="ci-field"><label>VIP Client Email</label><input type="email" name="clientEmail" placeholder="client@email.com" required></div>
    <div class="ci-field"><label>VIP Client Mailing Address</label><input type="text" name="clientAddress" placeholder="Street, City, State, ZIP" required></div>
  `;

  const employeeFields = `
    <div class="ci-field"><label>Employee Name</label><input type="text" name="employeeName" placeholder="Full name" required></div>
    <div class="ci-field"><label>Employee Department</label><input type="text" name="employeeDept" placeholder="e.g. Marketing, Partnerships" required></div>
    <div class="ci-field"><label>Employee Email</label><input type="email" name="employeeEmail" placeholder="you@polymarket.com" required></div>
    <div class="ci-field"><label>Employee Mailing Address</label><input type="text" name="employeeAddress" placeholder="Street, City, State, ZIP" required></div>
    <div class="ci-field"><label>Phone Number</label><input type="tel" name="phone" placeholder="+1 (000) 000-0000" required></div>
  `;

  panel.innerHTML = `
    <form id="cartIntakeForm" onsubmit="submitCartIntake(event, '${type}')">
      <button type="button" class="ci-back" onclick="hideCartForm()">← Back</button>
      ${type === 'client' ? clientFields : employeeFields}
      <button type="submit" class="ci-submit">Place Order →</button>
      <p class="ci-error" id="cartIntakeError" style="display:none;">Please fill in all fields.</p>
    </form>
  `;
  panel.style.display = 'block';
}

function hideCartForm() {
  const btnRow = document.getElementById('cartBtnRow');
  const panel  = document.getElementById('cartIntakePanel');
  if (btnRow) btnRow.style.display = 'flex';
  if (panel)  { panel.style.display = 'none'; panel.innerHTML = ''; }
}

function submitCartIntake(e, type) {
  e.preventDefault();
  const form = e.target;
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = v.trim(); });
  if (Object.values(data).some(v => !v)) {
    const err = document.getElementById('cartIntakeError');
    if (err) err.style.display = 'block';
    return;
  }
  sessionStorage.setItem('pm_intake', JSON.stringify({ type, ...data }));
  window.location.href = 'checkout.html';
}

// ── Init ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cartToggle')?.addEventListener('click', openCart);
  document.getElementById('cartClose')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
  renderCart();
  updateCartBadge();
});
