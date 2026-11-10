/* Who Borrows? Compares two ways to cover the same college gap:
   A) the student borrows federal Direct Loans first and parents cover the rest with Parent PLUS;
   B) parents borrow it all with Parent PLUS.
   Model (stated on the page):
   - Each year's amount is split into fall and spring disbursements (August and January).
   - Fees are taken out of each disbursement, so a family borrows a little more than it needs.
   - Interest builds during school (no payments) and is added to the balance when payments start,
     6 months after graduation (the student's grace period; parents can ask for the same deferment).
   - Repayment uses the Tiered Standard plan: 10/15/20/25 years by the balance entering repayment.
   - Later years use this year's rates and fees (future rates are set each July).
   Nothing typed here is saved or sent. */
(function(){
'use strict';
var P = window.PFC, F = P.FACTS;
var YEARS = 4;
var SPRING = 5/12;            /* January disbursement, 5 months after August */
var REPAY = YEARS + 0.25;     /* graduation in May of year 4 (3.75) + 6 months */

function $(id){ return document.getElementById(id); }

function readInputs(){
  return {
    net: P.parseMoney($('net').value),
    family: P.parseMoney($('family').value),
    student: P.parseMoney($('studentpay').value),
    grow: P.parsePct($('grow').value),
    parentAge: P.parseMoney($('parentage').value),
    salary: P.parseMoney($('salary').value),
    privRate: $('privrate').value.trim() === '' ? null : P.parsePct($('privrate').value),
    dRate: P.parsePct($('drate').value), dFee: P.parsePct($('dfee').value),
    pRate: P.parsePct($('prate').value), pFee: P.parsePct($('pfee').value)
  };
}

/* One plan: studentFirst = true (A) or false (B) */
function plan(inp, studentFirst){
  var rows = [], dAgg = 0, pAgg = 0;
  var loans = { s: { gross: 0, net: 0, accrued: 0 }, p: { gross: 0, net: 0, accrued: 0 }, x: { gross: 0, net: 0, accrued: 0 } };
  var uncovered = 0;
  var gap0 = Math.max(0, inp.net - inp.family - inp.student);
  for (var k = 0; k < YEARS; k++){
    var need = gap0 * Math.pow(1 + inp.grow, k);
    var remaining = need;
    var row = { year: k + 1, need: need, s: 0, p: 0, x: 0, left: 0 };
    var tMid = REPAY - k - SPRING / 2;   /* average time from the two disbursements to repayment */
    if (studentFirst && remaining > 0){
      var room = Math.min(F.direct.limits[k] != null ? F.direct.limits[k] : F.direct.limits[F.direct.limits.length - 1], F.direct.aggregate - dAgg);
      var gs = Math.max(0, Math.min(room, remaining / (1 - inp.dFee)));
      gs = P.round2(gs);
      dAgg += gs; row.s = gs;
      loans.s.gross += gs; loans.s.net += gs * (1 - inp.dFee); loans.s.accrued += gs * inp.dRate * tMid;
      remaining = Math.max(0, remaining - gs * (1 - inp.dFee));
    }
    if (remaining > 0.005){
      var proom = Math.min(F.plus.annualCap, F.plus.aggregateCap - pAgg);
      var gp = Math.max(0, Math.min(proom, remaining / (1 - inp.pFee)));
      gp = P.round2(gp);
      pAgg += gp; row.p = gp;
      loans.p.gross += gp; loans.p.net += gp * (1 - inp.pFee); loans.p.accrued += gp * inp.pRate * tMid;
      remaining = Math.max(0, remaining - gp * (1 - inp.pFee));
    }
    if (remaining > 0.005 && inp.privRate != null){
      var gx = P.round2(remaining);
      row.x = gx;
      loans.x.gross += gx; loans.x.net += gx; loans.x.accrued += gx * inp.privRate * tMid;
      remaining = 0;
    }
    if (remaining < 0.005) remaining = 0;
    row.left = remaining; uncovered += remaining;
    rows.push(row);
  }
  function repay(l, rate, years){
    var bal = l.gross + l.accrued;
    var yrs = years || P.tierYears(bal);
    var pay = P.payment(bal, rate, yrs);
    var total = pay * yrs * 12;
    return { gross: l.gross, net: l.net, fees: l.gross - l.net, accrued: l.accrued, balance: bal, years: yrs,
      monthly: pay, total: total, cost: total - l.net };
  }
  return {
    gap0: gap0, rows: rows, uncovered: uncovered,
    s: loans.s.gross > 0 ? repay(loans.s, inp.dRate) : null,
    p: loans.p.gross > 0 ? repay(loans.p, inp.pRate) : null,
    x: loans.x.gross > 0 ? repay(loans.x, inp.privRate, 10) : null
  };
}

function whoBlock(title, note, r, ageNow, inp, kind){
  var m = P.money;
  var h = '<div class="who"><h5>' + title + '</h5>';
  h += '<dl class="kv">';
  h += '<dt>Borrowed over 4 years</dt><dd>' + m(r.gross) + '</dd>';
  if (r.fees > 0.5) h += '<dt>Fees taken out first</dt><dd>' + m(r.fees) + '</dd>';
  h += '<dt>Interest added during school</dt><dd>' + m(r.accrued) + '</dd>';
  h += '<dt>Balance when payments start</dt><dd>' + m(r.balance) + '</dd>';
  h += '<dt>Payment plan</dt><dd>' + r.years + ' years</dd>';
  h += '<dt class="tot">Monthly payment</dt><dd class="tot">' + m(r.monthly) + '</dd>';
  h += '<dt>Total paid back</dt><dd>' + m(r.total) + '</dd>';
  h += '<dt>Cost beyond what college received</dt><dd>' + m(r.cost) + '</dd>';
  if (ageNow > 0) h += '<dt>' + (kind === 'p' ? 'Parent’s age at the last payment' : 'Student’s age at the last payment') + '</dt><dd>about ' + Math.round(ageNow + REPAY + r.years) + '</dd>';
  if (kind === 's' && inp.salary > 0) h += '<dt>Share of starting pay (before tax)</dt><dd>' + P.pctText(r.monthly / (inp.salary / 12), 1) + '</dd>';
  h += '</dl>';
  if (note) h += '<p class="small muted">' + note + '</p>';
  return h + '</div>';
}

function card(label, letter, pl, inp){
  var m = P.money;
  var monthly = (pl.s ? pl.s.monthly : 0) + (pl.p ? pl.p.monthly : 0) + (pl.x ? pl.x.monthly : 0);
  var total = (pl.s ? pl.s.total : 0) + (pl.p ? pl.p.total : 0) + (pl.x ? pl.x.total : 0);
  var h = '<div class="result" data-plan="' + letter + '"><h4>' + label + '</h4>';
  h += '<p class="bigline">Family total paid back: <b class="num">' + m(total) + '</b><br>Monthly payments after graduation, all loans: <b class="num">' + m(monthly) + '</b></p>';
  if (pl.s) h += whoBlock('In the student’s name: federal Direct Loans', 'Fixed ' + P.pctText(inp.dRate, 2) + '. Your student can also choose RAP, an income-based plan, after graduation; the standard plan is shown.', pl.s, 18, inp, 's');
  if (pl.p) h += whoBlock('In a parent’s name: Parent PLUS', 'Fixed ' + P.pctText(inp.pRate, 2) + '. New Parent PLUS loans can only use the Tiered Standard plan: no income-based plan and no Public Service Loan Forgiveness.', pl.p, inp.parentAge, inp, 'p');
  if (pl.x) h += whoBlock('Private loan (usually the student, with a parent as co-signer)', 'Your rate of ' + P.pctText(inp.privRate, 2) + ' over 10 years. A co-signer owes the loan if the student can’t pay. Get real quotes; rates depend on credit.', pl.x, 18, inp, 'x');
  if (!pl.s && !pl.p && !pl.x) h += '<p class="muted">Nothing to borrow: savings and income cover the net price.</p>';
  if (pl.uncovered > 0.5){
    var last = pl.rows.filter(function(r){ return r.left > 0.5; });
    h += '<div class="uncov"><b>Not covered by federal loans: ' + m(pl.uncovered) + '</b> over four years (' +
      last.map(function(r){ return 'year ' + r.year + ': ' + m(r.left); }).join(', ') +
      '). Families cover this with more savings, a private loan, or a lower-cost college. Enter a private loan rate above to include one.</div>';
  }
  h += '</div>';
  return h;
}

function table(pl){
  var m = P.money;
  var h = '<div class="tbl-wrap"><table><thead><tr><th>Year</th><th class="r">To cover</th><th class="r">Student loan</th><th class="r">Parent PLUS</th><th class="r">Private</th><th class="r">Not covered</th></tr></thead><tbody>';
  pl.rows.forEach(function(r){
    h += '<tr><td>' + r.year + '</td><td class="r">' + m(r.need) + '</td><td class="r">' + m(r.s) + '</td><td class="r">' + m(r.p) + '</td><td class="r">' + m(r.x) + '</td><td class="r">' + m(r.left) + '</td></tr>';
  });
  return h + '</tbody></table></div>';
}

function render(){
  var inp = readInputs();
  var A = plan(inp, true), B = plan(inp, false);
  var m = P.money;
  var out = $('out');
  if (A.gap0 <= 0){
    out.innerHTML = '<div class="result"><h4>Nothing to borrow in year 1</h4><p class="muted">What your family and student can pay covers the net price you entered. Change the numbers above to see what borrowing would look like.</p></div>';
    $('gapline').textContent = m(0);
    return;
  }
  $('gapline').textContent = m(A.gap0);
  var h = '<div class="scen">' + card('A. Student borrows first, parents cover the rest', 'A', A, inp) + card('B. Parents borrow it all', 'B', B, inp) + '</div>';
  var tA = (A.s ? A.s.total : 0) + (A.p ? A.p.total : 0) + (A.x ? A.x.total : 0);
  var tB = (B.s ? B.s.total : 0) + (B.p ? B.p.total : 0) + (B.x ? B.x.total : 0);
  var debtA = A.p ? A.p.gross : 0, debtB = B.p ? B.p.gross : 0;
  h += '<div class="card"><h4>The difference in numbers</h4><ul class="qs">';
  h += '<li>Parent PLUS borrowed: <b>' + m(debtA) + '</b> in A, <b>' + m(debtB) + '</b> in B.</li>';
  h += '<li>Family total paid back: <b>' + m(tA) + '</b> in A, <b>' + m(tB) + '</b> in B' + (Math.abs(tA - tB) > 1 ? ' (a difference of ' + m(Math.abs(tA - tB)) + ')' : '') + '.</li>';
  h += '<li>Not covered by federal loans: <b>' + m(A.uncovered) + '</b> in A, <b>' + m(B.uncovered) + '</b> in B.</li>';
  h += '</ul><p class="small muted">A plan that covers less has a smaller total because it borrows less. Compare the “not covered” line too: that money still has to come from somewhere.</p></div>';
  h += '<details class="more"><summary>Year-by-year: plan A</summary>' + table(A) + '</details>';
  h += '<details class="more"><summary>Year-by-year: plan B</summary>' + table(B) + '</details>';
  out.innerHTML = h;
}

document.addEventListener('DOMContentLoaded', function(){
  var q = new URLSearchParams(location.search);
  if (q.get('net')){ var v = P.parseMoney(q.get('net')); if (v > 0) $('net').value = Math.round(v).toLocaleString('en-US'); }
  if (q.get('name')) { var n = $('fromname'); n.textContent = 'From the Award Letter Decoder: ' + q.get('name').slice(0, 80) + '.'; n.hidden = false; }
  $('drate').value = (F.direct.rate * 100).toFixed(2); $('dfee').value = (F.direct.fee * 100).toFixed(3);
  $('prate').value = (F.plus.rate * 100).toFixed(2); $('pfee').value = (F.plus.fee * 100).toFixed(3);
  P.moneyInputs();
  document.querySelectorAll('#form input').forEach(function(i){ i.addEventListener('input', render); });
  $('reset-rates').addEventListener('click', function(){
    $('drate').value = (F.direct.rate * 100).toFixed(2); $('dfee').value = (F.direct.fee * 100).toFixed(3);
    $('prate').value = (F.plus.rate * 100).toFixed(2); $('pfee').value = (F.plus.fee * 100).toFixed(3); render();
  });
  $('print').addEventListener('click', function(){ window.print(); });
  if (P.collegeData().groups.length){
    $('quick').hidden = false;
    $('qc-college').innerHTML = P.collegeOptions('');
    $('qc-college').addEventListener('change', quick);
    $('qc-income').addEventListener('change', quick);
  }
  render();
});

/* Quick check: fill the net price from the College Scorecard snapshot */
function quick(){
  var c = P.findCollege($('qc-college').value), inc = $('qc-income').value, note = $('qc-note'), m = P.money;
  var y = P.collegeData().year, yr = ' (federal College Scorecard, most recent year reported)', yrCost = y ? ' (' + P.esc(y) + ' published cost)' : '';
  if (!c){ note.innerHTML = ''; return; }
  var calc = c.npc ? ' <a href="' + P.esc(c.npc) + '" target="_blank" rel="noopener">Net price calculator \u2197</a>' : '';
  var v = null, msg = '';
  if (P.netPricesApply(c)){
    if (inc !== '' && c.nb[Number(inc)] != null){ v = c.nb[Number(inc)]; msg = 'Families earning ' + P.BRACKETS[Number(inc)] + ' who applied for aid paid ' + m(v) + ' a year on average at ' + P.esc(c.n) + ' after grants' + yr + '.'; }
    else if (c.avg != null){ v = c.avg; msg = 'Families who applied for aid paid ' + m(v) + ' a year on average at ' + P.esc(c.n) + ' after grants' + yr + '. Choose your income range for a closer number.'; }
  } else {
    var k = P.collegeCost(c); v = k.tuition + k.housing + k.other;
    msg = 'Full published cost for an out-of-state student at ' + P.esc(c.n) + ': ' + m(v) + ' a year' + yrCost + ', before any merit aid. Federal averages after grants there are for in-state students, so they don\u2019t fit a Colorado family.';
  }
  if (v != null){ $('net').value = Math.round(v).toLocaleString('en-US'); render(); }
  else msg = 'No federal average is reported for that income range at ' + P.esc(c.n) + '.';
  note.innerHTML = '<p class="small" style="margin:6px 0 0">' + msg + ' Costs have likely gone up since.' + calc + '</p>';
}

window.PFC_WB = { plan: plan, REPAY: REPAY };
})();
