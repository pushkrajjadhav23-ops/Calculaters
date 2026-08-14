// ============================================================
// Refinance Breakeven Calculator
// Compares current vs new monthly payment, and how many months
// it takes for the savings to recoup closing costs. "The Split"
// donut shows the new loan's principal vs interest breakdown.
// ============================================================

function monthlyPayment(balance, annualRatePct, years){
  const n = Math.max(1, Math.round(years * 12));
  const r = (annualRatePct / 100) / 12;
  if (r === 0) return balance / n;
  return balance * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

document.addEventListener('DOMContentLoaded', () => {
  const balanceInput   = document.getElementById('currentBalance');
  const curRateInput   = document.getElementById('currentRate');
  const curTermInput   = document.getElementById('currentRemainingYears');
  const newRateInput   = document.getElementById('newRate');
  const newTermInput   = document.getElementById('newTerm');
  const closingInput   = document.getElementById('closingCosts');

  const curPaymentEl   = document.getElementById('currentPaymentOut');
  const newPaymentEl   = document.getElementById('newPaymentOut');
  const savingsEl      = document.getElementById('monthlySavingsOut');
  const breakevenEl    = document.getElementById('breakevenOut');
  const chartEl        = document.getElementById('rooflineChart');
  const breakevenNote  = document.getElementById('breakevenNote');

  function currentValues(){
    return {
      balance: parseFloat(balanceInput.value) || 0,
      curRate: parseFloat(curRateInput.value) || 0,
      curTerm: parseFloat(curTermInput.value) || 1,
      newRate: parseFloat(newRateInput.value) || 0,
      newTerm: parseFloat(newTermInput.value) || 1,
      closing: parseFloat(closingInput.value) || 0
    };
  }

  function recalc(){
    const { balance, curRate, curTerm, newRate, newTerm, closing } = currentValues();

    const curPayment = monthlyPayment(balance, curRate, curTerm);
    const newPayment = monthlyPayment(balance, newRate, newTerm);
    const savings = curPayment - newPayment;

    curPaymentEl.textContent = Currency.format(curPayment, { decimals: 0 });
    newPaymentEl.textContent = Currency.format(newPayment, { decimals: 0 });
    savingsEl.textContent = (savings >= 0 ? '' : '-') + Currency.format(Math.abs(savings), { decimals: 0 }) + ' / mo';

    if (savings > 0){
      const breakevenMonth = Math.ceil(closing / savings);
      breakevenEl.textContent = breakevenMonth + ' months';
      breakevenNote.textContent = `That's about ${(breakevenMonth / 12).toFixed(1)} years to recover your closing costs.`;
    } else {
      breakevenEl.textContent = '—';
      breakevenNote.textContent = 'Your new payment isn\u2019t lower than your current one, so this refinance wouldn\u2019t pay for itself on monthly savings alone.';
    }

    // "The Split": new loan's principal vs interest, over its full new term
    const newTermMonths = Math.max(1, Math.round(newTerm * 12));
    const newTotalPayment = newPayment * newTermMonths;
    const newTotalInterest = Math.max(newTotalPayment - balance, 0);

    if (chartEl){
      renderDonutChart(chartEl, [
        { label: 'Principal', value: balance, color: 'var(--teal-fill)' },
        { label: 'Interest', value: newTotalInterest, color: 'var(--brass-fill)' }
      ], {
        centerLabel: Currency.format(newTotalPayment, { decimals: 0 }),
        centerSub: 'New loan total'
      });
    }
  }

  [balanceInput, curRateInput, curTermInput, newRateInput, newTermInput, closingInput].forEach(el => {
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
