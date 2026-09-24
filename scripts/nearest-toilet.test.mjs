import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestToilet} from '../dist/routing.js';
test('nearest toilet uses reachable graph cost, not geometric proximity',()=>{
 const data={nodes:{s:{id:'s',x:0,y:0},a:{id:'a',x:1,y:0},b:{id:'b',x:100,y:0},c:{id:'c'}},edges:[{a:'s',b:'a',kind:'walk',cost:100},{a:'s',b:'b',kind:'walk',cost:20}],rooms:[{id:'a',node:'a',name:'WC 1',available:true},{id:'b',node:'b',name:'WC 2',available:true},{id:'c',node:'c',name:'WC 3',available:true}]};
 assert.equal(nearestToilet('s',{data}).room.id,'b');
 data.rooms[1].available=false;
 assert.equal(nearestToilet('s',{data}).room.id,'a');
 assert.equal(nearestToilet('unknown',{data}),null);
 assert.equal(nearestToilet('a',{data}).route.cost,0);
});
