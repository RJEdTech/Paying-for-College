/* Paying for College: shared facts and helpers.
   Nothing a family types is stored or sent anywhere: all math runs in this page.
   FACTS: federal loan terms for loans first disbursed July 1, 2026 to June 30, 2027.
   Update every July (rates) and October (fees). Checked November 10, 2026. */
(function(){
'use strict';
var FACTS = {
  checked: 'November 10, 2026',
  year: '2026–27',
  direct: { rate: 0.0652, fee: 0.01057, limits: [5500, 6500, 7500, 7500], aggregate: 31000 },
  plus:   { rate: 0.0907, fee: 0.04228, annualCap: 20000, aggregateCap: 65000 },
  /* Tiered Standard plan (loans made on or after July 1, 2026): term set by the balance entering repayment */
  tiers: [ [25000, 10], [50000, 15], [100000, 20], [Infinity, 25] ],
  /* Graduate loans for 2026–27 (One Big Beautiful Bill Act): Grad PLUS ends for new borrowers July 1, 2026 */
  grad: { rate: 0.0807, fee: 0.01057, annual: 20500, aggregate: 100000, profAnnual: 50000, profAggregate: 200000, lifetime: 257500 },
  sources: {
    direct: 'https://www2.mu.edu/central/financial-aid/loans/undergraduate-unsubsidized.php',
    fees: 'https://financial-aid.catholic.edu/financial-aid-basics/direct-loan-fees-interest.html',
    plus: 'https://www.union.edu/financial-aid-family-financing/types-aid/loans/parent-plus-loans',
    caps: 'https://undergradaid.northwestern.edu/types-of-aid/loans/plus-loan.html',
    tiers: 'https://www.elfi.com/understanding-parent-plus-loan-changes-in-2026/',
    plusPlans: 'https://www.credible.com/blog/refinance-student-loans/federal-repayment-options/'
  }
};

function parseMoney(v){
  if (v == null) return 0;
  var s = String(v).replace(/[$,\s]/g, '');
  if (s === '' || s === '-' || s === '.') return 0;
  var n = Number(s);
  return isFinite(n) ? n : 0;
}
function parsePct(v){ return parseMoney(String(v).replace('%','')) / 100; }
function money(n, cents){
  if (!isFinite(n)) return '—';
  var neg = n < 0; n = Math.abs(n);
  var s = n.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
  return (neg ? '−$' : '$') + s;
}
function round2(n){ return Math.round(n * 100) / 100; }
function pctText(x, d){ return (x * 100).toFixed(d == null ? 0 : d) + '%'; }
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

/* Level monthly payment on balance B at annual rate r over n years */
function payment(B, r, years){
  var n = years * 12;
  if (B <= 0) return 0;
  if (r === 0) return B / n;
  var i = r / 12;
  return B * i / (1 - Math.pow(1 + i, -n));
}
function tierYears(balance){
  for (var k = 0; k < FACTS.tiers.length; k++) if (balance < FACTS.tiers[k][0]) return FACTS.tiers[k][1];
  return 25;
}

/* Theme toggle (remembers only the light/dark choice, never anything typed) */
function themeInit(){
  var de = document.documentElement, key = 'rj-theme';
  try { var saved = localStorage.getItem(key); if (saved === 'dark' || saved === 'light') de.setAttribute('data-theme', saved); } catch(e){}
  var btn = document.getElementById('theme');
  if (!btn) return;
  function isDark(){
    var t = de.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function label(){ btn.textContent = isDark() ? 'Light mode' : 'Dark mode'; btn.setAttribute('aria-pressed', isDark() ? 'true' : 'false'); }
  btn.addEventListener('click', function(){
    var next = isDark() ? 'light' : 'dark';
    de.setAttribute('data-theme', next);
    try { localStorage.setItem(key, next); } catch(e){}
    label();
  });
  label();
}
/* Format money inputs on blur so "25000" reads "25,000" */
function moneyInputs(root){
  (root || document).querySelectorAll('.money input').forEach(function(inp){
    if (inp._pfc) return; inp._pfc = 1;
    inp.addEventListener('blur', function(){
      if (inp.value.trim() === '') return;
      var n = parseMoney(inp.value);
      inp.value = n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    });
  });
}

/* ---- Quick check: college menus from the College Scorecard snapshot (colleges.js) ---- */
var BRACKETS = ['$0–$30,000', '$30,001–$48,000', '$48,001–$75,000', '$75,001–$110,000', 'Over $110,000'];
function collegeData(){ return window.PFC_COLLEGES || { year: '', groups: [] }; }
function findCollege(id){
  var gs = collegeData().groups;
  for (var i = 0; i < gs.length; i++) for (var j = 0; j < gs[i].colleges.length; j++) if (String(gs[i].colleges[j].id) === String(id)) return gs[i].colleges[j];
  return null;
}
function collegeOptions(selected){
  var h = '<option value="">Choose a college (optional)</option>';
  collegeData().groups.forEach(function(g){
    h += '<optgroup label="' + esc(g.label) + '">';
    g.colleges.forEach(function(c){ h += '<option value="' + c.id + '"' + (String(c.id) === String(selected) ? ' selected' : '') + '>' + esc(c.n) + '</option>'; });
    h += '</optgroup>';
  });
  return h;
}
/* Colorado residents pay in-state tuition only at Colorado public colleges */
function coloradoRate(c){ return c.pub && c.st === 'CO'; }
/* Tuition choices a Colorado student has at this college:
   'in' (Colorado public), 'out' (other public), 'wue' (Western Undergraduate Exchange: at most 150% of in-state), 'priv' */
function residencyChoices(c){
  if (!c.pub) return ['priv'];
  if (c.st === 'CO') return ['in'];
  return c.wue ? ['wue', 'out'] : ['out'];
}
function wueTuition(c){ return Math.min(c.tout || 0, Math.round(1.5 * (c.tin || 0))); }
/* Published yearly cost, split four ways.
   opts.res: 'in' | 'out' | 'wue' (ignored for private colleges); opts.live: 'on' | 'off' | 'home'.
   Scorecard tuition includes required fees. Housing and food = room and board (meal plan) on campus,
   or the college's own estimate of rent and groceries off campus. Living at home: no housing cost here
   (the family covers it), and the college's smaller "living with family" allowance for other costs. */
function collegeCost(c, opts){
  opts = opts || {};
  var res = opts.res || (coloradoRate(c) ? 'in' : 'out');
  if (!c.pub) res = 'priv';
  if (c.pub && c.st === 'CO') res = 'in';
  if (res === 'wue' && !c.wue) res = 'out';
  var tuition = res === 'in' ? c.tin : res === 'wue' ? wueTuition(c) : c.tout;
  var live = opts.live || 'on';
  if (live === 'on' && c.rb == null) live = 'off';      /* no campus housing reported */
  var housing = live === 'on' ? c.rb : live === 'off' ? (c.rbo != null ? c.rbo : c.rb) : 0;
  var otherLiving = live === 'on' ? c.oth : live === 'off' ? (c.otho != null ? c.otho : c.oth) : (c.othf != null ? c.othf : c.oth);
  return { tuition: tuition || 0, housing: housing || 0, books: c.bk || 0, personal: otherLiving || 0,
    other: (c.bk || 0) + (otherLiving || 0), res: res, live: live };
}
function costTotal(k){ return k.tuition + k.housing + k.books + k.personal; }
/* Federal average net prices apply to a Colorado family only at private colleges and Colorado publics */
function netPricesApply(c){ return !c.pub || c.st === 'CO'; }
function collegeNote(c){
  var y = collegeData().year, h = '';
  h += '<p class="small muted" style="margin:6px 0">Published cost' + (y ? ' for ' + esc(y) : '') + ' (federal College Scorecard). Costs have likely gone up since; replace these with the numbers on your offer.' + (c.pub && c.st !== 'CO' ? ' Out-of-state tuition shown.' : '') + '</p>';
  if (netPricesApply(c) && c.nb && c.nb.some(function(v){ return v != null; })){
    h += '<details class="more small" style="margin:6px 0"><summary>What families paid after grants</summary><p class="small muted" style="margin:0 0 6px">Average yearly price after grants for first-year students who applied for federal aid' + (c.pub ? ' (in-state)' : '') + ', by family income. Federal data, most recent year reported:</p><dl class="kv">';
    c.nb.forEach(function(v, i){ h += '<dt>' + BRACKETS[i] + '</dt><dd>' + (v == null ? 'not reported' : money(v)) + '</dd>'; });
    h += '</dl></details>';
  } else if (c.pub && c.st !== 'CO') {
    h += '<p class="small muted" style="margin:6px 0">Federal averages after grants at this college are for its own state’s residents, so they don’t fit a Colorado family. Some out-of-state students get merit aid; the calculator below shows yours.</p>';
  }
  if (c.wue) h += '<p class="small" style="margin:6px 0"><b>Western discount (WUE):</b> Colorado students may pay at most 150% of in-state tuition here, about ' + money(wueTuition(c)) + ' a year instead of ' + money(c.tout) + '. Each college sets its own WUE rules (GPA, majors, deadlines). <a href="https://www.wiche.edu/tuition-savings/wue/wue-savings-finder/" target="_blank" rel="noopener">WUE Savings Finder ↗</a></p>';
  if (c.npc) h += '<p class="small" style="margin:6px 0"><a href="' + esc(c.npc) + '" target="_blank" rel="noopener">This college’s net price calculator ↗</a></p>';
  return h;
}

window.PFC = { FACTS: FACTS, BRACKETS: BRACKETS, findCollege: findCollege, collegeOptions: collegeOptions, collegeCost: collegeCost, costTotal: costTotal, residencyChoices: residencyChoices, wueTuition: wueTuition,
  netPricesApply: netPricesApply, collegeNote: collegeNote, coloradoRate: coloradoRate, collegeData: collegeData, parseMoney: parseMoney, parsePct: parsePct, money: money, round2: round2,
  pctText: pctText, esc: esc, payment: payment, tierYears: tierYears, themeInit: themeInit, moneyInputs: moneyInputs };
document.addEventListener('DOMContentLoaded', themeInit);
})();
