
// ── DATA ──────────────────────────────────────────────────
const PT = {
  sh:{conns:[0,1,0,1],color:'#e07b39'},
  sv:{conns:[1,0,1,0],color:'#e07b39'},
  ne:{conns:[1,1,0,0],color:'#c07028'},
  se:{conns:[0,1,1,0],color:'#c07028'},
  sw:{conns:[0,0,1,1],color:'#c07028'},
  nw:{conns:[1,0,0,1],color:'#c07028'},
};
const BASE_LEVELS=[
  {title:'1단계: 프라이팬 달구기',badge:'초급',goal:'🍳',gLabel:'프라이팬',goalImgKey:'frying',
   cols:7,rows:3,src:{c:0,r:1},tgt:{c:6,r:1},
   fixed:[{c:1,r:1,k:'sh'}],
   avail:[{k:'sh',n:5}]},
  {title:'2단계: 초콜릿 녹이기',badge:'중급',goal:'🍫',gLabel:'초콜릿',goalImgKey:'choco',
   cols:7,rows:5,src:{c:0,r:2},tgt:{c:6,r:0},
   fixed:[{c:1,r:2,k:'sh'},{c:2,r:2,k:'sh'}],
   avail:[{k:'sh',n:5},{k:'sv',n:5},{k:'ne',n:5},{k:'se',n:5},{k:'nw',n:5},{k:'sw',n:5}]},
  {title:'3단계: 얼음 살짝 녹이기',badge:'응용',goal:'🧊',gLabel:'얼음',goalImgKey:'ice',
   cols:7,rows:5,src:{c:0,r:4},tgt:{c:6,r:0},
   fixed:[],
   blocked:[{c:2,r:3},{c:4,r:2},{c:3,r:1}],
   avail:[{k:'sh',n:5},{k:'sv',n:5},{k:'ne',n:5},{k:'se',n:5},{k:'nw',n:5},{k:'sw',n:5}]},
]
let LEVELS=[];
const DX=[0,1,0,-1],DY=[-1,0,1,0],OPP=[2,3,0,1];

// [수정] 매 플레이마다 시작점/목표/장애물 랜덤 배치
function cloneData(v){return JSON.parse(JSON.stringify(v));}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
// [수정] 2·3단계는 1단계보다 확실히 난이도가 높도록 랜덤 규칙 재설정
function buildRandomLevels(){
  function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
  function pickOne(arr){return arr[Math.floor(Math.random()*arr.length)];}
  function chooseRows(rowsA, rowsB, minGap){
    let sRow, tRow, tries=0;
    do{
      sRow=pickOne(rowsA);
      tRow=pickOne(rowsB);
      tries++;
    }while(Math.abs(sRow-tRow)<minGap && tries<100);
    return {sRow,tRow};
  }
  function uniqueBlocked(cols, rows, forbidKeys, perColCount=1){
    const blocked=[];
    const used=new Set();
    cols.forEach(c=>{
      const pool=shuffle(rows).filter(r=>!forbidKeys.has(`${c},${r}`) && !used.has(`${c},${r}`));
      pool.slice(0, perColCount).forEach(r=>{
        blocked.push({c,r});
        used.add(`${c},${r}`);
      });
    });
    return blocked;
  }

  LEVELS=BASE_LEVELS.map((base,idx)=>{
    const lv=cloneData(base);

    if(idx===0){
      // 1단계: 쉬운 일자형 경로
      const row=pickOne([0,1,2]);
      lv.src={c:0,r:row};
      lv.tgt={c:lv.cols-1,r:row};
      lv.fixed=[{c:1,r:row,k:'sh'}];
      lv.blocked=[];
    }else if(idx===1){
      // 2단계: 반드시 세로 이동이 필요하도록 행 차이를 크게 확보
      const rows=[0,1,2,3,4];
      const pair=chooseRows(rows, rows, 2);
      lv.src={c:0,r:pair.sRow};
      lv.tgt={c:lv.cols-1,r:pair.tRow};
      lv.fixed=[{c:1,r:pair.sRow,k:'sh'},{c:2,r:pair.sRow,k:'sh'}];
      lv.blocked=[];
    }else if(idx===2){
      // 3단계: 출발/도착 간 간격을 더 벌리고 중앙 장애물을 랜덤 배치
      const pair=chooseRows([3,4],[0,1],3);
      lv.src={c:0,r:pair.sRow};
      lv.tgt={c:lv.cols-1,r:pair.tRow};
      lv.fixed=[];
      const forbid=new Set([
        `${lv.src.c},${lv.src.r}`,
        `${lv.tgt.c},${lv.tgt.r}`,
        `1,${pair.sRow}`,
        `5,${pair.tRow}`
      ]);
      // 중앙 열마다 하나씩 장애물을 두되, 시작/목표와 겹치지 않게 배치
      lv.blocked=uniqueBlocked([2,3,4,5],[0,1,2,3,4],forbid,1);
    }

    return lv;
  });
}

