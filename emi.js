// ============================================================
// EMI Calculator (Equated Monthly Installment)
// Same fixed-rate amortization math as the mortgage calculator,
// generalized for any loan type, with a Years/Months tenure
// toggle. "The Split" donut shows principal vs interest share
// of the total amount repaid.
// ============================================================

function computeEmi(loanAmount, annualRatePct, months){
  const n = Math.max(1, Math.round(months));
  const r = (annualRatePct / 100) / 12;

  const emi = r === 0
    ? loanAmount / n
    : loanAmount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);

  const totalPayment = emi * n;
  const totalInterest = Math.max(totalPayment - loanAmount, 0);

  return { emi, totalInterest, totalPayment };
}

document.addEventListener('DOMContentLoaded', () => {
  const amountInput   = document.getElementById('loanAmount');
  const rateInput      = document.getElementById('loanRate');
  const tenureInput    = document.getElementById('loanTenure');
  const tenureUnitLabel = document.getElementById('tenureUnitLabel');

  const emiEl          = document.getElementById('emiOut');
  const principalEl    = document.getElementById('principalOut');
  const totalInterestEl = document.getElementById('totalInterestOut');
  const totalPaymentEl  = document.getElementById('totalPaymentOut');
  const chartEl          = document.getElementById('rooflineChart');

  let tenureUnit = 'years'; // 'years' | 'months'

  function tenureInMonths(){
    const val = parseFloat(tenureInput.value) || 0;
    return tenureUnit === 'years' ? val * 12 : val;
  }

  function recalc(){
    const amount = parseFloat(amountInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    const months = tenureInMonths();

    const result = computeEmi(amount, rate, months);

    emiEl.textContent = Currency.format(result.emi, { decimals: 0 });
    principalEl.textContent = Currency.format(amount, { decimals: 0 });
    totalInterestEl.textContent = Currency.format(result.totalInterest, { decimals: 0 });
    totalPaymentEl.textContent = Currency.format(result.totalPayment, { decimals: 0 });

    if (chartEl){
      renderDonutChart(chartEl, [
        { label: 'Principal', value: amount, color: 'var(--teal-fill)' },
        { label: 'Interest', value: result.totalInterest, color: 'var(--brass-fill)' }
      ], {
        centerLabel: Currency.format(result.totalPayment, { decimals: 0 }),
        centerSub: 'Total payment'
      });
    }
  }

  [amountInput, rateInput, tenureInput].forEach(el => {
    if (el) el.addEventListener('input', recalc);
  });
  document.addEventListener('currencychange', recalc);

  // tenure unit toggle (Years / Months)
  document.querySelectorAll('.tenure-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      const newUnit = btn.dataset.unit;
      if (newUnit === tenureUnit) return;
      const current = parseFloat(tenureInput.value) || 0;
      tenureInput.value = newUnit === 'months'
        ? Math.round(current * 12)
        : +(current / 12).toFixed(1);
      tenureUnit = newUnit;
      document.querySelectorAll('.tenure-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (tenureUnitLabel) tenureUnitLabel.textContent = newUnit === 'years' ? 'years' : 'months';
      recalc();
    });
  });

  // currency toggle
  document.querySelectorAll('.currency-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.currency-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Currency.set(btn.dataset.currency);
    });
  });
  const activeCurrencyBtn = document.querySelector(`.currency-toggle button[data-currency="${Currency.code()}"]`);
  if (activeCurrencyBtn) activeCurrencyBtn.classList.add('active');

  recalc();
});
