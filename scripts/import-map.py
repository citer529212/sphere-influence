"""Extract shoreline polygons from the user supplied Illustrator SVG (M/L/C/S/Z)."""
import re,json,xml.etree.ElementTree as E
from pathlib import Path
root=Path(__file__).resolve().parents[1]
r=E.parse(root/'public/world-reference.svg').getroot()
lands=[]
for e in r.iter():
 c=e.get('class')
 if not e.tag.endswith('path') or c not in ['st0','st33','st39','st53']:continue
 tokens=re.findall(r'[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?',e.get('d',''))
 i=0;cmd='';pos=(0,0);start=pos;control=None;prev='';points=[]
 while i<len(tokens):
  if tokens[i].isalpha():cmd=tokens[i];i+=1
  op=cmd.upper();relative=cmd.islower()
  if op=='Z':points.append(start);pos=start;control=None;prev=op;continue
  n={'M':2,'L':2,'C':6,'S':4}[op];v=list(map(float,tokens[i:i+n]));i+=n
  coords=[(v[j]+(pos[0] if relative else 0),v[j+1]+(pos[1] if relative else 0)) for j in range(0,n,2)]
  if op in ['M','L']:
   pos=coords[0];points.append(pos);control=None
   if op=='M':start=pos;cmd='l' if relative else 'L'
  else:
   a=pos
   if op=='C':b,d,end=coords
   else:b=(2*a[0]-control[0],2*a[1]-control[1]) if control and prev in ['C','S'] else a;d,end=coords
   for step in range(1,7):
    t=step/6;s=1-t
    points.append(tuple(s**3*a[k]+3*s*s*t*b[k]+3*s*t*t*d[k]+t**3*end[k] for k in [0,1]))
   pos=end;control=d
  prev=op
 pts=[]
 for x,y in points:
  p=[round((x-600)*.062,3),round((y-330)*.062,3)]
  if not pts or sum((p[k]-pts[-1][k])**2 for k in [0,1])>.012:pts.append(p)
 lands.append({'faction':{'st0':'atlas','st33':'neutral','st39':'meridian','st53':'concordat'}[c],'points':pts})
(root/'src/world/mapContours.ts').write_text('// Shorelines sampled from public/world-reference.svg. Coordinates retain its layout.\nexport const MAP_LANDS = '+json.dumps(lands,separators=(',',':'))+' as const;\n')
print('Imported',len(lands),'shorelines',sum(len(p['points']) for p in lands),'vertices')
