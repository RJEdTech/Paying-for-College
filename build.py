#!/usr/bin/env python3
"""Builds the three pages of Paying for College from src/*.html bodies.
Shared head, masthead, draft banner, footer and GoatCounter snippet live here,
so every page stays identical around its body. Run: python3 build.py"""
import pathlib, re, time

ROOT = pathlib.Path(__file__).parent
V = time.strftime('%Y%m%d%H%M')
MARK = (ROOT / 'rjmark.txt').read_text().strip()          # src="data:image/png;base64,..."
MASTHEAD_CSS = (ROOT / 'masthead.css').read_text()
BASE_CSS = (ROOT / 'base.css').read_text()
(ROOT / 'pfc.css').write_text(MASTHEAD_CSS.rstrip() + '\n\n' + BASE_CSS)

BUG = ('https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=4SwuQZc-CEClZjjFdYLisQzihhIB-7hPp9L3AOSeJONUOVJaVTVMOE9YMFNSVVM3TUNOOFVQR1pYTi4u'
       '&amp;rc59cb41123d3497584d2ca10cb9e1c54=%22Paying%20for%20College%22')

DRAFT = ('<p class="draft" role="note"><b>Draft for review by RJ College Counseling.</b> '
         'Not yet shared with families. Every number links to its source.</p>')

FOOT = f'''<p class="foot">RJ Ed Tech · Paying for College · Estimates for planning, not financial, tax or legal advice. Facts checked November 10, 2026.<br>
Questions about your student’s college plans? <a href="https://regisjesuit.com/student-experience/college-counseling" target="_blank" rel="noopener">Contact RJ College Counseling</a>.<br>
RJ staff: <a href="{BUG}" target="_blank" rel="noopener">report a problem or suggest an idea</a> (Microsoft Form, RJ sign-in).<br>
FAFSA® is a registered trademark of the U.S. Department of Education. CSS Profile is a College Board program. Neither is affiliated with, or endorses, this site.<br>
© 2026 Jason Beyer, RJ Ed Tech · <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="license noopener">CC BY-NC 4.0</a>: free to share and adapt for non-commercial use, with credit.</p>'''

GOAT = '''<!-- Anonymous page-view count (GoatCounter, rjedtech.goatcounter.com): no cookies, no personal data, nothing typed into the tools.
     Only the page path is sent; anything after ? in the address (such as a net price passed between tools) is never sent.
     A visit through the school's Securly filter (?scrlybrkr in the address) adds ?sd = school device; nothing else about the visitor is sent. -->
<script>
window.goatcounter={no_onload:true};
(function(){var last=null,tries=0;
function route(){var h=(location.hash||'').slice(1).split(/[=@?&]/)[0].replace(/[^A-Za-z0-9_-]/g,'').slice(0,40);return location.pathname.replace(/index\\.html$/,'')+(h?'#'+h:'')+(/scrlybrkr/.test(location.search)?'?sd':'');}
function go(){var p=route();if(p===last)return;var g=window.goatcounter;if(!g||typeof g.count!=='function'){if(tries++<40)setTimeout(go,250);return;}last=p;try{g.count({path:p});}catch(e){}}
window.addEventListener('hashchange',go);if(document.readyState==='complete')go();else window.addEventListener('load',go);})();
</script>
<script data-goatcounter="https://rjedtech.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>'''

PAGES = [
    ('index.html', 'src/index.html', 'Paying for College · Regis Jesuit',
     'Free tools and plain answers for Regis Jesuit families paying for college: award letters, student and parent loans, scholarships, and what changed for 2026–27.', []),
    ('award-letters.html', 'src/award-letters.html', 'Award Letter Decoder · Paying for College',
     'Compare up to four college financial aid offers: free money, loans, work-study, and the real net price over four years.', ['colleges.js', 'award-letters.js']),
    ('who-borrows.html', 'src/who-borrows.html', 'Who Borrows? · Paying for College',
     'Compare a student borrowing federal loans first with parents borrowing it all through Parent PLUS, under the 2026 loan limits.', ['colleges.js', 'who-borrows.js']),
    ('payoff.html', 'src/payoff.html', 'Loan Payoff Calculator \u00b7 Paying for College',
     'Monthly payment, payoff date and interest for a student or Parent PLUS loan at today\u2019s rates, with and without extra payments.', ['payoff.js']),
]

for out, src, title, desc, js in PAGES:
    body = (ROOT / src).read_text().strip()
    crumb = '' if out == 'index.html' else '<p class="crumb no-print"><a href="./">← Paying for College</a></p>\n'
    scripts = '\n'.join([f'<script src="pfc.js?v={V}"></script>'] + [f'<script src="{j}?v={V}"></script>' for j in js])
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<script>try{{var t=localStorage.getItem('rj-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}}catch(e){{}}</script>
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="stylesheet" href="pfc.css?v={V}">
</head>
<body>
<header class="rj-masthead">
  <div class="hl">
    <img class="rj-mark" {MARK} alt="RJ">
    <div>
      <h1>Paying for College</h1>
      <p class="tagline">For Regis Jesuit families</p>
    </div>
  </div>
  <div class="mh-right"><button type="button" id="theme" class="mh-btn" aria-pressed="false">Dark mode</button></div>
</header>

<main class="wrap">
{crumb}{DRAFT}
{body}
{FOOT}
</main>

{scripts}
{GOAT}
</body>
</html>
'''
    (ROOT / out).write_text(html)
    print('built', out, len(html), 'bytes')