// ── LEVEL ICON IMAGES (levelScreen 카드 img 재사용) ─────────
const LEVEL_IMGS = {};
(function preloadLevelImgs(){
  const map = [
    ['frying', '초급 단계 프라이팬 아이콘'],
    ['choco',  '중급 단계 초콜릿 아이콘'],
    ['ice',    '응용 단계 얼음 아이콘'],
  ];
  map.forEach(([key, alt]) => {
    const el = document.querySelector(`#levelScreen img[alt="${alt}"]`);
    if(el){ const img=new Image(); img.src=el.src; LEVEL_IMGS[key]=img; }
  });
})();

// ── FLAME IMAGE (열 출발 canvas 아이콘) ──────────────────────
const FLAME_IMG=(function(){
  const img=new Image();
  img.src='./assets/flame_icon.png';
  return img;
})();

// ── STATE ─────────────────────────────────────────────────
let mode='solo',curLv=0,LD=null,CS=60,raceOver=false;
let P=[];
let cpuTmrs=[];

function mkP(isCPU,cvId){
  return {grid:{},heat:[],heating:false,hanim:null,inv:[],sel:null,isCPU,done:false,ok:false,cvId};
}

// ── UTILS ─────────────────────────────────────────────────
function rotC(c){return[c[3],c[0],c[1],c[2]];}
function dir(a,b){
  if(b.r<a.r)return 0;if(b.c>a.c)return 1;if(b.r>a.r)return 2;return 3;
}
function connsMatch(arr){
  for(const[k,v]of Object.entries(PT))
    if(v.conns.every((x,i)=>!!x===!!arr[i]))return{k,conns:[...v.conns],color:v.color};
  return null;
}
function mkInv(avail){
  return avail.map(a=>({k:a.k,conns:[...PT[a.k].conns],color:PT[a.k].color,n:a.n}));
}
function mkGrid(fixed){
  const g={};
  fixed.forEach(f=>{const v=PT[f.k];g[`${f.c},${f.r}`]={k:f.k,conns:[...v.conns],color:v.color,fixed:true};});
  return g;
}
function rr(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

// ── SCREENS ───────────────────────────────────────────────
function showScr(id){document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active');s.scrollTop=0;});const next=document.getElementById(id);next.classList.add('active');next.scrollTop=0;document.body.scrollTop=0;document.documentElement.scrollTop=0;} // [수정] 스크롤 없이 active 화면만 즉시 전환
function setMode(m){playUiSound();mode=m;showScr('levelScreen');}
function goLevelSelect(){playUiSound();stopAll();showScr('levelScreen');}
function stopAll(){cpuTmrs.forEach(clearTimeout);cpuTmrs=[];P.forEach(p=>{if(p.hanim)clearTimeout(p.hanim);});}


// [수정] 사운드 엔진 추가
let audioCtx=null;
let bgmStarted=false;
let bgmTimer=null;
let bgmStep=0;
// [수정] BGM을 업로드된 레퍼런스 음원(~126BPM, Am-F-C-G 루프)에 맞춰 재설계
// 8스텝 = 1마디(4박, 8분음표 단위). 총 4마디로 Am-F-C-G 한 사이클 반복.
// 각 엔트리: {root: 베이스 주파수, chord: 상성부 3화음 배열}
const BGM_CHORDS=[
  {root:220.00, chord:[261.63,329.63,440.00]}, // Am : A3 - C4 E4 A4
  {root:174.61, chord:[261.63,349.23,440.00]}, // F  : F3 - C4 F4 A4
  {root:130.81, chord:[261.63,329.63,392.00]}, // C  : C3 - C4 E4 G4
  {root:196.00, chord:[246.94,293.66,392.00]}  // G  : G3 - B3 D4 G4
];
// 각 코드 안에서 8분음표 단위로 어떤 멜로디 음을 찍을지 (아르페지오 패턴)
// 0=rest, 그 외는 주파수(Hz). 업로드 음원의 밝고 경쾌한 리듬감을 반영.
const BGM_MELODY=[
  // Am 마디
  [523.25,0,659.25,783.99,0,659.25,880.00,0],
  // F 마디
  [523.25,0,698.46,880.00,0,698.46,1046.50,0],
  // C 마디
  [523.25,0,659.25,783.99,0,1046.50,783.99,659.25],
  // G 마디
  [493.88,0,587.33,783.99,0,587.33,987.77,783.99]
];
function initAudio(){
  if(!audioCtx){
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  }
  if(audioCtx.state==='suspended'){
    audioCtx.resume();
  }
  startBGM();
}
function playTone(freq=440,dur=0.08,type='sine',vol=0.05,when=0){
  if(!audioCtx)return;
  if(audioCtx.state==='suspended')audioCtx.resume();
  const now=audioCtx.currentTime+when;
  const osc=audioCtx.createOscillator();
  const gain=audioCtx.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(freq,now);
  gain.gain.setValueAtTime(0.0001,now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001,vol),now+0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001,now+dur);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now+dur+0.02);
}
function playUiSound(){initAudio();playTone(640,0.07,'square',0.035);}
function playSelectSound(){initAudio();playTone(820,0.05,'triangle',0.03);}
function playPlaceSound(){initAudio();playTone(540,0.05,'square',0.03);playTone(760,0.07,'triangle',0.025,0.04);}
function playDeleteSound(){initAudio();playTone(260,0.09,'sawtooth',0.03);}
function playRotateSound(){initAudio();playTone(480,0.04,'triangle',0.028);playTone(620,0.05,'triangle',0.022,0.04);}
function playHeatSound(){initAudio();playTone(360,0.07,'sawtooth',0.03);playTone(520,0.09,'sawtooth',0.025,0.06);playTone(700,0.11,'triangle',0.02,0.12);}
function playSuccessSound(){initAudio();playTone(880,0.12,'triangle',0.04);playTone(1108.73,0.14,'triangle',0.04,0.12);playTone(1318.51,0.18,'triangle',0.04,0.24);}
function playFailSound(){initAudio();playTone(320,0.12,'sawtooth',0.035);playTone(240,0.18,'sawtooth',0.03,0.12);}
function startBGM(){
  if(bgmStarted||!audioCtx)return;
  bgmStarted=true;
  // 126 BPM → 4분음표 ≈ 0.476s → 8분음표 ≈ 0.238s
  const tick=0.238;
  const playStep=()=>{
    if(!audioCtx)return;
    const bar=Math.floor(bgmStep/8)%BGM_CHORDS.length; // 8스텝마다 코드 변경
    const pos=bgmStep%8; // 마디 내 8분음표 위치
    const c=BGM_CHORDS[bar];
    // 1) 베이스: 매 박(짝수 스텝)마다 루트 톤, 강박(0,4)은 살짝 더 큼
    if(pos%2===0){
      const bassVol=(pos===0)?0.028:0.02;
      playTone(c.root,tick*1.7,'triangle',bassVol,0);
    }
    // 2) 화음 패드: 매 박 첫 부분에 부드러운 코드(sine), 길게 울림
    if(pos===0||pos===4){
      c.chord.forEach((f,i)=>playTone(f,tick*3.6,'sine',0.009,i*0.008));
    }
    // 3) 멜로디 아르페지오: 8분음표 단위로 밝은 triangle 톤
    const mel=BGM_MELODY[bar][pos];
    if(mel>0){
      playTone(mel,tick*0.92,'triangle',0.016,0);
    }
    bgmStep++;
  };
  playStep();
  bgmTimer=setInterval(playStep,tick*1000);
}
document.addEventListener('click',initAudio,{passive:true});
document.addEventListener('touchstart',initAudio,{passive:true});

