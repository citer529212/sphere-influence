"""Build independent opening pieces from the same shorelines as the 3D map."""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
s=(root/'src/world/mapContours.ts').read_text();lands=json.loads(s[s.index('=')+1:s.rindex(' as const')])
colors={'atlas':'#318bc6','meridian':'#b44c40','concordat':'#c2a441','neutral':'#87928d'}
for faction,color in colors.items():
 paths=[]
 for land in lands:
  if land['faction']!=faction:continue
  coords=[((x/.062)+600,(z/.062)+330) for x,z in land['points']]
  d='M'+'L'.join(f'{x:.2f},{z:.2f}' for x,z in coords)+'Z'
  paths.append(f'<path d="{d}"/>')
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720"><defs><linearGradient id="paper" x2=".6" y2="1"><stop stop-color="{color}"/><stop offset="1" stop-color="#182c32"/></linearGradient><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#fff" opacity=".08"/></pattern></defs><g fill="url(#paper)" stroke="#e9d9a7" stroke-width="2">{''.join(paths)}</g><g fill="url(#grid)" opacity=".8">{''.join(paths)}</g></svg>'''
 (root/f'public/continent-{faction}.svg').write_text(svg)
 print(faction,len(paths),'geographic pieces')
