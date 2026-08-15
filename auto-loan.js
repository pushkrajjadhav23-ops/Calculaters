// ============================================================
// Auto Loan Calculator
// Amount financed = (Price − Down payment − Trade-in) + Sales tax,
// where Sales tax is calculated on price minus trade-in credit —
// the common convention in most US states. Same fixed-rate
// amortization math as the other loan calculators from there.
// "The Split" donut shows principal vs interest of the total repaid.
// ============================================================

function computeAutoLoan(price, downPayment, tradeIn, taxRatePct, annualRatePct, termMonths){
  const taxableAmount = Math.max(price - tradeIn, 0);
  const salesTax = taxableAmount * (taxRatePct / 100);
  const amountFinanced = Math.max(price - downPayment - tradeIn + salesTax, 0);

  const n = Math.max(1, Math.round(termMonths));
  const r = (annualRatePct / 100) / 12;

  const monthlyPayment = r === 0
    ? amountFinanced / n
    : amountFinanced * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);

  const totalPayment = monthlyPayment * n;
  const totalInterest = Math.max(totalPayment - amountFinanced, 0);

  return { salesTax, amountFinanced, monthlyPayment, totalInterest, totalPayment };
}

document.addEventListener('DOMContentLoaded', () => {
  const priceInput      = document.getElementById('alPrice');
  const downInput        = document.getElementById('alDown');
  const tradeInInput     = document.getElementById('alTradeIn');
  const taxInput          = document.getElementById('alTax');
  const rateInput          = document.getElementById('alRate');
  const termInput           = document.getElementById('alTerm');

  const paymentEl          = document.getElementById('alPaymentOut');
  const financedEl          = document.getElementById('alFinancedOut');
  const taxAmountEl         = document.getElementById('alTaxOut');
  const totalInterestEl     = document.getElementById('alInterestOut');
  const totalPaymentEl      = document.getElementById('alTotalOut');
  const chartEl              = document.getElementById('rooflineChart');

  function recalc(){
    const price = parseFloat(priceInput.value) || 0;
    const down = parseFloat(downInput.value) || 0;
    const tradeIn = parseFloat(tradeInInput.value) || 0;
    const tax = parseFloat(taxInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    const term = parseFloat(termInput.value) || 60;

    const result = computeAutoLoan(price, down, tradeIn, tax, rate, term);

    paymentEl.textContent = Currency.format(result.monthlyPayment, { decimals: 0 });
    financedEl.textContent = Currency.format(result.amountFinanced, { decimals: 0 });
    taxAmountEl.textContent = Currency.format(result.salesTax, { decimals: 0 });
    totalInterestEl.textContent = Currency.format(result.totalInterest, { decimals: 0 });
    totalPaymentEl.textContent = Currency.format(result.totalPayment, { decimals: 0 });

    if (chartEl){
      renderDonutChart(chartEl, [
        { label: 'Principal', value: result.amountFinanced, color: 'var(--teal-fill)' },
        { label: 'Interest', value: result.totalInterest, color: 'var(--brass-fill)' }
      ], {
        centerLabel: Currency.format(result.totalPayment, { decimals: 0 }),
        centerSub: 'Total payment'
      });
    }
  }

  [priceInput, downInput, tradeInInput, taxInput, rateInput, termInput].forEach(el => {
    if (el) el.addEventListener('input', recalc);
  });
  document.addEventListener('currencychange', recalc);

  // term toggle (common auto loan lengths)
  document.querySelectorAll('.term-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      termInput.value = btn.dataset.months;
      document.querySelectorAll('.term-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      recalc();
    });
  });

  document.querySelectorAll('.currency-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.currency-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Currency.set(btn.dataset.currency);
    });
  });
  const activeBtn = document.querySelector(`.currency-toggle button[data-currency="${Currency.code()}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  recalc();
});
