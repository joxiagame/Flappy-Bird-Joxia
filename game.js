// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
    // REMPLACE ICI PAR TES CLÉS FIREBASE
    apiKey: "TON_API_KEY",
    databaseURL: "https://TON_PROJET.firebaseio.com",
    projectId: "TON_PROJET_ID",
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- AUTH & URL ---
const urlParams = new URLSearchParams(window.location.search);
const currentPlayer = urlParams.get('player');
const authContent = document.getElementById('authContent');
const startBtn = document.getElementById('startBtn');

if (!currentPlayer) {
    authContent.innerHTML = "<p style='color:#ff4d4d; font-size:12px;'>Veuillez passer par le Hub JOXIA</p>";
    startBtn.style.display = "none";
}

document.getElementById('backToHub').onclick = () => window.location.href = "https://joxiagame.github.io/Joxia-Games/";

// --- THEMES ---
const themes = {
    default: { bg: '#70c5ce', pipe: '#73bf2e', bird: '#f7d018' },
    night: { bg: '#2c3e50', pipe: '#95a5a6', bird: '#e74c3c' },
    desert: { bg: '#e67e22', pipe: '#d35400', bird: '#f1c40f' }
};
let currentTheme = themes.default;

document.querySelectorAll('.theme-option').forEach(opt => {
    opt.onclick = () => {
        document.querySelector('.theme-option.active').classList.remove('active');
        opt.classList.add('active');
        currentTheme = themes[opt.dataset.theme];
        document.getElementById('game-area').style.background = currentTheme.bg;
    };
});

// --- JEU ---
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');

let gravity = 0.5, flapPower = -6, pipeSpeed = 3, gap = 170, interval = 150;
let bird, pipes, score, frame, running, gameReady, lastUpdate;

function init() {
    canvas.width = 320; canvas.height = 480;
    bird = { x: 80, y: 240, vy: 0, r: 12 };
    pipes = []; score = 0; frame = 0;
    running = false; gameReady = false; lastUpdate = 0;
    pipeSpeed = 3; flapPower = -6;
    scoreEl.textContent = '0';
}

function spawnPipe() {
    let h = 50 + Math.random() * (canvas.height - gap - 100);
    pipes.push({ x: canvas.width, y: h, scored: false });
}

function update() {
    if (!running || !gameReady) return;
    frame++;
    bird.vy += gravity; bird.y += bird.vy;

    if (frame % interval === 0) spawnPipe();

    pipes.forEach(p => {
        p.x -= pipeSpeed;
        // Collision
        if (bird.x + 8 > p.x && bird.x - 8 < p.x + 50) {
            if (bird.y - 8 < p.y || bird.y + 8 > p.y + gap) endGame();
        }
        // Score & Difficulté
        if (!p.scored && p.x < bird.x) {
            p.scored = true; score++; scoreEl.textContent = score;
            if (score % 10 === 0 && score !== lastUpdate) {
                pipeSpeed += 0.5; flapPower -= 0.5; lastUpdate = score;
            }
        }
    });
    pipes = pipes.filter(p => p.x > -60);
    if (bird.y > canvas.height - 50 || bird.y < 0) endGame();
}

function draw() {
    ctx.clearRect(0,0,320,480);
    ctx.fillStyle = currentTheme.pipe;
    pipes.forEach(p => {
        ctx.fillRect(p.x, 0, 50, p.y);
        ctx.fillRect(p.x, p.y + gap, 50, canvas.height);
    });
    ctx.fillStyle = '#ded895'; ctx.fillRect(0, canvas.height-50, 320, 50);
    ctx.fillStyle = currentTheme.bird; ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI*2); ctx.fill();
    requestAnimationFrame(() => { update(); draw(); });
}

function endGame() {
    running = false;
    document.getElementById('overlay').classList.remove('hidden');
    if (currentPlayer && score > 0) saveScore(currentPlayer, score);
}

// --- CLASSEMENT ---
function saveScore(name, pts) {
    database.ref('games/FLAPPY_BIRD/scores').push({ name: name, score: pts });
}

function displayLeaderboard() {
    database.ref('games/FLAPPY_BIRD/scores').orderByChild('score').limitToLast(10).on('value', snap => {
        let html = ""; let data = [];
        snap.forEach(s => data.push(s.val()));
        data.reverse().forEach((s, i) => {
            html += `<div class="score-row"><span class="rank">#${i+1}</span><span>${s.name}</span><span class="player-score">${s.score} pts</span></div>`;
        });
        document.getElementById('leaderboard').innerHTML = html || "Aucun score";
    });
}

function flap() { if (running) { gameReady = true; bird.vy = flapPower; } }

startBtn.onclick = () => { 
    init(); running = true; 
    document.getElementById('overlay').classList.add('hidden'); 
};
window.onmousedown = flap;
window.onkeydown = (e) => { if(e.code==='Space') flap(); };

init(); draw(); displayLeaderboard();
