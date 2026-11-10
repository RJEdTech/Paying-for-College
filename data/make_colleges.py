#!/usr/bin/env python3
"""Turns a College Scorecard API pull (data/scorecard.json, the API's "results" list)
into colleges.js, the snapshot the Quick check menus read. No live API calls from the site.
Run from the repo root: python3 data/make_colleges.py <data-year label, e.g. 2023-24>"""
import json, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
YEAR = sys.argv[1] if len(sys.argv) > 1 else ''
# data/rows.json: [id, ownership(1 public, 2 private), tuition in-state, tuition out-of-state, room+board on campus,
#   books, other expenses on campus, average net price, net price by income x5] from the API's "latest" fields.
# data/npc.json: id -> net price calculator URL. data/ids.json: Scorecard name -> id.
IDS = json.load(open(ROOT / 'data' / 'ids.json'))
NPC = json.load(open(ROOT / 'data' / 'npc.json'))
RAW = {r[0]: r for r in json.load(open(ROOT / 'data' / 'rows.json'))}
rows = []
for name, i in IDS.items():
    r = RAW[i]
    rows.append({'id': i, 'school.name': name, 'own': r[1], 'tin': r[2], 'tout': r[3], 'rb': r[4], 'bk': r[5], 'oth': r[6],
                 'avg': r[7], 'nb': r[8:13], 'npc': NPC.get(str(i), '')})

# Display name and menu group for each Scorecard name. Groups are neutral categories only.
G = {
 'co_pub': ('Colorado public universities', [
   ('University of Colorado Boulder', 'University of Colorado Boulder'),
   ('Colorado State University-Fort Collins', 'Colorado State University'),
   ('University of Colorado Denver/Anschutz Medical Campus', 'University of Colorado Denver'),
   ('Colorado School of Mines', 'Colorado School of Mines'),
   ('University of Northern Colorado', 'University of Northern Colorado'),
   ('University of Colorado Colorado Springs', 'University of Colorado Colorado Springs'),
   ('Metropolitan State University of Denver', 'Metropolitan State University of Denver'),
   ('Fort Lewis College', 'Fort Lewis College'),
   ('Western Colorado University', 'Western Colorado University')]),
 'co_priv': ('Colorado private universities', [
   ('University of Denver', 'University of Denver'),
   ('Colorado College', 'Colorado College'),
   ('Regis University', 'Regis University')]),
 'jesuit': ('Jesuit colleges and universities', [
   ('Boston College', 'Boston College'), ('College of the Holy Cross', 'College of the Holy Cross'),
   ('Creighton University', 'Creighton University'), ('Fordham University', 'Fordham University'),
   ('Georgetown University', 'Georgetown University'), ('Gonzaga University', 'Gonzaga University'),
   ('John Carroll University', 'John Carroll University'), ('Loyola Marymount University', 'Loyola Marymount University'),
   ('Loyola University Chicago', 'Loyola University Chicago'), ('Loyola University Maryland', 'Loyola University Maryland'),
   ('Marquette University', 'Marquette University'), ('Rockhurst University', 'Rockhurst University'),
   ("Saint Joseph's University", "Saint Joseph's University"), ('Saint Louis University', 'Saint Louis University'),
   ('Santa Clara University', 'Santa Clara University'), ('Seattle University', 'Seattle University'),
   ('University of San Francisco', 'University of San Francisco'), ('Xavier University', 'Xavier University')]),
 'catholic': ('Other Catholic universities', [
   ('University of Notre Dame', 'University of Notre Dame'), ('Villanova University', 'Villanova University'),
   ('University of Dayton', 'University of Dayton'), ('Providence College', 'Providence College')]),
 'west': ('Western public universities (some offer the WUE discount)', [
   ('Arizona State University Campus Immersion', 'Arizona State University'), ('University of Arizona', 'University of Arizona'),
   ('Northern Arizona University', 'Northern Arizona University'), ('University of Utah', 'University of Utah'),
   ('Utah State University', 'Utah State University'), ('Montana State University', 'Montana State University'),
   ('The University of Montana', 'University of Montana'), ('University of Wyoming', 'University of Wyoming'),
   ('University of Oregon', 'University of Oregon'), ('Oregon State University', 'Oregon State University'),
   ('Boise State University', 'Boise State University'), ('University of Idaho', 'University of Idaho'),
   ('University of Nevada-Reno', 'University of Nevada, Reno'), ('University of New Mexico-Main Campus', 'University of New Mexico')]),
 'pub': ('Other public universities', [
   ('The University of Alabama', 'University of Alabama'), ('Auburn University', 'Auburn University'),
   ('University of Arkansas', 'University of Arkansas'), ('University of Florida', 'University of Florida'),
   ('Indiana University-Bloomington', 'Indiana University Bloomington'), ('Purdue University-Main Campus', 'Purdue University'),
   ('University of Kansas', 'University of Kansas'), ('Louisiana State University and Agricultural & Mechanical College', 'Louisiana State University'),
   ('Miami University-Oxford', 'Miami University (Ohio)'), ('University of Mississippi', 'University of Mississippi'),
   ('University of Missouri-Columbia', 'University of Missouri'), ('University of Nebraska-Lincoln', 'University of Nebraska-Lincoln'),
   ('University of Oklahoma-Norman Campus', 'University of Oklahoma'), ('Texas A&M University-College Station', 'Texas A&M University'),
   ('The University of Texas at Austin', 'University of Texas at Austin'), ('University of Wisconsin-Madison', 'University of Wisconsin-Madison')]),
 'priv': ('Other private universities', [
   ('Baylor University', 'Baylor University'), ('Southern Methodist University', 'Southern Methodist University'),
   ('Texas Christian University', 'Texas Christian University'), ('Tulane University of Louisiana', 'Tulane University')]),
}
by = {r['school.name']: r for r in rows}
groups, missing = [], []
for key, (label, items) in G.items():
    out = []
    for sc_name, show in items:
        r = by.get(sc_name)
        if not r:
            missing.append(sc_name); continue
        pub = r['own'] == 1
        url = r['npc']
        if url and not url.startswith('http'):
            url = 'https://' + url
        rec = {'id': r['id'], 'n': show, 'st': ('CO' if key in ('co_pub', 'co_priv') else 'OUT'), 'pub': pub,
               'tin': r['tin'], 'tout': r['tout'], 'rb': r['rb'], 'bk': r['bk'], 'oth': r['oth'],
               'avg': r['avg'], 'nb': r['nb'], 'npc': url}
        out.append(rec)
    out.sort(key=lambda x: x['n'].replace('University of ', ''))
    groups.append({'key': key, 'label': label, 'colleges': out})
if missing:
    print('MISSING:', missing)
js = ('/* College Scorecard snapshot for the Quick check menus (U.S. Department of Education).\n'
      '   Costs and average net prices for the data year below; refresh yearly with data/make_colleges.py.\n'
      '   Public colleges\' net prices are for in-state students. */\n'
      'window.PFC_COLLEGES = ' + json.dumps({'year': YEAR, 'pulled': 'November 10, 2026', 'groups': groups}, separators=(',', ':')) + ';\n')
(ROOT / 'colleges.js').write_text(js)
print('wrote colleges.js', sum(len(g['colleges']) for g in groups), 'colleges', len(js), 'bytes')
