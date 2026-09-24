"""Raster cross-check for authored paths. Text/arrow exclusions are annotated below.
Requires Pillow and numpy. This complements visual inspection; it is not a door detector.
"""
import json,math
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw

data=json.loads(Path('work/qa/network.json').read_text(encoding='utf-8'))
# These are printed labels on open floor space, not walls (verified on V3).
annotations={'B:-1':[(350,624,440,638),(1375,774,1620,820)],'C:5':[(1490,395,1580,440)]}
hits=[];wall_data={};panels=[]
for m in data['maps']:
 im=Image.open('dist/'+m['image']).convert('RGB').resize((1888,1334));dark=np.asarray(im).min(2)<105
 for x,y,z,w in annotations.get(m['id'],[]):dark[y:w,x:z]=False
 mask=np.zeros(dark.shape,dtype=bool);segments=[]
 for vertical in [False,True]:
  ar=dark.T if vertical else dark
  for y,row in enumerate(ar):
   diff=np.diff(np.r_[False,row,False].astype(int));starts=np.where(diff==1)[0];ends=np.where(diff==-1)[0]
   for x,z in zip(starts,ends):
    if z-x<30:continue
    if vertical:mask[x:z,y]=True
    else:mask[y,x:z]=True
    segments.append([int(y),int(x),int(y),int(z-1)] if vertical else [int(x),int(y),int(z-1),int(y)])
 wall_data[m['id']]=segments;draw=ImageDraw.Draw(im)
 for e in data['edges']:
  a=data['nodes'][e['a']];b=data['nodes'][e['b']]
  if e['kind']!='walk' or a['map']!=m['id']:continue
  draw.line((a['x'],a['y'],b['x'],b['y']),fill='#2083c5',width=4)
  collided=[]
  for t in np.linspace(0,1,max(2,int(math.hypot(a['x']-b['x'],a['y']-b['y'])*2))):
   x=round(a['x']+(b['x']-a['x'])*t);y=round(a['y']+(b['y']-a['y'])*t)
   if mask[y,x]:collided.append((x,y))
  if collided:
   x,y=collided[len(collided)//2];hits.append({'map':m['id'],'a':e['a'],'b':e['b'],'hit':[x,y]});draw.ellipse((x-9,y-9,x+9,y+9),fill='red')
 for r in data['rooms']:
  if r['map']==m['id']:
   x,y=r['x'],r['y'];draw.ellipse((x-5,y-5,x+5,y+5),fill='#d9b057' if r['available'] else '#9aa2b5')
 im.save(f"work/qa/{m['id'].replace(':','_')}.png");panels.append(im.resize((566,400)))
sheet=Image.new('RGB',(1698,2400),'white')
for i,im in enumerate(panels):sheet.paste(im,((i%3)*566,(i//3)*400))
sheet.save('work/qa/all.png')
Path('work/qa/wall-hits.json').write_text(json.dumps(hits,indent=2))
Path('work/qa/walls.json').write_text(json.dumps(wall_data))
print(f"Checked {sum(e['kind']=='walk' for e in data['edges'])} walk edges across {len(data['maps'])} plans. Wall intersections: {len(hits)}")
if hits:print(json.dumps(hits));raise SystemExit(1)
