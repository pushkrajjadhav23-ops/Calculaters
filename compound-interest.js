// ============================================================
// Compound Interest Calculator
// Grows an initial principal plus optional monthly contributions
// at a chosen compounding frequency. The nominal annual rate is
// converted to an effective monthly rate so contributions (always
// monthly) and compounding (any frequency) combine correctly:
//   effectiveMonthlyRate = (1 + annualRate/n)^(n/12) − 1
// where n = compounding periods per year.
// "The Split" donut shows contributions vs interest earned.
// ============================================================

function computeCompoundInterest(principal, monthlyContribution, annualRatePct, years, periodsPerYear){
  const months = Math.max(0, Math.round(years * 12));
  const annualRate = annualRatePct / 100;
  const effectiveMonthlyRate = periodsPerYear > 0
    ? Math.pow(1 + annualRate / periodsPerYear, periodsPerYear / 12) - 1
    : annualRate / 12;

  let balance = principal;
  for (let m = 1; m <= months; m++){
    balance = balance * (1 + effectiveMonthlyRate) + monthlyContribution;
  }

  const totalContributions = principal + monthlyContribution * months;
  const totalInterest = Math.max(balance - totalContributions, 0);

  return { balance, totalContributions, totalInterest };
}

document.addEventListener('DOMContentLoaded', () => {
  const principalInput   = document.getElementById('ciPrincipal');
  const contributionInput = document.getElementById('ciContribution');
  const rateInput          = document.getElementById('ciRate');
  const yearsInput          = document.getElementById('ciYears');

  const balanceEl          = document.getElementById('ciBalanceOut');
  const contributionsEl    = document.getElementById('ciContributionsOut');
  const interestEl          = document.getElementById('ciInterestOut');
  const chartEl              = document.getElementById('rooflineChart');

  let periodsPerYear = 12; // default: monthly compounding

  function recalc(){
    const principal = parseFloat(principalInput.value) || 0;
    const contribution = parseFloat(contributionInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    const years = parseFloat(yearsInput.value) || 0;

    const result = computeCompoundInterest(principal, contribution, rate, years, periodsPerYear);

    balanceEl.textContent = Currency.format(result.balance, { decimals: 0 });
    contributionsEl.textContent = Currency.format(result.totalContributions, { decimals: 0 });
    interestEl.textContent = Currency.format(result.totalInterest, { decimals: 0 });

    if (chartEl){
      renderDonutChart(chartEl, [
        { label: 'Contributions', value: result.totalContributions, color: 'var(--teal-fill)' },
        { label: 'Interest earned', value: result.totalInterest, color: 'var(--brass-fill)' }
      ], {
        centerLabel: Currency.format(result.balance, { decimals: 0 }),
        centerSub: 'Final balance'
      });
    }
  }

  [principalInput, contributionInput, rateInput, yearsInput].forEach(el => {
    if (el) el.addEventListener('input', recalc);
  });
  document.addEventListener('currencychange', recalc);

  // compounding frequency toggle
  document.querySelectorAll('.compounding-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      periodsPerYear = parseInt(btn.dataset.periods, 10);
      document.querySelectorAll('.compounding-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
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
  const activeBtn = document.querySelector(`.currency-toggle button[data-currency="${Currency.code()}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  recalc();
});
