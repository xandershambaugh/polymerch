/**
 * Polymerch — Employee login modal
 * Triggered by the Account (person) icon in the header.
 * Accepts any @polymarket.com address, or emails listed in APPROVED.
 */
(function () {
  /* ── Approved individual emails ───────────────────────────── */
  const APPROVED = [
    /* add specific addresses here if needed, e.g.:
       'partner@example.com' */
  ];

  /* ── Helpers ───────────────────────────────────────────────── */
  function isApproved(email) {
    email = (email || '').toLowerCase().trim();
    return email.endsWith('@polymarket.com') || APPROVED.includes(email);
  }

  function storedEmail() {
    return sessionStorage.getItem('pm_employee_email') || null;
  }

  /* ── Modal HTML builders ───────────────────────────────────── */
  function loginHTML() {
    return `
      <p class="am-label">Employee Login</p>
      <input id="am-email" class="am-input" type="email"
             placeholder="you@polymarket.com" autocomplete="email">
      <button id="am-submit" class="am-btn am-btn-primary">Sign In →</button>
      <p id="am-err" class="am-err" style="display:none">
        Please use a @polymarket.com address.
      </p>`;
  }

  function authedHTML(email) {
    return `
      <p class="am-label">Signed in as</p>
      <p class="am-email-display">${email}</p>
      <button id="am-signout" class="am-btn am-btn-outline">Sign Out</button>`;
  }

  /* ── Build & inject modal once ─────────────────────────────── */
  function buildModal() {
    if (document.getElementById('am-overlay')) return;

    const email = storedEmail();

    const overlay = document.createElement('div');
    overlay.id = 'am-overlay';
    overlay.innerHTML = `
      <div id="am-card">
        ${email ? authedHTML(email) : loginHTML()}
      </div>`;

    document.body.appendChild(overlay);

    /* Close on backdrop click */
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });

    /* Close on Escape */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });

    wireListeners();
  }

  function wireListeners() {
    document.getElementById('am-submit')?.addEventListener('click', handleLogin);
    document.getElementById('am-email')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('am-email')?.addEventListener('input', () => {
      const err = document.getElementById('am-err');
      if (err) err.style.display = 'none';
    });
    document.getElementById('am-signout')?.addEventListener('click', () => {
      sessionStorage.removeItem('pm_auth');
      sessionStorage.removeItem('pm_employee_email');
      window.location.replace('index.html');
    });
  }

  /* ── Login handler ─────────────────────────────────────────── */
  function handleLogin() {
    const emailEl = document.getElementById('am-email');
    const email   = (emailEl?.value || '').trim();
    if (isApproved(email)) {
      sessionStorage.setItem('pm_auth', 'true');
      sessionStorage.setItem('pm_employee_email', email);
      closeModal();
      /* If still on the password gate, go to shop */
      const onGate = window.location.pathname.includes('index.html')
                  || window.location.pathname === '/'
                  || window.location.pathname === '';
      if (onGate) {
        window.location.replace('shop.html');
      } else {
        /* Rebuild modal to show "signed in" state */
        const overlay = document.getElementById('am-overlay');
        if (overlay) overlay.remove();
        buildModal();
      }
    } else {
      const err = document.getElementById('am-err');
      if (err) err.style.display = 'block';
    }
  }

  /* ── Open / close ──────────────────────────────────────────── */
  function openModal() {
    /* Rebuild each time so it reflects current auth state */
    const old = document.getElementById('am-overlay');
    if (old) old.remove();
    buildModal();
    const overlay = document.getElementById('am-overlay');
    overlay.style.display = 'flex';
    setTimeout(() => document.getElementById('am-email')?.focus(), 40);
  }

  function closeModal() {
    const overlay = document.getElementById('am-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  /* ── Init on DOMContentLoaded ──────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[title="Account"]').forEach(btn => {
      btn.addEventListener('click', openModal);
    });
  });
})();
