// ============================================================
// Home Loan Calculator
// Same amortization math as EMI/mortgage calculators, plus two
// things specific to home loans: processing fee, and an
// EMI-to-income ratio check lenders use for eligibility.
// "The Split" donut shows principal vs interest share of the
// total amount repaid.
// ============================================================

function computeHomeLoan(loanAmount, annualRatePct, years){
  const n = Math.max(1, Math.round(years * 12));
  const r = (annualRatePct / 100) / 12;

  const emi = r === 0
    ? loanAmount / n
    : loanAmount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);

  const totalPayment = emi * n;
  const totalInterest = Math.max(totalPayment - loanAmount, 0);

  return { emi, totalInterest, totalPayment };
}

document.addEventListener('DOMContentLoaded', () => {
  const amountInput   = document.getElementById('hlAmount');
  const rateInput      = document.getElementById('hlRate');
  const tenureInput    = document.getElementById('hlTenure');
  const feeInput        = document.getElementById('hlFee');
  const incomeInput     = document.getElementById('hlIncome');

  const emiEl           = document.getElementById('hlEmiOut');
  const totalInterestEl = document.getElementById('hlInterestOut');
  const totalPaymentEl  = document.getElementById('hlTotalOut');
  const feeAmountEl     = document.getElementById('hlFeeOut');
  const chartEl          = document.getElementById('rooflineChart');

  const ratioBlock       = document.getElementById('hlRatioBlock');
  const ratioValueEl     = document.getElementById('hlRatioValue');
  const ratioNoteEl      = document.getElementById('hlRatioNote');

  function recalc(){
    const amount = parseFloat(amountInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    const years = parseFloat(tenureInput.value) || 20;
    const feePct = parseFloat(feeInput.value) || 0;
    const income = parseFloat(incomeInput.value) || 0;

    const result = computeHomeLoan(amount, rate, years);
    const feeAmount = amount * (feePct / 100);

    emiEl.textContent = Currency.format(result.emi, { decimals: 0 });
    totalInterestEl.textContent = Currency.format(result.totalInterest, { decimals: 0 });
    totalPaymentEl.textContent = Currency.format(result.totalPayment, { decimals: 0 });
    feeAmountEl.textContent = Currency.format(feeAmount, { decimals: 0 });

    if (chartEl){
      renderDonutChart(chartEl, [
        { label: 'Principal', value: amount, color: 'var(--teal-fill)' },
        { label: 'Interest', value: result.totalInterest, color: 'var(--brass-fill)' }
      ], {
        centerLabel: Currency.format(result.totalPayment, { decimals: 0 }),
        centerSub: 'Total payment'
      });
    }

    if (income > 0){
      const ratio = (result.emi / income) * 100;
      ratioBlock.style.display = '';
      ratioValueEl.textContent = ratio.toFixed(1) + '%';
      let note, cls;
      if (ratio <= 40){
        note = 'Comfortable — well within what most lenders approve.';
        cls = 'principal';
      } else if (ratio <= 55){
        note = 'Moderate — approvable at many lenders, but leaves less monthly buffer.';
        cls = '';
      } else {
        note = 'High — above the 50–55% EMI-to-income range most lenders prefer. You may need a longer tenure or smaller loan.';
        cls = 'interest';
      }
      ratioValueEl.parentElement.classList.remove('principal', 'interest');
      if (cls) ratioValueEl.parentElement.classList.add(cls);
      ratioNoteEl.textContent = note;
    } else {
      ratioBlock.style.display = 'none';
      ratioNoteEl.textContent = '';
    }
  }

  [amountInput, rateInput, tenureInput, feeInput, incomeInput].forEach(el => {
    if (el) el.addEventListener('input', recalc);
  });
  document.addEventListener('currencychange', recalc);

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
