import test from 'node:test';
import assert from 'node:assert/strict';
import {spriteFor,frameFor,drawSprite,SPRITE_SIZE} from '../sprites.js';
const types=['player','thug','runner','brute','boss'];
const frames=['idle-0','idle-1',...Array.from({length:6},(_,i)=>`walk-${i}`),'jump','hurt','held','down',...['punch','cross','upper','kick','airkick','throw','slam','charge'].flatMap(a=>['ready','strike','recover'].map(p=>`${a}-${p}`))];
test('all five original characters have bounded, opaque, integer indexed pixels in every frame',()=>{
 for(const type of types)for(const frame of frames){const s=spriteFor(type,frame);assert.equal(s.width,SPRITE_SIZE);assert.ok(s.runs.length>80);for(const [x,y,w,c]of s.runs){assert.ok([x,y,w].every(Number.isInteger));assert.ok(x>=0&&y>=0&&x+w<=64&&y<64);assert.match(c,/^#[0-9a-f]{6}$/);}}
});
test('discrete walk, attack, throw, hurt and knockdown silhouettes are distinct and cached',()=>{
 for(const type of types){let poses=['idle-0','walk-1','walk-3','punch-ready','punch-strike','punch-recover','kick-strike','throw-ready','throw-strike','hurt','down'];assert.equal(new Set(poses.map(f=>JSON.stringify(spriteFor(type,f)))).size,poses.length);assert.equal(spriteFor(type,'idle-0'),spriteFor(type,'idle-0'));}
});
test('animation is selected from actual engine attack timing and action, without changing entities',()=>{
 for(const [kind,name]of [['punch','punch'],['finisher','upper'],['jumpkick','airkick'],['throw','throw'],['slam','slam'],['charge','charge']]){const e={attack:{kind,time:0,windup:.1,end:.3}};assert.equal(frameFor(e),name+'-ready');e.attack.time=.2;assert.equal(frameFor(e),name+'-strike');e.attack.time=.4;assert.equal(frameFor(e),name+'-recover');}
 assert.equal(frameFor({grabbedBy:'player'}),'held');assert.equal(frameFor({dead:true}),'down');assert.equal(frameFor({z:12}),'jump');assert.equal(frameFor({attack:{kind:'punch',step:2,time:.2,windup:.1,end:.3}}),'cross-strike');
});
test('sprite output is exactly two-pixel grid with an exact horizontal mirror',()=>{
 for(const type of types){const capture=face=>{let result=[];drawSprite({set fillStyle(v){},fillRect(...a){result.push(a)}},type,'punch-strike',200.2,400.3,face);return result};let right=capture(1),left=capture(-1);assert.equal(right.length,left.length);for(let i=0;i<right.length;i++){const[x,y,w,h]=right[i];assert.ok([x,y,w,h].every(Number.isInteger));assert.equal(h,2);assert.equal(w%2,0);assert.equal(left[i][0],400-x-w);assert.deepEqual(left[i].slice(1),[y,w,h]);}}
});
test('types have unique palettes and silhouettes; malformed type uses a safe fallback',()=>{
 assert.equal(new Set(types.map(t=>JSON.stringify(spriteFor(t)))).size,5);assert.equal(spriteFor('unknown'),spriteFor('thug'));
});
