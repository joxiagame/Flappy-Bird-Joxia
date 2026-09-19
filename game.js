/* ============================================================
   FLAPPY JOXIA — version qualité (modes, skins, pièces, sons)
   ============================================================ */

/* ---------- Firebase ---------- */
const firebaseConfig = {
    apiKey: "AIzaSyCPecKQH6DURfYitjY4bXMeW0URLrcNnsI",
    authDomain: "joxiahub-2928b.firebaseapp.com",
    databaseURL: "https://joxiahub-2928b-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "joxiahub-2928b",
    storageBucket: "joxiahub-2928b.firebasestorage.app",
    messagingSenderId: "303698595695",
    appId: "1:303698595695:web:5c99c2cb2a9ea88e36a29a"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

/* ---------- Joueur / accès Hub ---------- */
const urlParams = new URLSearchParams(location.search);
const currentPlayer = urlParams.get('player');
if (!currentPlayer || currentPlayer === "null") {
    document.getElementById('game-content').classList.add('hidden');
    document.getElementById('access-denied').classList.remove('hidden');
}
const $ = id => document.getElementById(id);
if (currentPlayer) $('topNavUser').innerText = currentPlayer;

/* ---------- Sauvegarde locale ---------- */
const SAVE_KEY = 'flappyJoxia';
const defaultSave = { coins: 0, best: {}, unlocked: ['classic', 'phoenix'], skin: 'classic', biome: 'prairie' };
let save = loadSave();
function loadSave() {
    try {
        const s = JSON.parse(localStorage.getItem(SAVE_KEY));
        if (!s) return { ...defaultSave };
        return { ...defaultSave, ...s, best: s.best || {},
                 unlocked: Array.from(new Set([...(defaultSave.unlocked), ...(s.unlocked || [])])) };
    } catch (e) { return { ...defaultSave }; }
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

/* ---------- Modes ---------- */
const MODES = {
    classic: { name:"Classique", emo:"🐤", desc:"L'équilibre parfait",
               grav:.42, jump:-7.6, speed:2.9, gap:165, spawn:100, coin:1 },
    rapide:  { name:"Rapide",    emo:"⚡", desc:"Vitesse ×1.4, pièces ×2",
               grav:.46, jump:-8.0, speed:4.1, gap:170, spawn:82,  coin:2 },
    extreme: { name:"Extrême",   emo:"🔥", desc:"Passages serrés, pièces ×3",
               grav:.5,  jump:-8.2, speed:3.4, gap:128, spawn:92,  coin:3 },
    zen:     { name:"Zen",       emo:"🧘", desc:"Large & tranquille",
               grav:.34, jump:-6.6, speed:2.3, gap:215, spawn:120, coin:1 }
};
let mode = 'classic';

/* ---------- Skins (oiseaux) ---------- */
const SKINS = {
    classic: { name:"Piou",        body:"#ffd23f", belly:"#fff0b0", wing:"#f2a71b", beak:"#ff8a00", outline:"#8a5200", price:0 },
    phoenix: { name:"Phénix",      body:"#ff5a3c", belly:"#ffb27a", wing:"#c02a12", beak:"#ffb300", outline:"#7a1c0a", price:0,  glow:true },
    ice:     { name:"Givre",       body:"#66d4ff", belly:"#dff5ff", wing:"#2e93d6", beak:"#ff9a3c", outline:"#155a86", price:60 },
    robin:   { name:"Rouge-gorge", body:"#8a5a3c", belly:"#ff8a52", wing:"#5f3a24", beak:"#2a1f14", outline:"#3a2416", price:100 },
    neon:    { name:"Néon",        body:"#9dff2f", belly:"#dcff9e", wing:"#4fb800", beak:"#ff2fd0", outline:"#2f6b00", price:160, glow:true },
    gold:    { name:"Royal",       body:"#ffd700", belly:"#fff4b0", wing:"#c9a400", beak:"#ff8a00", outline:"#8a6a00", price:260, crown:true },
    shadow:  { name:"Ombre",       body:"#565b6e", belly:"#8b90a3", wing:"#33363f", beak:"#ff5a5a", outline:"#1c1e26", price:380, angry:true },
    rainbow: { name:"Arc-en-ciel", body:"rainbow", belly:"#ffffff", wing:"#ff7ac0", beak:"#ff8a00", outline:"#7a2f9a", price:560, glow:true, sparkle:true }
};

/* ---------- Décors / biomes ---------- */
const BIOMES = {
    prairie: { name:"Prairie",  emo:"🌤️",
        sky:['#8fd3e6','#d3eef7'], sun:'#fff3b0', glow:'rgba(255,240,160,.55)', sunY:96, moon:false, stars:false, clouds:true,
        mtn:'#a9dcc6', hill:'#8ed06a', hill2:'#67b54c', ground:'#e6d79c', groundDk:'#cdbd7f', grass:'#79c65a',
        pipe:['#57ad2c','#7ed63f','#4b9724'] },
    sunset:  { name:"Coucher",  emo:"🌇",
        sky:['#ff9d57','#ffd7a1'], sun:'#fff0b0', glow:'rgba(255,150,80,.5)', sunY:210, moon:false, stars:false, clouds:true,
        mtn:'#c98f96', hill:'#a86a7e', hill2:'#7d4d66', ground:'#c98f5a', groundDk:'#b07a49', grass:'#d98f55',
        pipe:['#c0554e','#e8776a','#9c3f3a'] },
    night:   { name:"Nuit",     emo:"🌙",
        sky:['#141b45','#333a66'], sun:'#eef3ff', glow:'rgba(220,230,255,.3)', sunY:90, moon:true, stars:true, clouds:false,
        mtn:'#2b3466', hill:'#212a55', hill2:'#161d3c', ground:'#2b2f52', groundDk:'#232746', grass:'#3c9b6a',
        pipe:['#2f8f57','#49b877','#237046'] }
};

/* ---------- Canvas / dimensions logiques ---------- */
const canvas = $('canvas'), ctx = canvas.getContext('2d');
const W = 360, H = 560, GROUND = 74;
function fitCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

/* ---------- État de jeu ---------- */
let state = 'menu';           // menu | countdown | playing | dead
let bird, pipes, particles, clouds, groundX = 0, frame = 0, score = 0, cfg = MODES.classic;
let biome = (save && save.biome && BIOMES[save.biome]) ? save.biome : 'prairie';
let par = { far:0, mid:0, near:0 };
const STARS = Array.from({length:44}, () => ({ x:Math.random()*W, y:Math.random()*(H*0.5), r:Math.random()*1.3+.35, t:Math.random()*6.28 }));

function shade(hex, amt){            // amt<0 assombrit, amt>0 éclaircit
    if (typeof hex!=='string' || hex[0]!=='#') return hex;
    let n=parseInt(hex.slice(1),16), r=(n>>16)&255, g=(n>>8)&255, b=n&255;
    const f = amt<0?0:255, p=Math.min(1,Math.abs(amt));
    r=Math.round(r+(f-r)*p); g=Math.round(g+(f-g)*p); b=Math.round(b+(f-b)*p);
    return `rgb(${r},${g},${b})`;
}

function resetWorld() {
    cfg = MODES[mode];
    bird = { x: 92, y: H*0.42, vy: 0, r: 15, rot: 0, flapT: 0 };
    pipes = []; particles = []; score = 0; frame = 0;
    par = { far:0, mid:0, near:0 };
    $('score').textContent = '0';
    clouds = Array.from({length:5}, () => ({
        x: Math.random()*W, y: 40+Math.random()*160,
        s: .25+Math.random()*.45, r: 20+Math.random()*24
    }));
}

/* ---------- Son (Web Audio) ---------- */
let AC = null;
function actx(){ if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
function beep(freq, dur, type='square', vol=.06, slide=0){
    const a = actx(); if(!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40,freq+slide), a.currentTime+dur);
    g.gain.value = vol; g.gain.exponentialRampToValueAtTime(.0001, a.currentTime+dur);
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime+dur);
}
const sFlap  = () => beep(520, .12, 'square', .05, 120);
const sScore = () => { beep(660,.08,'triangle',.07); setTimeout(()=>beep(880,.1,'triangle',.07),70); };
const sCrash = () => { beep(200,.25,'sawtooth',.09,-150); };
const sCoin  = () => { beep(880,.07,'square',.07); setTimeout(()=>beep(1180,.1,'square',.07),60); };

/* ---------- Dessin ---------- */
function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

function hillLayer(color, baseY, amp, off, wl){
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, H);
    const o = ((off % wl)+wl)%wl;
    ctx.lineTo(0, baseY);
    for(let x=-o; x<=W+wl; x+=wl) ctx.quadraticCurveTo(x+wl/2, baseY-amp, x+wl, baseY);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}
