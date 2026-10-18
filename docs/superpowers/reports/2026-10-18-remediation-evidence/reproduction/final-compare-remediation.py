from pathlib import Path
from collections import Counter
import json,hashlib,shutil
OUT=Path(__file__).parent
ROOT=Path('/Users/majedsiefalnasr/Documents/Work/Ultimate-Solutions-EGY/skey/skey-figma')
REPORTS=ROOT/'docs/superpowers/reports'
def read(path):
 data=json.loads(path.read_text());rows=[]
 def visit(suites,parents=()):
  for suite in suites:
   labels=parents+((suite['title'],) if parents or suite['title']!=Path(suite.get('file','')).name else ())
   for spec in suite.get('specs',[]):
    for test in spec['tests']:
     result=test['results'][-1]
     rows.append({'file':spec['file'],'title':' › '.join((*labels,spec['title'])),'project':test['projectName'],'status':result['status'],'errors':[e.get('message','') for e in result.get('errors',[])],'attachments':[a for a in result.get('attachments',[]) if a.get('path')],'durationMs':result.get('duration')})
   visit(suite.get('suites',[]),labels)
 visit(data['suites']);return data,rows
key=lambda r:(r['file'],r['title'],r['project'])
bad=lambda r:r['status'] not in ('passed','skipped')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if __name__=='__main__':
 data,rows=read(OUT/'full-final.json');current={key(r):r for r in rows}
 control=json.loads((REPORTS/'2026-10-18-corrected-historical-suite.json').read_text())['allResults'];historical={key(r):r for r in control}
 prior=json.loads((REPORTS/'2026-10-18-final-regression-comparison.json').read_text())['allResults'];previous={key(r):r for r in prior}
 original=json.loads((REPORTS/'2026-10-17-pre-delivery-suite.json').read_text())['failures'];names={key(r) for r in original}
 approved=set((REPORTS/'2026-10-18-approved-png-paths.txt').read_text().splitlines())
 review={r['path']:r for r in json.loads((REPORTS/'2026-10-17-demo-visual-review/review.json').read_text())['entries']}
 for r in rows:
  if not bad(r):continue
  k=key(r);r['failedOnCorrectedControl']=k in historical and bad(historical[k]);r['failedInPreviousDelivery']=k in previous and bad(previous[k]);r['inOriginal73']=k in names;r['snapshotEvidence']=[]
  for a in r['attachments']:
   if not a['name'].endswith('-actual.png'):continue
   stem=a['name'].removesuffix('-actual.png');p=f"tests/{r['file']}-snapshots/{r['project']}/{stem}.png";e=review.get(p,{})
   r['snapshotEvidence'].append({'path':p,'approvedInOriginal89':p in approved,'protectedSha256':sha(ROOT/p),'actualSha256':sha(Path(a['path'])),'matchesReviewedCandidate':sha(Path(a['path']))==e.get('afterSha256'),'reviewReason':e.get('reason'),'actual':a['path']})
  if r['snapshotEvidence']:
   mail=r['file']=='messaging.spec.mjs' or (r['file']=='parity.spec.mjs' and any(e['path'].endswith('/email.png') for e in r['snapshotEvidence']))
   r['classification']='Protected visual baseline: requested Mail gutter alignment plus approved canonical identity/dates' if mail else 'Protected visual baseline: previously reviewed product change' if all(e['matchesReviewedCandidate'] for e in r['snapshotEvidence']) else 'Requires individual image investigation'
  else:r['classification']='Requires individual functional investigation'
 result={'buildInventory':'verified-final-build.json','stats':dict(Counter(r['status'] for r in rows)),'profiles':{p:dict(Counter(r['status'] for r in rows if r['project']==p)) for p in sorted({r['project'] for r in rows})},'commonControlIdentities':len(set(current)&set(historical)),'addedIdentities':len(set(current)-set(historical)),'missingControlIdentities':[historical[k] for k in sorted(set(historical)-set(current))],'missingPreviousIdentities':[previous[k] for k in sorted(set(previous)-set(current))],'original73StillFailing':[r for r in rows if key(r) in names and bad(r)],'original73NowPassing':[r for r in rows if key(r) in names and r['status']=='passed'],'failures':[r for r in rows if bad(r)],'newFailuresVsControl':[r for r in rows if bad(r) and not r['failedOnCorrectedControl']],'newFailuresVsPrevious':[r for r in rows if bad(r) and not r['failedInPreviousDelivery']],'resolvedControlFailures':[r for r in rows if key(r) in historical and bad(historical[key(r)]) and r['status']=='passed'],'allResults':rows}
 (OUT/'comparison.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:len(v) if isinstance(v,list) else v for k,v in result.items() if k!='allResults'},ensure_ascii=False,indent=2))
