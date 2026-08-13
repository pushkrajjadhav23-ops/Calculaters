// ============================================================
// EMI Calculator (Equated Monthly Installment)
// Same fixed-rate amortization math as the mortgage calculator,
// generalized for any loan type, with a Years/Months tenure toggle.
// Reuses "The Roofline" chart: cumulative principal vs interest.
// ============================================================

function amortizeLoan(loanAmount, annualRatePct, months){
  const n = Math.max(1, Math.round(months));
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

// ---- Roofline SVG chart (same visual language as mortgage-calculator) ----
function renderEmiRoofline(svgEl, yearly){
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

    const result = amortizeLoan(amount, rate, months);

    emiEl.textContent = Currency.format(result.emi, { decimals: 0 });
    principalEl.textContent = Currency.format(amount, { decimals: 0 });
    totalInterestEl.textContent = Currency.format(result.totalInterest, { decimals: 0 });
    totalPaymentEl.textContent = Currency.format(result.totalPayment, { decimals: 0 });

    if (chartEl) renderEmiRoofline(chartEl, result.yearly);
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
      // convert the displayed number when switching units
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
