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

window.PFC = { FACTS: FACTS, parseMoney: parseMoney, parsePct: parsePct, money: money, round2: round2,
  pctText: pctText, esc: esc, payment: payment, tierYears: tierYears, themeInit: themeInit, moneyInputs: moneyInputs };
document.addEventListener('DOMContentLoaded', themeInit);
})();
