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

const urlParams = new URLSearchParams(window.location.search);
const currentPlayer = urlParams.get('player');

if (!currentPlayer || currentPlayer === "null") {
    document.getElementById('game-content').classList.add('hidden');
    document.getElementById('access-denied').classList.remove('hidden');
} else {
    document.getElementById('access-denied').classList.add('hidden');
    document.getElementById('game-content').classList.remove('hidden');
    document.getElementById('topNavUser').innerText = currentPlayer;
}

const canvas = document.getElementById('canvas'), ctx = canvas.getContext('2d');
const themes = {
    default: { sky: '#70c5ce', pipe: '#73bf2e', bird: '#f7d018' },
    night:   { sky: '#2c3e50', pipe: '#7f8c8d', bird: '#e74c3c' },
    desert:  { sky: '#e67e22', pipe: '#d35400', bird: '#f1c40f' },
    forest:  { sky: '#27ae60', pipe: '#1e8449', bird: '#ecf0f1' }
};

let bird, pipes, score, frame, running, gameReady, currentTheme = themes.default;

function init() {
    canvas.width = 320; canvas.height = 440;
    bird = { x: 70, y: 220, vy: 0, r: 13 };
    pipes = []; score = 0; frame = 0; running = false; gameReady = false;
    document.getElementById('score').textContent = '0';
}

function update() {
    if (!running || !gameReady) return;
    frame++; bird.vy += 0.30; bird.y += bird.vy;

    if (frame % 130 === 0) {
        let h = 50 + Math.random() * (canvas.height - 180 - 120);
        pipes.push({ x: canvas.width, y: h, scored: false });
    }

    pipes.forEach(p => {
        p.x -= 2.5;
        if (bird.x + 10 > p.x && bird.x - 10 < p.x + 50) {
            if (bird.y - 10 < p.y || bird.y + 10 > p.y + 170) endGame();
        }
        if (!p.scored && p.x < bird.x) { p.scored = true; score++; document.getElementById('score').textContent = score; }
    });

    pipes = pipes.filter(p => p.x > -60);
    if (bird.y > canvas.height - 45 || bird.y < 0) endGame();
}

function draw() {
    ctx.fillStyle = currentTheme.sky; ctx.fillRect(0, 0, 320, 440);
    
    pipes.forEach(p => {
        ctx.fillStyle = currentTheme.pipe; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.fillRect(p.x, 0, 50, p.y); ctx.strokeRect(p.x, -2, 50, p.y + 2);
        ctx.fillRect(p.x, p.y + 170, 50, canvas.height); ctx.strokeRect(p.x, p.y + 170, 50, canvas.height);
    });

    ctx.fillStyle = '#ded895'; ctx.fillRect(0, canvas.height - 40, 320, 40);
    ctx.fillStyle = '#95e17a'; ctx.fillRect(0, canvas.height - 45, 320, 5);

    ctx.save(); ctx.translate(bird.x, bird.y); ctx.rotate(Math.min(Math.PI/4, Math.max(-Math.PI/8, bird.vy * 0.1)));
    ctx.fillStyle = currentTheme.bird; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, bird.r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(6, -4, 5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "black"; ctx.beginPath(); ctx.arc(8, -4, 2, 0, Math.PI*2); ctx.fill(); 
    ctx.restore();

    update();
    requestAnimationFrame(draw);
}

function endGame() {
    if (!running) return;
    running = false;
    document.getElementById('overlay').classList.remove('hidden');

    if (score > 0 && currentPlayer && currentPlayer !== "null") {
        const path = 'games/FLAPPY_BIRD/scores';
        database.ref(path).orderByChild('name').equalTo(currentPlayer).once('value', snap => {
            const val = snap.val();
            if (val) {
                const key = Object.keys(val)[0];
                // Correction : on force la comparaison numérique
                if (Number(score) > Number(val[key].score)) {
                    database.ref(`${path}/${key}`).update({ 
                        score: Number(score), 
                        date: Date.now() 
                    });
                }
            } else {
                // Correction : premier enregistrement en format Nombre
                database.ref(path).push({ 
                    name: currentPlayer, 
                    score: Number(score), 
                    date: Date.now() 
                });
            }
            displayLeaderboard();
        });
    }
}

function displayLeaderboard() {
    // Le tri Firebase nécessite des nombres pour fonctionner avec orderByChild
    database.ref('games/FLAPPY_BIRD/scores').orderByChild('score').limitToLast(10).once('value', snap => {
        let html = "", data = [];
        snap.forEach(s => data.push(s.val()));
        data.reverse().forEach((s, i) => {
            html += `<div class="score-row"><span>#${i+1} ${s.name}</span><span class="player-score">${s.score} pts</span></div>`;
        });
        document.getElementById('leaderboard').innerHTML = html || "Aucun score";
    });
}

document.getElementById('startBtn').onclick = (e) => { e.stopPropagation(); init(); running = true; document.getElementById('overlay').classList.add('hidden'); };
window.onmousedown = (e) => { if(!e.target.classList.contains('exit-btn') && e.target.id !== 'startBtn') { gameReady = true; bird.vy = -6; } };
window.onkeydown = (e) => { if(e.code === 'Space') { gameReady = true; bird.vy = -6; } };

document.querySelectorAll('.theme-option').forEach(opt => {
    opt.onclick = () => {
        document.querySelector('.theme-option.active').classList.remove('active');
        opt.classList.add('active'); currentTheme = themes[opt.dataset.theme];
    };
});

init(); draw(); displayLeaderboard();
