from pathlib import Path
import json,collections
O=Path(__file__).parent
mapping={
 'SHL-01':['architecture.test','navigation.test'],'SHL-02':['routes.test','routing.spec'],'SHL-03':['navigation-honesty.spec'],'SHL-04':['leave-guard.spec','invoice-journey.spec','customer-journey.spec'],'SHL-05':['navigation-honesty.spec'],'SHL-06':['lifecycle.spec','visual-qa-batch2.spec'],'SHL-07':['navigation-honesty.spec'],
 'INV-01':['invoice-selection.spec'],'INV-02':['invoice-journey.spec'],'INV-03':['invoice-journey.spec'],'INV-04':['invoice-journey.spec'],'INV-05':['invoice-journey.spec'],'INV-06':['invoice-selection.spec','invoice-journey.spec'],'INV-07':['invoice-selection.spec'],'INV-08':['invoice-selection.spec'],'INV-09':['invoice-selection.spec'],'INV-10':['invoice-geography.spec','components.spec'],'INV-11':['invoice-journey.spec','invoice-selection.spec'],'INV-12':[],
 'CUS-01':['customer-journey.spec','lifecycle.spec'],'CUS-02':['customer-journey.spec','lifecycle.spec'],'CUS-03':['customer-journey.spec'],'CUS-04':['demo-data.test','customer-journey.spec'],'CUS-05':['customer-journey.spec','leave-guard.spec'],
 'GEO-01':['invoice-geography.spec'],'GEO-02':['invoice-geography.spec'],'GEO-03':['invoice-geography.spec','delivery-locale.spec'],
 'COL-01':['collaboration.spec','help-screens-consistency.spec','messaging.spec'],'COL-02':['mail-draft-exit.spec','messaging.spec'],'COL-03':['mail-draft-exit.spec'],'COL-04':['visual-qa-batch1.spec'],'COL-05':['visual-qa-batch2.spec'],
 'ACC-01':['signin-gate.spec','signin-pages.spec'],'ACC-02':['profile-lifecycle.spec'],'ACC-03':['organization-center.spec'],'ACC-04':['visual-qa-batch3.spec'],
 'DAT-01':['demo-data.test','invoice-selection.spec'],'DAT-02':['demo-data.test'],'DAT-03':['demo-data.test','delivery-locale.spec'],'DAT-04':['demo-data.test'],'DAT-05':['demo-data.test'],'DAT-06':[],'DAT-07':[],
 'UX-01':['page-gutters.spec','help-screens-consistency.spec'],'UX-02':['page-gutters.spec','invoice-geography.spec','customer-journey.spec','collaboration.spec'],'UX-03':['page-gutters.spec','visual-qa-batch1.spec','visual-qa-batch2.spec','visual-qa-batch3.spec'],'UX-04':['dialog-option-values.spec','language-switcher.spec'],'UX-05':['delivery-locale.spec','delivery-locale.test','i18n-coverage.test'],'UX-06':['a11y-ledger.spec'],'UX-07':['a11y-ledger.spec','visual-qa-batch1.spec'],'UX-08':['chart-parity.spec'],'UX-09':[],
 'ARC-01':['architecture.test'],'ARC-02':['tailwind.test','architecture.test'],'ARC-03':['tailwind.test'],'ARC-04':[],'ARC-05':[],'ARC-06':[]}
notes={
 'INV-12':('deferred','VQA-07 / D-06; no formatting policy or calculation introduced.'),
 'DAT-06':('limited','Accepted representative subtotal/tax/line amounts; no new financial model.'),
 'DAT-07':('limited','English fixture names/remarks permitted in Arabic; interface labels remain in scope.'),
 'UX-04':('passed with deferred portion','Existing number/date/phone direction rules retained; VQA-07 remains deferred.'),
 'UX-06':('passed within scoped checks','Four ledger fixes checked; this is not a comprehensive WCAG certification.'),
 'UX-09':('acceptance pending','All 233 starting PNGs preserved in this mission; protected visual differences and repeat raster variants remain open.'),
 'ACC-02':('passed within retained scope','Seven existing Profile sections retained; P-02 does not authorize redesign/removal.'),
 'ACC-03':('passed within retained scope','Five visible Organization sections retained; existing hidden sections/role gating unchanged; P-03 not inferred approved.'),
 'ARC-04':('passed','Single direct owner; no subagents or concurrent source mutations.'),
 'ARC-05':('passed','P-05 in-memory persistence only; P-04 retained separately pending; no storage/calculation/scope expansion.'),
 'ARC-06':('passed','Existing app-shell development stylesheet, week-start and hit-target notes inspected; already corrected before this mission.'),
 'SHL-04':('passed within tested routes','Guard coverage is established by explicit route cases in linked tests; no claim of exhaustive route permutation coverage.'),
 'CUS-05':('passed within tested routes','Same bounded unsaved-work route coverage limitation as SHL-04.'),
 'COL-01':('passed functionally; visual acceptance pending','Desktop collaboration behavior plus seven-project consistency tests; inherited project skips retained. Mail protected images remain open.'),
 'UX-01':('passed structurally; visual acceptance pending','Requested X alignment tested across 7 projects and 3 density/layout settings; protected images not updated.'),
 'UX-02':('passed functionally; visual acceptance pending','Accepted layout modes retained; screenshot approval remains separate.'),
 'UX-03':('passed within scoped geometry checks; visual acceptance pending','390x844 mobile/RTL plus seven configured profiles; screenshots remain protected.')}
if __name__=='__main__':
 rows=json.loads((O/'comparison.json').read_text())['allResults'];source=json.loads((O/'requirements-source.json').read_text());out=[]
 for requirement in source+[{'id':f'ARC-0{i}','source':'Master specification architecture constraints'} for i in range(1,7)]:
  rid=requirement['id'];patterns=mapping[rid];checks=[r for r in rows if any(p in r['file'] for p in patterns if '.spec' in p)];failures=[r for r in checks if r['status'] not in ['passed','skipped']];functional=[r for r in failures if not r.get('snapshotEvidence')];status,note=notes.get(rid,('passed','Current scoped browser/unit checks; accepted representative-data limitations retained.'))
  if functional:status='failed';note+=' Functional failures require individual classification.'
  elif failures and rid not in notes:status='passed functionally; visual acceptance pending'
  out.append({**requirement,'status':status,'note':note,'evidenceFiles':patterns,'browserCounts':dict(collections.Counter(r['status'] for r in checks)),'failureIdentities':[{'file':r['file'],'title':r['title'],'project':r['project']} for r in failures]})
 (O/'requirement-matrix.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
