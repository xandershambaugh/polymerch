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

// ── Cart intake — Wall-Street terminal modal ───────────────────────────
// Clicking the green (client) / red (employee) physical button opens a
// centered amber-on-black terminal form. On submit we stash the data and
// hand off to checkout.html, which confirms + posts the Shopify order.

const INTAKE_FIELDS = {
  client: [
    { name: 'employeeName', label: 'Employee',   placeholder: 'Full name' },
    { name: 'employeeDept', label: 'Department',  placeholder: 'e.g. Marketing' },
    { name: 'clientName',   label: 'Recipient',   placeholder: 'VIP client name' },
    { name: 'clientEmail',  label: 'Email',       placeholder: 'client@email.com', type: 'email' },
    { name: 'address1',     label: 'Address',     placeholder: 'Street, apt' },
    { name: 'city',         label: 'City',        placeholder: 'City' },
    { name: 'state',        label: 'State',       placeholder: 'CA', maxlength: 2 },
    { name: 'zip',          label: 'Zip',         placeholder: '90210', maxlength: 10 },
  ],
  employee: [
    { name: 'employeeName',  label: 'Employee',   placeholder: 'Full name' },
    { name: 'employeeDept',  label: 'Department',  placeholder: 'e.g. Marketing' },
    { name: 'employeeEmail', label: 'Email',       placeholder: 'you@polymarket.com', type: 'email' },
    { name: 'address1',      label: 'Address',     placeholder: 'Street, apt' },
    { name: 'city',          label: 'City',        placeholder: 'City' },
    { name: 'state',         label: 'State',       placeholder: 'CA', maxlength: 2 },
    { name: 'zip',           label: 'Zip',         placeholder: '90210', maxlength: 10 },
    { name: 'phone',         label: 'Phone',       placeholder: '+1 (000) 000-0000', type: 'tel' },
  ],
};

let _intakeModal = null;

function ensureIntakeModal() {
  if (_intakeModal) return _intakeModal;
  const overlay = document.createElement('div');
  overlay.className = 'intake-modal-overlay';
  overlay.id = 'intakeModalOverlay';
  overlay.innerHTML = `
    <div class="intake-modal" role="dialog" aria-modal="true" aria-label="Order terminal">
      <div class="intake-modal-bar">
        <span class="term-title">POLYMARKET ORDER TERMINAL</span>
        <button type="button" class="term-close" aria-label="Close">✕</button>
      </div>
      <div class="intake-modal-body">
        <div class="intake-modal-head term-cursor"></div>
        <form class="intake-term-form" novalidate>
          <div class="intake-fields"></div>
          <div class="intake-submit-row">
            <button type="submit" class="term-submit">Transmit Order →</button>
            <p class="term-error"></p>
            <button type="button" class="term-back">← Back to bag</button>
          </div>
        </form>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const form     = overlay.querySelector('.intake-term-form');
  const closeBtn = overlay.querySelector('.term-close');
  const backBtn  = overlay.querySelector('.term-back');

  closeBtn.addEventListener('click', closeIntakeModal);
  backBtn.addEventListener('click', closeIntakeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeIntakeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeIntakeModal();
  });
  form.addEventListener('submit', (e) => submitCartIntake(e, overlay.dataset.type));

  _intakeModal = overlay;
  return overlay;
}

function closeIntakeModal() {
  if (_intakeModal) _intakeModal.classList.remove('open');
  document.body.style.overflow = '';
}

function showCartForm(type) {
  const overlay = ensureIntakeModal();
  overlay.dataset.type = type;

  overlay.querySelector('.intake-modal-head').innerHTML = type === 'client'
    ? 'ORDER TYPE: <b>VIP CLIENT GIFT</b>'
    : 'ORDER TYPE: <b>EMPLOYEE</b>';

  const fieldsWrap = overlay.querySelector('.intake-fields');
  fieldsWrap.innerHTML = INTAKE_FIELDS[type].map(f => `
    <div class="term-field">
      <label for="if_${f.name}">${f.label}</label>
      <input id="if_${f.name}" name="${f.name}" type="${f.type || 'text'}"
        placeholder="${f.placeholder}" ${f.maxlength ? `maxlength="${f.maxlength}"` : ''} autocomplete="off">
    </div>`).join('');

  overlay.querySelector('.term-error').textContent = '';
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => { const first = fieldsWrap.querySelector('input'); if (first) first.focus(); }, 60);
}

function submitCartIntake(e, type) {
  e.preventDefault();
  const overlay = _intakeModal;
  const form = e.target;
  const data = { type };
  let firstInvalid = null;
  form.querySelectorAll('.term-field').forEach(fieldEl => {
    const input = fieldEl.querySelector('input');
    const val = input.value.trim();
    data[input.name] = val;
    if (!val) { fieldEl.classList.add('invalid'); if (!firstInvalid) firstInvalid = input; }
    else fieldEl.classList.remove('invalid');
  });
  const errEl = overlay.querySelector('.term-error');
  if (firstInvalid) {
    errEl.textContent = 'ERR — all fields required';
    firstInvalid.focus();
    return;
  }
  errEl.textContent = '';
  sessionStorage.setItem('pm_intake', JSON.stringify(data));
  window.location.href = 'checkout.html';
}

// ── Mount the green (Client) / red (Employee) physical buttons ──────────

function mountCartButtons() {
  if (typeof window.mountPhysicalButton !== 'function') return;
  const clientC = document.getElementById('cartClientBtn');
  const empC    = document.getElementById('cartEmployeeBtn');
  if (clientC && !clientC.dataset.mounted) {
    clientC.dataset.mounted = '1';
    window.mountPhysicalButton({ container: clientC, variant: 'green', label: 'Client',   onClick: () => showCartForm('client') });
  }
  if (empC && !empC.dataset.mounted) {
    empC.dataset.mounted = '1';
    window.mountPhysicalButton({ container: empC, variant: 'red', label: 'Employee', onClick: () => showCartForm('employee') });
  }
}

// ── Init ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cartToggle')?.addEventListener('click', openCart);
  document.getElementById('cartClose')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
  mountCartButtons();
  renderCart();
  updateCartBadge();
});
