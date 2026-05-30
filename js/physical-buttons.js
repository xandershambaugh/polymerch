/**
 * Physical Button — shared component (ported from physical-buttons-demo).
 * Renders a tactile sprite button (green / red / blue) with press + lit
 * states, a synthesized mechanical click, and haptics.
 *
 *   mountPhysicalButton({ container, variant, label, onClick }) -> btnEl
 *
 * Requires the .phys-btn-v3 CSS family (in style.css) and the sprite at
 * assets/button-base.webp. Self-contained; safe to include on any page.
 */
(function () {
  // ── Synthesized mechanical click ─────────────────────────────────────
  let audioCtx = null, unlocked = false;
  function getCtx() {
    if (!audioCtx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      audioCtx = new C();
    }
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  function unlockAudio() {
    if (unlocked) return;
    const ac = getCtx();
    if (!ac) return;
    try {
      const buf = ac.createBuffer(1, 1, 22050);
      const src = ac.createBufferSource();
      src.buffer = buf; src.connect(ac.destination); src.start(0);
      if (ac.state === "suspended") ac.resume().catch(() => {});
      unlocked = true;
    } catch {}
  }
  function ensureAudioUnlocked() {
    if (unlocked) return;
    const onGesture = () => {
      unlockAudio();
      if (unlocked) {
        window.removeEventListener("pointerdown", onGesture);
        window.removeEventListener("keydown", onGesture);
      }
    };
    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);
  }
  function clickLayer(ac, opts) {
    const now = opts.at ?? ac.currentTime;
    const bufSize = Math.floor(ac.sampleRate * opts.noiseDur);
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const t = i / bufSize; ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 5);
    }
    const noise = ac.createBufferSource(); noise.buffer = buf;
    const bp = ac.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.value = opts.noiseFreq; bp.Q.value = opts.noiseQ;
    const ng = ac.createGain(); ng.gain.value = opts.noiseGain;
    noise.connect(bp).connect(ng).connect(ac.destination); noise.start(now);

    const thud = ac.createOscillator(); thud.type = "sine";
    thud.frequency.value = opts.thudFreq;
    const tg = ac.createGain();
    tg.gain.setValueAtTime(0, now);
    tg.gain.linearRampToValueAtTime(opts.thudGain, now + 0.003);
    tg.gain.exponentialRampToValueAtTime(0.0001, now + opts.thudDur);
    thud.connect(tg).connect(ac.destination); thud.start(now);
    thud.stop(now + opts.thudDur + 0.02);

    if (opts.popFreq && opts.popGain) {
      const pop = ac.createOscillator(); pop.type = "triangle";
      pop.frequency.value = opts.popFreq;
      const pg = ac.createGain();
      pg.gain.setValueAtTime(opts.popGain, now);
      pg.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
      pop.connect(pg).connect(ac.destination); pop.start(now); pop.stop(now + 0.02);
    }
  }
  function playClickDown(variant) {
    const ac = getCtx(); if (!ac) return;
    clickLayer(ac, { noiseFreq: variant === "green" ? 4200 : 3600, noiseQ: 4.0, noiseGain: 0.34, noiseDur: 0.022, thudFreq: variant === "green" ? 360 : 300, thudGain: 0.08, thudDur: 0.05, popFreq: variant === "green" ? 2800 : 2200, popGain: 0.22 });
  }
  function playClickUp(variant) {
    const ac = getCtx(); if (!ac) return;
    clickLayer(ac, { noiseFreq: variant === "green" ? 5200 : 4400, noiseQ: 5.0, noiseGain: 0.14, noiseDur: 0.015, thudFreq: variant === "green" ? 420 : 360, thudGain: 0.03, thudDur: 0.03, popFreq: variant === "green" ? 3400 : 2800, popGain: 0.10 });
  }
  function vibrate() { if (navigator.vibrate) { try { navigator.vibrate(18); } catch {} } }

  // ── Sprite offsets per variant (blue reuses red + hue-rotate) ─────────
  const OUTER = {
    green: { left: "-88.55%",  top: "-358.54%", w: "391.69%", h: "753.11%" },
    red:   { left: "-204.02%", top: "-358.54%", w: "391.69%", h: "753.11%" },
    blue:  { left: "-204.02%", top: "-358.54%", w: "391.69%", h: "753.11%" },
  };
  const INNER = {
    green: { left: "-100.22%", top: "-486.34%", w: "426.2%",  h: "986.25%" },
    red:   { left: "-227.87%", top: "-477.96%", w: "428.22%", h: "972.16%" },
    blue:  { left: "-227.87%", top: "-477.96%", w: "428.22%", h: "972.16%" },
  };
  const CAP_FILTER = { green: "", red: "", blue: "hue-rotate(220deg) saturate(1.05)" };

  function mountPhysicalButton({ container, variant, label, onClick }) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "phys-btn-v3";
    btn.setAttribute("aria-label", label);
    btn.dataset.variant = variant;
    btn.dataset.lit = "false";
    btn.dataset.pressed = "false";

    const soundVariant = variant === "green" ? "green" : "red";

    btn.innerHTML = `
      <span class="phys-btn-bgglow phys-btn-bgglow--${variant}"></span>
      <span class="phys-btn-stage">
        <span class="phys-btn-cap">
          <img src="assets/button-base.webp" alt="" draggable="false"
            style="left:${OUTER[variant].left};top:${OUTER[variant].top};width:${OUTER[variant].w};height:${OUTER[variant].h};filter:${CAP_FILTER[variant]};" />
          <span class="cap-darken"></span>
        </span>
        <span class="phys-btn-recess"></span>
        <span class="phys-btn-inner phys-btn-inner--${variant}">
          <img src="assets/button-base.webp" alt="" draggable="false"
            style="left:${INNER[variant].left};top:${INNER[variant].top};width:${INNER[variant].w};height:${INNER[variant].h};filter:${CAP_FILTER[variant]};" />
          <span class="top-shadow"></span>
          <span class="phys-btn-label">${label}</span>
        </span>
        <span class="phys-btn-halo phys-btn-halo--${variant}"></span>
      </span>`;

    const cap = btn.querySelector(".phys-btn-cap");
    const inner = btn.querySelector(".phys-btn-inner");
    const halo = btn.querySelector(".phys-btn-halo");
    const bgglow = btn.querySelector(".phys-btn-bgglow");
    let pressed = false;

    function setPressed(v) {
      if (pressed === v) return;
      pressed = v;
      btn.dataset.pressed = v ? "true" : "false";
      cap.classList.toggle("is-pressed", v);
      inner.classList.toggle("is-pressed", v);
      v ? playClickDown(soundVariant) : playClickUp(soundVariant);
    }
    function setLit(v) {
      btn.dataset.lit = v ? "true" : "false";
      inner.classList.toggle("is-lit", v);
      halo.classList.toggle("is-lit", v && !pressed);
      bgglow.classList.toggle("is-lit", v && !pressed);
    }

    let pointerInside = false;
    btn.addEventListener("pointerdown", (e) => {
      ensureAudioUnlocked(); unlockAudio(); vibrate();
      pointerInside = true; setPressed(true); btn.setPointerCapture(e.pointerId);
    });
    btn.addEventListener("pointermove", (e) => {
      if (!pressed) return;
      const r = btn.getBoundingClientRect();
      pointerInside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    function release() {
      if (!pressed) return;
      setPressed(false);
      if (pointerInside) { setLit(true); onClick && onClick(); }
    }
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("lostpointercapture", () => { pressed && setPressed(false); });
    btn.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!pressed) { ensureAudioUnlocked(); setPressed(true); } }
    });
    btn.addEventListener("keyup", (e) => {
      if (e.key === " " || e.key === "Enter") { pointerInside = true; release(); }
    });

    container.appendChild(btn);
    ensureAudioUnlocked();
    return btn;
  }

  window.mountPhysicalButton = mountPhysicalButton;
})();
