/* Who Borrows? Compares two ways to cover the same college bill:
   A) the student borrows federal Direct Loans first and parents cover the rest with Parent PLUS;
   B) parents borrow it all with Parent PLUS.
   Each year: net price (rising by the family's %) − what the family and student pay from income
   − savings put down (used in the first years, or spread evenly) = the amount to finance.
   Model (stated on the page):
   - Each year's loan is split into fall and spring disbursements (August and January).
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
var DOWN_STEPS = [0, 10000, 25000, 50000, 75000, 100000];
var COLORS = { save: '--c-free', fam: '--c-fam', stu: '--c-stu', s: '--c-ws', p: '--c-loan', x: '--c-priv', left: '--c-gap' };
var LABELS = { save: 'Savings put down', fam: 'Family income', stu: 'Student pays', s: 'Student loan', p: 'Parent PLUS', x: 'Private loan', left: 'Not covered' };

function $(id){ return document.getElementById(id); }

function readInputs(){
  return {
    net: P.parseMoney($('net').value),
    family: P.parseMoney($('family').value),
    student: P.parseMoney($('studentpay').value),
    down: P.parseMoney($('down').value),
    downMode: $('downmode').value,
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
  var rows = [], dAgg = 0, pAgg = 0, downLeft = Math.max(0, inp.down || 0), carry = 0;
  var loans = { s: { gross: 0, net: 0, accrued: 0 }, p: { gross: 0, net: 0, accrued: 0 }, x: { gross: 0, net: 0, accrued: 0 } };
  var uncovered = 0, financed = 0, saveUsed = 0;
  for (var k = 0; k < YEARS; k++){
    var cost = Math.max(0, inp.net * Math.pow(1 + inp.grow, k));
    var fam = Math.min(inp.family, cost);
    var stu = Math.min(inp.student, cost - fam);
    var rem = cost - fam - stu;
    var save;
    if (inp.downMode === 'even'){ var share = (inp.down || 0) / YEARS + carry; save = Math.min(rem, share); carry = share - save; }
    else save = Math.min(rem, downLeft);
    downLeft -= save; saveUsed += save;
    var need = rem - save, remaining = need;
    financed += need;
    var row = { year: k + 1, cost: cost, fam: fam, stu: stu, save: save, need: need, s: 0, p: 0, x: 0, sNet: 0, pNet: 0, xNet: 0, left: 0 };
    var tMid = REPAY - k - SPRING / 2;   /* average time from the two disbursements to repayment */
    if (studentFirst && remaining > 0.005){
      var room = Math.min(F.direct.limits[Math.min(k, F.direct.limits.length - 1)], F.direct.aggregate - dAgg);
      var gs = P.round2(Math.max(0, Math.min(room, remaining / (1 - inp.dFee))));
      dAgg += gs; row.s = gs; row.sNet = gs * (1 - inp.dFee);
      loans.s.gross += gs; loans.s.net += row.sNet; loans.s.accrued += gs * inp.dRate * tMid;
      remaining = Math.max(0, remaining - row.sNet);
    }
    if (remaining > 0.005){
      var proom = Math.min(F.plus.annualCap, F.plus.aggregateCap - pAgg);
      var gp = P.round2(Math.max(0, Math.min(proom, remaining / (1 - inp.pFee))));
      pAgg += gp; row.p = gp; row.pNet = gp * (1 - inp.pFee);
      loans.p.gross += gp; loans.p.net += row.pNet; loans.p.accrued += gp * inp.pRate * tMid;
      remaining = Math.max(0, remaining - row.pNet);
    }
    if (remaining > 0.005 && inp.privRate != null){
      var gx = P.round2(remaining);
      row.x = gx; row.xNet = gx;
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
  var out = {
    rows: rows, uncovered: uncovered, financed: financed, saveUsed: saveUsed, gap0: rows[0].need,
    s: loans.s.gross > 0 ? repay(loans.s, inp.dRate) : null,
    p: loans.p.gross > 0 ? repay(loans.p, inp.pRate) : null,
    x: loans.x.gross > 0 ? repay(loans.x, inp.privRate, 10) : null
  };
  out.monthly = (out.s ? out.s.monthly : 0) + (out.p ? out.p.monthly : 0) + (out.x ? out.x.monthly : 0);
  out.total = (out.s ? out.s.total : 0) + (out.p ? out.p.total : 0) + (out.x ? out.x.total : 0);
  out.received = (out.s ? out.s.net : 0) + (out.p ? out.p.net : 0) + (out.x ? out.x.net : 0);
  return out;
}

