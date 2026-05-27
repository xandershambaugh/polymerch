/**
 * Polymarket Ticker
 * Fetches top markets from the Gamma API and renders a scrolling ticker.
 * Falls back to curated hardcoded markets if the API is unavailable.
 */
(async function () {
  const track = document.getElementById('tickerTrack');
  if (!track) return;

  // ── Fallback markets (used if API is unavailable) ──────────────────────
  const FALLBACK = [
    { title: 'France wins 2026 FIFA World Cup',    prob: '17%', slug: 'will-france-win-the-2026-fifa-world-cup-924' },
    { title: 'Spain wins 2026 FIFA World Cup',     prob: '17%', slug: 'will-spain-win-the-2026-fifa-world-cup-963' },
    { title: 'Brazil wins 2026 FIFA World Cup',    prob: '9%',  slug: 'will-brazil-win-the-2026-fifa-world-cup-183' },
    { title: 'Argentina wins 2026 FIFA World Cup', prob: '7%',  slug: 'will-argentina-win-the-2026-fifa-world-cup' },
    { title: 'England wins 2026 FIFA World Cup',   prob: '7%',  slug: 'will-england-win-the-2026-fifa-world-cup' },
    { title: 'Germany wins 2026 FIFA World Cup',   prob: '6%',  slug: 'will-germany-win-the-2026-fifa-world-cup' },
    { title: 'USA wins 2026 FIFA World Cup',       prob: '1%',  slug: 'will-usa-win-the-2026-fifa-world-cup-467' },
    { title: 'Bitcoin above $100k in 2026',        prob: '82%', slug: 'bitcoin-above-100k-in-2026' },
    { title: 'Trump approval above 50% in 2026',   prob: '21%', slug: 'trump-approval-above-50-in-2026' },
    { title: 'Fed cuts rates in 2026',             prob: '74%', slug: 'fed-cuts-rates-in-2026' },
    { title: 'AI surpasses human performance on all benchmarks', prob: '34%', slug: 'ai-surpasses-human-performance' },
    { title: 'Elon Musk returns to Twitter/X CEO', prob: '12%', slug: 'elon-musk-returns-to-x-ceo' },
  ];

  // ── Helpers ───────────────────────────────────────────────────────────
  // Strip "Will " prefix and trailing "?" to make titles punchier
  function cleanTitle(raw) {
    return (raw || '')
      .replace(/^Will\s+/i, '')
      .replace(/\?$/, '')
      .trim();
  }

  // Parse outcomePrices — may arrive as a JSON string or already as an array
  function yesProb(market) {
    try {
      let prices = market.outcomePrices;
      if (typeof prices === 'string') prices = JSON.parse(prices);
      const pct = Math.round(parseFloat(prices[0]) * 100);
      if (isNaN(pct)) return null;
      return pct + '%';
    } catch {
      return null;
    }
  }

  // ── Direction arrow based on YES probability ───────────────────────────
  function arrow(prob) {
    if (!prob) return '';
    const n = parseInt(prob, 10);
    if (isNaN(n)) return '';
    return n >= 50
      ? '<span class="ticker-up">▲</span>'
      : '<span class="ticker-down">▼</span>';
  }

  // ── Render ─────────────────────────────────────────────────────────────
  function buildTicker(items) {
    // Duplicate the list for a seamless infinite loop
    const all = [...items, ...items];
    track.innerHTML = all.map(item => `
      <a href="https://polymarket.com/event/${item.slug}" target="_blank" rel="noopener noreferrer">${arrow(item.prob)}${item.title}${item.prob ? ' ' + item.prob : ''}</a>
      <span class="ticker-sep">/</span>
    `).join('');
  }

  // ── Fetch live markets ─────────────────────────────────────────────────
  try {
    const res = await fetch(
      'https://gamma-api.polymarket.com/events?active=true&closed=false&limit=30&order=volume&ascending=false',
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error('API error');
    const events = await res.json();

    // Filter, clean and score
    const items = events
      .filter(e => {
        if (!e.slug || !e.title) return false;
        if (!e.markets || !e.markets.length) return false;
        // Skip very niche daily price / individual election primaries
        const skip = /\b(istanbul|hourly|daily weather|ultra kill|dota|league of legends|temperature)\b/i;
        return !skip.test(e.title);
      })
      .slice(0, 20)
      .map(e => {
        const prob = yesProb(e.markets[0]);
        return {
          title: cleanTitle(e.title),
          prob: prob,
          slug: e.slug,
        };
      })
      .filter(item => item.title.length > 4);

    buildTicker(items.length >= 5 ? items : FALLBACK);
  } catch {
    buildTicker(FALLBACK);
  }
})();