// ── LEVEL INIT ────────────────────────────────────────────
function startLevel(lv){
  curLv=lv;buildRandomLevels();LD=LEVELS[lv];stopAll();raceOver=false;
  if(mode==='solo'){
    CS=Math.max(52,Math.floor(Math.min((Math.min(window.innerWidth-150,600))/LD.cols,78)));
    P=[mkP(false,'soloCanvas')];
    P[0].grid=mkGrid(LD.fixed);P[0].inv=mkInv(LD.avail);
    document.getElementById('gTitle').textContent=LD.title;
    document.getElementById('gBadge').textContent=LD.badge;
    const cv=document.getElementById('soloCanvas');
    cv.width=LD.cols*CS;cv.height=LD.rows*CS;
    P[0].cv=cv;P[0].ctx=cv.getContext('2d');
    buildPanel(0,'soloPL',false);drawGrid(0);
    showScr('gameScreen');
  } else {
    CS=Math.max(42,Math.floor(Math.min((window.innerWidth/2-70)/LD.cols,56)));
    const isCPU=mode==='1vsCPU';
    P=[mkP(false,'rCanvas0'),mkP(isCPU,'rCanvas1')];
    document.getElementById('rTitle').textContent=LD.title;
    document.getElementById('rStatus').textContent='🏁 준비!';
    document.getElementById('rStatus').style.background='#fff';
    document.getElementById('rStatus').style.color='var(--dark)';
    document.getElementById('p2lbl').textContent=isCPU?'🤖 CPU':'👤 플레이어 2';
    document.getElementById('p2ctrls').style.display=isCPU?'none':'flex';
    document.getElementById('rHeat0').disabled=false;
    document.getElementById('rHeat1').disabled=false;
    document.getElementById('cpuSt').style.display=isCPU?'block':'none';
    document.getElementById('cpuSt').textContent='🤖 CPU 생각 중...';
    [0,1].forEach(i=>{
      P[i].grid=mkGrid(LD.fixed);P[i].inv=mkInv(LD.avail);
      const cv=document.getElementById(P[i].cvId);
      cv.width=LD.cols*CS;cv.height=LD.rows*CS;
      P[i].cv=cv;P[i].ctx=cv.getContext('2d');
      drawGrid(i);
      if(!P[i].isCPU){buildPanel(i,`rPL${i}`,true);cv.onclick=e=>clickGrid(e,i);}
      else{document.getElementById(`rPL${i}`).innerHTML='<span style="color:#bbb;font-size:.82em;">CPU 자동 배치</span>';}
    });
    showScr('raceScreen');
    if(isCPU)setTimeout(()=>runCPU(1),500);
    setTimeout(()=>document.getElementById('rStatus').textContent='🔥 시작!',700);
  }
}
function resetLv(){playUiSound();startLevel(curLv);}
function nextLv(){playUiSound();closeModal();const n=curLv+1;if(n<LEVELS.length)startLevel(n);else showScr('levelScreen');}

