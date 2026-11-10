# Paying for College

Parent tools for Regis Jesuit families, built by RJ Ed Tech for RJ College Counseling.
Live: https://rjedtech.github.io/Paying-for-College/

| Page | What it does |
| --- | --- |
| `index.html` | Hub: the tools, where to go for everything else, what changed for 2026–27, questions for aid offices |
| `award-letters.html` | Award Letter Decoder: up to 4 offers, free money vs. loans vs. work-study, net price for 1 and 4 years |
| `who-borrows.html` | Who Borrows?: student Direct Loans first vs. parents borrowing it all (Parent PLUS), under the 2026 limits |

Everything runs in the browser. Nothing a family types is saved or sent. GoatCounter counts page views only.

## Editing
- Page bodies live in `src/*.html`. Shared head, masthead, draft banner, footer and GoatCounter are in `build.py`.
- Run `python3 build.py` to rebuild the three pages and `pfc.css` (masthead block + `base.css`).
- Loan facts (rates, fees, limits, repayment tiers) are in `pfc.js` → `FACTS`. Update rates every July and fees every October.
- To take the site out of draft, delete the `DRAFT` banner in `build.py` and rebuild.

© 2026 Jason Beyer, RJ Ed Tech · CC BY-NC 4.0
