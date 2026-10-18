from pathlib import Path
import hashlib,json,subprocess
O=Path(__file__).parent;R=Path('/Users/majedsiefalnasr/Documents/Work/Ultimate-Solutions-EGY/skey/skey-figma')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
git=lambda *args:subprocess.check_output(['git','-c','core.fsmonitor=false',*args],cwd=R)
if __name__=='__main__':
 start=json.loads((O/'checkpoint.json').read_text());current={};missing=[];changes=[]
 for name,record in start['files'].items():
  p=R/name
  if not p.exists():missing.append(name);continue
  if p.is_file() and 'sha256' in record:
   h=sha(p);current[name]={'sha256':h,'bytes':p.stat().st_size}
   if h!=record['sha256']:changes.append({'path':name,'beforeSha256':record['sha256'],'afterSha256':h})
 expected={'concepts/app/components/data-list/menu-controller.js','concepts/app/core/delivery-translations.js','concepts/app/pages/invoices/operations.js','tests/data-list-component.spec.mjs','tests/delivery-locale.spec.mjs','docs/superpowers/reports/2026-10-17-demo-prototype-acceptance.md'}|{f'concepts/app/pages/{p}/templates.html' for p in ['activities','email','events','for-you','notes','placeholder']}
 inputs=json.loads((O/'delivery-inputs.json').read_text());inputsChanged=[p for p,h in inputs.items() if not (R/p).is_file() or sha(R/p)!=h]
 build=json.loads((O/'delivery-frozen-build.json').read_text())['files'];actual={str(p.relative_to(O/'delivery-frozen')):sha(p) for p in (O/'delivery-frozen').rglob('*') if p.is_file()}
 approved=set((R/'docs/superpowers/reports/2026-10-18-approved-png-paths.txt').read_text().splitlines());pngs={p:r for p,r in start['files'].items() if p.startswith('tests/') and p.endswith('.png')};pngChanged=[p for p in pngs if p in missing or sha(R/p)!=pngs[p]['sha256']];finalPngs={str(p.relative_to(R)) for p in (R/'tests').rglob('*.png')}
 status=git('status','--porcelain=v1','--untracked-files=all');(O/'status-final.txt').write_bytes(status);(O/'staged-final.patch').write_bytes(git('diff','--cached','--binary'))
 allPaths=set(git('ls-files','--cached','--others','--exclude-standard').decode().splitlines());added=sorted(allPaths-set(start['files']))
 preservedPrefix=(R/'docs/superpowers/reports/2026-10-17-demo-prototype-acceptance.md').read_bytes().startswith((O/'acceptance-before.md').read_bytes())
 audit={'initialHead':start['head'],'finalHead':git('rev-parse','HEAD').decode().strip(),'initialBranch':start['branch'],'finalBranch':git('branch','--show-current').decode().strip(),'initialCheckpointFiles':len(start['files']),'missingCheckpointFiles':missing,'changedCheckpointFiles':changes,'unexpectedChangedFiles':[r for r in changes if r['path'] not in expected],'addedPaths':added,'stagedPatchUnchanged':(O/'staged-final.patch').read_bytes()==(O/'staged.patch').read_bytes(),'initialStatusSha256':sha(O/'status.txt'),'finalStatusSha256':sha(O/'status-final.txt'),'sourceTestConfigInputsChecked':len(inputs),'changedInputsSinceFreeze':inputsChanged,'frozenFileCount':len(build),'frozenInventoryUnchanged':actual==build,'startingTestPngs':len(pngs),'priorApprovedPngs':len(approved),'protectedPngs':len(set(pngs)-approved),'pngChangesThisMission':pngChanged,'addedTestPngs':sorted(finalPngs-set(pngs)),'missingTestPngs':sorted(set(pngs)-finalPngs),'historicalAcceptancePrefixPreserved':preservedPrefix,'operations':'No commit, push, reset, stash, checkout, worktree deletion, or repository cleanup performed. Dev process temporarily paused/restored to isolate unit tests; generated build directories retained.'}
 audit['passed']=not any([missing,audit['unexpectedChangedFiles'],inputsChanged,pngChanged,audit['addedTestPngs'],audit['missingTestPngs']]) and actual==build and audit['stagedPatchUnchanged'] and preservedPrefix and audit['initialHead']==audit['finalHead'] and audit['initialBranch']==audit['finalBranch']
 (O/'preservation.json').write_text(json.dumps(audit,indent=2)+'\n');print(json.dumps({k:v for k,v in audit.items() if k not in ['changedCheckpointFiles','addedPaths']},indent=2))
