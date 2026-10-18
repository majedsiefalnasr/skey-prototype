from pathlib import Path
import json,hashlib,collections
O=Path(__file__).parent;R=Path('/Users/majedsiefalnasr/Documents/Work/Ultimate-Solutions-EGY/skey/skey-figma')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
d=json.loads((O/'verified-final-capture-comparison.json').read_text())
review={r['path']:r for r in json.loads((R/'docs/superpowers/reports/2026-10-17-demo-visual-review/review.json').read_text())['entries']}
between={r['path']:r for r in json.loads((O/'interbuild-capture-differences.json').read_text())}
prior=Path('/private/tmp/skey-delivery/codex-resume/capture-post-approval')
for r in d['rows']:
 p=r['path'];e=review.get(p,{});r['previousReviewReason']=e.get('reason');r['matchesReviewedCandidate']=r['candidateSha256']==e.get('afterSha256');old=prior/p;r['previousCaptureSha256']=sha(old) if old.is_file() else None;r['matchesPreviousCapture']=r['candidateSha256']==r['previousCaptureSha256'];r['interbuildDifference']=between.get(p)
 if r['identical']:r['classification']='Identical';r['decision']='None'
 elif '/people-' in p:
  assert r['matchesReviewedCandidate'];r['classification']='Intended earlier canonical identity/coarse-pointer change';r['decision']='Exact-path approval required before replacement'
 elif '/invoice-' in p:r['classification']='Unresolved invoice border raster variation; prior protected review already flagged pixels';r['decision']='Hold baseline; do not replace while unexplained'
 elif p.endswith('/desktop-high-contrast-light/activities-calendar-week.png') or p.endswith('/desktop-high-contrast-dark/events-calendar-month.png'):
  r['classification']='Requested gutter alignment plus original unresolved corner repeat variation';r['decision']='Hold baseline; intended gutters do not resolve raster cause'
 elif p in between:
  r['classification']='Requested gutter alignment plus additional interbuild border-pixel difference';r['decision']='Hold baseline; bounded repeat diagnosis pending'
 else:r['classification']='Intended requested gutter alignment';r['decision']='Exact-path approval required before replacement'
d['countsByClassification']=dict(collections.Counter(r['classification'] for r in d['rows']));(O/'verified-final-capture-comparison.json').write_text(json.dumps(d,indent=2)+'\n');print(d['countsByClassification'])