function puff(x,y,r){ ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.arc(x+r*.9,y+r*.28,r*.75,0,7); ctx.arc(x-r*.9,y+r*.32,r*.7,0,7); ctx.arc(x+r*.2,y-r*.3,r*.62,0,7); ctx.fill(); }

function drawBackground(){
    const b = BIOMES[biome];
    // ciel
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,b.sky[0]); g.addColorStop(1,b.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // avance de la parallaxe
    if (state==='playing'){ par.far -= cfg.speed*0.12; par.mid -= cfg.speed*0.32; par.near -= cfg.speed*0.55; }

    // étoiles (nuit)
    if (b.stars){
        STARS.forEach(s=>{
            const tw = .5 + .5*Math.abs(Math.sin(frame*0.03 + s.t));
            ctx.fillStyle = `rgba(255,255,255,${.35+tw*.5})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r*(.7+tw*.5), 0, 7); ctx.fill();
        });
    }
    // soleil / lune + halo
    ctx.fillStyle = b.glow; ctx.beginPath(); ctx.arc(285, b.sunY, 66, 0, 7); ctx.fill();
    ctx.fillStyle = b.sun;  ctx.beginPath(); ctx.arc(285, b.sunY, 38, 0, 7); ctx.fill();
    if (b.moon){ ctx.fillStyle = b.sky[0]; ctx.beginPath(); ctx.arc(272, b.sunY-10, 32, 0, 7); ctx.fill(); }

    // montagnes lointaines
    hillLayer(b.mtn, H-GROUND+16, 96, par.far, 210);
    // collines (2 couches)
    hillLayer(shade(b.hill,-.06), H-GROUND+6, 54, par.mid*1.25, 150);
    hillLayer(b.hill,             H-GROUND+2, 40, par.mid,      110);

    // nuages
    if (b.clouds){
        ctx.fillStyle = biome==='sunset' ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.9)';
        clouds.forEach(c=>{
            if (state==='playing') c.x -= c.s;
            if (c.x < -c.r*2){ c.x = W+c.r*2; c.y = 40+Math.random()*160; }
            puff(c.x, c.y, c.r);
        });
    }
    // buisson près du sol (couche rapide)
    hillLayer(shade(b.hill2,0), H-GROUND-2, 26, par.near, 90);
}

function drawPipe(p){
    const w = 60, capH = 18, pc = BIOMES[biome].pipe;
    const grad = ctx.createLinearGradient(p.x,0,p.x+w,0);
    grad.addColorStop(0,pc[0]); grad.addColorStop(.42,pc[1]); grad.addColorStop(1,pc[2]);
    const drawSeg = (x,y,ww,hh)=>{
        ctx.fillStyle=grad; ctx.strokeStyle='rgba(0,0,0,.28)'; ctx.lineWidth=2;
        roundRect(x,y,ww,hh,6); ctx.fill(); ctx.stroke();
        // reflet
        ctx.fillStyle='rgba(255,255,255,.22)'; roundRect(x+6,y+3,6,Math.max(0,hh-6),3); ctx.fill();
    };
    // haut
    drawSeg(p.x, -4, w, p.y+4);
    drawSeg(p.x-4, p.y-capH, w+8, capH);
    // bas
    const by = p.y + cfg.gap;
    drawSeg(p.x, by, w, H-GROUND-by);
    drawSeg(p.x-4, by, w+8, capH);
}

function birdColors(){
    const sk = SKINS[save.skin] || SKINS.classic;
    let body = sk.body;
    if (body === 'rainbow') body = `hsl(${(frame*4)%360},85%,62%)`;
    return { ...sk, body };
}
function bodyEllipse(R){ ctx.beginPath(); ctx.ellipse(0,0,R+1.5,R,0,0,7); ctx.closePath(); }

function drawBird(){
    const sk = birdColors();
    const R = bird.r, OL = sk.outline;
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot);

    if (sk.glow){ ctx.shadowColor = sk.body; ctx.shadowBlur = 16; }

    // ---- queue (derrière) ----
    ctx.fillStyle = shade(sk.wing,-.08); ctx.strokeStyle = OL; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-R+3,-3); ctx.lineTo(-R-9,-8); ctx.lineTo(-R-7,-1);
    ctx.lineTo(-R-10,5); ctx.lineTo(-R+3,5); ctx.closePath();
    ctx.fill(); ctx.stroke();

    // ---- corps ----
    ctx.fillStyle = sk.body; bodyEllipse(R); ctx.fill();
    if (sk.glow) ctx.shadowBlur = 0;
    // reflet clair (haut-gauche)
    let hg = ctx.createRadialGradient(-5,-6,2,-3,-3,R+5);
    hg.addColorStop(0,'rgba(255,255,255,.5)'); hg.addColorStop(.65,'rgba(255,255,255,0)');
    ctx.fillStyle = hg; bodyEllipse(R); ctx.fill();
    // ombre (bas-droite)
    let sg = ctx.createRadialGradient(6,8,2,4,5,R+7);
    sg.addColorStop(0,'rgba(0,0,0,.16)'); sg.addColorStop(.7,'rgba(0,0,0,0)');
    ctx.fillStyle = sg; bodyEllipse(R); ctx.fill();
    // contour
    ctx.strokeStyle = OL; ctx.lineWidth = 2.4; bodyEllipse(R); ctx.stroke();

    // ---- ventre ----
    ctx.fillStyle = sk.belly;
    ctx.beginPath(); ctx.ellipse(2,5,R*0.66,R*0.6,0,-0.35,Math.PI+0.35); ctx.fill();

    // ---- aile animée ----
    let a = (state==='playing'||state==='countdown') ? Math.sin(bird.flapT) : Math.sin(frame*0.1)*0.6;
    ctx.save(); ctx.translate(-1,1); ctx.rotate(-0.35 + a*0.85);
    ctx.fillStyle = sk.wing; ctx.strokeStyle = OL; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(-4,3,9.5,6.2,0.2,0,7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shade(sk.wing,-.18);
    ctx.beginPath(); ctx.ellipse(-5,4,6,3.6,0.2,0,7); ctx.fill();
    ctx.restore();

    // ---- bec (2 parties) ----
    ctx.strokeStyle = OL; ctx.lineWidth = 1.6;
    ctx.fillStyle = sk.beak;
    ctx.beginPath(); ctx.moveTo(R-4,-3.5); ctx.lineTo(R+11,-1.5); ctx.lineTo(R-2,1.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shade(sk.beak,-.28);
    ctx.beginPath(); ctx.moveTo(R-4,2.5); ctx.lineTo(R+9,3); ctx.lineTo(R-2,5.5); ctx.closePath(); ctx.fill(); ctx.stroke();

    // ---- joue rosée ----
    if (!sk.angry){ ctx.fillStyle='rgba(255,120,120,.33)'; ctx.beginPath(); ctx.arc(4,4,3.2,0,7); ctx.fill(); }

    // ---- œil ----
    ctx.fillStyle = '#fff'; ctx.strokeStyle = OL; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(7,-5.5,5.6,0,7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#20232b'; ctx.beginPath(); ctx.arc(8.8,-5.5,2.7,0,7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(7.8,-6.8,1.2,0,7); ctx.fill();
    if (sk.angry){ ctx.strokeStyle = OL; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(1.5,-11); ctx.lineTo(10,-7.5); ctx.stroke(); }

    // ---- couronne (Royal) ----
    if (sk.crown){
        const cy = -R-3; ctx.fillStyle='#ffd700'; ctx.strokeStyle='#a9810a'; ctx.lineWidth=1.2;
        ctx.beginPath();
        ctx.moveTo(-7,cy+6); ctx.lineTo(-7,cy+1); ctx.lineTo(-3,cy+4); ctx.lineTo(0,cy-3);
        ctx.lineTo(3,cy+4); ctx.lineTo(7,cy+1); ctx.lineTo(7,cy+6); ctx.closePath();
        ctx.fill(); ctx.stroke();
    }
    ctx.restore();

    // ---- étincelles (Arc-en-ciel) ----
    if (sk.sparkle && state==='playing' && frame%6===0)
        spawnParticles(bird.x-8, bird.y+(Math.random()-.5)*14, `hsl(${(frame*9)%360},90%,66%)`, 1);
}

function spawnParticles(x,y,color,n){
    for(let i=0;i<n;i++) particles.push({
        x,y, vx:(Math.random()-.5)*3, vy:(Math.random()-.5)*3-1,
        life:1, col:color, sz:2+Math.random()*3
    });
}
function drawParticles(){
    for(let i=particles.length-1;i>=0;i--){
        const p=particles[i];
        p.x+=p.vx; p.y+=p.vy; p.vy+=.12; p.life-=.03;
        if(p.life<=0){ particles.splice(i,1); continue; }
        ctx.globalAlpha=Math.max(0,p.life); ctx.fillStyle=p.col;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.sz,0,7); ctx.fill();
    }
    ctx.globalAlpha=1;
}

function drawGround(){
    const b = BIOMES[biome];
    ctx.fillStyle=b.ground; ctx.fillRect(0,H-GROUND,W,GROUND);
    ctx.fillStyle=b.groundDk;
    if(state==='playing') groundX=(groundX-cfg.speed)%24;
    for(let x=groundX; x<W; x+=24){ ctx.fillRect(x,H-GROUND,12,GROUND); }
    // bande d'herbe + liseré
    ctx.fillStyle=b.grass; ctx.fillRect(0,H-GROUND-7,W,9);
    ctx.fillStyle=shade(b.grass,-.18); ctx.fillRect(0,H-GROUND+2,W,3);
}

/* ---------- Boucle ---------- */
let shake = 0;
function loop(){
    const dpr = canvas.width / W;
    ctx.setTransform(dpr,0,0,dpr,0,0);

    if (shake>0){ ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake); shake*=.9; if(shake<.4)shake=0; }

    drawBackground();

    if (state==='playing'){
        // physique
        bird.vy += cfg.grav; bird.y += bird.vy;
        bird.rot = Math.max(-.5, Math.min(1.4, bird.vy*.06));
        bird.flapT += .3;
        frame++;

        if (frame % cfg.spawn === 0){
            const margin = 60;
            const y = margin + Math.random()*(H-GROUND-cfg.gap-margin*2);
            pipes.push({ x: W+10, y, scored:false });
        }
        pipes.forEach(p=>{
            p.x -= cfg.speed;
            // collision (ne PAS return : la boucle doit toujours atteindre requestAnimationFrame)
            const w=60;
            if (bird.x+bird.r-3 > p.x && bird.x-bird.r+3 < p.x+w){
                if (bird.y-bird.r+2 < p.y || bird.y+bird.r-2 > p.y+cfg.gap) die();
            }
            if (!p.scored && p.x+w < bird.x){
                p.scored=true; score++; $('score').textContent=score;
                spawnParticles(bird.x+10,bird.y,'#ffd23f',8); sScore();
            }
        });
        pipes = pipes.filter(p=>p.x>-70);
        if (bird.y+bird.r > H-GROUND || bird.y-bird.r < 0) die();
    }

    pipes.forEach(drawPipe);
    drawParticles();
    drawGround();
    drawBird();

    requestAnimationFrame(loop);
}

/* ---------- Actions ---------- */
function flap(){
    if (state!=='playing') return;
    bird.vy = cfg.jump; bird.flapT = 0; sFlap();
    spawnParticles(bird.x-8, bird.y+6, 'rgba(255,255,255,.9)', 3);
}

function startCountdown(){
    hideAllScreens();
    resetWorld();
    state='countdown';
    $('score').classList.add('on');
    $('flapBtn').classList.remove('hidden');
    let n=3; const cd=$('countdown'), num=$('cd-num');
    cd.classList.remove('hidden'); num.textContent=n; num.style.animation='none'; void num.offsetWidth; num.style.animation='';
    const iv=setInterval(()=>{
        n--;
        if(n<=0){ clearInterval(iv); cd.classList.add('hidden'); state='playing'; }
        else { num.textContent=n; num.style.animation='none'; void num.offsetWidth; num.style.animation='pop .5s ease'; }
    },700);
}

function die(){
    if (state!=='playing') return;
    state='dead'; shake=10; sCrash();
    spawnParticles(bird.x,bird.y,'#ff5a5a',18);
    $('flapBtn').classList.add('hidden');
    $('score').classList.remove('on');

    // pièces
    const earned = score * cfg.coin;
    save.coins += earned;
    // record par mode
    const prevBest = save.best[mode] || 0;
    const isRecord = score > prevBest;
    if (isRecord) save.best[mode] = score;
    persist();
    refreshCoins();

    // médaille
    const m = score>=40?'🏆':score>=25?'🥇':score>=12?'🥈':score>=4?'🥉':'💀';
    $('medal').textContent = m;
    $('finalScore').textContent = score;
    $('finalBest').textContent = save.best[mode]||0;
    $('earnedCoins').textContent = earned;
    setTimeout(()=>{ $('gameover').classList.remove('hidden'); }, 450);

    // Firebase (meilleur score global du joueur)
    saveScoreCloud(score);
}

function saveScoreCloud(sc){
    if (sc<=0 || !currentPlayer || currentPlayer==="null") return;
    const path='games/FLAPPY_BIRD/scores';
    database.ref(path).orderByChild('name').equalTo(currentPlayer).once('value', snap=>{
        const val=snap.val();
        if(val){ const k=Object.keys(val)[0];
            if(Number(sc)>Number(val[k].score)) database.ref(`${path}/${k}`).update({score:Number(sc),date:Date.now()});
        } else database.ref(path).push({name:currentPlayer,score:Number(sc),date:Date.now()});
    });
}
function loadLeaderboard(){
    const box=$('leaderboard'); box.innerHTML='<p class="muted">Chargement…</p>';
    database.ref('games/FLAPPY_BIRD/scores').once('value', snap=>{
        const v=snap.val();
        const list=v?Object.values(v).sort((a,b)=>b.score-a.score).slice(0,10):[];
        box.innerHTML = list.length ? list.map((s,i)=>{
            const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`;
            return `<div class="score-row"><span class="rk">${medal}</span><span class="nm">${escapeHtml(s.name)}</span><span class="pts">${s.score}</span></div>`;
        }).join('') : '<p class="muted">Aucun score pour l\'instant.</p>';
    });
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

