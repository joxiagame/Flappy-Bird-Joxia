const firebaseConfig = {
    apiKey: "AIzaSyCPecKQH6DURfYitjY4bXMeW0URLrcNnsI",
    authDomain: "joxiahub-2928b.firebaseapp.com",
    databaseURL: "https://joxiahub-2928b-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "joxiahub-2928b",
    storageBucket: "joxiahub-2928b.firebasestorage.app",
    messagingSenderId: "303698595695",
    appId: "1:303698595695:web:5c99c2cb2a9ea88e36a29a"
};

// Init Firebase avec sécurité Safari
try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
} catch (e) { console.error("Firebase Error:", e); }

const database = firebase.database();
const urlParams = new URLSearchParams(window.location.search);
const currentPlayer = urlParams.get('player');

if (!currentPlayer || currentPlayer === "null") {
    document.getElementById('game-content').classList.add('hidden');
    document.getElementById('access-denied').classList.remove('hidden');
} else {
    document.getElementById('topNavUser').innerText = currentPlayer;
}

const canvas = document.getElementById('canvas'), ctx = canvas.getContext('2d');
const themes = {
    default: { sky: '#70c5ce', pipe: '#73bf2e', bird: '#f7d018' },
    night:   { sky: '#2c3e50', pipe: '#7f8c8d', bird: '#e74c3c' },
    desert:  { sky: '#e67e22', pipe: '#d35400', bird: '#f1c40f' },
    forest:  { sky: '#27ae60', pipe: '#1e8449', bird: '#ecf0f1' }
};

let bird, pipes, score, frame, running, currentTheme = themes.default;

function init() {
    canvas.width = 320; canvas.height = 440;
    bird = { x: 70, y: 220, vy: 0, r: 13 };
    pipes = []; score = 0; frame = 0; running = false;
    document.getElementById('score').textContent = '0';
}

function update() {
    if (!running) return;
    frame++; bird.vy += 0.28; bird.y += bird.vy;
    if (frame % 125 === 0) {
        let h = 60 + Math.random() * 160;
        pipes.push({ x: 320, y: h, scored: false });
    }
    pipes.forEach(p => {
        p.x -= 2.4;
        if (bird.x + 10 > p.x && bird.x - 10 < p.x + 50) {
            if (bird.y - 10 < p.y || bird.y + 10 > p.y + 160) endGame();
        }
        if (!p.scored && p.x < bird.x) { p.scored = true; score++; document.getElementById('score').textContent = score; }
    });
    pipes = pipes.filter(p => p.x > -60);
    if (bird.y > 440 || bird.y < 0) endGame();
}

function draw() {
    ctx.fillStyle = currentTheme.sky; ctx.fillRect(0, 0, 320, 440);
    pipes.forEach(p => {
        ctx.fillStyle = currentTheme.pipe;
        ctx.fillRect(p.x, 0, 50, p.y);
        ctx.fillRect(p.x, p.y + 160, 50, 440);
    });
    ctx.fillStyle = currentTheme.bird;
    ctx.beginPath(); ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(bird.x+5, bird.y-4, 4, 0, Math.PI*2); ctx.fill();
    update();
    requestAnimationFrame(draw);
}

function endGame() {
    if (!running) return;
    running = false;
    document.getElementById('overlay').classList.remove('hidden');
    if (score > 0 && currentPlayer) {
        const path = 'games/FLAPPY_BIRD/scores';
        database.ref(path).orderByChild('name').equalTo(currentPlayer).once('value', snap => {
            const data = snap.val();
            if (data) {
                const key = Object.keys(data)[0];
                if (score > data[key].score) database.ref(`${path}/${key}`).update({ score: score });
            } else {
                database.ref(path).push({ name: currentPlayer, score: score });
            }
            displayLeaderboard();
        });
    }
}

function displayLeaderboard() {
    database.ref('games/FLAPPY_BIRD/scores').orderByChild('score').limitToLast(10).once('value', snap => {
        let html = "", res = [];
        snap.forEach(s => res.push(s.val()));
        res.reverse().forEach((s, i) => {
            html += `<div class="score-row"><span>#${i+1} ${s.name}</span><b>${s.score}</b></div>`;
        });
        document.getElementById('leaderboard').innerHTML = html;
    });
}

function handleAction(e) {
    if (e.target.id === 'startBtn') return;
    if (running) {
        bird.vy = -5.5;
        if (e.type === 'touchstart') e.preventDefault();
    }
}

document.getElementById('startBtn').onclick = () => { init(); running = true; document.getElementById('overlay').classList.add('hidden'); };
window.addEventListener('mousedown', handleAction);
window.addEventListener('touchstart', handleAction, { passive: false });
window.addEventListener('keydown', (e) => { if(e.code === 'Space') handleAction(e); });

document.querySelectorAll('.theme-option').forEach(opt => {
    opt.onclick = () => {
        document.querySelector('.theme-option.active').classList.remove('active');
        opt.classList.add('active'); currentTheme = themes[opt.dataset.theme];
    };
});

init(); draw(); displayLeaderboard();
