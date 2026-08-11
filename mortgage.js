// ============================================================
// Mortgage Calculator
// Standard fixed-rate amortization math + live UI binding +
// "Roofline" chart: cumulative principal (teal) vs interest
// (brass) paid over the life of the loan. The ridge where teal
// meets brass is the crossover point — when principal overtakes
// interest in each payment.
// ============================================================

function amortize(loanAmount, annualRatePct, years){
  const n = Math.max(1, Math.round(years * 12));
  const r = (annualRatePct / 100) / 12;

  const monthlyPayment = r === 0
    ? loanAmount / n
    : loanAmount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);

  let balance = loanAmount;
  let cumPrincipal = 0;
  let cumInterest = 0;
  const yearly = [{ year: 0, principalCum: 0, interestCum: 0, totalCum: 0 }];

  for (let m = 1; m <= n; m++){
    const interest = balance * r;
    let principal = monthlyPayment - interest;
    if (m === n) principal = balance; // clean up rounding on final payment
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

  return {
    monthlyPayment,
    totalInterest: cumInterest,
    totalCost: cumPrincipal + cumInterest,
    yearly
  };
}

// ---- Roofline SVG chart ----
function renderRoofline(svgEl, yearly){
  const W = 640, H = 240, padL = 44, padR = 16, padT = 16, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxYear = yearly[yearly.length - 1].year;
  const maxTotal = yearly[yearly.length - 1].totalCum || 1;

  const xScale = (year) => padL + (year / maxYear) * innerW;
  const yScale = (val) => padT + innerH - (val / maxTotal) * innerH;
  const baseY = padT + innerH;

  const totalPoints = yearly.map(d => `${xScale(d.year)},${yScale(d.totalCum)}`);
  const principalPoints = yearly.map(d => `${xScale(d.year)},${yScale(d.principalCum)}`);

  const totalPath = `M${padL},${baseY} L${totalPoints.join(' L')} L${xScale(maxYear)},${baseY} Z`;
  const principalPath = `M${padL},${baseY} L${principalPoints.join(' L')} L${xScale(maxYear)},${baseY} Z`;
  const ridgeLine = `M${principalPoints.join(' L')}`;

  // gridlines (quarter marks)
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

    const result = amortize(loanAmount, rate, years);

    payoutEl.textContent = Currency.format(result.monthlyPayment, { decimals: 0 });
    loanAmtEl.textContent = Currency.format(loanAmount, { decimals: 0 });
    totalInterestEl.textContent = Currency.format(result.totalInterest, { decimals: 0 });
    totalCostEl.textContent = Currency.format(result.totalCost, { decimals: 0 });

    if (chartEl) renderRoofline(chartEl, result.yearly);
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
