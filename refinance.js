// ============================================================
// Refinance Breakeven Calculator
// Compares current vs new monthly payment, then charts
// cumulative net savings (savings so far minus closing costs)
// month by month. The Roofline here is the savings curve
// crossing from below zero (still paying off closing costs)
// to above zero (net ahead) — the breakeven point.
// ============================================================

function monthlyPayment(balance, annualRatePct, years){
  const n = Math.max(1, Math.round(years * 12));
  const r = (annualRatePct / 100) / 12;
  if (r === 0) return balance / n;
  return balance * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

function buildSavingsCurve(monthlySavings, closingCosts, months){
  const points = [];
  for (let m = 0; m <= months; m++){
    points.push({ month: m, net: monthlySavings * m - closingCosts });
  }
  return points;
}

// ---- Roofline SVG chart: net savings curve crossing zero ----
function renderSavingsRoofline(svgEl, points, breakevenMonth){
  const W = 640, H = 240, padL = 54, padR = 16, padT = 16, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxMonth = points[points.length - 1].month || 1;
  const values = points.map(p => p.net);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, -1);
  const range = maxVal - minVal || 1;

  const xScale = (m) => padL + (m / maxMonth) * innerW;
  const yScale = (v) => padT + innerH - ((v - minVal) / range) * innerH;
  const zeroY = yScale(0);

  const linePoints = points.map(p => `${xScale(p.month)},${yScale(p.net)}`);
  const areaPath = `M${padL},${zeroY} L${linePoints.join(' L')} L${xScale(maxMonth)},${zeroY} Z`;
  const ridgeLine = `M${linePoints.join(' L')}`;

  let grid = '';
  for (let i = 1; i <= 3; i++){
    const gy = padT + (innerH / 4) * i;
    grid += `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="var(--line-soft)" stroke-width="1"/>`;
  }

  let breakevenMark = '';
  if (breakevenMonth !== null && breakevenMonth <= maxMonth){
    const bx = xScale(breakevenMonth);
    breakevenMark = `
      <line x1="${bx}" y1="${padT}" x2="${bx}" y2="${zeroY}" stroke="var(--ink)" stroke-width="1" stroke-dasharray="3,3"/>
      <circle cx="${bx}" cy="${zeroY}" r="4" fill="var(--ink)"/>
      <text x="${bx}" y="${padT - 4}" text-anchor="middle" font-family="var(--font-mono)" font-size="10" fill="var(--ink)">Breakeven</text>
    `;
  }

  // clip so fill above zero renders teal, below renders brass — use two clipped rects
  const clipId = 'clipAbove' + Math.random().toString(36).slice(2,8);
  const clipId2 = 'clipBelow' + Math.random().toString(36).slice(2,8);

  svgEl.innerHTML = `
    <defs>
      <clipPath id="${clipId}"><rect x="0" y="0" width="${W}" height="${zeroY}"/></clipPath>
      <clipPath id="${clipId2}"><rect x="0" y="${zeroY}" width="${W}" height="${H - zeroY}"/></clipPath>
    </defs>
    <rect x="0" y="0" width="${W}" height="${H}" fill="transparent"/>
    ${grid}
    <path d="${areaPath}" fill="var(--teal)" fill-opacity="0.55" clip-path="url(#${clipId})"/>
    <path d="${areaPath}" fill="var(--brass)" fill-opacity="0.55" clip-path="url(#${clipId2})"/>
    <path d="${ridgeLine}" fill="none" stroke="var(--ink)" stroke-width="1.5"/>
    <line x1="${padL}" y1="${zeroY}" x2="${W - padR}" y2="${zeroY}" stroke="var(--ink-faint)" stroke-width="1"/>
    ${breakevenMark}
    <text x="${padL}" y="${H - 6}" font-family="var(--font-mono)" font-size="10" fill="var(--ink-faint)">0 mo</text>
    <text x="${W - padR}" y="${H - 6}" text-anchor="end" font-family="var(--font-mono)" font-size="10" fill="var(--ink-faint)">${maxMonth} mo</text>
  `;
  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
}

// ============================================================
// UI binding
// ============================================================
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

    let breakevenMonth = null;
    if (savings > 0){
      breakevenMonth = Math.ceil(closing / savings);
      breakevenEl.textContent = breakevenMonth + ' months';
      breakevenNote.textContent = `That's about ${(breakevenMonth / 12).toFixed(1)} years to recover your closing costs.`;
    } else {
      breakevenEl.textContent = '—';
      breakevenNote.textContent = 'Your new payment isn\u2019t lower than your current one, so this refinance wouldn\u2019t pay for itself on monthly savings alone.';
    }

    const chartMonths = breakevenMonth ? Math.min(Math.max(breakevenMonth * 2, 24), 240) : 60;
    const points = buildSavingsCurve(savings, closing, chartMonths);
    if (chartEl) renderSavingsRoofline(chartEl, points, breakevenMonth);
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
