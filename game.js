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
const currentPlayer = urlParams.get('player') || "Invité";
document.getElementById('topNavUser').innerText = currentPlayer;

const canvas = document.getElementById('canvas'), ctx = canvas.getContext('2d');
const themes = {
    default: { sky: '#70c5ce', pipe: '#73bf2e', bird: '#f7d018' },
    night:   { sky: '#2c3e50', pipe: '#7f8c8d', bird: '#e74c3c' },
    desert:  { sky: '#e67e22', pipe: '#d35400', bird: '#f1c40f' },
    forest:  { sky: '#27ae60', pipe: '#1e8449', bird: '#ecf0f1' }
};

let bird, pipes, score, frame, running, currentTheme = themes.default;

function init() {
    canvas.width = 320; canvas.height = 420;
    bird = { x: 50, y: 200, vy: 0, r: 12 };
    pipes = []; score = 0; frame = 0; running = false;
    document.getElementById('score').textContent = '0';
}

function update() {
    if (!running) return;
    frame++; bird.vy += 0.25; bird.y += bird.vy;

    if (frame % 90 === 0) {
        let h = 50 + Math.random() * 180;
        pipes.push({ x: 320, y: h, scored: false });
    }

    pipes.forEach(p => {
        p.x -= 2;
        // Collision
        if (bird.x + 10 > p.x && bird.x - 10 < p.x + 50) {
            if (bird.y - 10 < p.y || bird.y + 10 > p.y + 150) endGame();
        }
        // Score
        if (!p.scored && p.x < bird.x) {
            p.scored = true; score++;
            document.getElementById('score').textContent = score;
        }
    });

    pipes = pipes.filter(p => p.x > -50);
    if (bird.y > 420 || bird.y < 0) endGame();
}

function draw() {
    ctx.fillStyle = currentTheme.sky; ctx.fillRect(0, 0, 320, 420);
    
    pipes.forEach(p => {
        ctx.fillStyle = currentTheme.pipe;
        ctx.fillRect(p.x, 0, 50, p.y);
        ctx.fillRect(p.x, p.y + 150, 50, 420);
    });

    ctx.fillStyle = currentTheme.bird;
    ctx.beginPath(); ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "black"; ctx.stroke();

    update();
    requestAnimationFrame(draw);
}

function endGame() {
    if (!running) return;
    running = false;
    document.getElementById('overlay').classList.remove('hidden');

    if (score > 0 && currentPlayer !== "Invité") {
        const path = 'games/FLAPPY_BIRD/scores';
        // REQUÊTE POUR SCORE UNIQUE
        database.ref(path).orderByChild('name').equalTo(currentPlayer).once('value', snap => {
            const data = snap.val();
            if (data) {
                const key = Object.keys(data)[0];
                if (score > data[key].score) {
                    database.ref(`${path}/${key}`).update({ score: score, date: Date.now() })
                        .then(() => displayLeaderboard());
                } else { displayLeaderboard(); }
            } else {
                database.ref(path).push({ name: currentPlayer, score: score, date: Date.now() })
                    .then(() => displayLeaderboard());
            }
        });
    }
}

function displayLeaderboard() {
    database.ref('games/FLAPPY_BIRD/scores').orderByChild('score').limitToLast(10).once('value', snap => {
        let html = ""; let arr = [];
        snap.forEach(s => arr.push(s.val()));
        arr.reverse().forEach((s, i) => {
            html += `<div class="score-row"><span>#${i+1} ${s.name}</span><b>${s.score}</b></div>`;
        });
        document.getElementById('leaderboard').innerHTML = html;
    });
}

document.getElementById('startBtn').onclick = () => {
    init(); running = true;
    document.getElementById('overlay').classList.add('hidden');
};

window.onmousedown = () => { if(running) bird.vy = -5; };

document.querySelectorAll('.theme-option').forEach(opt => {
    opt.onclick = () => {
        document.querySelector('.theme-option.active').classList.remove('active');
        opt.classList.add('active');
        currentTheme = themes[opt.dataset.theme];
    };
});

init(); draw(); displayLeaderboard();
