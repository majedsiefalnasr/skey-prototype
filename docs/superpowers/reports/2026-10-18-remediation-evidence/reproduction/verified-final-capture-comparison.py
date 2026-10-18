from pathlib import Path
from PIL import Image,ImageChops
import hashlib,json
O=Path(__file__).parent;R=Path('/Users/majedsiefalnasr/Documents/Work/Ultimate-Solutions-EGY/skey/skey-figma')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
rows=[]
for p in sorted((O/'verified-final-capture-harness/tests').rglob('*.png')):
 rel=str(p.relative_to(O/'verified-final-capture-harness'));before=R/rel; a=Image.open(before).convert('RGBA');b=Image.open(p).convert('RGBA'); bounds=None;pixels=None
 if a.size==b.size:
  diff=ImageChops.difference(a,b).convert('RGB');bounds=diff.getbbox();channels=diff.split(); mask=ImageChops.lighter(ImageChops.lighter(channels[0],channels[1]),channels[2]).point(lambda x:255 if x else 0);pixels=mask.histogram()[255]
 state=p.stem;changed=state.startswith(('notes-','activities-','events-','mail-','note-editor','event-editor'))
 rows.append({'path':rel,'baselineSha256':sha(before),'candidateSha256':sha(p),'identical':sha(before)==sha(p),'baselineSize':a.size,'candidateSize':b.size,'differentPixels':pixels,'bounds':bounds,'classification':'User-requested page gutter alignment; current candidate requires visual review, no PNG replacement performed' if changed else 'Unchanged state' if sha(before)==sha(p) else 'Requires individual investigation','candidate':str(p)})
assert len(rows)==128
(O/'verified-final-capture-comparison.json').write_text(json.dumps({'checked':128,'identical':sum(r['identical'] for r in rows),'rows':rows},indent=2)+'\n')
print({'checked':128,'identical':sum(r['identical'] for r in rows),'unexplained':[r['path'] for r in rows if r['classification']=='Requires individual investigation']})
