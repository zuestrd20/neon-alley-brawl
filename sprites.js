/* Original indexed pixel sprites. All geometry is rasterized to a 64 × 64
   logical grid, cached as color runs and displayed at exactly 2×. No vectors,
   fractional sprite scaling, external assets, or canvas antialiasing. */
export const SPRITE_SIZE = 64;
const palettes = {
 player: ['#0a1222','#254452','#4e8b91','#91f5cf','#d6ffe6','#914e56','#db9677','#ffd0a0','#253042','#516070','#fa637a','#a73555'],
 thug:   ['#0a1222','#352e51','#66558d','#a391c7','#ded2eb','#744e60','#b8847a','#edb9a1','#24283d','#51526c','#ecbf73','#926244'],
 runner: ['#0a1222','#66413e','#b66b49','#f4ad65','#ffe4b3','#754459','#c17e72','#f3b49b','#292c46','#5a4564','#e87091','#943c6a'],
 brute:  ['#0a1222','#562f41','#943e51','#d76a68','#ffad8b','#804c4e','#bb7965','#ebac82','#242d43','#4d5870','#e8c280','#a47854'],
 boss:   ['#0a1222','#312e57','#5e5188','#9580c1','#dbd6ef','#77566a','#ac7e8d','#dfb6b4','#25263b','#4e4d69','#ff5f83','#a62f59'],
};
const cache = new Map();
export function frameFor(e,t=0) {
 if(e.dead || e.state==='dead' || e.state==='down') return 'down';
 if(e.grabbedBy) return 'held';
 if(e.state==='hurt' || e.stun>0) return 'hurt';
 const a=e.attack;
 if(a){const phase=a.time < a.windup ? 'ready' : a.time < (a.end ?? a.windup+.15) ? 'strike' : 'recover';
  const kind=a.kind==='jumpkick'?'airkick':/kick/.test(a.kind)?'kick':a.kind==='throw'?'throw':a.kind==='slam'?'slam':a.kind==='charge'?'charge':a.kind==='finisher'?'upper':a.step===2?'cross':'punch';
  return `${kind}-${phase}`;
 }
 if(e.z>4 || e.state==='jump') return 'jump';
 if(e.state==='walk'||e.state==='run')return `walk-${Math.floor(t*(e.type==='runner'?14:10))%6}`;
 return `idle-${Math.floor(t*3)%2}`;
}
export function spriteFor(type='thug',frame='idle-0') {
 if(!palettes[type])type='thug';
 const key=type+':'+frame;if(cache.has(key))return cache.get(key);
 const W=64, data=new Uint8Array(W*W),pal=palettes[type];
 const put=(x,y,col)=>{x=Math.round(x)+27;y=Math.round(y)+59;if(x>=0&&x<W&&y>=0&&y<W)data[y*W+x]=col+1;};
 const rect=(x,y,w,h,col)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,col);};
 const line=(a,b,r,col)=>{let [x,y]=a,[xx,yy]=b;let dx=Math.abs(xx-x),sx=x<xx?1:-1,dy=-Math.abs(yy-y),sy=y<yy?1:-1,err=dx+dy;for(;;){rect(x-r,y-r,r*2+1,r*2+1,col);if(x===xx&&y===yy)break;let q=2*err;if(q>=dy){err+=dy;x+=sx}if(q<=dx){err+=dx;y+=sy}}};
 const polygon=(pts,col)=>{let lo=Math.min(...pts.map(p=>p[1])),hi=Math.max(...pts.map(p=>p[1]));for(let y=lo;y<=hi;y++){let xs=[];for(let i=0,j=pts.length-1;i<pts.length;j=i++){let a=pts[i],b=pts[j];if((a[1]>y)!==(b[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let i=0;i<xs.length;i+=2)for(let x=Math.ceil(xs[i]);x<xs[i+1];x++)put(x,y,col);}};
 const big=type==='boss'||type==='brute',boss=type==='boss',brute=type==='brute',runner=type==='runner',player=type==='player';
 let h=big?51:44,bw=brute?11:boss?9:runner?6:7,bob=0,lean=0;
 let knees=[[-6,-9],[6,-10]],feet=[[-9,-1],[9,-1]],hands=[[-10,-22],[11,-27]],elbows=[[-11,-28],[11,-20]];
 let [action,phase]=frame.split('-'),strike=phase==='strike',ready=phase==='ready';
 if(action==='walk'){let i=Number(phase),steps=[[-6,6],[-3,3],[2,-2],[6,-6],[3,-3],[-2,2]][i];feet=[[-4+steps[0],-1],[4+steps[1],-1]];knees=[[-5+Math.round(steps[0]/2),-9],[5+Math.round(steps[1]/2),-10]];bob=[0,-1,-2,0,-1,-2][i];hands=[[-10-steps[0],-22],[10-steps[1],-22]];}
 if(action==='idle')bob=Number(phase);
 if(['punch','cross','upper'].includes(action)){lean=strike?3:ready?-2:1;hands[1]=strike?(action==='upper'?[17,-43]:[28,action==='cross'?-30:-28]):ready?[5,-30]:[15,-25];elbows[1]=strike?[16,-28]:[12,-22];feet=[[-11,-1],[10,-1]];}
 if(action==='kick'||action==='airkick'){lean=strike?-3:0;feet[1]=strike?[29,-23]:[8,-13];knees[1]=strike?[15,-21]:[9,-19];hands=[[ -13,-26],[10,-31]];if(action==='airkick'){feet[0]=[-13,-9];knees[0]=[-10,-17];}}
 if(action==='jump'){knees=[[-8,-15],[8,-16]];feet=[[-11,-9],[5,-9]];hands=[[-12,-34],[12,-36]];}
 if(action==='throw'){lean=strike?5:-2;hands=strike?[[14,-22],[23,-28]]:[[-5,-47],[12,-47]];elbows=strike?[[6,-31],[15,-34]]:[[-12,-36],[15,-37]];feet=[[-12,-1],[10,-1]];}
 if(action==='slam'){hands=ready?[[-11,-49],[11,-49]]:[[15,-20],[22,-22]];elbows=ready?[[-16,-41],[16,-41]]:[[4,-30],[15,-31]];lean=strike?5:0;}
 if(action==='charge'){lean=strike?6:-3;hands=[[0,-26],[17,-33]];feet=[[-14,-1],[12,-1]];}
 if(action==='hurt'||action==='held'){lean=-4;hands=[[-15,-30],[14,-35]];feet=[[-10,-1],[7,-4]];}
 const limb=(a,b,dark,light,r=2)=>{line(a,b,r+1,0);line(a,b,r,dark);line([a[0]-1,a[1]],[b[0]-1,b[1]],Math.max(0,r-1),light)};
 for(let i=0;i<2;i++){limb([i?4:-4,-18],knees[i],8,i?9:1,big?3:2);limb(knees[i],feet[i],8,i?9:1,big?3:2);rect(feet[i][0]-3,feet[i][1]-2,9,4,0);rect(feet[i][0]-2,feet[i][1],8,1,i?4:3);rect(feet[i][0]+1,feet[i][1]-2,4,2,9);}
 const shift=p=>[p[0]+lean,p[1]+bob-(big?5:0)];
 function arm(i){const a=shift([i?bw-1:-bw+1,-31]),b=shift(elbows[i]),d=shift(hands[i]);limb(a,b,1,brute?6:2,big?3:2);limb(b,d,5,brute?7:6,2);rect(d[0]-3,d[1]-3,7,6,0);rect(d[0]-2,d[1]-2,5,4,7);rect(d[0]-3,d[1]+1,6,2,player?4:10);put(d[0]+2,d[1]-2,6);}
 arm(0);
 const tx=lean,ty=bob-(big?5:0);
 polygon([[-bw+tx,-33+ty],[bw-2+tx,-33+ty],[bw+2+tx,-27+ty],[bw-1+tx,-16],[-bw+tx,-16],[-bw-2+tx,-27+ty]],0);
 rect(-bw+1+tx,-31+ty,bw*2-2,13-ty,1);rect(-bw+2+tx,-30+ty,bw-2,11-ty,2);rect(1+tx,-30+ty,bw-3,12-ty,3);rect(-2+tx,-31+ty,3,14-ty,0);
 if(brute){rect(-7+tx,-33+ty,14,12,6);rect(-6+tx,-33+ty,12,3,7);rect(tx,-29+ty,1,7,5);rect(-6+tx,-26+ty,5,1,5);rect(2+tx,-26+ty,5,1,5);}
 else{rect(-bw+2+tx,-29+ty,3,2,4);rect(3+tx,-25+ty,3,1,1);}
 rect(-bw+tx,-17,bw*2,3,0);rect(-bw+1+tx,-17,bw*2-2,1,9);rect(tx,-17,3,2,10);
 if(boss){polygon([[-8+tx,-22],[-1+tx,-21],[-3+tx,-6],[-13+tx,-8]],1);polygon([[2+tx,-22],[8+tx,-22],[13+tx,-8],[4+tx,-6]],2);rect(-7+tx,-35,2,15,10);rect(5+tx,-35,2,15,10);}
 const hx=tx+(runner?2:0),hy=-h+bob;
 rect(hx-3,hy+9,6,5,5);
 polygon([[hx-5,hy],[hx+4,hy],[hx+7,hy+3],[hx+7,hy+7],[hx+9,hy+7],[hx+8,hy+10],[hx+4,hy+12],[hx-4,hy+11],[hx-6,hy+6]],0);
 rect(hx-4,hy+2,10,7,6);rect(hx-1,hy+3,7,6,7);rect(hx+6,hy+6,2,3,7);rect(hx-3,hy+9,8,2,5);rect(hx-5,hy+5,3,4,6);rect(hx+4,hy+5,2,2,0);put(hx+5,hy+5,4);rect(hx+5,hy+9,2,1,0);
 if(player){polygon([[hx-6,hy+6],[hx-7,hy+1],[hx-3,hy-2],[hx+5,hy-2],[hx+7,hy+1],[hx+2,hy+3],[hx-2,hy+2],[hx-3,hy+7]],0);rect(hx-4,hy,8,1,9);rect(hx-6,hy+7,2,3,10);rect(hx-4,hy+11,10,3,10);rect(hx-3,hy+14,4,3,11);polygon([[hx-3,hy+12],[hx-12,hy+10],[hx-19,hy+13+(bob?1:0)],[hx-12,hy+15],[hx-5,hy+14]],11);rect(hx-12,hy+12,7,1,10);}
 if(runner){polygon([[hx-6,hy+7],[hx-7,hy],[hx-2,hy-3],[hx+5,hy-1],[hx+7,hy+3],[hx-1,hy+1],[hx-3,hy+7]],10);rect(hx-5,hy,7,1,4);rect(hx-2,hy+5,10,3,0);rect(hx+2,hy+5,6,1,10);rect(hx-2,hy+10,8,2,11);}
 if(type==='thug'){rect(hx-6,hy-1,12,4,2);rect(hx-7,hy+2,18,2,1);rect(hx-5,hy,9,1,3);rect(hx-4,hy+9,8,3,1);}
 if(brute){rect(hx-6,hy,11,3,0);rect(hx-4,hy,7,1,9);rect(hx-3,hy+10,9,2,1);rect(hx-6,hy+7,2,2,10);}
 if(boss){polygon([[hx-7,hy+8],[hx-8,hy+1],[hx-4,hy-3],[hx+4,hy-3],[hx+7,hy],[hx+4,hy+3],[hx-2,hy+2],[hx-4,hy+8]],4);rect(hx-6,hy+2,3,7,3);rect(hx-1,hy+5,10,3,0);rect(hx+1,hy+5,7,1,10);}
 arm(1);
 // Downed bodies are rotated on the integer grid, never by Canvas transforms.
 let output=data;if(action==='down'){output=new Uint8Array(W*W);for(let y=0;y<W;y++)for(let x=0;x<W;x++){const nx=59-y+7,ny=x-27+47;if(nx>=0&&nx<W&&ny>=0&&ny<W)output[ny*W+nx]=data[y*W+x];}}
 const runs=[];for(let y=0;y<W;y++)for(let x=0;x<W;){const color=output[y*W+x];if(!color){x++;continue}let end=x+1;while(end<W&&output[y*W+end]===color)end++;runs.push([x,y,end-x,pal[color-1]]);x=end;}
 const result=Object.freeze({width:W,height:W,runs:Object.freeze(runs.map(Object.freeze))});cache.set(key,result);return result;
}
export function drawSprite(c,type,frame,x,y,face=1,flash=false){
 const sprite=spriteFor(type,frame),left=Math.round(x)-54,top=Math.round(y)-118;
 for(const [sx,sy,w,color] of sprite.runs){c.fillStyle=flash&&color!==palettes[type]?.[0]?'#e2f3dd':color;c.fillRect(face<0?Math.round(x)+54-(sx+w)*2:left+sx*2,top+sy*2,w*2,2);}
}