/* ---------- UI : écrans ---------- */
function hideAllScreens(){ ['menu','shop','board','gameover'].forEach(id=>$(id).classList.add('hidden')); }
function showMenu(){
    hideAllScreens(); state='menu';
    $('flapBtn').classList.add('hidden'); $('score').classList.remove('on');
    resetWorld();
    $('menu').classList.remove('hidden');
    buildBiomes();
    updateBestLine();
}
function refreshCoins(){ $('coinCount').textContent=save.coins; const sc=$('shopCoins'); if(sc) sc.textContent=save.coins; }
function updateBestLine(){ $('bestModeLabel').textContent=MODES[mode].name; $('bestScore').textContent=save.best[mode]||0; }

/* modes */
function buildModes(){
    const grid=$('modeGrid'); grid.innerHTML='';
    Object.entries(MODES).forEach(([id,m])=>{
        const el=document.createElement('div');
        el.className='mode-card'+(id===mode?' sel':'');
        el.innerHTML=`<span class="mode-emo">${m.emo}</span><span class="mode-name">${m.name}</span><span class="mode-desc">${m.desc}</span>`;
        el.onclick=()=>{ mode=id; buildModes(); updateBestLine(); };
        grid.appendChild(el);
    });
}

/* décors */
function buildBiomes(){
    const row=$('biomeRow'); if(!row) return; row.innerHTML='';
    Object.entries(BIOMES).forEach(([id,b])=>{
        const el=document.createElement('button');
        el.className='biome-chip'+(id===biome?' sel':'');
        el.innerHTML=`${b.emo} ${b.name}`;
        el.onclick=()=>{ biome=id; save.biome=id; persist(); buildBiomes(); sCoin(); };
        row.appendChild(el);
    });
}

