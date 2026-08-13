// ============================================================
// Home Loan Calculator
// Same amortization math as EMI/mortgage calculators, plus two
// things specific to home loans: processing fee, and an
// EMI-to-income ratio check lenders use for eligibility.
// ============================================================

function amortizeHomeLoan(loanAmount, annualRatePct, years){
  const n = Math.max(1, Math.round(years * 12));
  const r = (annualRatePct / 100) / 12;

  const emi = r === 0
    ? loanAmount / n
    : loanAmount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);

  let balance = loanAmount;
  let cumPrincipal = 0;
  let cumInterest = 0;
  const yearly = [{ year: 0, principalCum: 0, interestCum: 0, totalCum: 0 }];

  for (let m = 1; m <= n; m++){
    const interest = balance * r;
    let principal = emi - interest;
    if (m === n) principal = balance;
    balance = Math.max(0, balance - principal);
    cumPrincipal += principal;
    cumInterest += interest;

    if (m % 12 === 0 || m === n){
      yearly.push({
        year: Math.ceil(m / 12),
        principalCum: cumPrincipal,
        interestCum: cumInterest,
        totalCum: cumPrincipal + cumInterest,
        balance
      });
    }
  }

  return { emi, totalInterest: cumInterest, totalPayment: cumPrincipal + cumInterest, yearly };
}

function renderHomeLoanRoofline(svgEl, yearly){
  const W = 640, H = 240, padL = 44, padR = 16, padT = 16, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxYear = yearly[yearly.length - 1].year || 1;
  const maxTotal = yearly[yearly.length - 1].totalCum || 1;

  const xScale = (year) => padL + (year / maxYear) * innerW;
  const yScale = (val) => padT + innerH - (val / maxTotal) * innerH;
  const baseY = padT + innerH;

  const totalPoints = yearly.map(d => `${xScale(d.year)},${yScale(d.totalCum)}`);
  const principalPoints = yearly.map(d => `${xScale(d.year)},${yScale(d.principalCum)}`);

  const totalPath = `M${padL},${baseY} L${totalPoints.join(' L')} L${xScale(maxYear)},${baseY} Z`;
  const principalPath = `M${padL},${baseY} L${principalPoints.join(' L')} L${xScale(maxYear)},${baseY} Z`;
  const ridgeLine = `M${principalPoints.join(' L')}`;

  let grid = '';
  for (let i = 1; i <= 3; i++){
    const gy = padT + (innerH / 4) * i;
    grid += `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="var(--line-soft)" stroke-width="1"/>`;
  }

  svgEl.innerHTML = `
    <rect x="0" y="0" width="${W}" height="${H}" fill="transparent"/>
    ${grid}
    <path d="${totalPath}" fill="var(--brass)" fill-opacity="0.55"/>
    <path d="${principalPath}" fill="var(--teal)" fill-opacity="0.9"/>
    <path d="${ridgeLine}" fill="none" stroke="var(--ink)" stroke-width="1.5"/>
    <line x1="${padL}" y1="${baseY}" x2="${W - padR}" y2="${baseY}" stroke="var(--ink-faint)" stroke-width="1"/>
    <text x="${padL}" y="${H - 6}" font-family="var(--font-mono)" font-size="10" fill="var(--ink-faint)">0</text>
    <text x="${W - padR}" y="${H - 6}" text-anchor="end" font-family="var(--font-mono)" font-size="10" fill="var(--ink-faint)">Yr ${maxYear}</text>
  `;
  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
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

    const result = amortizeHomeLoan(amount, rate, years);
    const feeAmount = amount * (feePct / 100);

    emiEl.textContent = Currency.format(result.emi, { decimals: 0 });
    totalInterestEl.textContent = Currency.format(result.totalInterest, { decimals: 0 });
    totalPaymentEl.textContent = Currency.format(result.totalPayment, { decimals: 0 });
    feeAmountEl.textContent = Currency.format(feeAmount, { decimals: 0 });

    if (chartEl) renderHomeLoanRoofline(chartEl, result.yearly);

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
