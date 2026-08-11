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