/* ---------- Pictures (plain HTML bars, numbers always written beside them) ---------- */
function seg(v, total, key){
  if (v <= 0.5 || total <= 0) return '';
  return '<span style="width:' + (v / total * 100).toFixed(2) + '%;background:var(' + COLORS[key] + ')" title="' + LABELS[key] + ': ' + P.money(v) + '"></span>';
}
function legend(keys){
  return '<div class="legend">' + keys.map(function(k){ return '<span><i class="dot" style="background:var(' + COLORS[k] + ')"></i>' + LABELS[k] + '</span>'; }).join('') + '</div>';
}
/* Who pays for each year of college */
function yearChart(pl){
  var m = P.money, max = Math.max.apply(null, pl.rows.map(function(r){ return r.cost; })) || 1;
  var used = {};
  var h = '<div class="ychart" role="img" aria-label="Who pays for each year: ' + pl.rows.map(function(r){
    return 'year ' + r.year + ' ' + m(r.cost) + ', borrowed ' + m(r.sNet + r.pNet + r.xNet) + (r.left > 0.5 ? ', not covered ' + m(r.left) : '');
  }).join('; ') + '">';
  pl.rows.forEach(function(r){
    var parts = { save: r.save, fam: r.fam, stu: r.stu, s: r.sNet, p: r.pNet, x: r.xNet, left: r.left };
    Object.keys(parts).forEach(function(k){ if (parts[k] > 0.5) used[k] = 1; });
    h += '<div class="yrow"><span class="ylab">Year ' + r.year + '</span><div class="ytrack"><div class="bar" style="width:' + (r.cost / max * 100).toFixed(2) + '%">' +
      seg(r.save, r.cost, 'save') + seg(r.fam, r.cost, 'fam') + seg(r.stu, r.cost, 'stu') + seg(r.sNet, r.cost, 's') + seg(r.pNet, r.cost, 'p') + seg(r.xNet, r.cost, 'x') + seg(r.left, r.cost, 'left') +
      '</div></div><span class="yval num">' + m(r.cost) + '</span></div>';
  });
  h += '</div>';
  return h + legend(['save', 'fam', 'stu', 's', 'p', 'x', 'left'].filter(function(k){ return used[k]; }));
}
/* Repayment timeline: years after starting college, shared scale across both plans */
function timeline(pl, inp, scaleYears){
  var W = function(y){ return (y / scaleYears * 100).toFixed(2) + '%'; };
  var h = '<div class="tl" role="img" aria-label="Timeline: four years of college, then ' +
    (pl.s ? 'the student pays ' + P.money(pl.s.monthly) + ' a month for ' + pl.s.years + ' years' : '') +
    (pl.s && pl.p ? ' and ' : '') + (pl.p ? 'parents pay ' + P.money(pl.p.monthly) + ' a month for ' + pl.p.years + ' years' : '') + '">';
  h += '<div class="tlrow"><span class="tllab">College</span><div class="tltrack"><span class="tlbar school" style="left:0;width:' + W(YEARS) + '"></span></div></div>';
  function row(lab, r, startAge, key){
    if (!r) return '';
    var a0 = startAge > 0 ? Math.round(startAge + REPAY) : null, a1 = startAge > 0 ? Math.round(startAge + REPAY + r.years) : null;
    return '<div class="tlrow"><span class="tllab">' + lab + '</span><div class="tltrack"><span class="tlbar" style="left:' + W(REPAY) + ';width:' + W(r.years) + ';background:var(' + COLORS[key] + ')"></span>' +
      '<span class="tlnote" style="left:' + W(REPAY) + '">' + P.money(r.monthly) + '/mo for ' + r.years + ' yrs' + (a0 ? ' · age ' + a0 + '–' + a1 : '') + '</span></div></div>';
  }
  h += row('Student', pl.s, 18, 's') + row('Parents', pl.p, inp.parentAge, 'p') + row('Private', pl.x, 18, 'x');
  var ticks = '';
  for (var t = 0; t <= scaleYears; t += 5) ticks += '<span style="left:' + W(t) + '">' + t + '</span>';
  h += '<div class="tlrow"><span class="tllab"></span><div class="tlaxis">' + ticks + '</div></div><p class="small muted" style="margin:2px 0 0">Years after your student starts college</p></div>';
  return h;
}
/* What the college got vs. what gets paid back */
function costBar(pl){
  if (!pl.total) return '';
  var m = P.money, extra = pl.total - pl.received;
  return '<div class="costbar"><div class="bar" role="img" aria-label="Loans paid back ' + m(pl.total) + ': ' + m(pl.received) + ' reached the college, ' + m(extra) + ' is interest and fees">' +
    '<span style="width:' + (pl.received / pl.total * 100).toFixed(2) + '%;background:var(--c-ws)"></span><span style="width:' + (extra / pl.total * 100).toFixed(2) + '%;background:var(--c-gap)"></span></div>' +
    '<div class="legend"><span><i class="dot" style="background:var(--c-ws)"></i>Reached the college ' + m(pl.received) + '</span><span><i class="dot" style="background:var(--c-gap)"></i>Interest and fees ' + m(extra) + '</span></div></div>';
}

