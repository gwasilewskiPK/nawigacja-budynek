import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {network as n} from '../dist/network-data.js';
import {findRoute,navigationSteps,turnAngle,turnInstruction,heading} from '../dist/routing.js';
const room=id=>n.rooms.find(r=>r.id===id);
test('18 new plans, only A/B/C, unique room identifiers and connected door destinations',()=>{
 assert.equal(n.maps.length,18);assert.deepEqual([...new Set(n.maps.map(m=>m.building))],['A','B','C']);assert.equal(new Set(n.rooms.map(r=>r.id)).size,n.rooms.length);
 for(const m of n.maps)assert.ok(fs.existsSync(`dist/${m.image}`));
 for(const r of n.rooms){if(!r.available){assert.equal(r.node,null);continue;}assert.ok(Number.isFinite(r.facing),r.id);const route=findRoute(n.entrance,r.node);assert.ok(route,r.id);assert.equal(route.nodes.at(-1).id,r.node);assert.equal(n.nodes[r.node].type,'door');}
});
test('all walk edges stay on their plan; A/C connections must use B',()=>{
 for(const e of n.edges){const a=n.nodes[e.a],b=n.nodes[e.b];assert.ok(a&&b);if(e.kind==='walk')assert.equal(a.map,b.map);else if(e.kind==='connector'){assert.equal(a.floor,b.floor);assert.ok([a.building,b.building].includes('B'));assert.ok([-1,0,1].includes(a.floor));}else{assert.equal(a.building,b.building);assert.equal(Math.abs(a.floor-b.floor),1);}}
 for(const [a,b]of [['A:110','C:301'],['C:501','A:01'],['A:619','C:03']]){const r=findRoute(room(a).node,room(b).node);assert.ok(r.nodes.some(p=>p.building==='B'));}
});
test('missing door and disconnected graph return no route, never a straight line',()=>{
 for(const r of n.rooms.filter(r=>!r.available))assert.equal(findRoute(n.entrance,r.node),null);
 assert.equal(findRoute(n.entrance,room('A:110').node,{data:{...n,edges:[]}}),null);
});
test('internal rooms use their real parent doors in both directions',()=>{
 for(const [child,parent]of [['A:14','A:15'],['A:101','A:102'],['A:430','A:429'],['C:107-2','C:107'],['C:317-1','C:317'],['B:02-2','B:02']]){
  const p=room(parent).node,c=room(child).node;assert.ok(findRoute(n.entrance,c).nodes.some(n=>n.id===p),child);assert.ok(findRoute(c,n.entrance).nodes.some(n=>n.id===p),child);
 }
});
test('right and left are relative to walking direction on a screen-coordinate map',()=>{
 for(const h of [-90,0,90,180]){assert.equal(turnInstruction(turnAngle(h,h+90)).kind,'right');assert.equal(turnInstruction(turnAngle(h,h-90)).kind,'left');assert.equal(turnInstruction(turnAngle(h,h+180)).kind,'uturn');assert.equal(turnInstruction(turnAngle(h,h)).kind,'straight');}
 assert.equal(turnInstruction(20).kind,'right');assert.equal(turnInstruction(-20).kind,'left');
});
test('starting facing the room turns around; going into a child room does not',()=>{
 const r=room('A:110'),route=findRoute(r.node,n.entrance),steps=navigationSteps(route,{startRoom:r});assert.equal(steps[0].kind,'uturn');assert.match(steps[0].body,/Stoisz przodem do drzwi 110A/);
 const parent=room('A:15');const child=room('A:14');const s=navigationSteps(findRoute(parent.node,child.node),{startRoom:parent,destination:child});assert.equal(s[0].kind,'straight');
});
test('each change of direction is preserved as an instruction, on routes across all plans',()=>{
 for(const target of n.rooms.filter(r=>r.available)){
  const route=findRoute(n.entrance,target.node),steps=navigationSteps(route,{destination:target});
  const walkSegments=steps.flatMap(s=>s.nodes.slice(1).map((p,i)=>[s.nodes[i].id,p.id]));
  const expected=route.edges.flatMap((e,i)=>e.kind==='walk'?[[route.nodes[i].id,route.nodes[i+1].id]]:[]);assert.deepEqual(walkSegments,expected,target.id);
  for(const s of steps){assert.ok(s.nodes.every(p=>p.map===s.map));for(let i=1;i<s.nodes.length-1;i++)assert.ok(Math.abs(turnAngle(heading(s.nodes[i-1],s.nodes[i]),heading(s.nodes[i],s.nodes[i+1])))<1e-6,`hidden turn ${target.id}`);}
 }
});
test('connector arrival uses destination map orientation, not an angle across drawings',()=>{
 const steps=navigationSteps(findRoute(room('A:110').node,room('C:102').node),{startRoom:room('A:110'),destination:room('C:102')});const i=steps.findIndex(s=>s.kind==='connector'&&s.to.building==='C');assert.ok(i>=0);assert.equal(steps[i+1].map,'C:1');assert.equal(steps[i+1].startHeading,-90);assert.equal(steps[i+1].kind,'straight');
});
test('same destination needs no spurious turn; stairs preference changes vertical transport',()=>{
 const r=room('C:301');assert.equal(navigationSteps(findRoute(r.node,r.node),{startRoom:r,destination:r})[0].kind,'arrival');const route=findRoute(room('A:110').node,room('A:619').node,{preferStairs:true});assert.ok(route.edges.some(e=>e.kind==='stairs'));assert.ok(!route.edges.some(e=>e.kind==='elevator'));
});
test('authored walk segments do not intersect source-image wall runs',()=>{
 const walls=JSON.parse(fs.readFileSync('scripts/fixtures/walls.json','utf8'));
 for(const m of n.maps){const mask=new Uint8Array(n.width*n.height);for(const [x,y,z,w]of walls[m.id]){for(let yy=y;yy<=w;yy++)for(let xx=x;xx<=z;xx++)mask[yy*n.width+xx]=1;}
  for(const e of n.edges){const a=n.nodes[e.a],b=n.nodes[e.b];if(e.kind!=='walk'||a.map!==m.id)continue;const count=Math.max(2,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*2));for(let i=0;i<=count;i++){const x=Math.round(a.x+(b.x-a.x)*i/count),y=Math.round(a.y+(b.y-a.y)*i/count);assert.equal(mask[y*n.width+x],0,`${e.a} → ${e.b}: wall at ${x},${y}`);}}
 }
});
