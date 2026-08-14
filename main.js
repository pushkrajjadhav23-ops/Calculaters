// ============================================================
// calculaters — shared site behavior
// ============================================================

// ---- mobile nav ----
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links){
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // ---- FAQ accordion (works for any .faq-item on the page) ----
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      // close siblings for a tidy accordion
      item.parentElement.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
});

// ============================================================
// Currency utility — shared by every calculator.
// Amounts are always stored/computed as raw numbers (assume the
// user's own currency, unitless). We only swap the DISPLAY symbol.
// ============================================================
const Currency = (() => {
  const SYMBOLS = { USD: '$', GBP: '£', EUR: '€', INR: '₹', AUD: 'A$', CAD: 'C$' };
  let current = localStorage.getItem('calc_currency') || 'USD';

  function set(code){
    if (!SYMBOLS[code]) return;
    current = code;
    localStorage.setItem('calc_currency', code);
    document.dispatchEvent(new CustomEvent('currencychange', { detail: code }));
  }

  function symbol(){ return SYMBOLS[current]; }
  function code(){ return current; }

  function format(amount, { decimals = 0 } = {}){
    if (isNaN(amount)) amount = 0;
    return symbol() + Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  return { set, symbol, code, format, SYMBOLS };
})();

// ============================================================
// Shared donut/pie chart renderer — used by every calculator's
// "The Split" visual (principal vs interest, or any 2+ slice
// breakdown). Pure vector SVG so it stays crisp at any pixel
// density, with a legend rendered as real text (not baked into
// a raster image) for retina-sharp readability.
//
// slices: [{ label, value, color }]   — color should be a CSS
//         var() string, e.g. 'var(--teal-fill)'
// opts:   { centerLabel, centerSub }  — text shown in the donut hole
// ============================================================
function renderDonutChart(svgEl, slices, opts = {}){
  const W = 320, H = 320;
  const cx = 160, cy = 150, rOuter = 118, rInner = 74;

  const total = slices.reduce((sum, s) => sum + Math.max(s.value, 0), 0);

  if (total <= 0){
    svgEl.innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="none" stroke="var(--line)" stroke-width="${rOuter - rInner}"/>
      <text x="${cx}" y="${cy}" text-anchor="middle" font-family="var(--font-body)" font-size="13" fill="var(--ink-faint)">Enter values above</text>
    `;
    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    return;
  }

  const toRad = (deg) => (deg * Math.PI) / 180;
  function arcPath(startDeg, endDeg){
    const large = endDeg - startDeg > 180 ? 1 : 0;
    const x1 = cx + rOuter * Math.cos(toRad(startDeg)), y1 = cy + rOuter * Math.sin(toRad(startDeg));
    const x2 = cx + rOuter * Math.cos(toRad(endDeg)), y2 = cy + rOuter * Math.sin(toRad(endDeg));
    const x3 = cx + rInner * Math.cos(toRad(endDeg)), y3 = cy + rInner * Math.sin(toRad(endDeg));
    const x4 = cx + rInner * Math.cos(toRad(startDeg)), y4 = cy + rInner * Math.sin(toRad(startDeg));
    return `M${x1.toFixed(2)},${y1.toFixed(2)} A${rOuter},${rOuter} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} L${x3.toFixed(2)},${y3.toFixed(2)} A${rInner},${rInner} 0 ${large} 0 ${x4.toFixed(2)},${y4.toFixed(2)} Z`;
  }

  let angle = -90; // start at 12 o'clock
  let arcs = '';
  const legendItems = [];

  slices.forEach(s => {
    const value = Math.max(s.value, 0);
    const pct = (value / total) * 100;
    const sweep = (value / total) * 360;
    const start = angle;
    const end = sweep >= 359.99 ? angle + 359.99 : angle + sweep; // avoid degenerate full-circle path
    angle = end;
    if (sweep > 0){
      arcs += `<path d="${arcPath(start, end)}" fill="${s.color}" stroke="var(--surface)" stroke-width="3"/>`;
    }
    legendItems.push({ label: s.label, pct, display: Currency.format(value, { decimals: 0 }), color: s.color });
  });

  const centerLabel = opts.centerLabel != null ? opts.centerLabel : Currency.format(total, { decimals: 0 });
  const centerSub = opts.centerSub != null ? opts.centerSub : 'Total';

  const legendHtml = legendItems.map((item, i) => `
    <div class="donut-legend-item">
      <span class="donut-legend-swatch" style="background:${item.color}"></span>
      <span class="donut-legend-text">
        <span class="donut-legend-label">${item.label}</span>
        <span class="donut-legend-value">${item.display} <span class="donut-legend-pct">(${item.pct.toFixed(1)}%)</span></span>
      </span>
    </div>
  `).join('');

  svgEl.innerHTML = `
    ${arcs}
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-family="var(--font-mono)" font-size="24" font-weight="700" fill="var(--ink)">${centerLabel}</text>
    <text x="${cx}" y="${cy + 18}" text-anchor="middle" font-family="var(--font-body)" font-size="12" fill="var(--ink-faint)">${centerSub}</text>
  `;
  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);

  // legend lives in a sibling HTML element, not baked into the SVG,
  // so the text renders with real font hinting at any zoom level
  const legendEl = svgEl.parentElement ? svgEl.parentElement.querySelector('.donut-legend') : null;
  if (legendEl) legendEl.innerHTML = legendHtml;
}
