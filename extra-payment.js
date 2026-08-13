// ============================================================
// Extra Payment Calculator
// Compares your standard loan payoff against paying extra
// toward principal each month — shows time saved, interest
// saved, and a dual-curve chart of the two payoff paths.
// "The Payoff Curves": two balance lines racing to zero, brass
// (standard) vs teal (accelerated), with the gap between them
// shaded to represent the head start extra payments buy you.
// ============================================================

function standardPayment(loanAmount, annualRatePct, years){
  const n = Math.max(1, Math.round(years * 12));
  const r = (annualRatePct / 100) / 12;
  return r === 0
    ? loanAmount / n
    : loanAmount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

// Pays a fixed monthly amount against a balance until paid off (or caps at 100 years).
function payoffSeries(loanAmount, annualRatePct, monthlyPayment){
  const r = (annualRatePct / 100) / 12;
  let balance = loanAmount;
  let month = 0;
  let totalInterest = 0;
  const yearly = [{ year: 0, balance: loanAmount }];
  const CAP_MONTHS = 1200;

  if (monthlyPayment <= balance * r){
    // payment doesn't even cover interest — loan never pays off
    return { months: Infinity, totalInterest: Infinity, yearly, neverPaysOff: true };
  }

  while (balance > 0.5 && month < CAP_MONTHS){
    month++;
    const interest = balance * r;
    let principal = monthlyPayment - interest;
    if (principal > balance) principal = balance;
    balance -= principal;
    totalInterest += interest;
    if (month % 12 === 0) yearly.push({ year: month / 12, balance: Math.max(balance, 0) });
  }
  if (month % 12 !== 0) yearly.push({ year: +(month / 12).toFixed(2), balance: Math.max(balance, 0) });

  return { months: month, totalInterest, yearly, neverPaysOff: false };
}

function renderPayoffCurves(svgEl, standardYearly, acceleratedYearly, maxYears, loanAmount){
  const W = 640, H = 240, padL = 54, padR = 16, padT = 16, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xScale = (year) => padL + (Math.min(year, maxYears) / maxYears) * innerW;
  const yScale = (val) => padT + innerH - (val / loanAmount) * innerH;
  const baseY = padT + innerH;

  // pad accelerated series with a flat-zero point at maxYears so both lines share the x domain
  const accPadded = acceleratedYearly.slice();
  if (accPadded[accPadded.length - 1].year < maxYears){
    accPadded.push({ year: maxYears, balance: 0 });
  }

  const stdPts = standardYearly.map(d => `${xScale(d.year)},${yScale(d.balance)}`);
  const accPts = accPadded.map(d => `${xScale(d.year)},${yScale(d.balance)}`);

  const stdLine = `M${stdPts.join(' L')}`;
  const accLine = `M${accPts.join(' L')}`;
  const gapArea = `M${stdPts.join(' L')} L${accPts.slice().reverse().join(' L')} Z`;

  let grid = '';
  for (let i = 1; i <= 3; i++){
    const gy = padT + (innerH / 4) * i;
    grid += `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="var(--line-soft)" stroke-width="1"/>`;
  }

  svgEl.innerHTML = `
    <rect x="0" y="0" width="${W}" height="${H}" fill="transparent"/>
    ${grid}
    <path d="${gapArea}" fill="var(--teal)" fill-opacity="0.18"/>
    <path d="${stdLine}" fill="none" stroke="var(--brass)" stroke-width="2"/>
    <path d="${accLine}" fill="none" stroke="var(--teal)" stroke-width="2.5"/>
    <line x1="${padL}" y1="${baseY}" x2="${W - padR}" y2="${baseY}" stroke="var(--ink-faint)" stroke-width="1"/>
    <text x="${padL}" y="${H - 6}" font-family="var(--font-mono)" font-size="10" fill="var(--ink-faint)">0</text>
    <text x="${W - padR}" y="${H - 6}" text-anchor="end" font-family="var(--font-mono)" font-size="10" fill="var(--ink-faint)">Yr ${maxYears.toFixed(0)}</text>
  `;
  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
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
  const chartEl           = document.getElementById('payoffChart');
  const warningEl          = document.getElementById('epWarning');

  function recalc(){
    const balance = parseFloat(balanceInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    const years = parseFloat(termInput.value) || 30;
    const extra = parseFloat(extraInput.value) || 0;

    const basePayment = standardPayment(balance, rate, years);
    const standardResult = payoffSeries(balance, rate, basePayment);
    const acceleratedResult = payoffSeries(balance, rate, basePayment + extra);

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

    if (chartEl){
      renderPayoffCurves(chartEl, standardResult.yearly, acceleratedResult.neverPaysOff ? standardResult.yearly : acceleratedResult.yearly, years, balance);
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
