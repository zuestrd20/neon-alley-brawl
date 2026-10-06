import { drawSprite, frameFor } from './sprites.js';
/* Original canvas artwork for NEON ALLEY: Midnight Signal. */
const P={ink:'#0b1022',deep:'#10172c',navy:'#18233b',slate:'#293955',edge:'#3c536b',muted:'#687992',paper:'#e2f3dd',mint:'#83f7ce',mintDark:'#388f87',coral:'#ff657e',coralDark:'#a83760',amber:'#ffc16e',purple:'#a294ed',blue:'#6085c9',skin:'#edb690',skinShade:'#b87568'};
const GLYPHS={A:['01110','11011','11011','11111','11011','11011','11011'],B:['11110','11011','11011','11110','11011','11011','11110'],C:['01111','11000','11000','11000','11000','11000','01111'],D:['11110','11011','11011','11011','11011','11011','11110'],E:['11111','11000','11000','11110','11000','11000','11111'],F:['11111','11000','11000','11110','11000','11000','11000'],G:['01111','11000','11000','11011','11011','11011','01111'],H:['11011','11011','11011','11111','11011','11011','11011'],I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00011','00011','00011','11011','11011','01110'],K:['11011','11011','11110','11100','11110','11011','11011'],L:['11000','11000','11000','11000','11000','11000','11111'],M:['11011','11111','11111','10101','10001','10001','10001'],N:['11001','11101','11101','11011','11011','11001','11001'],O:['01110','11011','11011','11011','11011','11011','01110'],P:['11110','11011','11011','11110','11000','11000','11000'],Q:['01110','11011','11011','11011','11011','11110','00111'],R:['11110','11011','11011','11110','11100','11010','11011'],S:['01111','11000','11000','01110','00011','00011','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['11011','11011','11011','11011','11011','11011','01110'],V:['11011','11011','11011','11011','11011','01010','00100'],W:['10001','10001','10001','10101','11111','11111','11011'],X:['11011','11011','01010','00100','01010','11011','11011'],Y:['11011','11011','01010','00100','00100','00100','00100'],Z:['11111','00011','00110','00100','01100','11000','11111'],'0':['01110','11011','11011','11111','11011','11011','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','11011','00011','00110','01100','11000','11111'],'3':['11110','00011','00011','01110','00011','00011','11110'],'4':['11011','11011','11011','11111','00011','00011','00011'],'5':['11111','11000','11000','11110','00011','00011','11110'],'6':['01110','11000','11000','11110','11011','11011','01110'],'7':['11111','00011','00110','00100','01100','01100','01100'],'8':['01110','11011','11011','01110','11011','11011','01110'],'9':['01110','11011','11011','01111','00011','00011','01110'],'-':['00000','00000','00000','11111','00000','00000','00000'],'.':['00000','00000','00000','00000','00000','00110','00110'],':':['00000','00100','00100','00000','00100','00100','00000'],'/':['00001','00011','00110','00100','01100','11000','10000'],'+':['00000','00100','00100','11111','00100','00100','00000']};
const mod=(v,n)=>((v%n)+n)%n;
const hash=(a,b=0)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n)};
function box(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h))}
function poly(c,pts,col){c.fillStyle=col;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(Math.round(p[0]),Math.round(p[1])):c.moveTo(Math.round(p[0]),Math.round(p[1])));c.closePath();c.fill()}
function pixels(c,str,x,y,s=1,col=P.paper){str=String(str).toUpperCase();c.fillStyle=col;let ox=Math.round(x);for(const ch of str){const glyph=GLYPHS[ch];if(glyph)for(let j=0;j<7;j++)for(let i=0;i<5;i++)if(glyph[j][i]==='1')c.fillRect(ox+i*s,Math.round(y)+j*s,s,s);ox+=6*s}}
function stroke(c,x1,y1,x2,y2,col,width=2){c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(Math.round(x1),Math.round(y1));c.lineTo(Math.round(x2),Math.round(y2));c.stroke()}
function glow(c,x,y,w,h,col){c.save();c.globalAlpha=.035;box(c,x-18,y-16,w+36,h+32,col);c.globalAlpha=.065;box(c,x-8,y-6,w+16,h+12,col);c.restore()}
function sign(c,label,x,y,s=2,col=P.mint,bg=P.ink){const w=label.length*6*s+18;glow(c,x,y,w,7*s+18,col);box(c,x-3,y-3,w+6,7*s+24,P.ink);box(c,x,y,w,7*s+18,P.edge);box(c,x+2,y+2,w-4,7*s+14,bg);box(c,x+4,y+4,w-8,2,col);pixels(c,label,x+9,y+9,s,col);box(c,x+4,y+7*s+12,w-8,2,col)}
function wire(c,x1,y1,x2,y2,sag=28,col=P.ink){const n=16;for(let i=0;i<n;i++){let a=i/n,b=(i+1)/n;stroke(c,x1+(x2-x1)*a,y1+(y2-y1)*a+Math.sin(a*Math.PI)*sag,x1+(x2-x1)*b,y1+(y2-y1)*b+Math.sin(b*Math.PI)*sag,col,2)}}
function sky(c,g,stage,t){
 const shades=stage===2?['#15142c','#1e1a38','#282343','#35304a']:stage===1?['#17182b','#211f35','#29263b','#353041']:['#11182d','#192238','#202c42','#2a374d'];
 for(let i=0;i<4;i++)box(c,0,i*80,960,82,shades[i]);
 if(stage===2){box(c,722,55,32,4,'#c8c4ac');box(c,714,59,48,24,'#c8c4ac');box(c,722,83,32,4,'#c8c4ac');box(c,714,59,26,20,shades[0]);for(let i=0;i<27;i++){let x=hash(i,71)*960,y=hash(i,42)*135;box(c,x,y,2,2,i%3?P.muted:P.paper)}}
 else {box(c,593,36,70,2,'#394259');box(c,620,41,98,2,'#303b50');box(c,108,75,156,2,'#313e51')}
 const cam=Number(g.camera)||0;
 for(let layer=0;layer<2;layer++){let step=layer?74:96;let shift=cam*(layer?.22:.1);for(let i=Math.floor(shift/step)-1;i<Math.floor(shift/step)+15;i++){let x=i*step-shift;let h=80+hash(i,layer+8)*115;let y=284-h;box(c,x,y,step-6,h,layer?'#172237':'#243148');box(c,x+8,y-5,step-23,7,layer?'#172237':'#243148');if(i%3===0){box(c,x+step/2,y-28,3,25,P.navy);box(c,x+step/2-2,y-29,7,3,stage===2?P.coral:P.edge)}for(let yy=y+15;yy<274;yy+=15)for(let xx=x+10;xx<x+step-12;xx+=12){if(hash(i+xx,yy)>.59)box(c,xx,yy,4,5,layer?(hash(xx,yy)>.7?'#59665f':'#34495a'):'#35465a')}}}
 if(stage===1){for(let i=0;i<3;i++){let x=i*540-mod(cam*.3,540)-90;box(c,x,84,7,209,'#314152');stroke(c,x+3,90,x+210,153,'#314152',5);stroke(c,x-60,153,x+230,153,'#314152',5);stroke(c,x+3,89,x-60,153,'#314152',3);box(c,x+182,153,2,81,P.slate)}}
}
function windows(c,x,y,w,h,seed,col='#3c5262'){box(c,x,y,w,h,P.ink);for(let a=0;a<w-7;a+=17)for(let b=0;b<h-7;b+=17){box(c,x+a+3,y+b+3,11,11,hash(a+seed,b)>.7?col:'#1c2a40');box(c,x+a+3,y+b+3,11,2,hash(a+seed,b)>.7?'#728071':'#2a3a4e')}}
function aircon(c,x,y){box(c,x-2,y-2,42,28,P.ink);box(c,x,y,38,24,P.slate);box(c,x+3,y+3,32,2,P.edge);for(let i=0;i<4;i++)box(c,x+4,y+8+i*3,28,1,P.ink);box(c,x+33,y+3,3,3,P.mintDark);box(c,x+6,y+24,3,14,P.ink);box(c,x+31,y+24,3,14,P.ink)}
function shop(c,x,index,t,reduced){
 const widths=[286,252,306],w=widths[mod(index,3)]; // Shop modules intentionally share architectural rhythm.
 box(c,x,97,320,220,'#1c2940');box(c,x+2,103,316,4,P.edge);box(c,x+8,113,306,3,'#2c3c53');
 for(let row=0;row<5;row++)for(let col=0;col<7;col++){box(c,x+col*48+(row%2?24:0),181+row*25,40,1,'#28384e')}
 windows(c,x+20,123,64,39,index);windows(c,x+101,123,64,39,index+1);aircon(c,x+256,130);
 const variant=mod(index,3);
 if(variant===0){
  sign(c,'MOON NOODLE',x+29,181,2,P.amber);box(c,x+19,229,232,63,P.ink);box(c,x+25,235,74,52,'#493b43');box(c,x+105,235,70,52,'#574148');box(c,x+181,235,64,52,'#493b43');
  for(let j=0;j<3;j++){box(c,x+25+j*78,251,65,3,'#996154');box(c,x+44+j*76,271,24,3,P.amber);box(c,x+49+j*76,276,14,3,'#ad6a53')}
  for(let j=0;j<13;j++)box(c,x+10+j*20,220,18,8,j%2?P.coralDark:'#d07c69');box(c,x+8,217,265,3,P.ink);box(c,x+13,288,244,7,P.slate);
  for(let j=0;j<2;j++){let yy=reduced?0:Math.round(Math.sin(t*2+j)*2);box(c,x+68+j*125,250+yy,2,6,'#93736a');box(c,x+71+j*125,243+yy,2,7,'#93736a')}
  box(c,x+279,185,24,84,P.ink);box(c,x+282,188,18,78,P.coralDark);pixels(c,'24',x+285,194,1,P.amber);pixels(c,'H',x+289,207,1,P.amber);for(let j=0;j<3;j++){box(c,x+286,226+j*10,10,2,P.coral);box(c,x+290,223+j*10,2,8,P.coral)}
 }else if(variant===1){
  sign(c,'AFTER HOURS',x+23,180,2,P.purple);box(c,x+17,225,248,74,P.ink);box(c,x+22,230,96,64,'#222a42');for(let j=0;j<8;j++)box(c,x+24,234+j*7,91,2,P.slate);box(c,x+126,230,129,64,'#303044');box(c,x+132,235,118,42,'#292a43');box(c,x+155,242,6,28,P.purple);box(c,x+143,253,30,6,P.purple);pixels(c,'RECORDS',x+183,249,1,'#9a8ac1');box(c,x+133,281,115,2,'#675b88');box(c,x+269,197,8,109,P.ink);box(c,x+273,206,24,53,P.slate);box(c,x+278,212,14,37,'#637079');box(c,x+282,216,6,6,P.amber);
 }else{
  sign(c,'KITE MART',x+22,180,2,P.mint);box(c,x+20,222,247,75,P.ink);box(c,x+28,229,114,63,'#25424b');box(c,x+151,229,106,63,'#294750');box(c,x+86,229,4,63,P.slate);box(c,x+200,229,4,63,P.slate);for(let j=0;j<4;j++){box(c,x+35,240+j*12,99,3,'#527073');box(c,x+158,240+j*12,90,3,'#527073');for(let k=0;k<6;k++)box(c,x+39+k*15,233+j*12,6,7,j%2?'#777d69':'#57887f')};box(c,x+282,230,22,64,'#523442');pixels(c,'ICE',x+285,237,1,P.coral);box(c,x+285,256,16,27,P.slate)
 }
 box(c,x+4,300,310,13,P.navy);box(c,x+6,300,307,2,P.edge);box(c,x+310,110,6,200,P.ink);box(c,x+307,160,3,103,'#3b5062');
}
function container(c,x,y,w,h,col,label){box(c,x-3,y-3,w+6,h+6,P.ink);box(c,x,y,w,h,col);box(c,x+3,y+3,w-6,4,'#637074');for(let j=12;j<w-8;j+=17){box(c,x+j,y+10,4,h-17,'#172c3a');box(c,x+j+4,y+10,2,h-17,'#586569')}box(c,x+4,y+h-7,w-8,4,P.ink);box(c,x+w-34,y+7,3,h-16,P.ink);pixels(c,label,x+17,y+21,2,'#b3b9a0');pixels(c,'MN / 06',x+18,y+h-20,1,'#899d94')}
function streetBack(c,g,stage,t,reduced){const cam=Number(g.camera)||0;
 if(stage===0){let offset=cam*.65;let first=Math.floor(offset/320)-1;for(let i=first;i<first+5;i++)shop(c,i*320-offset,i,t,reduced);for(let i=0;i<3;i++){let x=i*640-mod(cam*.67,640)-210;wire(c,x,75,x+625,118,34);for(let k=1;k<8;k++){let u=k/8,xx=x+625*u,yy=75+43*u+Math.sin(u*Math.PI)*34;box(c,xx,yy,2,9,P.ink);box(c,xx-4,yy+9,10,11,k%2?'#b76b62':'#568b80');box(c,xx-2,yy+10,6,8,k%2?P.amber:P.mint)}}}
 if(stage===1){box(c,0,221,960,97,'#253348');for(let i=-1;i<6;i++){let x=i*280-mod(cam*.67,280);container(c,x+5,191,258,111,i%2?'#3c565c':'#71554c',i%2?'NORTH / 03':'FRAGILE');if(mod(i,3)===0)container(c,x+39,90,206,92,'#49515e','NX FREIGHT')};for(let i=0;i<4;i++){let x=i*360-mod(cam*.8,360);box(c,x,214,4,100,P.edge);for(let y=222;y<309;y+=15){stroke(c,x,y,x+360,y,'#3b4755',1);for(let k=0;k<24;k++)stroke(c,x+k*15,y,x+k*15+15,y+15,'#3b4755',1)}}sign(c,'SWITCHYARD NINE',48-mod(cam*.1,550),74,2,P.amber)}
 if(stage===2){box(c,0,266,960,51,'#34364b');box(c,0,263,960,7,'#656277');box(c,0,271,960,2,P.ink);for(let i=-1;i<5;i++){let x=i*340-mod(cam*.5,340);box(c,x+14,172,132,91,'#262c41');box(c,x+8,170,146,8,P.slate);for(let j=0;j<7;j++)box(c,x+26,186+j*9,105,3,'#182336');box(c,x+165,85,8,180,P.slate);box(c,x+150,261,37,7,P.edge);stroke(c,x+170,97,x+136,236,P.edge,4);stroke(c,x+170,97,x+204,236,P.edge,4);for(let j=0;j<5;j++)stroke(c,x+147+j*3,222-j*22,x+193-j*3,222-j*22,P.edge,3);box(c,x+160,66,28,7,P.ink);box(c,x+158,64,27,3,P.coral);box(c,x+168,52,4,17,P.edge);box(c,x+245,246,78,17,P.slate);box(c,x+255,239,55,7,P.edge)}sign(c,'SIGNAL / 99.4',143-mod(cam*.16,620),127,2,P.coral);wire(c,-20,205,980,209,29)}
 box(c,0,312,960,5,P.ink);box(c,0,317,960,5,'#4a5d6c');box(c,0,322,960,9,P.navy);for(let x=-mod(cam,96);x<960;x+=96){box(c,x,324,2,5,P.ink);box(c,x+5,319,73,1,'#6b7479')}
}
function puddle(c,x,y,w,col,seed){c.save();c.globalAlpha=.4;box(c,x+12,y,w-24,2,col);box(c,x+3,y+3,w-6,3,col);box(c,x,y+7,w,2,col);box(c,x+11,y+10,w-23,2,col);c.globalAlpha=.48;for(let j=0;j<5;j++)box(c,x+hash(j,seed)*w,y+hash(seed,j)*10,8+hash(j+9,seed)*15,1,P.mint);c.restore()}
function floor(c,g,stage,t,reduced){const cam=Number(g.camera)||0;box(c,0,331,960,209,stage===2?'#242b40':'#19283c');
 for(let y=333;y<540;y+=4)box(c,0,y,960,1,y%8?'#1b2b3f':'#202e42');
 for(let i=-1;i<9;i++){let x=i*170-mod(cam,170);stroke(c,x,333,x-31,540,'#101d30',2);box(c,x+1,334,1,39,'#2e3d50')}
 for(let y of [368,421,482,539]){box(c,0,y,960,2,'#101d30');box(c,0,y+2,960,1,'#2c3a4d')}
 for(let i=Math.floor(cam/80)-2;i<Math.floor(cam/80)+15;i++){let x=i*80-cam;let yy=342+hash(i,5)*161;box(c,x+hash(i,4)*50,yy,8,2,'#38475a');box(c,x+30,yy+30,3,2,'#101b2d')}
 if(stage===0){for(let i=Math.floor(cam/290)-1;i<Math.floor(cam/290)+5;i++){let x=i*290-cam;puddle(c,x+22,349,120,'#46817c',i);puddle(c,x+125,454,112,'#665279',i+4);c.save();c.globalAlpha=.14;for(let j=0;j<9;j++)box(c,x+35+hash(j,i)*16,333+j*8,75-j*5,2,j%2?P.amber:P.coral);c.restore()}}
 if(stage===1){for(let i=-1;i<8;i++){let x=i*170-mod(cam,170);poly(c,[[x,343],[x+48,343],[x+32,349],[x-17,349]],'#85704e');poly(c,[[x+11,496],[x+75,496],[x+87,504],[x+20,504]],'#85704e')}for(let i=-1;i<5;i++){let x=i*390-mod(cam,390);box(c,x+20,444,98,4,'#536071');box(c,x+20,445,24,2,'#839087')}}
 if(stage===2){for(let i=-1;i<4;i++){let x=i*600-mod(cam,600);c.save();c.globalAlpha=.5;stroke(c,x+25,350,x+442,350,P.muted,3);stroke(c,x+25,350,x-40,479,P.muted,3);stroke(c,x+442,350,x+507,479,P.muted,3);stroke(c,x-40,479,x+507,479,P.muted,3);box(c,x+179,386,16,57,P.amber);box(c,x+254,386,16,57,P.amber);box(c,x+185,409,79,12,P.amber);c.restore()}}
 // Drain grates and raised street edge frame the arena without hiding the action.
 for(let i=-1;i<5;i++){let x=i*300-mod(cam,300);box(c,x+36,334,75,8,P.ink);for(let j=0;j<12;j++)box(c,x+40+j*6,335,2,6,P.edge)}
 box(c,0,516,960,4,P.ink);box(c,0,520,960,20,'#142137');box(c,0,520,960,2,P.edge);for(let x=-mod(cam,124);x<960;x+=124){box(c,x,522,2,18,P.ink);box(c,x+7,526,100,1,'#263750')}
}
function crate(c,x,y,style=0){box(c,x-20,y-30,40,30,P.ink);box(c,x-17,y-27,34,24,style?'#3d5960':'#7a5d50');box(c,x-16,y-26,32,3,style?'#6c8b84':'#b08a67');box(c,x-16,y-8,32,3,'#263948');box(c,x-12,y-22,4,15,'#263948');box(c,x+8,y-22,4,15,'#263948');box(c,x-4,y-24,8,16,style?'#7b9b89':'#b49872')}
function props(c,g,stage,t){const cam=Number(g.camera)||0;for(let i=Math.floor(cam/480)-1;i<Math.floor(cam/480)+4;i++){let x=i*480+365-cam;
 if(stage===0){box(c,x-26,289,37,33,P.ink);box(c,x-23,293,31,27,'#3c595d');box(c,x-28,287,41,7,'#55716c');box(c,x-16,298,3,20,P.navy);box(c,x-3,298,3,20,P.navy);box(c,x-30,319,8,5,P.ink);box(c,x+2,319,8,5,P.ink);box(c,x+38,282,4,43,P.edge);box(c,x+23,280,34,26,P.ink);box(c,x+26,283,28,20,'#394558');pixels(c,'GO',x+34,289,1,P.mint);stroke(c,x+41,308,x+50,326,P.ink,3)}
 else if(stage===1){crate(c,x-24,325,0);crate(c,x+16,325,1);crate(c,x-16,297,1);box(c,x+85,281,7,39,P.amber);box(c,x+84,309,9,7,P.ink);box(c,x+84,294,9,7,P.ink);box(c,x+80,320,17,5,P.ink)}
 else{box(c,x-30,293,64,31,P.ink);box(c,x-27,296,58,25,P.slate);for(let j=0;j<7;j++)box(c,x-23+j*7,300,3,14,P.ink);box(c,x-26,296,57,3,P.edge);box(c,x+60,281,20,43,P.ink);box(c,x+63,284,14,36,'#3c4259');box(c,x+66,289,7,3,P.coral);wire(c,x+77,321,x+143,324,4,P.ink)}
 }
}
function shadow(c,x,y,w,alpha=.45){c.save();c.globalAlpha=alpha;poly(c,[[x-w*.5,y-3],[x-w*.36,y-6],[x+w*.35,y-6],[x+w*.5,y-2],[x+w*.41,y+3],[x-w*.35,y+4]],'#060d1c');c.restore()}
function health(c,e,x,y,wide){if(e.type==='player'||e.hp<=0)return;const w=wide?60:38;box(c,x-w/2-1,y-1,w+2,5,P.ink);box(c,x-w/2,y,w,3,'#3c3047');box(c,x-w/2,y,Math.max(0,w*e.hp/(e.maxHp||e.hp)),3,e.type==='boss'?P.coral:P.amber)}
function person(c,e,g,t,reduced){
 const cam=Number(g.camera)||0;const px=Math.round((Number(e.x)||0)-cam),baseY=Number(e.y)||410,z=Number(e.z)||0; if(px<-95||px>1055)return;
 const player=e.type==='player'||e===g.player,brute=e.type==='brute',boss=e.type==='boss',runner=e.type==='runner';const big=brute||boss;
 const dead=e.dead||e.state==='dead'||e.state==='down';const hurt=e.state==='hurt'||e.stun>0;let face=Number(e.face)||1;
 const atk=e.attack;const attacking=e.state==='attack'||!!atk;const windup=e.state==='windup'||(atk&&Number(atk.time)<Number(atk.windup));
 const kick=attacking&&atk&&/kick|heavy|special|spin/.test(atk.kind||'');const air=z>4||e.state==='jump';const active=attacking&&!windup;
 shadow(c,px,baseY,Math.max(19,(big?58:41)-z*.15),dead?.25:.46);
 if(windup&&!dead){c.save();c.globalAlpha=.35;poly(c,[[px+face*15,baseY-13],[px+face*(big?110:83),baseY-26],[px+face*(big?110:83),baseY+16],[px+face*15,baseY+7]],P.coral);c.globalAlpha=.7;box(c,px+face*30-3,baseY-10,6,3,P.amber);c.restore()}
 const sy=Math.round(baseY-z);
 const frame=frameFor(e,t);
 drawSprite(c,e.type,frame,px,sy,face,hurt&&!reduced&&Math.floor(t*14)%2===0);
 if(dead)return;
 if(player){pixels(c,'RIN',px-9,sy-106,1,P.mint);poly(c,[[px-3,sy-97],[px+3,sy-97],[px,sy-94]],P.mint)}
 health(c,e,px,sy-(big?130:104),big);
 if(windup){pixels(c,'!',px-2,sy-(big?144:117),1,P.coral);box(c,px-1,sy-(big?142:115),2,6,P.amber);box(c,px-1,sy-(big?134:107),2,2,P.amber)}
 // Mint slash marks trace the strike, away from faces.
 if(active&&!reduced&&player){c.save();c.globalAlpha=.6;let sx=px+face*(kick?49:51),yy=sy-z*.03-(kick?40:54);poly(c,[[sx,yy-13],[sx+face*12,yy-9],[sx+face*19,yy+2],[sx+face*12,yy+12],[sx+face*13,yy+1],[sx+face*7,yy-7]],P.mint);c.restore()}
}
function pickup(c,p,g,t){const x=(p.x||0)-(g.camera||0),y=p.y||400,yy=y-8-Math.sin(t*4+x)*2;if(p.taken||p.dead||x<-30||x>990)return;shadow(c,x,y,22,.28);let hp=/health|food|heal|ramen/.test(p.type||'');box(c,x-9,yy-12,18,17,P.ink);box(c,x-7,yy-10,14,13,hp?P.coralDark:'#658474');box(c,x-6,yy-10,12,2,hp?P.coral:P.mint);if(hp){box(c,x-1,yy-7,3,8,P.paper);box(c,x-4,yy-4,9,3,P.paper)}else{pixels(c,'$',x-3,yy-7,1,P.amber);box(c,x-1,yy-6,3,8,P.amber);box(c,x-4,yy-3,9,2,P.amber)}box(c,x-2,yy-20,4,2,P.paper);box(c,x-1,yy-21,2,4,P.paper)}
function effects(c,g,t,reduced){for(const e of (g.effects||[])){const x=(e.x||0)-(g.camera||0),y=(e.y||0)-(e.z||0),type=e.type||e.kind||'';let life=Number(e.life??e.ttl??.2),max=Number(e.maxLife??e.duration??.4);let alpha=Math.max(0,Math.min(1,life/max));if(!Number.isFinite(alpha))alpha=1;c.save();c.globalAlpha=alpha;const color=e.color||P.amber;if(type==='text'||e.text){pixels(c,e.text||'',x-String(e.text||'').length*3,y-35,1,color)}else if(/hit|spark|impact/.test(type)){const k=reduced?7:10+(1-alpha)*18;for(let i=0;i<6;i++){let a=i*Math.PI/3+.4;poly(c,[[x+Math.cos(a)*3,y+Math.sin(a)*3],[x+Math.cos(a)*k,y+Math.sin(a)*k],[x+Math.cos(a+.25)*6,y+Math.sin(a+.25)*6]],i%2?color:P.paper)}}else if(/dust|step|land/.test(type)){for(let i=0;i<4;i++)box(c,x+(i-2)*7,y+hash(i,3)*4,5,2,P.muted)}else if(/ring|special|shock/.test(type)&&!reduced){c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.ellipse(x,y,30+(1-alpha)*70,10+(1-alpha)*20,0,0,Math.PI*2);c.stroke()}else if(e.vx!==undefined||/particle/.test(type)){box(c,x,y,e.size||3,e.size||3,color)}c.restore()}}
function atmosphere(c,g,stage,t,reduced){
 if(stage===0&&!reduced){c.save();c.globalAlpha=.22;for(let i=0;i<50;i++){let x=mod(hash(i,32)*1050-t*85-(g.camera||0)*.3,1050)-40,y=mod(hash(i,96)*550+t*290,560)-20;stroke(c,x,y,x-3,y+10,'#abc8d0',1)}c.restore()}
 // Screen-edge pillars are intentionally absent: the arena is always unobstructed.
 c.save();c.globalAlpha=.15;for(let y=1;y<540;y+=3)box(c,0,y,960,1,P.ink);c.restore();
 const cam=g.camera||0,arena=g.arena;if(arena&&Number(arena.right)-cam<940&&Number(arena.right)-cam>650){const xx=Number(arena.right)-cam;pixels(c,'EXIT',xx-22,340,1,P.mint);poly(c,[[xx+9,343],[xx+17,343],[xx+17,339],[xx+23,346],[xx+17,352],[xx+17,349],[xx+9,349]],P.mint)}
}
export function render(ctx,g,{reducedMotion=false}={}){
 const c=ctx,stage=Math.max(0,Math.min(2,Number(g.stage)||0)),t=Number(g.time)||0;c.save();c.imageSmoothingEnabled=false;c.clearRect(0,0,960,540);box(c,0,0,960,540,P.ink);
 if(!reducedMotion&&g.shake>0){const amount=Math.min(6,g.shake);c.translate(Math.round(Math.sin(t*93)*amount),Math.round(Math.cos(t*79)*amount*.55))}
 sky(c,g,stage,t);streetBack(c,g,stage,t,reducedMotion);floor(c,g,stage,t,reducedMotion);props(c,g,stage,t);
 for(const p of g.pickups||[])pickup(c,p,g,reducedMotion?0:t);
 const entities=[...(g.enemies||[])];if(g.player)entities.push(g.player);entities.sort((a,b)=>(a.y||0)-(b.y||0));for(const e of entities)person(c,e,g,t,reducedMotion);
 effects(c,g,t,reducedMotion);atmosphere(c,g,stage,t,reducedMotion);c.restore();
}
