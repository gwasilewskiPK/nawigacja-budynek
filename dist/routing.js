import {roomLabel} from './places.js';
import {network} from './network-data.js';
export const floorName=f=>f===0?'Parter':f===-1?'Poziom −1':`Piętro ${f}`;
export function findRoute(from,to,{preferStairs=false,data=network}={}){
 if(!data.nodes[from]||!data.nodes[to])return null;
 const adj=new Map(Object.keys(data.nodes).map(id=>[id,[]]));
 for(const e of data.edges){if(!adj.has(e.a)||!adj.has(e.b))continue;adj.get(e.a).push([e.b,e]);adj.get(e.b).push([e.a,e]);}
 const costs=new Map([[from,0]]),previous=new Map(),open=new Set([from]);
 while(open.size){let u;for(const id of open)if(u===undefined||costs.get(id)<costs.get(u))u=id;open.delete(u);if(u===to)break;
  for(const [v,e]of adj.get(u)){const penalty=e.kind==='stairs'&&!preferStairs?200:e.kind==='elevator'&&preferStairs?400:0;const cost=costs.get(u)+e.cost+penalty;if(cost<(costs.get(v)??Infinity)){costs.set(v,cost);previous.set(v,{id:u,edge:e});open.add(v);}}
 }
 if(!costs.has(to))return null;
 const ids=[to],edges=[];let u=to;while(u!==from){const p=previous.get(u);if(!p)return null;edges.unshift(p.edge);u=p.id;ids.unshift(u);}
 return {nodes:ids.map(id=>data.nodes[id]),edges,cost:costs.get(to)};
}
export function routeLegs(route){
 if(!route)return[];const legs=[];let leg={map:route.nodes[0].map,nodes:[route.nodes[0]],transition:null};
 route.edges.forEach((e,i)=>{const next=route.nodes[i+1];if(e.kind!=='walk'){leg.transition={kind:e.kind,to:next};legs.push(leg);leg={map:next.map,nodes:[next],transition:null};}else leg.nodes.push(next);});legs.push(leg);return legs;
}

export const heading=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
export const turnAngle=(from,to)=>((to-from+540)%360)-180;
export function turnInstruction(angle){
 const a=Math.abs(angle),degrees=Math.round(a),side=angle>0?'w prawo':'w lewo';
 if(a<0.000001)return {title:'Idź prosto',icon:'↑',kind:'straight'};
 if(Math.abs(a-180)<0.000001)return {title:'Odwróć się o 180°',icon:'↶',kind:'uturn'};
 return {title:`Skręć ${a<35?'lekko ':''}${side}${Math.abs(a-90)<0.000001?' (90°)':` o ${degrees}°`}`,icon:angle>0?'↱':'↰',kind:angle>0?'right':'left'};
}
// Split at EVERY non-collinear vertex, doorway and map transition. Collinear
// graph nodes are retained in the path; no smoothing cuts across a corner.
export function navigationSteps(route,{startRoom=null,destination=null}={}){
 if(!route)return[];
 const ns=route.nodes,es=route.edges,steps=[];
 let facing=startRoom?.facing??ns[0].exitHeading??90,i=0,first=true;
 const context=index=>{let a=index,b=index;while(a>0&&es[a-1]?.kind==='walk')a--;while(b<es.length&&es[b]?.kind==='walk')b++;return ns.slice(a,b+1);};
 const destLabel=destination?roomLabel(destination):'celu';
 if(!es.length)return [{map:ns[0].map,nodes:[ns[0]],contextNodes:[ns[0]],title:`Jesteś przy drzwiach ${destLabel}`,body:'Miejsce startowe i cel są takie same.',button:'Zakończ ✓',icon:'◎',kind:'arrival'}];
 while(i<es.length){const edge=es[i],at=ns[i];
  if(edge.kind!=='walk'){
   let end=i+1;
   // One elevator ride may span several adjacent floors. No turns are lost.
   if(edge.kind==='elevator')while(es[end]?.kind==='elevator')end++;
   const next=ns[end],connector=edge.kind==='connector',lift=edge.kind==='elevator';
   steps.push({map:at.map,nodes:[at],contextNodes:context(i),kind:edge.kind,title:connector?`Przejdź do budynku ${next.building}`:`${lift?'Jedź windą':'Przejdź schodami'} · ${floorName(next.floor)}`,body:connector?`Przejdź przez łącznik. Następny krok pokaże plan budynku ${next.building}, ${floorName(next.floor).toLowerCase()}.`:`${lift?'Skorzystaj z windy':'Skorzystaj ze schodów'} do poziomu ${next.floor}. Po wyjściu stań twarzą w stronę korytarza.`,button:connector?`Jestem w budynku ${next.building} →`:'Jestem na wskazanym poziomie →',icon:connector?'→':next.floor>at.floor?'↑':'↓',to:next});
   facing=next.exitHeading??null;i=end;first=false;continue;
  }
  const out=heading(at,ns[i+1]),angle=facing===null?0:turnAngle(facing,out),turn=turnInstruction(angle);let end=i+1;
  while(end<es.length&&es[end].kind==='walk'&&ns[end].type!=='door'&&Math.abs(turnAngle(heading(ns[end-1],ns[end]),heading(ns[end],ns[end+1])))<0.000001)end++;
  const last=ns[end],final=end===es.length,nextEdge=es[end];
  let target=final?`do drzwi ${destLabel}`:last.type==='door'?`do ${last.name.replace(/^Drzwi ([ABC]) (.+)$/,(_,b,n)=>`drzwi ${n}${b}`).replace(/^Drzwi/,'drzwi')}`:nextEdge?.kind==='connector'?`do przejścia do budynku ${ns[end+1].building}`:nextEdge?.kind==='elevator'?'do windy':nextEdge?.kind==='stairs'?'do wejścia na schody':'do zaznaczonego zakrętu';
  let prefix=first&&startRoom?`Stoisz przodem do drzwi ${roomLabel(startRoom)}. `:'';
  if(!first&&at.type==='door')prefix=`Przejdź przez drzwi. `;
  const upcoming=!final&&nextEdge?.kind==='walk'?turnInstruction(turnAngle(heading(ns[end-1],last),heading(last,ns[end+1]))):null;
  const after=upcoming&&upcoming.kind!=='straight'?` Następnie: ${upcoming.title.toLowerCase()}.`:'';
  steps.push({map:at.map,nodes:ns.slice(i,end+1),contextNodes:context(i),kind:turn.kind,angle,title:turn.title,body:`${prefix}${turn.kind==='straight'?'Idź':`${turn.title}, a następnie idź`} prosto ${target}.${after}`,button:final?'Jestem przy drzwiach ✓':'Jestem w zaznaczonym punkcie →',icon:final&&turn.kind==='straight'?'◎':turn.icon,final,startHeading:facing});
  facing=heading(ns[end-1],last);i=end;first=false;
 }
 return steps;
}

export function nearestToilet(from,{preferStairs=false,data=network}={}){
 let best=null;
 for(const room of data.rooms){
  if(!room.available||!/^WC\b|toalet/i.test(room.name))continue;
  const route=findRoute(from,room.node,{preferStairs,data});
  if(route&&(!best||route.cost<best.route.cost))best={room,route};
 }
 return best;
}
