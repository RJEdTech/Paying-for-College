/* What It Costs: the pieces of a college's published cost, where the student lives,
   in-state vs. out-of-state vs. WUE, and an off-campus year planner.
   Data: colleges.js (College Scorecard + HUD FY2027 Small Area Fair Market Rents). Nothing typed is saved or sent. */
(function(){
'use strict';
var P = window.PFC, m = P.money;
var PARTS = [
  ['tuition', 'Tuition and fees', '--c-ws', true],
  ['housing', 'Housing and food', '--c-fam', null],
  ['books', 'Books and supplies', '--c-stu', false],
  ['personal', 'Transportation and personal', '--c-priv', false]
];
var RES_LABEL = { 'in': 'In-state (Colorado resident)', out: 'Out-of-state', wue: 'Western discount (WUE)', priv: 'Same for every student' };
var LIVE_LABEL = { on: 'On campus', off: 'Off campus', home: 'At home' };
function $(id){ return document.getElementById(id); }

function firstCollege(){ return P.findCollege(126614) || P.collegeData().groups[0].colleges[0]; }
function current(){ return P.findCollege($('c-college').value); }

function resOptions(c){
  var ch = P.residencyChoices(c), sel = $('c-res'), prev = sel.value;
  sel.innerHTML = ch.map(function(r){ return '<option value="' + r + '">' + RES_LABEL[r] + '</option>'; }).join('');
  if (ch.indexOf(prev) >= 0) sel.value = prev;
  sel.disabled = ch.length < 2;
  var hint = '';
  if (ch[0] === 'in') hint = 'Colorado public college: Colorado residents pay in-state tuition.';
  else if (ch[0] === 'priv') hint = 'Private colleges charge every student the same tuition.';
  else if (c.wue) hint = 'This college takes part in WUE. Each college sets its own WUE rules.';
  else hint = 'This college isn’t on WICHE’s list of WUE colleges.';
  $('c-res-hint').textContent = hint;
}

function stack(k, total, scale){
  return '<div class="bar" style="width:' + (total / scale * 100).toFixed(2) + '%">' + PARTS.map(function(p){
    var v = k[p[0]]; if (v <= 0) return '';
    return '<span style="width:' + (v / total * 100).toFixed(2) + '%;background:var(' + p[2] + ')" title="' + p[1] + ': ' + m(v) + '"></span>';
  }).join('') + '</div>';
}
function legend(){ return '<div class="legend">' + PARTS.map(function(p){ return '<span><i class="dot" style="background:var(' + p[2] + ')"></i>' + p[1] + '</span>'; }).join('') + '</div>'; }

function render(){
  var c = current(); if (!c) return;
  var res = $('c-res').value, live = $('c-live').value;
  var k = P.collegeCost(c, { res: res, live: live }), tot = P.costTotal(k);
  var y = P.collegeData().year;
  var h = '<div class="result" style="margin-top:12px"><h4>' + P.esc(c.n) + ' <span class="muted small">' + P.esc(c.loc || '') + '</span></h4>';
  h += '<p class="bigline">Published cost for one year' + (y ? ' (' + y + ')' : '') + ': <b>' + m(tot) + '</b> · four years at 3% a year more: about ' + m(tot * (1 + 1.03 + 1.0609 + 1.092727)) + '</p>';
  h += '<div role="img" aria-label="' + PARTS.map(function(p){ return p[1] + ' ' + m(k[p[0]]); }).join(', ') + '">' + stack(k, tot, tot) + '</div>' + legend();
  h += '<dl class="kv">';
  PARTS.forEach(function(p){
    var billed = p[3] === null ? (k.live === 'on' ? 'billed by the college' : k.live === 'off' ? 'not billed: rent and groceries' : 'family covers it') : p[3] ? 'billed by the college' : 'not billed';
    h += '<dt><i class="dot" style="background:var(' + p[2] + ')"></i>' + p[1] + ' <span class="small">(' + billed + ')</span></dt><dd>' + m(k[p[0]]) + '</dd>';
  });
  h += '<dt class="tot">Cost of attendance</dt><dd class="tot">' + m(tot) + '</dd></dl>';
  if (live === 'on' && k.live === 'off') h += '<p class="small muted">This college reports no campus housing, so the off-campus estimate is shown.</p>';
  if (live === 'home') h += '<p class="small muted">Living at home, the college counts no rent; your family still pays for food and the home. The college’s “living with family” estimate covers books, travel and personal costs.</p>';

  /* where the student lives */
  var lives = ['on', 'off', 'home'].map(function(L){ var kk = P.collegeCost(c, { res: res, live: L }); return [L, kk, P.costTotal(kk)]; });
  var lmax = Math.max.apply(null, lives.map(function(x){ return x[2]; }));
  h += '<p class="chart-h">Where your student lives changes the total</p><div class="dchart">';
  lives.forEach(function(x){
    if (x[0] === 'on' && x[1].live === 'off') return;
    h += '<button type="button" class="drow' + (x[0] === k.live ? ' cur' : '') + '" data-live="' + x[0] + '" aria-pressed="' + (x[0] === k.live) + '"><span>' + LIVE_LABEL[x[0]] + '</span><span class="dtrack">' + stack(x[1], x[2], lmax) + '</span><span class="dval num">' + m(x[2]) + '</span></button>';
  });
  h += '</div>';
  var on = lives[0][1], off = lives[1][1];
  if (c.rb != null && c.rbo != null){
    var d = off.housing - on.housing;
    h += '<p class="small">The college estimates off-campus rent and groceries at ' + m(off.housing) + ' for the school year, ' + (Math.abs(d) < 100 ? 'about the same as' : m(Math.abs(d)) + (d > 0 ? ' more than' : ' less than')) + ' its dorm and meal plan (' + m(on.housing) + '). Your real cost depends on your lease; plan it in step 3.</p>';
  }

  /* residency */
  if (c.pub){
    var opts = [['in', c.tin], ['wue', c.wue ? P.wueTuition(c) : null], ['out', c.tout]];
    var smax = c.tout || 1;
    h += '<p class="chart-h">Tuition and fees, one year</p><div class="ychart cmp">';
    opts.forEach(function(o){
      if (o[1] == null) return;
      var lab = o[0] === 'in' ? 'In-state' + (c.st === 'CO' ? '' : ' (this state’s residents)') : o[0] === 'wue' ? 'WUE (150%)' : 'Out-of-state';
      h += '<div class="yrow cmprow"><span class="ylab">' + lab + '</span><span class="ytrack"><span class="bar" style="width:' + (o[1] / smax * 100).toFixed(1) + '%"><span style="width:100%;background:var(' + (o[0] === 'out' ? '--c-gap' : o[0] === 'wue' ? '--c-loan' : '--c-ws') + ')"></span></span></span><span class="yval num">' + m(o[1]) + '</span></div>';
    });
    h += '</div>';
    var gap = c.tout - c.tin;
    h += '<p class="small">' + (c.st === 'CO'
      ? 'A student from another state pays ' + m(gap) + ' more each year here, about ' + m(gap * 4) + ' over four years. Colorado residents pay the in-state rate.'
      : 'A Colorado student pays the out-of-state rate here: ' + m(gap) + ' a year more than this state’s own residents' + (c.wue ? ', or about ' + m(c.tout - P.wueTuition(c)) + ' a year less than out-of-state with WUE.' : '.')) + '</p>';
  }
  h += P.collegeNote(c) + '</div>';
  $('c-out').innerHTML = h;
  $('c-out').querySelectorAll('[data-live]').forEach(function(b){ b.addEventListener('click', function(){ $('c-live').value = b.getAttribute('data-live'); render(); }); });
  rentDefaults(c);
  planner();
}

/* ---------- Off-campus planner ---------- */
var lastRentKey = '';
function rentDefaults(c){
  var u = +$('o-unit').value, f = c.fmr;
  var key = c.id + ':' + u;
  if (f && key !== lastRentKey){ $('o-rent').value = f[2 + u].toLocaleString('en-US'); lastRentKey = key; }
  $('o-rentinfo').innerHTML = f
    ? '<p class="saved">HUD fair market rents near ' + P.esc(c.n) + ' (ZIP ' + f[0] + ', ' + P.esc(f[1]) + '), per month with basic utilities: studio ' + m(f[2]) + ', 1 bedroom ' + m(f[3]) + ', 2 bedrooms ' + m(f[4]) + ', 3 bedrooms ' + m(f[5]) + '.</p>'
    : '';
}
function planner(){
  var c = current(); if (!c) return;
  var u = +$('o-unit').value, people = Math.max(1, u);
  var rent = P.parseMoney($('o-rent').value), util = P.parseMoney($('o-util').value);
  var share = (rent + util) / people;
  var monthly = { rent: share, net: P.parseMoney($('o-net').value), ins: P.parseMoney($('o-ins').value),
    food: P.parseMoney($('o-food').value), trans: P.parseMoney($('o-trans').value) };
  var housingMo = monthly.rent + monthly.net + monthly.ins, foodMo = monthly.food, transMo = monthly.trans;
  var perMonth = housingMo + foodMo + transMo;
  var months = +$('o-months').value;
  var deposit = rent / people, furn = P.parseMoney($('o-furn').value);
  var school9 = (housingMo + foodMo) * 9;              /* compare with the college's housing-and-food estimate */
  var leaseYear = housingMo * months + foodMo * 9;      /* food only while at school */
  var summer = housingMo * Math.max(0, months - 9);
  var on = P.collegeCost(c, { live: 'on' }), off = P.collegeCost(c, { live: 'off' });
  var rows = [
    ['Your plan, school year (9 months)', school9, '--c-fam'],
    ['Your plan with the ' + months + '-month lease', leaseYear, '--c-gap'],
    ['College’s off-campus estimate', c.rbo != null ? off.housing : null, '--c-uncov'],
    ['Dorm and meal plan', c.rb != null ? on.housing : null, '--c-ws']
  ];
  var mx = Math.max.apply(null, rows.map(function(r){ return r[1] || 0; })) || 1;
  var h = '<div class="result"><h4>Student’s share: ' + m(perMonth) + ' a month</h4>';
  h += '<dl class="kv"><dt>Rent' + (util ? ' and utilities' : '') + (people > 1 ? ' (split ' + people + ' ways)' : '') + '</dt><dd>' + m(monthly.rent) + '</dd>' +
    '<dt>Internet, phone, renter’s insurance</dt><dd>' + m(monthly.net + monthly.ins) + '</dd>' +
    '<dt>Groceries and eating out</dt><dd>' + m(foodMo) + '</dd><dt>Getting around</dt><dd>' + m(transMo) + '</dd>' +
    '<dt class="tot">Each month</dt><dd class="tot">' + m(perMonth) + '</dd></dl>';
  h += '<p class="chart-h">Housing and food for the year</p><div class="ychart cmp">';
  rows.forEach(function(r){
    if (r[1] == null) return;
    h += '<div class="yrow cmprow"><span class="ylab">' + r[0] + '</span><span class="ytrack"><span class="bar" style="width:' + (r[1] / mx * 100).toFixed(1) + '%"><span style="width:100%;background:var(' + r[2] + ')"></span></span></span><span class="yval num">' + m(r[1]) + '</span></div>';
  });
  h += '</div>';
  var notes = [];
  if (c.rbo != null){
    var diff = school9 - off.housing;
    if (diff > 250) notes.push('!Your school-year plan is ' + m(diff) + ' more than the college’s estimate. Financial aid and loans are based on the college’s number, so the difference comes from your family or the student.');
    else if (diff < -250) notes.push('Your school-year plan is ' + m(-diff) + ' less than the college’s estimate.');
  }
  if (summer > 0) notes.push('!A ' + months + '-month lease adds ' + m(summer) + ' of rent for the summer months, unless your student stays and works there or finds someone to sublet.');
  notes.push('Before moving in: about ' + m(deposit + furn) + ' (security deposit of about one month’s rent share, ' + m(deposit) + ', plus ' + m(furn) + ' to set up).');
  notes.push('Rule of thumb: rent should be no more than about 30% of income. HUD calls households that pay more “cost burdened.” A student paying ' + m(monthly.rent) + ' a month in rent would need about ' + m(monthly.rent / 0.3 * 12) + ' a year in income at that rate.');
  h += '<ul class="flags">' + notes.map(function(n){ var w = n.charAt(0) === '!'; return '<li class="' + (w ? '' : 'ok') + '">' + (w ? n.slice(1) : n) + '</li>'; }).join('') + '</ul></div>';
  $('o-out').innerHTML = h;
}

/* ---------- Residency table for every public college in the menus ---------- */
function resTable(){
  var rows = [];
  P.collegeData().groups.forEach(function(g){ g.colleges.forEach(function(c){ if (c.pub) rows.push(c); }); });
  var h = '<div class="tbl-wrap"><table><thead><tr><th>Public college</th><th class="r">In-state tuition</th><th class="r">Out-of-state</th><th class="r">A Colorado student pays</th></tr></thead><tbody>';
  rows.forEach(function(c){
    var pay = c.st === 'CO' ? m(c.tin) + ' (in-state)' : c.wue ? 'about ' + m(P.wueTuition(c)) + ' with WUE' : m(c.tout) + ' (not in WUE)';
    h += '<tr><td>' + P.esc(c.n) + ' <span class="muted small">' + P.esc(c.sa || '') + '</span></td><td class="r num">' + m(c.tin) + '</td><td class="r num">' + m(c.tout) + '</td><td class="r num">' + pay + '</td></tr>';
  });
  h += '</tbody></table></div><p class="src">Tuition and required fees for one year, ' + P.esc(P.collegeData().year) + ', College Scorecard. WUE estimates are 150% of in-state; each college sets its own WUE rate and rules.</p>';
  $('res-table').innerHTML = h;
}
/* Private college discount picture: $1.00 of tuition, 57 cents back in grants (NACUBO 2025–26, first-year students) */
function discount(){
  $('disc').innerHTML = '<div role="img" aria-label="Of every dollar of published tuition, first-year students got about 57 cents back in college grants and paid about 43 cents."><div class="bar"><span style="width:57.1%;background:var(--c-free)"></span><span style="width:42.9%;background:var(--c-ws)"></span></div></div>' +
    '<div class="legend"><span><i class="dot" style="background:var(--c-free)"></i>57¢ back in the college’s own grants</span><span><i class="dot" style="background:var(--c-ws)"></i>43¢ paid by the family, from savings, income or loans</span></div>';
}

document.addEventListener('DOMContentLoaded', function(){
  var sel = $('c-college');
  var q = new URLSearchParams(location.search), start = P.findCollege(q.get('college')) || firstCollege();
  sel.innerHTML = P.collegeOptions(start.id).replace('<option value="">Choose a college (optional)</option>', '');
  resOptions(start);
  if (q.get('live') && /^(on|off|home)$/.test(q.get('live'))) $('c-live').value = q.get('live');
  sel.addEventListener('change', function(){ resOptions(current()); render(); });
  $('c-res').addEventListener('change', render);
  $('c-live').addEventListener('change', render);
  ['o-unit', 'o-months'].forEach(function(id){ $(id).addEventListener('change', function(){ rentDefaults(current()); planner(); }); });
  ['o-rent', 'o-util', 'o-net', 'o-ins', 'o-food', 'o-trans', 'o-furn'].forEach(function(id){ $(id).addEventListener('input', planner); });
  P.moneyInputs();
  resTable(); discount(); render();
});
})();
