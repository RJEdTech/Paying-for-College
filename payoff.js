/* Loan Payoff: monthly payment, payoff date and interest for one loan balance,
   with and without an extra amount each month. Federal loans made after July 1, 2026 use the
   Tiered Standard plan (term set by the balance). Nothing typed here is saved or sent. */
(function(){
'use strict';
var P = window.PFC, F = P.FACTS;
var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function $(id){ return document.getElementById(id); }

/* Month-by-month payoff. Returns balances (one per month, starting balance first), months, interest. */
function amortize(bal, rate, base, extra){
  var i = rate / 12, b = bal, n = 0, interest = 0, pts = [b], paid = 0;
  var pay = base + (extra || 0);
  if (b <= 0 || pay <= 0) return { months: 0, interest: 0, paid: 0, pts: pts };
  while (b > 0.005 && n < 600){
    var int = b * i;
    if (pay <= int + 0.0001 && n > 0){ n = Infinity; break; }
    var p = Math.min(pay, b + int);
    b = b + int - p; interest += int; paid += p; n++; pts.push(Math.max(0, b));
  }
  return { months: n, interest: interest, paid: paid, pts: pts };
}
function fmtTime(m){
  if (!isFinite(m)) return 'never (payment too small)';
  var y = Math.floor(m / 12), r = m % 12;
  return (y ? y + (y === 1 ? ' year' : ' years') : '') + (y && r ? ', ' : '') + (r ? r + (r === 1 ? ' month' : ' months') : '') || '0 months';
}
function endDate(startY, startM, months){
  if (!startY || !isFinite(months)) return '';
  var t = startY * 12 + startM + months - 1;
  return MONTHS[t % 12] + ' ' + Math.floor(t / 12);
}

/* Balance-over-time chart: plain SVG, colors from the page theme */
function chart(a, b, startY, startM){
  var W = Math.max(300, Math.min(640, ($('out').clientWidth || 640) - 40)), H = W < 480 ? 220 : 250, L = 56, R = 16, T = 16, B = 34;
  var maxM = Math.max(a.pts.length, b.pts.length) - 1 || 1, maxB = a.pts[0] || 1;
  var X = function(m){ return L + m / maxM * (W - L - R); }, Y = function(v){ return T + (1 - v / maxB) * (H - T - B); };
  function path(pts){ return pts.map(function(v, k){ return (k ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(''); }
  var g = '';
  var stepY = maxB > 80000 ? 20000 : maxB > 30000 ? 10000 : 5000;
  for (var v = 0; v <= maxB + 1; v += stepY) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="var(--line)"/><text x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end" font-size="13" fill="var(--muted)">' + (v ? '$' + (v / 1000) + 'k' : '$0') + '</text>';
  var yrs = Math.ceil(maxM / 12), stepX = yrs > 15 ? 5 : yrs > 6 ? (W < 480 ? 4 : 2) : 1;
  for (var y = 0; y <= yrs; y += stepX){ var xm = Math.min(y * 12, maxM); g += '<text x="' + X(xm) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="13" fill="var(--muted)">' + (startY ? startY + y : y + ' yr') + '</text>'; }
  var lab = function(pl, color, txt){ var m = pl.pts.length - 1; return '<circle cx="' + X(m) + '" cy="' + Y(0) + '" r="5" fill="' + color + '"/>'; };
  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="lc" role="img" aria-label="Balance over time: paid off in ' + fmtTime(a.months) + ' on the plan' + (b !== a ? ', ' + fmtTime(b.months) + ' with the extra payment' : '') + '">' + g +
    '<path d="' + path(a.pts) + '" fill="none" stroke="var(--c-loan)" stroke-width="3"/>' + lab(a, 'var(--c-loan)') +
    (b !== a ? '<path d="' + path(b.pts) + '" fill="none" stroke="var(--c-free)" stroke-width="3"/>' + lab(b, 'var(--c-free)') : '') + '</svg>';
  return svg;
}

function render(){
  var m = P.money;
  var bal = P.parseMoney($('bal').value), rate = P.parsePct($('rate').value), extra = P.parseMoney($('extra').value);
  var termSel = $('term').value, type = $('type').value;
  var years = termSel === 'auto' ? P.tierYears(bal) : Number(termSel);
  $('autonote').textContent = termSel === 'auto' ? 'The federal plan for this balance: ' + years + ' years' : '';
  var startY = Number($('starty').value) || 0, startM = 10; /* payments start in November: 6 months after a May graduation */
  var out = $('out');
  if (bal <= 0){ out.innerHTML = '<p class="muted">Enter a loan balance, or pick a starting point above.</p>'; return; }
  var base = P.payment(bal, rate, years);
  var a = amortize(bal, rate, base, 0), b = extra > 0 ? amortize(bal, rate, base, extra) : a;
  var h = '<div class="scen">';
  h += '<div class="result"><h4>On the ' + years + '-year plan</h4><p class="bigline">Monthly payment: <b class="num">' + m(base) + '</b><br>Paid off in ' + fmtTime(a.months) + (startY ? ' (' + endDate(startY, startM, a.months) + ')' : '') + '<br>Interest paid: <b class="num">' + m(a.interest) + '</b></p></div>';
  if (extra > 0) h += '<div class="result"><h4>Paying ' + m(extra) + ' more each month</h4><p class="bigline">Monthly payment: <b class="num">' + m(base + extra) + '</b><br>Paid off in ' + fmtTime(b.months) + (startY ? ' (' + endDate(startY, startM, b.months) + ')' : '') + '<br>Interest paid: <b class="num">' + m(b.interest) + '</b></p>' +
    '<p class="saved">Saves <b>' + m(a.interest - b.interest) + '</b> and ' + fmtTime(a.months - b.months) + '.</p></div>';
  else h += '<div class="result"><h4>Try paying a little more</h4><p class="muted">Add an extra amount each month above to see how much sooner the loan is gone and how much interest you keep.</p><div class="btns" style="margin:0">' +
    [50, 100, 250].map(function(v){ return '<button type="button" class="btn ghost" data-extra="' + v + '">+$' + v + ' a month</button>'; }).join('') + '</div></div>';
  h += '</div>';
  h += '<div class="card"><h4 style="margin-top:0">What’s left to pay, year by year</h4>' + chart(a, b, startY, startM) +
    '<div class="legend"><span><i class="dot" style="background:var(--c-loan)"></i>' + years + '-year plan</span>' + (extra > 0 ? '<span><i class="dot" style="background:var(--c-free)"></i>With ' + m(extra) + ' extra a month</span>' : '') + '</div></div>';
  /* Where each dollar goes */
  var bars = [[years + '-year plan', a]].concat(extra > 0 ? [['With extra', b]] : []);
  var maxPaid = Math.max.apply(null, bars.map(function(x){ return x[1].paid; }));
  h += '<div class="card"><h4 style="margin-top:0">Total paid: the loan vs. the interest</h4><div class="ychart cmp">';
  bars.forEach(function(x){
    var pl = x[1];
    h += '<div class="yrow cmprow"><span class="ylab">' + x[0] + '</span><div class="ytrack" role="img" aria-label="' + x[0] + ': ' + m(bal) + ' borrowed plus ' + m(pl.interest) + ' interest"><div class="bar" style="width:' + (pl.paid / maxPaid * 100).toFixed(2) + '%">' +
      '<span style="width:' + (bal / pl.paid * 100).toFixed(2) + '%;background:var(--c-ws)"></span><span style="width:' + (pl.interest / pl.paid * 100).toFixed(2) + '%;background:var(--c-gap)"></span></div></div><span class="yval num">' + m(pl.paid) + '</span></div>';
  });
  h += '</div><div class="legend"><span><i class="dot" style="background:var(--c-ws)"></i>The loan itself ' + m(bal) + '</span><span><i class="dot" style="background:var(--c-gap)"></i>Interest</span></div></div>';
  /* Share of pay */
  var pay = P.parseMoney($('pay').value);
  if (pay > 0){
    var share = base / (pay / 12);
    h += '<div class="card"><h4 style="margin-top:0">Payment as a share of pay</h4><div class="bar" role="img" aria-label="' + P.pctText(share, 1) + ' of monthly pay before tax" style="height:22px"><span style="width:' + Math.min(100, share * 100).toFixed(2) + '%;background:var(--c-loan)"></span></div>' +
      '<p class="small" style="margin:6px 0 0"><b>' + P.pctText(share, 1) + '</b> of ' + m(pay / 12) + ' monthly pay before tax. A common guideline keeps student loan payments near 10% of pay or less.</p></div>';
  }
  if (type === 's') h += '<p class="small muted">Student federal loans can also be repaid on RAP, a plan based on income. Use the federal <a href="https://studentaid.gov/loan-simulator/" target="_blank" rel="noopener">Loan Simulator</a> to compare.</p>';
  if (type === 'p') h += '<p class="small muted">New Parent PLUS loans can only use the Tiered Standard plan. Extra payments go to the balance, and the payoff comes sooner.</p>';
  out.innerHTML = h;
  out.querySelectorAll('[data-extra]').forEach(function(btn){ btn.addEventListener('click', function(){ $('extra').value = btn.getAttribute('data-extra'); render(); }); });
}

function setType(t){
  $('type').value = t;
  if (t === 's') $('rate').value = (F.direct.rate * 100).toFixed(2);
  if (t === 'p') $('rate').value = (F.plus.rate * 100).toFixed(2);
  $('ratewrap').querySelector('.hint').textContent = t === 'x' ? 'Your lender’s rate' : 'Fixed federal rate for loans made in ' + F.year;
}

document.addEventListener('DOMContentLoaded', function(){
  var q = new URLSearchParams(location.search);
  var sy = $('starty'), now = new Date().getFullYear();
  var opts = '<option value="">Not set</option>';
  for (var y = now; y <= now + 10; y++) opts += '<option value="' + y + '"' + (y === now + 5 ? ' selected' : '') + '>November ' + y + '</option>';
  sy.innerHTML = opts;
  setType(q.get('type') === 'p' ? 'p' : q.get('type') === 'x' ? 'x' : 's');
  if (q.get('bal')){ var v = P.parseMoney(q.get('bal')); if (v > 0) $('bal').value = Math.round(v).toLocaleString('en-US'); }
  if (q.get('rate')){ var r = Number(q.get('rate')); if (r > 0 && r < 30) $('rate').value = r.toFixed(2); }
  if (q.get('who')){ var n = $('from'); n.textContent = 'From Who Borrows?: ' + q.get('who').slice(0, 60) + '.'; n.hidden = false; }
  P.moneyInputs();
  ['bal', 'rate', 'extra', 'pay'].forEach(function(id){ $(id).addEventListener('input', render); });
  ['term', 'starty'].forEach(function(id){ $(id).addEventListener('change', render); });
  $('type').addEventListener('change', function(){ setType($('type').value); render(); });
  document.querySelectorAll('[data-start]').forEach(function(btn){
    btn.addEventListener('click', function(){
      $('bal').value = Number(btn.getAttribute('data-start')).toLocaleString('en-US');
      setType(btn.getAttribute('data-type')); render();
    });
  });
  $('print').addEventListener('click', function(){ window.print(); });
  var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(render, 200); });
  render();
});
window.PFC_PO = { amortize: amortize };
})();