// solo canvas listener
document.getElementById('soloCanvas').addEventListener('click',e=>{
  if(mode!=='solo'||!P[0])return;clickGrid(e,0);
});

// ── INTERACTION ───────────────────────────────────────────
function clickGrid(e,pi){
  const p=P[pi];if(!p||p.heating||p.done)return;
  if(raceOver&&mode!=='solo')return;
  const cv=document.getElementById(p.cvId);
  const rect=cv.getBoundingClientRect();
  const mx=(e.clientX-rect.left)*(cv.width/rect.width);
  const my=(e.clientY-rect.top)*(cv.height/rect.height);
  const c=Math.floor(mx/CS),r=Math.floor(my/CS);
  if(!validCell(c,r))return;
  const key=`${c},${r}`;
  if(p.grid[key]&&!p.grid[key].fixed){
    const inv=p.inv.find(x=>x.k===p.grid[key].k);if(inv)inv.n++;
    delete p.grid[key];playDeleteSound();refreshPanel(pi);drawGrid(pi);return;
  }
  if(!p.sel||p.sel.n<=0)return;
  if(p.grid[key]&&p.grid[key].fixed)return;
  p.grid[key]={k:p.sel.k,conns:[...p.sel.conns],color:p.sel.color};
  p.inv[p.sel.idx].n--;p.sel.n=p.inv[p.sel.idx].n;
  playPlaceSound();refreshPanel(pi);if(p.sel.n<=0)p.sel=null;drawGrid(pi);
}
function validCell(c,r){
  if(!LD)return false;
  if(c<0||r<0||c>=LD.cols||r>=LD.rows)return false;
  if(c===LD.src.c&&r===LD.src.r)return false;
  if(c===LD.tgt.c&&r===LD.tgt.r)return false;
  if(LD.blocked&&LD.blocked.some(b=>b.c===c&&b.r===r))return false;
  return true;
}
function clearPG(pi){
  const p=P[pi];if(!p||p.heating)return;
  let removed=false;
  Object.keys(p.grid).forEach(k=>{
    if(!p.grid[k].fixed){const inv=p.inv.find(x=>x.k===p.grid[k].k);if(inv)inv.n++;delete p.grid[k];removed=true;}
  });if(removed)playDeleteSound();refreshPanel(pi);drawGrid(pi);
}
function rotSel(pi){
  const p=P[pi];if(!p||!p.sel)return;
  const nc=rotC(p.sel.conns);p.sel.conns=nc;p.inv[p.sel.idx].conns=[...nc];
  playRotateSound();
  const cid=mode==='solo'?'soloPL':`rPL${pi}`;
  buildPanel(pi,cid,mode!=='solo');
  document.querySelectorAll(`#${cid} [data-idx="${p.sel.idx}"]`).forEach(x=>x.classList.add('sel'));
}

