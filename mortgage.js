// ============================================================
// Mortgage Calculator
// Standard fixed-rate amortization math + live UI binding.
// "The Split" donut chart shows principal vs interest as a
// share of total cost — since every payment is level, total
// interest = (monthly payment × number of payments) − principal,
// no month-by-month loop needed.
// ============================================================

function computeMortgage(loanAmount, annualRatePct, years){
  const n = Math.max(1, Math.round(years * 12));
  const r = (annualRatePct / 100) / 12;

  const monthlyPayment = r === 0
    ? loanAmount / n
    : loanAmount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);

  const totalCost = monthlyPayment * n;
  const totalInterest = Math.max(totalCost - loanAmount, 0);

  return { monthlyPayment, totalInterest, totalCost };
}

// ============================================================
// UI binding
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const priceInput   = document.getElementById('homePrice');
  const downInput    = document.getElementById('downPayment');
  const downPctLabel = document.getElementById('downPctLabel');
  const rateInput    = document.getElementById('interestRate');
  const termInput    = document.getElementById('loanTerm');

  const payoutEl     = document.getElementById('monthlyPayment');
  const loanAmtEl    = document.getElementById('loanAmountOut');
  const totalInterestEl = document.getElementById('totalInterestOut');
  const totalCostEl  = document.getElementById('totalCostOut');
  const chartEl      = document.getElementById('rooflineChart');

  function currentValues(){
    return {
      price: parseFloat(priceInput.value) || 0,
      down: parseFloat(downInput.value) || 0,
      rate: parseFloat(rateInput.value) || 0,
      years: parseFloat(termInput.value) || 30
    };
  }

  function recalc(){
    const { price, down, rate, years } = currentValues();
    const loanAmount = Math.max(0, price - down);
    const downPct = price > 0 ? (down / price) * 100 : 0;
    downPctLabel.textContent = downPct.toFixed(1) + '%';

    const result = computeMortgage(loanAmount, rate, years);

    payoutEl.textContent = Currency.format(result.monthlyPayment, { decimals: 0 });
    loanAmtEl.textContent = Currency.format(loanAmount, { decimals: 0 });
    totalInterestEl.textContent = Currency.format(result.totalInterest, { decimals: 0 });
    totalCostEl.textContent = Currency.format(result.totalCost, { decimals: 0 });

    if (chartEl){
      renderDonutChart(chartEl, [
        { label: 'Principal', value: loanAmount, color: 'var(--teal-fill)' },
        { label: 'Interest', value: result.totalInterest, color: 'var(--brass-fill)' }
      ], {
        centerLabel: Currency.format(result.totalCost, { decimals: 0 }),
        centerSub: 'Total cost'
      });
    }
  }

  [priceInput, downInput, rateInput, termInput].forEach(el => {
    if (el) el.addEventListener('input', recalc);
  });

  document.addEventListener('currencychange', recalc);

  // currency toggle buttons
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