function whoBlock(title, note, r, ageNow, inp, kind){
  var m = P.money;
  var h = '<details class="more who"><summary>' + title + ': ' + m(r.monthly) + '/mo for ' + r.years + ' years</summary>';
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
  return h + '</details>';
}

function card(label, letter, pl, inp, scale){
  var m = P.money;
  var h = '<div class="result" data-plan="' + letter + '"><h4>' + label + '</h4>';
  h += '<p class="bigline">Loans paid back: <b class="num">' + m(pl.total) + '</b><br>Monthly payments after graduation: <b class="num">' + m(pl.monthly) + '</b></p>';
  h += '<h5 class="chart-h">Who pays for each year</h5>' + yearChart(pl);
  if (pl.s || pl.p || pl.x){
    h += '<h5 class="chart-h">How long the payments last</h5>' + timeline(pl, inp, scale);
    h += '<h5 class="chart-h">Where the money goes</h5>' + costBar(pl);
  }
  if (pl.s) h += whoBlock('Student’s federal loans', 'Fixed ' + P.pctText(inp.dRate, 2) + '. Your student can also choose RAP, an income-based plan, after graduation; the standard plan is shown.', pl.s, 18, inp, 's');
  if (pl.p) h += whoBlock('Parent PLUS', 'Fixed ' + P.pctText(inp.pRate, 2) + '. New Parent PLUS loans can only use the Tiered Standard plan: no income-based plan and no Public Service Loan Forgiveness.', pl.p, inp.parentAge, inp, 'p');
  if (pl.x) h += whoBlock('Private loan', 'Your rate of ' + P.pctText(inp.privRate, 2) + ' over 10 years, usually in the student’s name with a parent as co-signer, who owes it if the student can’t pay. Get real quotes.', pl.x, 18, inp, 'x');
  if (!pl.s && !pl.p && !pl.x) h += '<p class="muted">Nothing to borrow: savings and income cover the net price.</p>';
  if (pl.uncovered > 0.5){
    var last = pl.rows.filter(function(r){ return r.left > 0.5; });
    h += '<div class="uncov"><b>Not covered by federal loans: ' + m(pl.uncovered) + '</b> (' +
      last.map(function(r){ return 'year ' + r.year + ': ' + m(r.left); }).join(', ') +
      '). Cover it with more savings, a private loan, or a lower-cost college. Enter a private loan rate above to include one.</div>';
  }
  return h + '</div>';
}