/* skins */
function skinPreview(sk){
    if(sk.body==='rainbow') return 'linear-gradient(135deg,#ff5a5a,#ffd23f,#7CFC00,#5ad1ff,#c86bff)';
    return sk.body;
}
function buildShop(){
    refreshCoins();
    const grid=$('skinGrid'); grid.innerHTML='';
    Object.entries(SKINS).forEach(([id,sk])=>{
        const owned=save.unlocked.includes(id);
        const selected=save.skin===id;
        const el=document.createElement('div');
        el.className='skin-card'+(selected?' sel':'')+(owned?'':' locked');
        const tag = selected?'<span class="skin-tag sel">✓ Équipé</span>'
                  : owned?'<span class="skin-tag own">Choisir</span>'
                  : `<span class="skin-tag buy">🪙 ${sk.price}</span>`;
        el.innerHTML=`<div class="skin-prev" style="background:${skinPreview(sk)}"></div><span class="skin-name">${sk.name}</span>${tag}`;
        el.onclick=()=>onSkinClick(id);
        grid.appendChild(el);
    });
}
function onSkinClick(id){
    const sk=SKINS[id];
    if(save.unlocked.includes(id)){ save.skin=id; persist(); buildShop(); sCoin(); }
    else if(save.coins>=sk.price){
        save.coins-=sk.price; save.unlocked.push(id); save.skin=id; persist(); refreshCoins(); buildShop(); sCoin();
    } else {
        // pas assez de pièces : petit feedback visuel
        const c=$('shopCoins'); c.animate([{color:'#ff5a5a'},{color:''}],{duration:600});
    }
}

