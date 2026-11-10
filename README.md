# Paying for College

Parent tools for Regis Jesuit families, built by RJ Ed Tech for RJ College Counseling.
Live: https://rjedtech.github.io/Paying-for-College/

| Page | What it does |
| --- | --- |
| `index.html` | Hub: the tools, where to go for everything else, what changed for 2026–27, questions for aid offices |
| `costs.html` | What It Costs: the pieces of a college's price (tuition and fees, housing and meal plan, books, personal), on campus vs. off campus vs. at home, in-state vs. out-of-state vs. WUE, an off-campus year planner with HUD rents for the college's ZIP code |
| `paths.html` | Compare Paths: up to 3 colleges → four-year price after grants → who pays and loans → monthly payments → pay needed after college by major, city, household, renting or buying, grad school; rules of thumb |
| `award-letters.html` | Award Letter Decoder: up to 4 offers, free money vs. loans vs. work-study, net price for 1 and 4 years |
| `who-borrows.html` | Who Borrows?: student Direct Loans first vs. parents borrowing it all (Parent PLUS), under the 2026 limits |
| `payoff.html` | Loan Payoff Calculator: monthly payment, payoff date and interest at today's rates, with extra payments; typical starting amounts; linked from Who Borrows? |

Everything runs in the browser. Nothing a family types is saved or sent. GoatCounter counts page views only.

## Editing
- Page bodies live in `src/*.html`. Shared head, masthead, draft banner, footer and GoatCounter are in `build.py`.
- Run `python3 build.py` to rebuild the pages and `pfc.css` (masthead block + `base.css`).
- Loan facts (rates, fees, limits, repayment tiers) are in `pfc.js` → `FACTS`. Update rates every July and fees every October.
- To take the site out of draft, delete the `DRAFT` banner in `build.py` and rebuild.
- Quick check menus read `colleges.js`, a snapshot of 68 colleges from the federal College Scorecard (2025–26 published costs; average net price by income from the most recent year reported). Source files are in `data/` (`ids.json`, `rows.json`, `npc.json`); `data/make_colleges.py "2025–26"` regenerates `colleges.js`. Also `offcampus.json` (off-campus and living-with-family costs, city/state/ZIP), `rent.json` (HUD FY2027 Small Area Fair Market Rents for each college's ZIP) and the WUE list inside `make_colleges.py`. Refresh once a year. The site makes no calls to the Scorecard or HUD; no API key is stored here.
- The four-year loan model is in `loans.js` (shared by Who Borrows? and Compare Paths).
- Compare Paths reads `life-data.js`, built by `data/make_life.py` from `data/mit.json` and `data/mit-family.json` (MIT Living Wage Calculator, 12 metro areas, all household types). Majors' early-career pay (Georgetown CEW) and 2026 tax rules are in `paths.js`.

© 2026 Jason Beyer, RJ Ed Tech · CC BY-NC 4.0