/* "Lay down this, finance that": plan A at several down payments */
function downChart(inp){
  var m = P.money;
  var steps = DOWN_STEPS.slice();
  if (inp.down > 0 && steps.indexOf(inp.down) < 0) steps.push(inp.down);
  steps.sort(function(a, b){ return a - b; });
  var maxNeed = plan(Object.assign({}, inp, { down: 0 }), true).financed;
  steps = steps.filter(function(d){ return d === 0 || d === inp.down || d < maxNeed; });
  /* one more row: put down enough to finance nothing (when that is within reach) */
  var all = Math.ceil(maxNeed / 1000) * 1000;
  if (maxNeed > 0 && all <= 200000 && steps.indexOf(all) < 0) steps.push(all);
  steps.sort(function(a, b){ return a - b; });
  var res = steps.map(function(d){ var pl = plan(Object.assign({}, inp, { down: d }), true); return { d: d, pl: pl, put: pl.saveUsed, tot: pl.saveUsed + pl.total }; });
  var max = Math.max.apply(null, res.map(function(r){ return r.tot; })) || 1;
  var h = '<div class="dchart" role="list">';
  res.forEach(function(r){
    var cur = Math.abs(r.d - inp.down) < 1;
    var interest = r.pl.total - r.pl.received;
    h += '<button type="button" role="listitem" class="drow' + (cur ? ' cur' : '') + '" data-down="' + r.d + '" aria-label="Put down ' + m(r.put) + ': finance ' + m(r.pl.financed) + ', ' + m(r.pl.monthly) + ' a month, family pays ' + m(r.tot) + ' in all">' +
      '<span class="dlab">Put down <b>' + m(r.put) + '</b><br><span class="muted">finance ' + m(r.pl.financed) + '</span></span>' +
      '<span class="dtrack"><span class="bar" style="width:' + (r.tot / max * 100).toFixed(2) + '%">' +
        seg(r.put, r.tot, 'save') + '<span style="width:' + (r.pl.received / r.tot * 100).toFixed(2) + '%;background:var(--c-ws)"></span><span style="width:' + (interest / r.tot * 100).toFixed(2) + '%;background:var(--c-gap)"></span>' +
      '</span></span>' +
      '<span class="dval num">' + m(r.tot) + '<br><span class="muted">' + m(r.pl.monthly) + '/mo</span></span></button>';
  });
  h += '</div><div class="legend"><span><i class="dot" style="background:var(--c-free)"></i>Savings put down</span><span><i class="dot" style="background:var(--c-ws)"></i>Loans that reached the college</span><span><i class="dot" style="background:var(--c-gap)"></i>Interest and fees</span></div>';
  var a = res[0], b = res[res.length - 1];
  if (res.length > 1 && b.put > 0){
    var saved = a.tot - b.tot;
    h += '<p class="small muted">Plan A (student borrows first). Bars show savings put down plus every loan payment; income each year is the same in every row. Putting down ' + m(b.put) + ' instead of nothing ' + (saved > 0 ? 'lowers the family’s total by about ' + m(saved) + '.' : 'changes the total by ' + m(Math.abs(saved)) + '.') + ' Monthly payments can jump between rows because the repayment term depends on the balance (10, 15, 20 or 25 years). Tap a row to try it.</p>';
  }
  return h;
}

function table(pl){
  var m = P.money;
  var h = '<div class="tbl-wrap"><table><thead><tr><th>Year</th><th class="r">Net price</th><th class="r">Savings</th><th class="r">To finance</th><th class="r">Student loan</th><th class="r">Parent PLUS</th><th class="r">Private</th><th class="r">Not covered</th></tr></thead><tbody>';
  pl.rows.forEach(function(r){
    h += '<tr><td>' + r.year + '</td><td class="r">' + m(r.cost) + '</td><td class="r">' + m(r.save) + '</td><td class="r">' + m(r.need) + '</td><td class="r">' + m(r.s) + '</td><td class="r">' + m(r.p) + '</td><td class="r">' + m(r.x) + '</td><td class="r">' + m(r.left) + '</td></tr>';
  });
  return h + '</tbody></table></div><p class="small muted">Loan columns show the amount borrowed, before the fee comes out.</p>';
}

