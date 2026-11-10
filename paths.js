/* Compare Paths: up to three colleges → four-year price → loans → monthly payments →
   the pay needed after college for a chosen major, city, household and housing.
   Uses PFC (pfc.js), PFC_LOANS (loans.js), PFC_COLLEGES (colleges.js), PFC_LIFE_DATA (life-data.js).
   Nothing typed is saved or sent. */
(function(){
'use strict';
var P = window.PFC, F = P.FACTS, L = window.PFC_LOANS, D = window.PFC_LIFE_DATA, m = P.money;
function $(id){ return document.getElementById(id); }

/* Georgetown CEW, The Major Payoff (2025): ages 22–26, bachelor's only, full time; [label, p25, p50, p75] */
var MAJ = {
 nursing:['Nursing',53000,67000,81000], cs:['Computer science',56000,83000,110000], mech:['Mechanical engineering',64000,81000,94000],
 acct:['Accounting',45000,62000,78000], fin:['Finance',50000,68000,89000], bus:['Business management',39000,53000,70000],
 mkt:['Marketing',41000,55000,71000], comm:['Communications',37000,49000,65000], psych:['Psychology',32000,43000,57000],
 bio:['Biology',32000,44000,60000], eled:['Elementary education',36000,46000,54000], crim:['Criminal justice',35000,47000,62000],
 eng:['English',33000,45000,60000], hist:['History',32000,46000,63000], poli:['Political science',39000,53000,70000],
 econ:['Economics',49000,69000,94000], math:['Mathematics',44000,61000,84000], fine:['Fine arts',31000,43000,59000],
 kin:['Physical fitness and recreation',30000,43000,58000], sw:['Social work',34000,43000,52000], theo:['Theology and religious vocations',29000,40000,51000]
};
/* Kinds of work graduates of each major often go into (MIT occupational areas, index into D.occ) */
var MAJ_OCC = { nursing:[9], cs:[2], mech:[3], acct:[1], fin:[1,15], bus:[0,1,16], mkt:[15,8,1], comm:[8,15], psych:[5,4], bio:[4,9,10],
  eled:[7], crim:[11,6,5], eng:[7,8], hist:[7,6], poli:[6,5,1], econ:[1,2], math:[2,7], fine:[8], kin:[7,10,14], sw:[5], theo:[5,7] };
var STAGE = { alone: { col: 0, earners: 1, kids: 0, mfj: false, label: 'on their own' },
  room: { col: 0, earners: 1, kids: 0, mfj: false, room: true, label: 'with a roommate' },
  couple: { col: 8, earners: 2, kids: 0, mfj: true, label: 'a couple, both working' },
  kid1: { col: 9, earners: 2, kids: 1, mfj: true, label: 'a couple with 1 child' },
  kid2: { col: 10, earners: 2, kids: 2, mfj: true, label: 'a couple with 2 children' } };
var PCOL = ['--c-ws', '--c-loan', '--c-stu'];
var NAMES = ['A', 'B', 'C'];
var DEFAULTS = [{ id: 126614, live: 'on' }, { id: 180461, res: 'wue', live: 'on' }, { id: 181002, live: 'on' }];

/* ---------- 2026 taxes ---------- */
var BR_S = [[12400,.10],[50400,.12],[105700,.22],[201775,.24],[256225,.32],[640600,.35],[Infinity,.37]];
var BR_J = [[24800,.10],[100800,.12],[211400,.22],[403550,.24],[512450,.32],[768700,.35],[Infinity,.37]];
var STATE = { CO: .044, AZ: .025, IL: .0495, UT: .0445, TX: 0, TN: 0, WA: 0 };
function bracketTax(T, br){ var t = 0, lo = 0; for (var i = 0; i < br.length; i++){ var hi = br[i][0]; if (T > lo) t += (Math.min(T, hi) - lo) * br[i][1]; lo = hi; if (T <= hi) break; } return t; }
function taxes(G, st, s){
  var std = s.mfj ? 32200 : 16100, T = Math.max(0, G - std);
  var fed = Math.max(0, bracketTax(T, s.mfj ? BR_J : BR_S) - 2200 * s.kids);
  var each = G / s.earners;
  var fica = s.earners * (0.062 * Math.min(each, 184500)) + 0.0145 * G;
  var state = (STATE[st] || 0) * (st === 'IL' ? Math.max(0, G - 2925 * (s.earners + s.kids)) : T);
  if (st === 'CO') state += s.earners * 0.0044 * Math.min(each, 184500);
  return { fed: fed, fica: fica, state: state, total: fed + fica + state };
}
/* Pay G at which G − taxes − saving·G covers yearly spending S */
function payNeeded(S, st, s, save){
  var lo = 0, hi = 2e6;
  for (var k = 0; k < 80; k++){ var mid = (lo + hi) / 2; if (mid - taxes(mid, st, s).total - save * mid >= S) hi = mid; else lo = mid; }
  return hi;
}

/* ---------- inputs ---------- */
function metro(){ var id = $('metro').value; for (var i = 0; i < D.metros.length; i++) if (D.metros[i].id === id) return D.metros[i]; return D.metros[0]; }
function pathCard(i){
  var d = DEFAULTS[i];
  return '<div class="path" style="--pc:var(' + PCOL[i] + ')" data-i="' + i + '"><h4><span class="pchip"></span>Path ' + NAMES[i] + '</h4>' +
    '<div class="field"><label for="p' + i + '-c">College</label><select id="p' + i + '-c">' + P.collegeOptions(d.id).replace('Choose a college (optional)', i === 2 ? 'No third college' : 'Choose a college') + '</select></div>' +
    '<div class="field"><label for="p' + i + '-r">Tuition rate</label><select id="p' + i + '-r"></select></div>' +
    '<div class="field"><label for="p' + i + '-l">Lives</label><select id="p' + i + '-l"><option value="on">On campus</option><option value="off">Off campus</option><option value="home">At home</option></select></div>' +
    '<div class="field"><label for="p' + i + '-n">Price per year after grants</label><div class="money"><input type="text" inputmode="decimal" id="p' + i + '-n"></div><span class="hint" id="p' + i + '-h"></span></div>' +
    '</div>';
}
function resFill(i, want){
  var c = P.findCollege($('p' + i + '-c').value), sel = $('p' + i + '-r');
  if (!c){ sel.innerHTML = ''; sel.disabled = true; return; }
  var lab = { 'in': 'In-state', out: 'Out-of-state', wue: 'WUE (Western discount)', priv: 'Private' };
  var ch = P.residencyChoices(c), prev = want || sel.value;
  sel.innerHTML = ch.map(function(r){ return '<option value="' + r + '">' + lab[r] + '</option>'; }).join('');
  if (ch.indexOf(prev) >= 0) sel.value = prev;
  sel.disabled = ch.length < 2;
}
/* Fill the price after grants from the Scorecard: average by income bracket (private and Colorado public),
   moved by the difference in housing cost when the student lives off campus or at home; full price otherwise */
function autoPrice(i){
  var c = P.findCollege($('p' + i + '-c').value), inp = $('p' + i + '-n'), hint = $('p' + i + '-h');
  if (!c){ inp.value = ''; hint.textContent = ''; return; }
  var res = $('p' + i + '-r').value, live = $('p' + i + '-l').value, b = +$('income').value;
  var k = P.collegeCost(c, { res: res, live: live }), full = P.costTotal(k);
  var on = P.costTotal(P.collegeCost(c, { res: res, live: 'on' }));
  var v, note;
  if (P.netPricesApply(c) && (res === 'in' || res === 'priv')){
    var nb = c.nb && c.nb[b] != null ? c.nb[b] : c.avg;
    v = Math.max(0, Math.round(nb + (full - on)));
    note = 'What families in this income range paid after grants (federal average)' + (live !== 'on' ? ', adjusted for living ' + (live === 'off' ? 'off campus' : 'at home') : '') + '. Full price ' + m(full) + '.';
  } else {
    v = full;
    note = (res === 'wue' ? 'Full price with WUE tuition. ' : 'Full out-of-state price. ') + 'Subtract any scholarship the college offers.';
  }
  inp.value = v.toLocaleString('en-US');
  hint.textContent = note;
}
function readFamily(){
  return { family: P.parseMoney($('family').value), student: P.parseMoney($('studentpay').value), down: P.parseMoney($('down').value),
    who: $('who').value, parentInc: P.parseMoney($('parentinc').value) };
}

/* ---------- one path ---------- */
function runPath(i, fam){
  var c = P.findCollege($('p' + i + '-c').value);
  if (!c) return null;
  var net = P.parseMoney($('p' + i + '-n').value);
  var inp = L.defaults({ net: net, family: fam.family, student: fam.student, down: fam.down, downMode: 'first' });
  var pl;
  if (fam.who === 'c'){ inp.pRate = F.plus.rate; pl = L.plan(inp, true); }
  else pl = L.plan(inp, fam.who === 'a');
  /* option c: no parent loans: remove PLUS, count it as not covered */
  if (fam.who === 'c' && pl.p){
    var plusNet = pl.p.net; pl.uncovered += plusNet;
    pl.rows.forEach(function(r){ r.left += r.pNet; r.p = 0; r.pNet = 0; });
    pl.monthly -= pl.p.monthly; pl.p = null;
  }
  var total4 = pl.rows.reduce(function(a, r){ return a + r.cost; }, 0);
  return { i: i, c: c, net: net, pl: pl, total4: total4, res: $('p' + i + '-r').value, live: $('p' + i + '-l').value };
}
function gradLoans(){
  var kind = $('grad').value;
  if (kind === 'none') return null;
  var G = F.grad, yrs = +$('gyears').value, need = Math.max(0, P.parseMoney($('gcost').value) - P.parseMoney($('ghelp').value));
  var cap = kind === 'prof' ? G.profAnnual : G.annual, agg = kind === 'prof' ? G.profAggregate : G.aggregate;
  var gross = 0, net = 0, accrued = 0, short = 0;
  for (var k = 0; k < yrs; k++){
    var g = Math.min(cap, agg - gross, need / (1 - G.fee));
    g = Math.max(0, P.round2(g));
    gross += g; net += g * (1 - G.fee); short += Math.max(0, need - g * (1 - G.fee));
    accrued += g * G.rate * (yrs - k - 0.5 + 0.5);   /* to repayment, 6 months after the degree */
  }
  return { kind: kind, years: yrs, gross: gross, net: net, accrued: accrued, balance: gross + accrued, short: short, need: need };
}
/* Student's monthly payment after college, with any graduate loans (in-school deferment adds interest to undergraduate loans) */
function studentPayment(pl, gr){
  var u = pl.s ? pl.s.balance : 0;
  if (gr && u > 0) u = u * (1 + F.direct.rate * gr.years);
  var g = gr ? gr.balance : 0;
  var yrs = P.tierYears(u + g);
  var pay = P.payment(u, F.direct.rate, yrs) + P.payment(g, F.grad.rate, yrs);
  return { under: u, grad: g, balance: u + g, years: yrs, monthly: pay, atGrad: (pl.s ? pl.s.gross : 0) + (gr ? gr.gross : 0) };
}
function budget(stage, mt){
  var s = STAGE[stage], col = s.col, cats = mt.c.map(function(row){ return row[col]; });
  if (s.room) cats[3] = mt.c[3][1] / 2;              /* half of a 2-bedroom (MIT's 1 adult + 1 child housing) */
  var buy = null;
  if ($('home').value === 'buy'){
    var price = P.parseMoney($('price').value), dp = P.parsePct($('dp').value), r = P.parsePct($('mrate').value), ti = P.parsePct($('tins').value);
    var loan = price * (1 - dp), pi = P.payment(loan, r, 30), tim = price * ti / 12, ut = P.parseMoney($('hutil').value);
    buy = { price: price, down: price * dp, loan: loan, pi: pi, ti: tim, ut: ut, monthly: pi + tim + ut };
    cats[3] = buy.monthly * 12;
  }
  return { s: s, cats: cats, buy: buy };
}

/* ---------- pictures ---------- */
var SEG = [['Housing', '--c-fam'], ['Food', '--c-free'], ['Child care', '--c-priv'], ['Health care', '--c-ws'], ['Getting around', '--c-uncov'],
  ['Phone, internet, other', '--c-stu'], ['Student loans', '--c-loan'], ['Saving', '--good'], ['Taxes', '--c-gap']];
function monthlyParts(b, loanMo, G, save, tx){
  var c = b.cats;
  return [c[3] / 12, c[0] / 12, c[1] / 12, c[2] / 12, c[4] / 12, (c[5] + c[6] + c[7]) / 12, loanMo, save * G / 12, tx.total / 12];
}
function stackBar(parts, scale){
  var tot = parts.reduce(function(a, b){ return a + b; }, 0);
  return '<div class="bar" style="width:' + (tot / scale * 100).toFixed(2) + '%">' + parts.map(function(v, k){
    return v > 0.5 ? '<span style="width:' + (v / tot * 100).toFixed(2) + '%;background:var(' + SEG[k][1] + ')" title="' + SEG[k][0] + ': ' + m(v) + '"></span>' : '';
  }).join('') + '</div>';
}
function whoPays(pl, scale){
  var t = { save: 0, fam: 0, stu: 0, s: 0, p: 0, left: 0 };
  pl.rows.forEach(function(r){ t.save += r.save; t.fam += r.fam; t.stu += r.stu; t.s += r.sNet; t.p += r.pNet; t.left += r.left; });
  var keys = [['save', 'Savings', '--c-free'], ['fam', 'Parents’ income', '--c-fam'], ['stu', 'Student’s work', '--c-stu'], ['s', 'Student loans', '--c-ws'], ['p', 'Parent PLUS', '--c-loan'], ['left', 'Not covered', '--c-gap']];
  var tot = keys.reduce(function(a, k){ return a + t[k[0]]; }, 0) || 1;
  var bar = '<div class="bar" style="width:' + (tot / scale * 100).toFixed(1) + '%">' + keys.map(function(k){ var v = t[k[0]]; return v > 0.5 ? '<span style="width:' + (v / tot * 100).toFixed(2) + '%;background:var(' + k[2] + ')" title="' + k[1] + ': ' + m(v) + '"></span>' : ''; }).join('') + '</div>';
  var leg = '<dl class="kv">' + keys.filter(function(k){ return t[k[0]] > 0.5; }).map(function(k){ return '<dt><i class="dot" style="background:var(' + k[2] + ')"></i>' + k[1] + '</dt><dd>' + m(t[k[0]]) + '</dd>'; }).join('') + '</dl>';
  return { bar: bar, leg: leg, t: t };
}

/* ---------- render ---------- */
function render(){
  var fam = readFamily(), mt = metro(), maj = MAJ[$('major').value], stage = $('stage').value;
  var save = Math.min(0.5, P.parsePct($('save').value));
  var gr = gradLoans(), b = budget(stage, mt), s = b.s;
  var paths = [0, 1, 2].map(function(i){ return runPath(i, fam); }).filter(Boolean);
  if (!paths.length){ $('out').innerHTML = '<p class="result">Choose at least one college.</p>'; return; }
  var basePay = gr && P.parseMoney($('gpay').value) > 0 ? P.parseMoney($('gpay').value) : maj[2];
  var spendBase = b.cats.reduce(function(a, v){ return a + v; }, 0);

  paths.forEach(function(p){
    p.sp = studentPayment(p.pl, gr);
    p.parentMo = p.pl.p ? p.pl.p.monthly : 0;
    p.G = payNeeded(spendBase + 12 * p.sp.monthly, mt.st, s, save);
    p.tx = taxes(p.G, mt.st, s);
    p.parts = monthlyParts(b, p.sp.monthly, p.G, save, p.tx);
  });

  var h = '';
  /* A. What each path costs and who pays */
  var scale4 = Math.max.apply(null, paths.map(function(p){ return p.total4; }));
  h += '<h3>4. What each path costs, and who pays</h3><div class="need">';
  paths.forEach(function(p){
    var w = whoPays(p.pl, scale4);
    h += '<div class="result" style="--pc:var(' + PCOL[p.i] + ')"><h4><span class="pchip"></span>' + NAMES[p.i] + ': ' + P.esc(p.c.n) + '</h4>' +
      '<p class="small muted" style="margin:0 0 4px">' + P.esc(p.c.loc || '') + ' · ' + ({ 'in': 'in-state', out: 'out-of-state', wue: 'WUE rate', priv: 'private' })[p.res] + ' · ' + ({ on: 'on campus', off: 'off campus', home: 'at home' })[p.live] + '</p>' +
      '<p class="bigline">Four years after grants: <b>' + m(p.total4) + '</b></p>' +
      '<div role="img" aria-label="Who pays for ' + P.esc(p.c.n) + ': ' + w.leg.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') + '">' + w.bar + '</div>' + w.leg +
      '<dl class="kv"><dt>Student’s loan payment' + (gr ? ', with grad school' : '') + '</dt><dd class="tot">' + m(p.sp.monthly) + '/mo</dd>' +
      (p.sp.monthly > 0 ? '<dt>for</dt><dd>' + p.sp.years + ' years</dd>' : '') +
      '<dt>Parents’ PLUS payment</dt><dd class="tot">' + m(p.parentMo) + '/mo</dd>' + (p.parentMo > 0 ? '<dt>for</dt><dd>' + p.pl.p.years + ' years</dd>' : '') + '</dl>' +
      (p.pl.uncovered > 0.5 ? '<p class="uncov">Not covered by this plan: ' + m(p.pl.uncovered) + ' over four years.</p>' : '') +
      '</div>';
  });
  h += '</div>';

  /* B. Pay needed after college */
  var per = function(p){ return p.G / s.earners; };
  h += '<h3>5. The pay each path needs after college</h3>';
  h += '<p>To live ' + s.label + ' in <b>' + P.esc(mt.n) + '</b>, ' + (b.buy ? 'own a home' : 'rent') + ', save ' + Math.round(save * 100) + '% and pay the student’s loans' + (gr ? ' (including graduate school)' : '') + ':</p><div class="need">';
  paths.forEach(function(p){
    h += '<div class="result" style="--pc:var(' + PCOL[p.i] + ')"><h4><span class="pchip"></span>' + NAMES[p.i] + ': ' + P.esc(p.c.n) + '</h4>' +
      '<p class="big">' + m(per(p)) + '<span class="small muted"> a year' + (s.earners > 1 ? ' each' : '') + '</span></p>' +
      '<p class="small muted" style="margin:0 0 6px">about ' + m(per(p) / 2080, true) + ' an hour full time' + (s.earners > 1 ? ' · household ' + m(p.G) : '') + '</p>' +
      '<p class="small" style="margin:0">' + (p.parentMo > 0 ? 'Parents also pay ' + m(p.parentMo) + ' a month for ' + p.pl.p.years + ' years. ' : '') + (p.sp.monthly > 0 ? 'The ' + m(p.sp.monthly) + ' loan payment alone takes about ' + m(payNeeded(spendBase + 12 * p.sp.monthly, mt.st, s, save) - payNeeded(spendBase, mt.st, s, save)) + ' of yearly pay' + (s.earners > 1 ? ' for the household' : '') + '.' : 'No student loan payment.') + '</p></div>';
  });
  h += '</div>';

  /* Family's loan payments after college: student + parents */
  var fscale = Math.max.apply(null, paths.map(function(p){ return p.sp.monthly + p.parentMo; })) || 1;
  h += '<p class="chart-h">Loan payments each month after college, student and parents</p><div class="ychart cmp" role="img" aria-label="' + paths.map(function(p){ return 'Path ' + NAMES[p.i] + ': student ' + m(p.sp.monthly) + ', parents ' + m(p.parentMo); }).join('; ') + '">';
  paths.forEach(function(p){
    var t = p.sp.monthly + p.parentMo;
    h += '<div class="yrow cmprow"><span class="ylab"><span class="pchip" style="--pc:var(' + PCOL[p.i] + ')"></span>Path ' + NAMES[p.i] + '</span><span class="ytrack"><span class="bar" style="width:' + (t / fscale * 100).toFixed(1) + '%">' +
      (p.sp.monthly > 0.5 ? '<span style="width:' + (p.sp.monthly / t * 100).toFixed(1) + '%;background:var(--c-ws)"></span>' : '') + (p.parentMo > 0.5 ? '<span style="width:' + (p.parentMo / t * 100).toFixed(1) + '%;background:var(--c-loan)"></span>' : '') +
      '</span></span><span class="yval num">' + m(t) + '/mo</span></div>';
  });
  h += '</div><div class="legend"><span><i class="dot" style="background:var(--c-ws)"></i>Student’s loans</span><span><i class="dot" style="background:var(--c-loan)"></i>Parents’ PLUS loans</span></div>';
  var sameStu = paths.every(function(p){ return Math.abs(p.sp.monthly - paths[0].sp.monthly) < 1; });
  if (paths.length > 1 && sameStu && paths[0].sp.monthly > 0 && $('who').value === 'a')
    h += '<p class="small">The student’s federal loans stop at ' + m(F.direct.limits.reduce(function(a, b){ return a + b; }, 0)) + ' over four years ($5,500, $6,500, $7,500, $7,500), so the student’s payment is the same on every path. The difference between colleges lands on the parents.</p>';

  /* Monthly budget bars */
  var mscale = Math.max.apply(null, paths.map(function(p){ return p.parts.reduce(function(a, v){ return a + v; }, 0); }));
  h += '<p class="chart-h">Where each month’s pay goes</p><div class="ychart cmp">';
  paths.forEach(function(p){
    var tot = p.parts.reduce(function(a, v){ return a + v; }, 0);
    h += '<div class="yrow cmprow"><span class="ylab"><span class="pchip" style="--pc:var(' + PCOL[p.i] + ')"></span>Path ' + NAMES[p.i] + '</span><span class="ytrack" role="img" aria-label="Path ' + NAMES[p.i] + ' monthly: ' + SEG.map(function(sg, k){ return sg[0] + ' ' + m(p.parts[k]); }).join(', ') + '">' + stackBar(p.parts, mscale) + '</span><span class="yval num">' + m(tot) + '/mo</span></div>';
  });
  h += '</div><div class="seg-legend">' + SEG.map(function(sg, k){
    var vals = paths.map(function(p){ return p.parts[k]; }), same = vals.every(function(v){ return Math.abs(v - vals[0]) < 1; });
    return '<span><span><i class="dot" style="background:var(' + sg[1] + ')"></i>' + sg[0] + '</span><b>' + (same ? m(vals[0]) : vals.map(function(v){ return m(v); }).join(' / ')) + '</b></span>';
  }).join('') + '</div>';
  if (b.buy) h += '<p class="small">Buying: ' + m(b.buy.down) + ' down payment saved first, then ' + m(b.buy.pi) + ' a month for the mortgage, ' + m(b.buy.ti) + ' for taxes and insurance, and ' + m(b.buy.ut) + ' for utilities and upkeep. The typical first-time buyer is now 40 years old (NAR 2025).</p>';
  if (s.kids) h += '<p class="small">Child care alone is ' + m(b.cats[1] / 12) + ' a month here for ' + s.kids + (s.kids > 1 ? ' children' : ' child') + ' (MIT). Health care is ' + m(b.cats[2] / 12) + ' a month: the household’s share of insurance premiums plus care. Workers paid an average of $7,471 a year toward employer family coverage in 2026 (KFF).</p>';

  /* C. Pay needed vs. what jobs pay */
  var marks = [];
  marks.push(['Full-time at minimum wage', mt.minw * 2080, '--c-uncov']);
  marks.push(['MIT living wage, ' + (s.earners > 1 ? 'each worker' : 'this household'), (s.earners > 1 ? mt.pre[s.col] / 2 : mt.pre[s.col]), '--c-uncov']);
  paths.forEach(function(p){ marks.push(['Path ' + NAMES[p.i] + ' needs', per(p), PCOL[p.i], true]); });
  if (gr && P.parseMoney($('gpay').value) > 0) marks.push(['Expected pay after grad school', basePay, '--c-free']);
  marks.push([maj[0] + ': low (25th percentile)', maj[1], '--c-free']);
  marks.push([maj[0] + ': middle (median)', maj[2], '--c-free']);
  marks.push([maj[0] + ': high (75th percentile)', maj[3], '--c-free']);
  (MAJ_OCC[$('major').value] || []).forEach(function(o){ if (mt.j[o] > 0) marks.push(['Typical ' + P.esc(mt.n) + ' pay, ' + D.occ[o].toLowerCase() + ' (all ages)', mt.j[o], '--c-fam']); });
  var mmax = Math.max.apply(null, marks.map(function(x){ return x[1]; }));
  h += '<p class="chart-h">Pay needed vs. what jobs pay' + (s.earners > 1 ? ' (per worker)' : '') + '</p><div class="ychart marks" role="img" aria-label="' + marks.map(function(x){ return x[0].replace(/<[^>]+>/g, '') + ' ' + m(x[1]); }).join('; ') + '">';
  marks.forEach(function(x){
    h += '<div class="yrow"><span class="ylab">' + (x[3] ? '<b>' + x[0] + '</b>' : x[0]) + '</span><span class="ytrack"><span class="bar" style="width:' + (x[1] / mmax * 100).toFixed(1) + '%"><span style="width:100%;background:var(' + x[2] + ')"></span></span></span><span class="yval num">' + m(x[1]) + '</span></div>';
  });
  h += '</div><p class="small muted">Early-career pay by major is national and covers every job graduates hold; local pay covers workers of all ages.' + (mt.st === 'CO' && mt.n === 'Denver' ? ' Denver’s city minimum wage is $19.29 ($40,123 full time).' : '') + '</p>';

  /* D. Rules of thumb */
  h += '<h3>6. Rules of thumb for each path</h3><div class="need">';
  paths.forEach(function(p){
    var debt = p.sp.atGrad, items = [];
    if (debt > 0){
      items.push([debt <= basePay, 'Student debt ' + m(debt) + (debt <= basePay ? ' is under ' : ' is more than ') + 'the first year’s expected pay (' + m(basePay) + ').']);
      var share = p.sp.monthly * 12 / basePay;
      items.push([share <= 0.10, 'Loan payment is ' + Math.round(share * 100) + '% of that pay' + (share <= 0.10 ? ', under the 10% guideline.' : share <= 0.15 ? ', over 10%: a stretch.' : ', over 15%: likely too high.')]);
    } else items.push([true, 'No student loans.']);
    if (p.pl.p){
      if (fam.parentInc > 0) items.push([p.pl.p.gross <= fam.parentInc, 'Parent PLUS ' + m(p.pl.p.gross) + (p.pl.p.gross <= fam.parentInc ? ' is under' : ' is more than') + ' one year of parents’ income. The guideline counts all children, and less near retirement.']);
      else items.push([p.pl.p.gross < 30000, 'Parents borrow ' + m(p.pl.p.gross) + ' (' + m(p.parentMo) + '/mo for ' + p.pl.p.years + ' years). Add parents’ income above to check it.']);
    }
    var housing = b.cats[3] / p.G;
    items.push([housing <= 0.30, 'Housing is ' + Math.round(housing * 100) + '% of the pay needed' + (housing <= 0.30 ? ', within the 30% guideline.' : ', above 30%: a roommate or a cheaper place helps.')]);
    h += '<div class="result" style="--pc:var(' + PCOL[p.i] + ')"><h4><span class="pchip"></span>' + NAMES[p.i] + ': ' + P.esc(p.c.n) + '</h4><ul class="flags">' +
      items.map(function(it){ return '<li class="' + (it[0] ? 'ok' : '') + '">' + it[1] + '</li>'; }).join('') + '</ul></div>';
  });
  h += '</div>';
  if (gr){
    h += '<p class="small">Graduate school: borrowing ' + m(gr.gross) + ' over ' + gr.years + (gr.years > 1 ? ' years' : ' year') + ' in federal graduate loans at ' + P.pctText(F.grad.rate, 2) + ' (limit ' + m(gr.kind === 'prof' ? F.grad.profAnnual : F.grad.annual) + ' a year; Grad PLUS ended for new borrowers on July 1, 2026). ' +
      (gr.short > 0.5 ? 'The federal limit leaves ' + m(gr.short) + ' to pay another way. ' : '') + 'Undergraduate loans can wait during graduate school, but interest keeps adding up.</p>';
  }
  $('out').innerHTML = h;
}

document.addEventListener('DOMContentLoaded', function(){
  $('income').innerHTML = P.BRACKETS.map(function(b, i){ return '<option value="' + i + '"' + (i === 3 ? ' selected' : '') + '>' + b + '</option>'; }).join('');
  $('major').innerHTML = Object.keys(MAJ).map(function(k){ return '<option value="' + k + '"' + (k === 'bus' ? ' selected' : '') + '>' + MAJ[k][0] + '</option>'; }).join('');
  $('metro').innerHTML = D.metros.map(function(x){ return '<option value="' + x.id + '">' + P.esc(x.n) + ' (' + x.st + ')</option>'; }).join('');
  $('paths').innerHTML = [0, 1, 2].map(pathCard).join('');
  [0, 1, 2].forEach(function(i){
    resFill(i, DEFAULTS[i].res); $('p' + i + '-l').value = DEFAULTS[i].live; autoPrice(i);
    $('p' + i + '-c').addEventListener('change', function(){ resFill(i); autoPrice(i); render(); });
    $('p' + i + '-r').addEventListener('change', function(){ autoPrice(i); render(); });
    $('p' + i + '-l').addEventListener('change', function(){ autoPrice(i); render(); });
    $('p' + i + '-n').addEventListener('input', render);
  });
  $('income').addEventListener('change', function(){ [0, 1, 2].forEach(autoPrice); render(); });
  $('home').addEventListener('change', function(){ $('buy').hidden = $('home').value !== 'buy'; render(); });
  $('grad').addEventListener('change', function(){ $('gradbox').hidden = $('grad').value === 'none'; render(); });
  document.querySelectorAll('#family,#studentpay,#down,#parentinc,#save,#price,#dp,#mrate,#tins,#hutil,#gcost,#ghelp,#gpay').forEach(function(el){ el.addEventListener('input', render); });
  document.querySelectorAll('#who,#major,#metro,#stage,#gyears').forEach(function(el){ el.addEventListener('change', render); });
  P.moneyInputs();
  render();
});
window.PFC_PATHS = { taxes: taxes, payNeeded: payNeeded, MAJ: MAJ, STAGE: STAGE };
})();
