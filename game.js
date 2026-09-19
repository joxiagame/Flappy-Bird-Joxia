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
const defaultSave = { coins: 0, best: {}, unlocked: ['classic', 'phoenix'], skin: 'classic' };
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

/* ---------- Skins (couleurs de l'oiseau) ---------- */
const SKINS = {
    classic: { name:"Piou",     body:"#ffd23f", belly:"#ffe58a", wing:"#f4a915", beak:"#ff7a00", price:0 },
    phoenix: { name:"Phénix",   body:"#ff5a4d", belly:"#ff9a7a", wing:"#c0281c", beak:"#ffb300", price:0 },
    ice:     { name:"Givre",    body:"#5ad1ff", belly:"#bff0ff", wing:"#2b8fd6", beak:"#ff9a3c", price:60 },
    neon:    { name:"Néon",     body:"#7CFC00", belly:"#c8ff9e", wing:"#39a900", beak:"#ff2fd0", price:120 },
    gold:    { name:"Royal",    body:"#ffd700", belly:"#fff2a8", wing:"#c9a400", beak:"#ff7a00", price:220 },
    shadow:  { name:"Ombre",    body:"#5b5f6e", belly:"#8b90a3", wing:"#33363f", beak:"#ff5a5a", price:350 },
    rainbow: { name:"Arc",      body:"rainbow", belly:"#ffffff", wing:"#ffffff", beak:"#ff7a00", price:500 }
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

function resetWorld() {
    cfg = MODES[mode];
    bird = { x: 92, y: H*0.42, vy: 0, r: 14, rot: 0, flapT: 0 };
    pipes = []; particles = []; score = 0; frame = 0;
    $('score').textContent = '0';
    if (!clouds) {
        clouds = Array.from({length:5}, () => ({
            x: Math.random()*W, y: 40+Math.random()*180,
            s: .3+Math.random()*.5, r: 22+Math.random()*24
        }));
    }
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

function drawBackground(){
    // ciel dégradé (déjà en CSS mais on peint pour le canvas)
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#8fd3e6'); g.addColorStop(1,'#d7f0f7');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    // nuages parallaxe
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    clouds.forEach(c=>{
        if (state==='playing') c.x -= c.s;
        if (c.x < -c.r*2){ c.x = W+c.r; c.y = 40+Math.random()*180; }
        ctx.beginPath();
        ctx.arc(c.x,c.y,c.r,0,7); ctx.arc(c.x+c.r*.9,c.y+6,c.r*.75,0,7);
        ctx.arc(c.x-c.r*.9,c.y+8,c.r*.7,0,7); ctx.fill();
    });
    // collines
    ctx.fillStyle = 'rgba(120,200,120,.45)';
    ctx.beginPath(); ctx.moveTo(0,H-GROUND);
    for(let x=0;x<=W;x+=60) ctx.quadraticCurveTo(x+30,H-GROUND-34,x+60,H-GROUND);
    ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.fill();
}

function drawPipe(p){
    const w = 60, capH = 18;
    const grad = ctx.createLinearGradient(p.x,0,p.x+w,0);
    grad.addColorStop(0,'#5bb12f'); grad.addColorStop(.5,'#7fd63f'); grad.addColorStop(1,'#4e9c26');
    ctx.fillStyle = grad; ctx.strokeStyle='rgba(0,0,0,.28)'; ctx.lineWidth=2;
    // haut
    roundRect(p.x, -4, w, p.y+4, 6); ctx.fill(); ctx.stroke();
    roundRect(p.x-4, p.y-capH, w+8, capH, 6); ctx.fill(); ctx.stroke();
    // bas
    const by = p.y + cfg.gap;
    roundRect(p.x, by, w, H-GROUND-by, 6); ctx.fill(); ctx.stroke();
    roundRect(p.x-4, by, w+8, capH, 6); ctx.fill(); ctx.stroke();
}

function birdColors(){
    const sk = SKINS[save.skin] || SKINS.classic;
    let body = sk.body;
    if (body === 'rainbow'){
        const hue = (frame*4)%360;
        body = `hsl(${hue},85%,60%)`;
    }
    return { ...sk, body };
}
function drawBird(){
    const sk = birdColors();
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot);
    // corps
    ctx.fillStyle = sk.body; ctx.strokeStyle='rgba(0,0,0,.3)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(0,0,bird.r,0,7); ctx.fill(); ctx.stroke();
    // ventre
    ctx.fillStyle = sk.belly;
    ctx.beginPath(); ctx.arc(-2,4,bird.r*.62,0,7); ctx.fill();
    // aile (bat des ailes)
    const wf = Math.sin(bird.flapT)*.5;
    ctx.fillStyle = sk.wing;
    ctx.save(); ctx.translate(-3,0); ctx.rotate(wf);
    ctx.beginPath(); ctx.ellipse(-3,2,8,5,0,0,7); ctx.fill(); ctx.stroke(); ctx.restore();
    // bec
    ctx.fillStyle = sk.beak;
    ctx.beginPath(); ctx.moveTo(bird.r-2,-2); ctx.lineTo(bird.r+8,1); ctx.lineTo(bird.r-2,5); ctx.closePath(); ctx.fill(); ctx.stroke();
    // oeil
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(6,-5,4.6,0,7); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(7.5,-5,2.2,0,7); ctx.fill();
    ctx.restore();
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
    ctx.fillStyle='#ded29a'; ctx.fillRect(0,H-GROUND,W,GROUND);
    ctx.fillStyle='#c9bd82';
    if(state==='playing') groundX=(groundX-cfg.speed)%24;
    for(let x=groundX; x<W; x+=24){ ctx.fillRect(x,H-GROUND,12,GROUND); }
    ctx.fillStyle='#8fd05a'; ctx.fillRect(0,H-GROUND-6,W,7);
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