function render(){
  var inp = readInputs();
  var A = plan(inp, true), B = plan(inp, false);
  var m = P.money;
  $('gapline').textContent = m(A.financed);
  $('gapsub').textContent = A.saveUsed > 0 ? '(after ' + m(A.saveUsed) + ' of savings put down)' : '';
  var out = $('out');
  var downOut = $('downout');
  if (A.financed <= 0.5){
    out.innerHTML = '<div class="result"><h4>Nothing to finance</h4>' + yearChart(A) + '<p class="muted">Savings, income and what your student pays cover the net price you entered.</p></div>';
    downOut.innerHTML = '';
    return;
  }
  var longest = Math.max(A.s ? A.s.years : 0, A.p ? A.p.years : 0, A.x ? A.x.years : 0, B.p ? B.p.years : 0, B.x ? B.x.years : 0);
  var scale = Math.ceil((REPAY + longest) / 5) * 5;
  var h = '<div class="scen">' + card('A. Student borrows first, parents cover the rest', 'A', A, inp, scale) + card('B. Parents borrow it all', 'B', B, inp, scale) + '</div>';
  h += '<div class="card"><h4 style="margin-top:0">The difference in numbers</h4><ul class="qs">';
  h += '<li>Parent PLUS borrowed: <b>' + m(A.p ? A.p.gross : 0) + '</b> in A, <b>' + m(B.p ? B.p.gross : 0) + '</b> in B.</li>';
  h += '<li>Loans paid back: <b>' + m(A.total) + '</b> in A, <b>' + m(B.total) + '</b> in B' + (Math.abs(A.total - B.total) > 1 ? ' (a difference of ' + m(Math.abs(A.total - B.total)) + ')' : '') + '.</li>';
  h += '<li>Not covered by federal loans: <b>' + m(A.uncovered) + '</b> in A, <b>' + m(B.uncovered) + '</b> in B.</li>';
  h += '</ul><p class="small muted">A plan that covers less has a smaller total because it borrows less. Compare the “not covered” line too: that money still has to come from somewhere.</p></div>';
  h += '<details class="more"><summary>Year-by-year numbers: plan A</summary>' + table(A) + '</details>';
  h += '<details class="more"><summary>Year-by-year numbers: plan B</summary>' + table(B) + '</details>';
  out.innerHTML = h;
  downOut.innerHTML = downChart(inp);
  downOut.querySelectorAll('[data-down]').forEach(function(b){
    b.addEventListener('click', function(){
      var d = Number(b.getAttribute('data-down'));
      $('down').value = d ? d.toLocaleString('en-US') : '';
      render();
      var again = downOut.querySelector('[data-down="' + d + '"]'); if (again) again.focus();
    });
  });
}

/* Quick check: fill the net price from the College Scorecard snapshot */
function quick(){
  var c = P.findCollege($('qc-college').value), inc = $('qc-income').value, note = $('qc-note'), m = P.money;
  var y = P.collegeData().year, yr = ' (federal College Scorecard, most recent year reported)', yrCost = y ? ' (' + P.esc(y) + ' published cost)' : '';
  if (!c){ note.innerHTML = ''; return; }
  var calc = c.npc ? ' <a href="' + P.esc(c.npc) + '" target="_blank" rel="noopener">Net price calculator ↗</a>' : '';
  var v = null, msg = '';
  if (P.netPricesApply(c)){
    if (inc !== '' && c.nb[Number(inc)] != null){ v = c.nb[Number(inc)]; msg = 'Families earning ' + P.BRACKETS[Number(inc)] + ' who applied for aid paid ' + m(v) + ' a year on average at ' + P.esc(c.n) + ' after grants' + yr + '.'; }
    else if (c.avg != null){ v = c.avg; msg = 'Families who applied for aid paid ' + m(v) + ' a year on average at ' + P.esc(c.n) + ' after grants' + yr + '. Choose your income range for a closer number.'; }
  } else {
    var k = P.collegeCost(c); v = k.tuition + k.housing + k.other;
    msg = 'Full published cost for an out-of-state student at ' + P.esc(c.n) + ': ' + m(v) + ' a year' + yrCost + ', before any merit aid. Federal averages after grants there are for in-state students, so they don’t fit a Colorado family.';
  }
  if (v != null){ $('net').value = Math.round(v).toLocaleString('en-US'); render(); }
  else msg = 'No federal average is reported for that income range at ' + P.esc(c.n) + '.';
  note.innerHTML = '<p class="small" style="margin:6px 0 0">' + msg + ' Costs have likely gone up since.' + calc + '</p>';
}

document.addEventListener('DOMContentLoaded', function(){
  var q = new URLSearchParams(location.search);
  if (q.get('net')){ var v = P.parseMoney(q.get('net')); if (v > 0) $('net').value = Math.round(v).toLocaleString('en-US'); }
  if (q.get('name')) { var n = $('fromname'); n.textContent = 'From the Award Letter Decoder: ' + q.get('name').slice(0, 80) + '.'; n.hidden = false; }
  $('drate').value = (F.direct.rate * 100).toFixed(2); $('dfee').value = (F.direct.fee * 100).toFixed(3);
  $('prate').value = (F.plus.rate * 100).toFixed(2); $('pfee').value = (F.plus.fee * 100).toFixed(3);
  P.moneyInputs();
  document.querySelectorAll('#form input').forEach(function(i){ i.addEventListener('input', render); });
  $('downmode').addEventListener('change', render);
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

window.PFC_WB = { plan: plan, REPAY: REPAY };
})();
