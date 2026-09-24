export const roomLabel=r=>`${r.number}${r.building}`;
const names={
 'A:1':'Biuro wsparcia osób z niepełnosprawnością',
 'A:608':'Rektor',
 'A:601':'Prorektor do spraw studenckich'
};
export function roomName(r){
 const base=names[r.id]??(r.name.endsWith(' '+r.number)?r.name.slice(0,-r.number.length-1):r.name);
 return `${base} · ${roomLabel(r)}`;
}
