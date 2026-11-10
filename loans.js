/* Paying for College: the shared four-year loan model (used by Who Borrows? and Compare Paths).
   Each year: net price (rising by the family's %) − what the family and student pay from income
   − savings put down (used in the first years, or spread evenly) = the amount to finance.
   - Each year's loan is split into fall and spring disbursements (August and January).
   - Fees are taken out of each disbursement, so a family borrows a little more than it needs.
   - Interest builds during school (no payments) and is added to the balance when payments start,
     6 months after graduation.
   - Repayment uses the Tiered Standard plan: 10/15/20/25 years by the balance entering repayment.
   inp: {net, family, student, down, downMode ('first'|'even'), grow, privRate|null, dRate, dFee, pRate, pFee}
   Nothing typed is saved or sent. */
(function(){
'use strict';
var P = window.PFC, F = P.FACTS;
var YEARS = 4;
var SPRING = 5/12;            /* January disbursement, 5 months after August */
var REPAY = YEARS + 0.25;     /* graduation in May of year 4 (3.75) + 6 months */
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

/* Default inputs at this year's federal rates */
function defaults(o){
  var d = { net: 0, family: 0, student: 0, down: 0, downMode: 'first', grow: 0.03, privRate: null,
    dRate: F.direct.rate, dFee: F.direct.fee, pRate: F.plus.rate, pFee: F.plus.fee };
  for (var k in o) d[k] = o[k];
  return d;
}
window.PFC_LOANS = { plan: plan, defaults: defaults, YEARS: YEARS, REPAY: REPAY };
})();
