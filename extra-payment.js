// ============================================================
// Extra Payment Calculator
// Compares your standard loan payoff against paying extra
// toward principal each month — shows time saved, interest
// saved, and two donuts ("The Split") comparing how much of
// each path's total cost is principal vs interest.
// ============================================================

function standardPayment(loanAmount, annualRatePct, years){
  const n = Math.max(1, Math.round(years * 12));
  const r = (annualRatePct / 100) / 12;
  return r === 0
    ? loanAmount / n
    : loanAmount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

// Pays a fixed monthly amount against a balance until paid off (or caps at 100 years).
// Extra payments change the payoff length dynamically, so this still needs a loop —
// unlike the level-payment calculators, total interest can't be derived with simple algebra here.
function payoffSummary(loanAmount, annualRatePct, monthlyPayment){
  const r = (annualRatePct / 100) / 12;
  let balance = loanAmount;
  let month = 0;
  let totalInterest = 0;
  const CAP_MONTHS = 1200;

  if (monthlyPayment <= balance * r){
    return { months: Infinity, totalInterest: Infinity, neverPaysOff: true };
  }

  while (balance > 0.5 && month < CAP_MONTHS){
    month++;
    const interest = balance * r;
    let principal = monthlyPayment - interest;
    if (principal > balance) principal = balance;
    balance -= principal;
    totalInterest += interest;
  }

  return { months: month, totalInterest, neverPaysOff: false };
}

document.addEventListener('DOMContentLoaded', () => {
  const balanceInput = document.getElementById('epBalance');
  const rateInput      = document.getElementById('epRate');
  const termInput       = document.getElementById('epTerm');
  const extraInput      = document.getElementById('epExtra');

  const timeSavedEl     = document.getElementById('epTimeSaved');
  const interestSavedEl = document.getElementById('epInterestSaved');
  const newPayoffEl     = document.getElementById('epNewPayoff');
  const standardPaymentEl = document.getElementById('epStandardPayment');
  const warningEl          = document.getElementById('epWarning');

  const standardChartEl    = document.getElementById('standardChart');
  const acceleratedChartEl = document.getElementById('acceleratedChart');

  function recalc(){
    const balance = parseFloat(balanceInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    const years = parseFloat(termInput.value) || 30;
    const extra = parseFloat(extraInput.value) || 0;

    const basePayment = standardPayment(balance, rate, years);
    const standardResult = payoffSummary(balance, rate, basePayment);
    const acceleratedResult = payoffSummary(balance, rate, basePayment + extra);

    standardPaymentEl.textContent = Currency.format(basePayment, { decimals: 0 });

    if (extra <= 0 || acceleratedResult.neverPaysOff){
      timeSavedEl.textContent = '—';
      interestSavedEl.textContent = '—';
      newPayoffEl.textContent = '—';
      warningEl.textContent = extra <= 0
        ? 'Add an extra monthly payment above to see your time and interest savings.'
        : '';
    } else {
      const monthsSaved = standardResult.months - acceleratedResult.months;
      const interestSaved = standardResult.totalInterest - acceleratedResult.totalInterest;
      const yrs = Math.floor(acceleratedResult.months / 12);
      const mos = acceleratedResult.months % 12;
      const savedYrs = Math.floor(monthsSaved / 12);
      const savedMos = monthsSaved % 12;

      timeSavedEl.textContent = `${savedYrs}y ${savedMos}mo`;
      interestSavedEl.textContent = Currency.format(interestSaved, { decimals: 0 });
      newPayoffEl.textContent = `${yrs}y ${mos}mo`;
      warningEl.textContent = '';
    }

    if (standardChartEl){
      renderDonutChart(standardChartEl, [
        { label: 'Principal', value: balance, color: 'var(--teal-fill)' },
        { label: 'Interest', value: standardResult.totalInterest, color: 'var(--brass-fill)' }
      ], {
        centerLabel: Currency.format(balance + standardResult.totalInterest, { decimals: 0 }),
        centerSub: 'Standard total'
      });
    }
    if (acceleratedChartEl){
      if (extra > 0 && !acceleratedResult.neverPaysOff){
        renderDonutChart(acceleratedChartEl, [
          { label: 'Principal', value: balance, color: 'var(--teal-fill)' },
          { label: 'Interest', value: acceleratedResult.totalInterest, color: 'var(--brass-fill)' }
        ], {
          centerLabel: Currency.format(balance + acceleratedResult.totalInterest, { decimals: 0 }),
          centerSub: 'With extra total'
        });
      } else {
        renderDonutChart(acceleratedChartEl, [], {});
      }
    }
  }

  [balanceInput, rateInput, termInput, extraInput].forEach(el => {
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
