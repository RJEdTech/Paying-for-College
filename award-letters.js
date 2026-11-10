/* Award Letter Decoder: sorts each college's offer into free money, loans and work-study,
   then shows the net price for year 1 and an estimate for four years.
   Four-year estimate: costs rise by the family's chosen rate; college grants stay the same each year
   unless marked first-year only; federal and state grants are assumed to repeat; outside scholarships
   repeat only if marked. Nothing typed here is saved or sent. */
(function(){
'use strict';
var P = window.PFC, F = P.FACTS;
var MAX = 4;
var FIELDS = [
  ['tuition', 'Tuition and fees', 'cost', 'On the bill'],
  ['housing', 'Housing and meals', 'cost', 'On the bill if living on campus'],
  ['other', 'Books, travel, personal', 'cost', 'Not billed; the college’s estimate'],
  ['gCollege', 'Grants and scholarships from the college', 'free', 'Merit or need-based awards'],
  ['gGov', 'Federal and state grants', 'free', 'Pell, Colorado Student Grant, etc.'],
  ['gOutside', 'Outside scholarships', 'free', 'Rotary, Daniels, a parent’s employer…'],
  ['ws', 'Work-study', 'ws', 'Paid as paychecks for hours worked'],
  ['sLoan', 'Student loans', 'loan', 'Direct Subsidized or Unsubsidized'],
  ['pLoan', 'Parent PLUS loan', 'loan', 'In a parent’s name'],
  ['xLoan', 'Private or other loans', 'loan', 'From a bank or the college']
];
var EXAMPLES = [
  { name: 'Example State University', tuition: 13800, housing: 14200, other: 4300, gCollege: 3000, gGov: 0, gOutside: 1000, ws: 0, sLoan: 5500, pLoan: 0, xLoan: 0, renew: 'gpa', gpa: '3.0', outRenew: 'once' },
  { name: 'Example Jesuit University', tuition: 58900, housing: 16100, other: 3900, gCollege: 31000, gGov: 0, gOutside: 1000, ws: 2500, sLoan: 5500, pLoan: 10000, xLoan: 0, renew: 'gpa', gpa: '3.0', outRenew: 'once' },
  { name: 'Example Private College', tuition: 49500, housing: 15400, other: 0, gCollege: 24000, gGov: 0, gOutside: 1000, ws: 3000, sLoan: 5500, pLoan: 0, xLoan: 0, renew: 'once', gpa: '', outRenew: 'once' }
];
var schools = [];

function blank(i){ return { name: '', tuition: '', housing: '', other: '', gCollege: '', gGov: '', gOutside: '', ws: '', sLoan: '', pLoan: '', xLoan: '', renew: 'same', gpa: '', outRenew: 'once', _i: i }; }
function $(id){ return document.getElementById(id); }
function fmtIn(v){ if (v === '' || v == null) return ''; return Number(v).toLocaleString('en-US'); }

function form(){
  var host = $('schools');
  var h = '';
  schools.forEach(function(s, i){
    var id = 's' + i;
    h += '<div class="school" data-i="' + i + '">';
    if (schools.length > 1) h += '<button type="button" class="rm no-print" data-rm="' + i + '">Remove</button>';
    h += '<div class="field sname"><label for="' + id + '-name">College ' + (i + 1) + '</label><input type="text" id="' + id + '-name" data-k="name" placeholder="College name" value="' + P.esc(s.name) + '" autocomplete="off"></div>';
    var groups = [['cost', 'Cost for one year'], ['free', 'Free money (no repaying)'], ['ws', 'Earned'], ['loan', 'Loans (repaid with interest)']];
    groups.forEach(function(g){
      h += '<fieldset><legend>' + g[1] + '</legend>';
      FIELDS.filter(function(f){ return f[2] === g[0]; }).forEach(function(f){
        h += '<div class="field"><label for="' + id + '-' + f[0] + '">' + f[1] + '<span class="hint">' + f[3] + '</span></label><div class="money"><input type="text" inputmode="decimal" id="' + id + '-' + f[0] + '" data-k="' + f[0] + '" value="' + fmtIn(s[f[0]]) + '" autocomplete="off"></div></div>';
        if (f[0] === 'gCollege'){
          h += '<div class="field"><label for="' + id + '-renew">Does the college’s award renew?</label><select id="' + id + '-renew" data-k="renew">' +
            opt('same', 'Yes, every year', s.renew) + opt('gpa', 'Yes, if a GPA is kept', s.renew) + opt('once', 'First year only', s.renew) + opt('unk', 'Not stated', s.renew) + '</select></div>';
          h += '<div class="field" ' + (s.renew === 'gpa' ? '' : 'hidden') + ' data-gpa><label for="' + id + '-gpa">GPA needed to keep it</label><input type="text" inputmode="decimal" id="' + id + '-gpa" data-k="gpa" value="' + P.esc(s.gpa) + '" placeholder="e.g. 3.0"></div>';
        }
        if (f[0] === 'gOutside'){
          h += '<div class="field"><label for="' + id + '-outRenew">Outside scholarships renew?</label><select id="' + id + '-outRenew" data-k="outRenew">' +
            opt('once', 'First year only', s.outRenew) + opt('same', 'Yes, every year', s.outRenew) + '</select></div>';
        }
      });
      h += '</fieldset>';
    });
    h += '</div>';
  });
  host.innerHTML = h;
  $('add').hidden = schools.length >= MAX;
  P.moneyInputs(host);
  host.querySelectorAll('[data-k]').forEach(function(el){
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function(){
      var i = Number(el.closest('.school').getAttribute('data-i')), k = el.getAttribute('data-k');
      schools[i][k] = (k === 'name' || k === 'renew' || k === 'gpa' || k === 'outRenew') ? el.value : el.value;
      if (k === 'renew'){ var g = el.closest('.school').querySelector('[data-gpa]'); g.hidden = el.value !== 'gpa'; }
      render();
    });
  });
  host.querySelectorAll('[data-rm]').forEach(function(b){
    b.addEventListener('click', function(){ schools.splice(Number(b.getAttribute('data-rm')), 1); form(); render(); });
  });
}
function opt(v, t, cur){ return '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + t + '</option>'; }

function calc(s, grow){
  var n = function(k){ return P.parseMoney(s[k]); };
  var coa = n('tuition') + n('housing') + n('other');
  var billed = n('tuition') + n('housing');
  var free = n('gCollege') + n('gGov') + n('gOutside');
  var loans = n('sLoan') + n('pLoan') + n('xLoan');
  var ws = n('ws');
  var net = coa - free;
  var left = Math.max(0, net - loans - ws);
  var net4 = 0, years = [];
  for (var k = 0; k < 4; k++){
    var c = coa * Math.pow(1 + grow, k);
    var g = n('gGov') + (s.renew === 'once' && k > 0 ? 0 : n('gCollege')) + (s.outRenew === 'same' || k === 0 ? n('gOutside') : 0);
    years.push(c - g); net4 += c - g;
  }
  return { name: s.name.trim() || ('College ' + (s._i + 1)), coa: coa, billed: billed, free: free, loans: loans, ws: ws, net: net, left: left,
    net4: net4, years: years, gCollege: n('gCollege'), gOutside: n('gOutside'), sLoan: n('sLoan'), pLoan: n('pLoan'), xLoan: n('xLoan'),
    other: n('other'), housing: n('housing'), tuition: n('tuition'), renew: s.renew, gpa: s.gpa, outRenew: s.outRenew,
    billDue: Math.max(0, billed - free - n('sLoan') - n('pLoan') - n('xLoan')) };
}

function flags(r){
  var m = P.money, out = [];
  var aid = r.free + r.loans + r.ws;
  if (r.loans > 0) out.push(m(r.loans) + ' of the ' + m(aid) + ' offered (' + P.pctText(r.loans / aid) + ') is loans. Loans lower what you pay now, not what college costs: they are paid back with interest.');
  if (r.pLoan > 0) out.push('The offer includes a ' + m(r.pLoan) + ' Parent PLUS loan. It would be in a parent’s name at ' + P.pctText(F.plus.rate, 2) + ', with a ' + P.pctText(F.plus.fee, 3) + ' fee and a $20,000 yearly limit per student.');
  if (r.sLoan > F.direct.limits[0]) out.push('The student loan (' + m(r.sLoan) + ') is more than the ' + m(F.direct.limits[0]) + ' federal limit for a first-year student. Ask whether part of it is a private or college loan.');
  if (r.ws > 0) out.push('Work-study (' + m(r.ws) + ') is paid as paychecks for hours worked during the year. It does not lower the first bill.');
  if (r.renew === 'once' && r.gCollege > 0) out.push('The college’s ' + m(r.gCollege) + ' award is for the first year only. Years 2 to 4 would each cost about that much more.');
  if (r.renew === 'gpa' && r.gCollege > 0) out.push('The college’s award needs a ' + (r.gpa ? r.gpa + ' ' : '') + 'GPA to renew. If it were lost after year 1, the four-year cost would rise by ' + m(r.gCollege * 3) + '.');
  if (r.renew === 'unk' && r.gCollege > 0) out.push('The offer doesn’t say whether the college’s award renews. Ask before you compare four-year costs.');
  if (r.other === 0 && r.coa > 0) out.push('No books, travel or personal costs are listed, so this college can look cheaper than it is. Ask for the college’s estimate.');
  if (r.gOutside > 0 && r.outRenew === 'once') out.push({ ok: true, t: 'Outside scholarships are counted for year 1 only. Ask each college whether it lowers its own grants when a student brings in outside money.' });
  if (aid > r.coa + 0.5 && r.coa > 0) out.push('The offer adds up to more than the cost of attendance. Check the numbers you typed.');
  return out;
}

function render(){
  var grow = P.parsePct($('grow').value);
  var res = schools.map(function(s){ return calc(s, grow); }).filter(function(r){ return r.coa > 0; });
  var out = $('results');
  if (!res.length){ out.innerHTML = '<p class="muted">Results appear here as you type. Start with the cost lines from one offer, or try the example.</p>'; return; }
  var m = P.money;
  var sorted = res.slice().sort(function(a, b){ return a.net4 - b.net4; });
  var h = '';
  if (res.length > 1){
    h += '<div class="tbl-wrap"><table><thead><tr><th>College</th><th class="r">Cost (1 year)</th><th class="r">Free money</th><th class="r">Net price, year 1</th><th class="r">Loans in offer</th><th class="r">Net price, 4 years</th></tr></thead><tbody>';
    sorted.forEach(function(r){
      h += '<tr><td>' + P.esc(r.name) + '</td><td class="r">' + m(r.coa) + '</td><td class="r">' + m(r.free) + '</td><td class="r"><b>' + m(r.net) + '</b></td><td class="r">' + m(r.loans) + '</td><td class="r"><b>' + m(r.net4) + '</b></td></tr>';
    });
    h += '</tbody></table></div><p class="small muted">Sorted by four-year net price (cost minus free money). The lowest price is a fact, not a recommendation: fit, programs and what your student wants matter too.</p>';
  }
  sorted.forEach(function(r, idx){
    var total = Math.max(r.coa, r.free + r.loans + r.ws);
    var seg = function(v, c, t){ return v > 0 ? '<span style="width:' + (v / total * 100).toFixed(2) + '%;background:var(' + c + ')" title="' + t + ': ' + m(v) + '"></span>' : ''; };
    h += '<div class="result"><h4>' + P.esc(r.name) + (res.length > 1 && idx === 0 ? '<span class="lowest">Lowest 4-year net price</span>' : '') + '</h4>';
    h += '<p class="bigline">Net price for year 1: <b class="num">' + m(r.net) + '</b> &nbsp;·&nbsp; about <b class="num">' + m(r.net4) + '</b> over four years</p>';
    h += '<div class="bar" role="img" aria-label="Of ' + m(r.coa) + ': free money ' + m(r.free) + ', loans ' + m(r.loans) + ', work-study ' + m(r.ws) + ', still to pay ' + m(r.left) + '">' +
      seg(r.free, '--c-free', 'Free money') + seg(r.loans, '--c-loan', 'Loans') + seg(r.ws, '--c-ws', 'Work-study') + seg(r.left, '--c-gap', 'Still to pay') + '</div>';
    h += '<div class="legend"><span><i class="dot" style="background:var(--c-free)"></i>Free money ' + m(r.free) + '</span><span><i class="dot" style="background:var(--c-loan)"></i>Loans ' + m(r.loans) + '</span><span><i class="dot" style="background:var(--c-ws)"></i>Work-study ' + m(r.ws) + '</span><span><i class="dot" style="background:var(--c-gap)"></i>Still to pay ' + m(r.left) + '</span></div>';
    h += '<dl class="kv"><dt>Cost of attendance (1 year)</dt><dd>' + m(r.coa) + '</dd><dt>− Free money</dt><dd>' + m(r.free) + '</dd><dt class="tot">= Net price</dt><dd class="tot">' + m(r.net) + '</dd>' +
      '<dt>− Loans offered</dt><dd>' + m(r.loans) + '</dd><dt>− Work-study</dt><dd>' + m(r.ws) + '</dd><dt class="tot">= Still to pay from savings, income or more loans</dt><dd class="tot">' + m(r.left) + '</dd>' +
      '<dt>First bill after grants and loans (tuition + housing only)</dt><dd>' + m(r.billDue) + '</dd></dl>';
    var fl = flags(r);
    if (fl.length) h += '<ul class="flags">' + fl.map(function(f){ return typeof f === 'string' ? '<li>' + f + '</li>' : '<li class="ok">' + f.t + '</li>'; }).join('') + '</ul>';
    h += '<details class="more" style="margin-top:10px"><summary>Year-by-year net price</summary><div class="tbl-wrap"><table><thead><tr><th>Year</th><th class="r">Net price</th></tr></thead><tbody>' +
      r.years.map(function(v, k){ return '<tr><td>' + (k + 1) + '</td><td class="r">' + m(v) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
    h += '<p class="no-print" style="margin:10px 0 0"><a href="who-borrows.html?net=' + Math.round(r.net) + '&amp;name=' + encodeURIComponent(r.name) + '">Plan who borrows for ' + P.esc(r.name) + ' →</a></p>';
    h += '</div>';
  });
  out.innerHTML = h;
}

function csv(){
  var grow = P.parsePct($('grow').value);
  var res = schools.map(function(s){ return calc(s, grow); }).filter(function(r){ return r.coa > 0; });
  var head = ['College', 'Cost of attendance', 'Free money', 'Loans offered', 'Work-study', 'Net price year 1', 'Still to pay after offer', 'Net price 4 years'];
  var lines = [head.join(',')].concat(res.map(function(r){
    return ['"' + r.name.replace(/"/g, '""') + '"', r.coa, r.free, r.loans, r.ws, Math.round(r.net), Math.round(r.left), Math.round(r.net4)].join(',');
  }));
  var blob = new Blob([lines.join('\r\n')], { type: 'text/csv' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'award-letter-comparison.csv';
  document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

document.addEventListener('DOMContentLoaded', function(){
  schools = [blank(0), blank(1)];
  form(); render();
  $('add').addEventListener('click', function(){ if (schools.length < MAX){ schools.push(blank(schools.length)); reindex(); form(); render(); } });
  $('example').addEventListener('click', function(){
    schools = EXAMPLES.map(function(e, i){ var o = blank(i); Object.keys(e).forEach(function(k){ o[k] = e[k]; }); return o; });
    form(); render(); $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('clear').addEventListener('click', function(){ schools = [blank(0), blank(1)]; form(); render(); });
  $('grow').addEventListener('input', render);
  $('print').addEventListener('click', function(){ window.print(); });
  $('csv').addEventListener('click', csv);
});
function reindex(){ schools.forEach(function(s, i){ s._i = i; }); }
window.PFC_AL = { calc: calc, flags: flags };
})();
