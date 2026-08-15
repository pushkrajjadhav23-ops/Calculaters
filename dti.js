// ============================================================
// Debt-to-Income (DTI) Calculator
// Computes both ratios lenders actually look at:
// - Front-end DTI: housing payment ÷ gross income
// - Back-end DTI: all monthly debt ÷ gross income
// "The Split" donut shows income going to debt vs what's left.
// ============================================================

function classifyBackEnd(ratio){
  if (ratio <= 36) return { label: 'Healthy', note: 'Well within what most lenders prefer for new credit approval.', cls: 'principal' };
  if (ratio <= 43) return { label: 'Moderate', note: 'Approvable at many lenders — this is the standard ceiling for most conventional mortgages.', cls: '' };
  if (ratio <= 50) return { label: 'High', note: 'Above what most conventional lenders accept. Some programs (FHA and others) may still qualify you up to around 50%.', cls: 'interest' };
  return { label: 'Very high', note: 'Most lenders will have real difficulty approving new credit at this level. Paying down existing debt first will help.', cls: 'interest' };
}

function classifyFrontEnd(ratio){
  if (ratio <= 28) return { label: 'Healthy', note: 'Within the traditional 28% guideline for housing costs.' };
  if (ratio <= 36) return { label: 'Moderate', note: 'A bit above the traditional guideline, but often still workable alongside a reasonable back-end ratio.' };
  return { label: 'High', note: 'Housing costs alone are eating a large share of income — worth stress-testing your monthly budget.' };
}

document.addEventListener('DOMContentLoaded', () => {
  const incomeInput   = document.getElementById('dtiIncome');
  const housingInput  = document.getElementById('dtiHousing');
  const autoInput      = document.getElementById('dtiAuto');
  const studentInput   = document.getElementById('dtiStudent');
  const cardInput       = document.getElementById('dtiCards');
  const otherInput      = document.getElementById('dtiOther');

  const frontEndEl    = document.getElementById('dtiFrontEnd');
  const backEndEl      = document.getElementById('dtiBackEnd');
  const frontNoteEl    = document.getElementById('dtiFrontNote');
  const backNoteEl      = document.getElementById('dtiBackNote');
  const totalDebtEl     = document.getElementById('dtiTotalDebt');
  const remainingEl     = document.getElementById('dtiRemaining');
  const chartEl          = document.getElementById('rooflineChart');

  function recalc(){
    const income = parseFloat(incomeInput.value) || 0;
    const housing = parseFloat(housingInput.value) || 0;
    const auto = parseFloat(autoInput.value) || 0;
    const student = parseFloat(studentInput.value) || 0;
    const cards = parseFloat(cardInput.value) || 0;
    const other = parseFloat(otherInput.value) || 0;

    const totalDebt = housing + auto + student + cards + other;
    const remaining = Math.max(income - totalDebt, 0);

    const frontEndRatio = income > 0 ? (housing / income) * 100 : 0;
    const backEndRatio = income > 0 ? (totalDebt / income) * 100 : 0;

    frontEndEl.textContent = frontEndRatio.toFixed(1) + '%';
    backEndEl.textContent = backEndRatio.toFixed(1) + '%';
    totalDebtEl.textContent = Currency.format(totalDebt, { decimals: 0 });
    remainingEl.textContent = Currency.format(remaining, { decimals: 0 });

    if (income > 0){
      const front = classifyFrontEnd(frontEndRatio);
      const back = classifyBackEnd(backEndRatio);
      frontNoteEl.textContent = `${front.label} — ${front.note}`;
      backNoteEl.textContent = `${back.label} — ${back.note}`;
      backEndEl.parentElement.classList.remove('principal', 'interest');
      if (back.cls) backEndEl.parentElement.classList.add(back.cls);
    } else {
      frontNoteEl.textContent = '';
      backNoteEl.textContent = 'Enter your gross monthly income above to see your ratio breakdown.';
    }

    if (chartEl){
      renderDonutChart(chartEl, [
        { label: 'Remaining income', value: remaining, color: 'var(--teal-fill)' },
        { label: 'Debt payments', value: totalDebt, color: 'var(--brass-fill)' }
      ], {
        centerLabel: Currency.format(income, { decimals: 0 }),
        centerSub: 'Gross income'
      });
    }
  }

  [incomeInput, housingInput, autoInput, studentInput, cardInput, otherInput].forEach(el => {
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
