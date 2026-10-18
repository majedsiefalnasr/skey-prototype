from pathlib import Path
import json,html,shutil,hashlib
O=Path(__file__).parent;R=Path('/Users/majedsiefalnasr/Documents/Work/Ultimate-Solutions-EGY/skey/skey-figma');D=R/'docs/superpowers/reports/2026-10-18-remediation-evidence'
comparison=json.loads((O/'comparison.json').read_text());captures=json.loads((O/'final-capture-classification.json').read_text());rows=[]
new={ (r['file'],r['title'],r['project']) for r in comparison['newFailuresVsControl']+comparison['newFailuresVsPrevious'] }
for r in comparison['failures']:
 for e in r['snapshotEvidence']:
  rows.append({'path':e['path'],'originalSha256':e['protectedSha256'],'candidateSha256':e['actualSha256'],'original':e['originalAsset'],'candidate':e['candidateAsset'],'source':'Full regression','classification':r['classification'],'risk':r['risk'],'policy':e['decision'],'newSinceControl':not r['failedOnCorrectedControl'],'newSincePrevious':not r['failedInPreviousDelivery'],'decisionRequiredForNewRegression':(r['file'],r['title'],r['project']) in new})
for r in captures['rows']:
 if r['identical']:continue
 p=Path(r['path']);project=p.parent.name;name=p.name;original='capture-originals/'+r['path'];candidate='verified-final-capture-candidates/'+p.parent.parent.name+'/'+project+'/'+name
 rows.append({'path':r['path'],'originalSha256':r['baselineSha256'],'candidateSha256':r['candidateSha256'],'original':original,'candidate':candidate,'source':'128-state capture','classification':r['classification'],'risk':r['decision'],'policy':r['decision'],'decisionRequiredForNewRegression':False})
for row in rows:
 for label in ['original','candidate']:
  p=D/row[label];assert p.is_file(),p;assert hashlib.sha256(p.read_bytes()).hexdigest()==row[label+'Sha256']
(O/'visual-review.json').write_text(json.dumps({'scope':'Review evidence only. No path is approved by this agent-authored manifest. All original test PNGs remain protected.','newRegressionDecisionPaths':[r['path'] for r in rows if r['decisionRequiredForNewRegression']],'entries':rows},ensure_ascii=False,indent=2)+'\n')
parts=['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Skey final visual review</title><style>body{font:15px system-ui;margin:24px;color:#20242b}article{border-top:1px solid #bbb;padding:18px 0}code{overflow-wrap:anywhere;font-size:12px}.pair{display:flex;gap:16px;align-items:flex-start}.pair a{width:50%}img{max-width:100%;max-height:660px;object-fit:contain;object-position:top}h2{font-size:16px;overflow-wrap:anywhere}.hold{color:#a03216}.pending{color:#035ac7}</style><h1>Skey final visual review</h1><p>No baseline replacement is authorized by this document. Original and candidate links open full-resolution images. The exact-path JSON records full SHA-256 hashes and historical policy. Four newly failing Mail paths require a separate user decision; historical D-04 and unexplained raster paths remain protected.</p><p><a href="visual-review.json">Exact paths, hashes and policy</a> · <a href="final-capture-classification.json">All 128 capture comparisons</a></p>']
for i,r in enumerate(rows):
 esc=html.escape;parts.append(f'<article id="p{i}"><h2>{esc(r["path"])}</h2><p>{esc(r["classification"])}</p><p>{esc(r["risk"])}</p><p><strong>{"NEW REGRESSION DECISION REQUIRED" if r["decisionRequiredForNewRegression"] else esc(r["policy"])}</strong></p><code>Original: {r["originalSha256"]}<br>Candidate: {r["candidateSha256"]}</code><div class="pair"><a href="{esc(r["original"])}"><p>Preserved original</p><img loading="lazy" src="{esc(r["original"])}"></a><a href="{esc(r["candidate"])}"><p>Current candidate</p><img loading="lazy" src="{esc(r["candidate"])}"></a></div></article>')
parts.append('</html>');(D/'visual-review.html').write_text('\n'.join(parts));shutil.copy2(O/'visual-review.json',D/'visual-review.json');print(len(rows),'reviewed differing paths;',sum(r['decisionRequiredForNewRegression'] for r in rows),'new-regression decision paths')