// ── PIECE PANEL ───────────────────────────────────────────
function buildPanel(pi,cid,compact){
  const p=P[pi],wrap=document.getElementById(cid);wrap.innerHTML='';
  const sz=compact?50:60,dsz=compact?38:46;
  p.inv.forEach((item,idx)=>{
    const div=document.createElement('div');
    div.className=compact?'rpi':'pi';div.dataset.idx=idx;
    const cv=document.createElement('canvas');cv.width=dsz;cv.height=dsz;
    drawPrev(cv,item,dsz);div.appendChild(cv);
    const cnt=document.createElement('div');cnt.className='pc';cnt.textContent=item.n;div.appendChild(cnt);
    div.onclick=()=>{
      playSelectSound();
      p.sel={...item,idx};
      wrap.querySelectorAll('[data-idx]').forEach(x=>x.classList.remove('sel'));div.classList.add('sel');
    };
    wrap.appendChild(div);
  });
}
function refreshPanel(pi){
  const cid=mode==='solo'?'soloPL':`rPL${pi}`;
  const p=P[pi],wrap=document.getElementById(cid);if(!wrap)return;
  wrap.querySelectorAll('[data-idx]').forEach(el=>{
    const idx=+el.dataset.idx;
    const cnt=el.querySelector('.pc');if(cnt)cnt.textContent=p.inv[idx].n;
    const cv=el.querySelector('canvas');if(cv)drawPrev(cv,p.inv[idx],cv.width);
    el.classList.toggle('sel',!!(p.sel&&p.sel.idx===idx));
  });
}
// ── PIECE DRAWING ────────────────────────────────────────
// Flat canvas-drawn pieces: tile base + channel that reaches exactly to cell edge
// → perfect alignment on rotation, no 3D perspective distortion

function _drawPiece(ctx, x, y, sz, conns, isFixed) {
  const cx = x + sz/2, cy = y + sz/2;
  const mg = Math.max(3, sz * 0.06);       // tile outer margin
  const cr = Math.max(4, sz * 0.13);       // tile corner radius
  const chW = Math.max(6, sz * 0.28);      // channel width
  const chHalf = chW / 2;

  // ── Tile base ──────────────────────────────────────────
  const baseColor = isFixed ? '#c07030' : '#e0843a';
  const hiColor   = isFixed ? '#d89050' : '#f0a060';
  const shColor   = isFixed ? '#a05820' : '#b86020';
  const rimColor  = isFixed ? 'rgba(80,30,0,0.55)' : 'rgba(120,50,0,0.35)';

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.22)';
  ctx.shadowBlur  = sz * 0.08;
  ctx.shadowOffsetY = sz * 0.04;

  ctx.fillStyle = baseColor;
  rr(ctx, x+mg, y+mg, sz-mg*2, sz-mg*2, cr);
  ctx.fill();

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  // Top highlight gradient
  const grad = ctx.createLinearGradient(x, y, x, y+sz*0.55);
  grad.addColorStop(0, 'rgba(255,255,255,0.30)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  rr(ctx, x+mg, y+mg, sz-mg*2, sz-mg*2, cr);
  ctx.fill();

  // Bottom shadow strip
  const shadGrad = ctx.createLinearGradient(x, y+sz*0.65, x, y+sz-mg);
  shadGrad.addColorStop(0, 'rgba(0,0,0,0)');
  shadGrad.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = shadGrad;
  rr(ctx, x+mg, y+mg, sz-mg*2, sz-mg*2, cr);
  ctx.fill();

  // Border
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 1.5;
  rr(ctx, x+mg, y+mg, sz-mg*2, sz-mg*2, cr);
  ctx.stroke();

  // ── Channel (path groove) ──────────────────────────────
  // Channel goes from center to each connected edge (exactly to edge of cell, not tile)
  // This makes adjacent tiles connect seamlessly
  const chColor  = '#f5f5f5';
  const chShadow = 'rgba(0,0,0,0.22)';
  const chHi     = 'rgba(255,255,255,0.90)';

  // Draw channel segments
  const dirs = [
    [conns[0], cx, cy, cx, y],          // N: to top edge
    [conns[1], cx, cy, x+sz, cy],       // E: to right edge
    [conns[2], cx, cy, cx, y+sz],       // S: to bottom edge
    [conns[3], cx, cy, x, cy],          // W: to left edge
  ];

  ctx.lineCap = 'square';

  dirs.forEach(([on, x1, y1, x2, y2]) => {
    if (!on) return;
    // Shadow under channel
    ctx.strokeStyle = chShadow;
    ctx.lineWidth = chW + 3;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    // Main channel fill
    ctx.strokeStyle = chColor;
    ctx.lineWidth = chW;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    // Highlight stripe
    ctx.strokeStyle = chHi;
    ctx.lineWidth = chW * 0.28;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  });

  // Center cap — covers jagged channel crossing at center
  ctx.fillStyle = chColor;
  ctx.beginPath(); ctx.arc(cx, cy, chHalf + 1, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = chHi;
  ctx.beginPath(); ctx.arc(cx - chHalf*0.15, cy - chHalf*0.2, chHalf*0.45, 0, Math.PI*2); ctx.fill();
}

function drawPrev(cv, item, sz) {
  const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, sz, sz);
  _drawPiece(ctx, 0, 0, sz, item.conns, false);
}

