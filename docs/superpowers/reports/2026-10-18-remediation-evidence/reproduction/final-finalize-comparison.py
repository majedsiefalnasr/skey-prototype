from pathlib import Path
from PIL import Image,ImageChops
import json,hashlib,shutil,collections
O=Path(__file__).parent;R=Path('/Users/majedsiefalnasr/Documents/Work/Ultimate-Solutions-EGY/skey/skey-figma');D=R/'docs/superpowers/reports/2026-10-18-remediation-evidence'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
key=lambda r:(r['file'],r['title'],r['project'])
d=json.loads((O/'comparison.json').read_text());review={r['path']:r for r in json.loads((R/'docs/superpowers/reports/2026-10-17-demo-visual-review/review.json').read_text())['entries']};control={key(r):r for r in json.loads((R/'docs/superpowers/reports/2026-10-18-corrected-historical-suite.json').read_text())['allResults']}
for r in d['allResults']:
 if r['status'] in ['passed','skipped']:continue
 assert r['snapshotEvidence'],'Unexpected functional failure requires diagnosis'
 for e in r['snapshotEvidence']:
  p=e['path'];entry=review.get(p,{});e['historicalReviewStatus']=entry.get('status');e['historicalReviewReason']=entry.get('reason')
  stem=Path(p).stem;folder=D/'full-failures'/r['project'];folder.mkdir(parents=True,exist_ok=True);prefix=r['file'].removesuffix('.spec.mjs')+'-'+stem
  for label,src in [('original',R/p),('candidate',Path(e['actual']))]:
   dst=folder/(prefix+'-'+label+'.png');shutil.copy2(src,dst);e[label+'Asset']=str(dst.relative_to(D))
  for a in r['attachments']:
   src=Path(a['path'])
   if a['name'].endswith('-diff.png') or a['name']=='trace':
    dst=folder/(prefix+'-'+('trace.zip' if a['name']=='trace' else 'diff.png'));shutil.copy2(src,dst)
  if r['file']=='messaging.spec.mjs' or (r['file']=='parity.spec.mjs' and stem=='email'):
   r['classification']='Intended Mail gutter alignment and approved canonical demo data; protected PNG retained'
   r['risk']='Exact screenshot fails. Reader/unread assertions pass before capture; candidate reproduces by exact hash. No replacement authorized for this version.'
  elif r['file']=='data-list-component.spec.mjs' and r['project']=='mobile-rtl' and stem=='adaptive':
   r['classification']='Intended Arabic PO Reference label plus prior reviewed list changes; protected PNG retained'
   r['risk']='The prior candidate displayed PO Reference in English. Current label is مرجع أمر الشراء; raw field values and layout geometry are retained. Focused reproduction hash matches.'
   old=R/'docs/superpowers/reports/2026-10-17-demo-visual-review'/entry['after'];a=Image.open(old).convert('RGB');b=Image.open(e['actual']).convert('RGB');diff=ImageChops.difference(a,b);e['deltaFromPriorReviewedCandidateBounds']=diff.getbbox();e['priorReviewedCandidateSha256']=sha(old)
  elif r['file']=='parity.spec.mjs' and stem=='launchpad':
   originals=[Path(a['path']) for a in control[key(r)]['attachments'] if a['name'].endswith('-actual.png')];assert len(originals)==1 and sha(originals[0])==e['actualSha256'];r['classification']='Inherited launchpad baseline discrepancy; exact pixels match corrected historical control'
   r['risk']='No current-delivery product change explains this baseline. Preserve D-04/unresolved historical policy; no replacement proposed.';e['matchesCorrectedControlActual']=True
  else:
   assert e['matchesReviewedCandidate'],(p,'Unexplained current difference');r['classification']='Inherited protected screenshot; current pixels exactly match previously reviewed candidate'
   r['risk']=entry.get('reason','Protected visual change remains open')
  e['decision']='Retain historical D-04 baseline; no replacement proposed' if entry.get('status')=='retained-stale' else 'Retain unexplained historical baseline; no replacement proposed' if r['classification'].startswith('Inherited launchpad') else 'Exact-path approval required before any replacement'
index={key(r):r for r in d['allResults']}
for field in ['failures','newFailuresVsControl','newFailuresVsPrevious','original73StillFailing']:d[field]=[index[key(r)] for r in d[field]]
d['failureClassifications']=dict(collections.Counter(r['classification'] for r in d['failures']));d['execution']={'commandExit':1,'allCasesObserved':2604,'globalErrors':0,'flakyCases':0,'durationMinutes':json.loads((O/'full-final.json').read_text())['stats']['duration']/60000,'fullRun':'full-final.json','interruptedPreliminaryRun':'full-stable.json; 230 passed, 7 skipped, 2 interrupted, 2365 not run; not final evidence'}
(O/'comparison.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');print(d['failureClassifications'])