/* ---------- Entrées ---------- */
const ga=$('game-area');
ga.addEventListener('mousedown', e=>{ if(e.target.closest('.screen')) return; flap(); });
ga.addEventListener('touchstart', e=>{ if(e.target.closest('.screen')) return; e.preventDefault(); flap(); }, {passive:false});
$('flapBtn').addEventListener('mousedown', e=>{ e.preventDefault(); flap(); });
$('flapBtn').addEventListener('touchstart', e=>{ e.preventDefault(); flap(); }, {passive:false});
window.addEventListener('keydown', e=>{ if(e.code==='Space'){ e.preventDefault(); if(state==='menu') startCountdown(); else flap(); } });

/* boutons */
$('playBtn').onclick   = startCountdown;
$('retryBtn').onclick  = startCountdown;
$('menuBtn').onclick   = showMenu;
$('shopBtn').onclick   = ()=>{ hideAllScreens(); buildShop(); $('shop').classList.remove('hidden'); };
$('boardBtn').onclick  = ()=>{ hideAllScreens(); loadLeaderboard(); $('board').classList.remove('hidden'); };
document.querySelectorAll('[data-close]').forEach(b=> b.onclick=()=>showMenu());

/* ---------- Go ---------- */
refreshCoins();
buildModes();
resetWorld();
showMenu();
requestAnimationFrame(loop);