function drawCell(ctx, c, r, pc) {
  _drawPiece(ctx, c*CS, r*CS, CS, pc.conns, pc.fixed);
}
// ── DRAW GRID ─────────────────────────────────────────────
function drawGrid(pi){
  const p=P[pi];if(!p||!p.cv)return;
  const ctx=p.ctx,w=p.cv.width,h=p.cv.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#d9eef5';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#b0cfe0';ctx.lineWidth=1;
  for(let c=0;c<=LD.cols;c++){ctx.beginPath();ctx.moveTo(c*CS,0);ctx.lineTo(c*CS,h);ctx.stroke();}
  for(let r=0;r<=LD.rows;r++){ctx.beginPath();ctx.moveTo(0,r*CS);ctx.lineTo(w,r*CS);ctx.stroke();}
  if(LD.blocked)LD.blocked.forEach(b=>{
    const x=b.c*CS,y=b.r*CS;ctx.fillStyle='#bdd0d8';ctx.fillRect(x+2,y+2,CS-4,CS-4);
    ctx.fillStyle='#6a8a9a';ctx.font=`bold ${Math.floor(CS*.44)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✖',x+CS/2,y+CS/2);
  });
  Object.entries(p.grid).forEach(([key,pc])=>{
    if(!pc)return;const[c,r]=key.split(',').map(Number);drawCell(ctx,c,r,pc);
  });
  p.heat.forEach((cell,i)=>{
    const al=0.28+0.52*(i/Math.max(p.heat.length,1));
    ctx.fillStyle=`rgba(255,95,15,${al})`;
    rr(ctx,cell.c*CS+6,cell.r*CS+6,CS-12,CS-12,8);ctx.fill();
  });
  (function(){
    const isz=CS*0.82;
    const srcImg=FLAME_IMG;
    const tgtImg=LEVEL_IMGS[LD.goalImgKey];
    const sx=LD.src.c*CS+(CS-isz)/2,sy=LD.src.r*CS+(CS-isz)/2;
    const tx=LD.tgt.c*CS+(CS-isz)/2,ty=LD.tgt.r*CS+(CS-isz)/2;
    const fs=Math.floor(CS*.58);
    if(srcImg&&srcImg.complete&&srcImg.naturalWidth){
      ctx.drawImage(srcImg,sx,sy,isz,isz);
    } else {
      ctx.font=`${fs}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('🔥',LD.src.c*CS+CS/2,LD.src.r*CS+CS/2);
    }
    if(tgtImg&&tgtImg.complete&&tgtImg.naturalWidth){
      ctx.drawImage(tgtImg,tx,ty,isz,isz);
    } else {
      ctx.font=`${fs}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(LD.goal,LD.tgt.c*CS+CS/2,LD.tgt.r*CS+CS/2);
    }
  })();
  ctx.font=`bold ${Math.floor(CS*.19)}px sans-serif`;
  ctx.fillStyle='#c0392b';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('열 출발',LD.src.c*CS+CS/2,LD.src.r*CS+CS-4);
  ctx.fillStyle='#27ae60';
  ctx.fillText('목표',LD.tgt.c*CS+CS/2,LD.tgt.r*CS+CS-4);
  if(p.done){
    ctx.fillStyle=p.ok?'rgba(6,214,160,.15)':'rgba(200,30,30,.1)';ctx.fillRect(0,0,w,h);
    ctx.font=`bold ${Math.floor(CS*.85)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(p.ok?'🎉':'❌',w/2,h/2);
  }
}
// ── PATH FIND ─────────────────────────────────────────────
function findPath(pi){
  const p=P[pi];
  function gc(c,r){
    const k=`${c},${r}`;
    if(c===LD.src.c&&r===LD.src.r)return[0,1,0,1];
    if(c===LD.tgt.c&&r===LD.tgt.r)return[1,1,1,1];
    if(p.grid[k])return p.grid[k].conns;return null;
  }
  const vis=new Set(),q=[{c:LD.src.c,r:LD.src.r,path:[{c:LD.src.c,r:LD.src.r}]}];
  vis.add(`${LD.src.c},${LD.src.r}`);
  while(q.length){
    const{c,r,path}=q.shift(),cn=gc(c,r);if(!cn)continue;
    for(let d=0;d<4;d++){
      if(!cn[d])continue;
      const nc=c+DX[d],nr=r+DY[d],nk=`${nc},${nr}`;
      if(vis.has(nk))continue;if(nc<0||nr<0||nc>=LD.cols||nr>=LD.rows)continue;
      const ncn=gc(nc,nr);if(!ncn||!ncn[OPP[d]])continue;
      const np=[...path,{c:nc,r:nr}];
      if(nc===LD.tgt.c&&nr===LD.tgt.r)return{path:np,ok:true};
      vis.add(nk);q.push({c:nc,r:nr,path:np});
    }
  }
  // partial
  const v2=new Set(),q2=[{c:LD.src.c,r:LD.src.r}],part=[];v2.add(`${LD.src.c},${LD.src.r}`);
  while(q2.length){
    const{c,r}=q2.shift();part.push({c,r});const cn=gc(c,r);if(!cn)continue;
    for(let d=0;d<4;d++){
      if(!cn[d])continue;const nc=c+DX[d],nr=r+DY[d],nk=`${nc},${nr}`;
      if(v2.has(nk))continue;if(nc<0||nr<0||nc>=LD.cols||nr>=LD.rows)continue;
      const ncn=gc(nc,nr);if(!ncn||!ncn[OPP[d]])continue;v2.add(nk);q2.push({c:nc,r:nr});
    }
  }
  return{path:part,ok:false};
}

// ── HEAT ANIMATION ────────────────────────────────────────
function heatPlayer(pi){
  const p=P[pi];if(!p||p.heating||p.done)return;
  if(raceOver&&mode!=='solo')return;
  playHeatSound();
  p.heating=true;p.heat=[];
  const btnId=mode==='solo'?'soloHeatBtn':`rHeat${pi}`;
  const btn=document.getElementById(btnId);if(btn)btn.disabled=true;
  const res=findPath(pi);
  let i=0;
  function step(){
    if(i<res.path.length){p.heat=res.path.slice(0,i+1);drawGrid(pi);i++;p.hanim=setTimeout(step,280);}
    else{p.heating=false;p.done=true;p.ok=res.ok;drawGrid(pi);if(btn)btn.disabled=false;
      if(mode==='solo')showSoloModal(res.ok);else handleRace(pi,res.ok);}
  }
  step();
}

// ── SOLO MODAL ────────────────────────────────────────────
function showSoloModal(ok){
  if(ok)playSuccessSound();else playFailSound();
  document.getElementById('mIcon').textContent=ok?'🎉':'🤔';
  document.getElementById('mTitle').textContent=ok?`${LD.gLabel}까지 열이 도착했어요!`:'길이 끊겼어요!';
  document.getElementById('mStars').textContent=ok?'⭐⭐⭐':'⭐';
  document.getElementById('mMsg').textContent=ok?`열이 고체 조각을 따라 이동해서 ${LD.gLabel}까지 도착했어요!`:`길이 끊겨 있어서 열이 끝까지 이동하지 못했어요. 다시 배치해 보세요!`;
  document.getElementById('mConcept').innerHTML=ok
    ?`✅ <strong>전도</strong>: 고체에서는 온도가 높은 곳에서 낮은 곳으로 열이 이동해요.<br>✅ 고체 길이 이어져 있을 때만 전도가 일어나요.`
    :`❌ 고체가 끊겨 있으면 <strong>전도가 일어나지 않아요.</strong><br>💡 조각을 다시 연결해 보세요.`;
  document.getElementById('mNext').style.display=curLv<LEVELS.length-1?'':'none';
  document.getElementById('mHome').style.display=(ok&&curLv===LEVELS.length-1)?'':'none';
  document.getElementById('modal').classList.add('active');syncModalBodyLock();
}
function closeModal(){playUiSound();document.getElementById('modal').classList.remove('active');syncModalBodyLock();}

// [수정] 모달 열기/닫기 스크립트 추가
function syncModalBodyLock(){document.body.style.overflow=document.querySelector('.mo.active')?'hidden':'';}
function openGuideModal(){const m=document.getElementById('guideModal');m.classList.add('active');m.setAttribute('aria-hidden','false');syncModalBodyLock();}
function closeGuideModal(){playUiSound();const m=document.getElementById('guideModal');m.classList.remove('active');m.setAttribute('aria-hidden','true');syncModalBodyLock();}


// ── RACE RESULT ───────────────────────────────────────────
function handleRace(pi,ok){
  if(ok&&!raceOver){
    raceOver=true;stopAll();
    P.forEach((pp,i)=>{if(i!==pi){pp.heating=false;if(pp.hanim)clearTimeout(pp.hanim);}});
    const st=document.getElementById('rStatus');
    let msg;
    if(pi===0)msg=mode==='1vsCPU'?'🎉 내가 이겼어요!':'🎉 플레이어 1 승리!';
    else msg=mode==='1vsCPU'?'🤖 CPU 승리!':'🎉 플레이어 2 승리!';
    st.textContent=msg;st.style.background=pi===0?'var(--p1)':'var(--p2)';st.style.color='#fff';
    setTimeout(()=>showRaceModal(pi),900);
  } else if(!ok){
    if(P.every(pp=>pp.done)&&!raceOver){
      raceOver=true;
      document.getElementById('rStatus').textContent='🤝 무승부!';
      setTimeout(()=>showRaceModal(-1),900);
    }
  }
}
function showRaceModal(wi){
  if(wi===0)playSuccessSound();else playFailSound();
  const icons=['🏆',mode==='1vsCPU'?'🤖':'🏆'];
  const titles=[mode==='1vsCPU'?'CPU를 이겼어요!':'플레이어 1 승리!',mode==='1vsCPU'?'CPU가 더 빨랐어요!':'플레이어 2 승리!'];
  const msgs=[mode==='1vsCPU'?'열길을 더 빨리 연결했어요! 대단해요!':'빠르게 열길을 이었어요!',mode==='1vsCPU'?'아쉽지만 다시 도전해 보세요!':'상대방을 이겼어요!'];
  document.getElementById('mIcon').textContent=wi<0?'🤝':(icons[wi]||'🏆');
  document.getElementById('mTitle').textContent=wi<0?'둘 다 연결 실패!':(titles[wi]||'');
  document.getElementById('mStars').textContent=wi===0?'⭐⭐⭐':(wi===1?'⭐⭐':'⭐');
  document.getElementById('mMsg').textContent=wi<0?'길이 끊겨서 열이 이동하지 못했어요.':(msgs[wi]||'');
  document.getElementById('mConcept').innerHTML=`✅ <strong>전도</strong>: 고체 길이 이어져야 열이 이동할 수 있어요.<br>✅ 먼저 완성할수록 열이 목표에 빨리 도착해요!`;
  document.getElementById('mNext').style.display=curLv<LEVELS.length-1?'':'none';
  document.getElementById('mHome').style.display=(wi===0&&curLv===LEVELS.length-1)?'':'none';
  document.getElementById('modal').classList.add('active');syncModalBodyLock();
}

// ── CPU SOLVER ────────────────────────────────────────────
function cpuBFS(){
  const vis=new Set(),q=[{c:LD.src.c,r:LD.src.r,path:[{c:LD.src.c,r:LD.src.r}]}];
  vis.add(`${LD.src.c},${LD.src.r}`);
  while(q.length){
    const{c,r,path}=q.shift();
    for(let d=0;d<4;d++){
      const nc=c+DX[d],nr=r+DY[d],nk=`${nc},${nr}`;
      if(vis.has(nk))continue;if(nc<0||nr<0||nc>=LD.cols||nr>=LD.rows)continue;
      if(LD.blocked&&LD.blocked.some(b=>b.c===nc&&b.r===nr))continue;
      vis.add(nk);const np=[...path,{c:nc,r:nr}];
      if(nc===LD.tgt.c&&nr===LD.tgt.r)return np;q.push({c:nc,r:nr,path:np});
    }
  }
  return null;
}
function pathToPlacements(path){
  const fxd=new Set(LD.fixed.map(f=>`${f.c},${f.r}`));
  return path.slice(1,-1).map((cell,i)=>{
    const k=`${cell.c},${cell.r}`;if(fxd.has(k))return null;
    const prev=path[i],next=path[i+2];
    const ind=dir(prev,cell),outd=dir(cell,next);
    const need=[0,0,0,0];need[OPP[ind]]=1;need[outd]=1;
    const m=connsMatch(need);return m?{c:cell.c,r:cell.r,...m}:null;
  }).filter(Boolean);
}
function runCPU(pi){
  const path=cpuBFS();if(!path)return;
  const pls=pathToPlacements(path);
  let i=0;
  function next(){
    if(raceOver)return;
    if(i>=pls.length){
      document.getElementById('cpuSt').textContent='🤖 가열 준비 중...';
      const t=setTimeout(()=>{if(!raceOver){heatPlayer(pi);document.getElementById('cpuSt').style.display='none';}},700);
      cpuTmrs.push(t);return;
    }
    const{c,r,k,conns,color}=pls[i];
    P[pi].grid[`${c},${r}`]={k,conns:[...conns],color};drawGrid(pi);
    document.getElementById(`rPL${pi}`).innerHTML=`<span style="color:#bbb;font-size:.82em;">CPU 배치 중 (${i+1}/${pls.length})</span>`;
    i++;
    const t=setTimeout(next,1000+Math.random()*600);cpuTmrs.push(t);
  }
  cpuTmrs.push(setTimeout(next,1600));
}

// [수정] 게임 방법 모달 이벤트 바인딩
document.addEventListener('click',e=>{
  const gm=document.getElementById('guideModal');
  if(gm.classList.contains('active') && e.target===gm) closeGuideModal();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(document.getElementById('guideModal').classList.contains('active')) closeGuideModal();
    else if(document.getElementById('modal').classList.contains('active')) closeModal();
  }
});

