const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const scoreEl = document.getElementById('score');
const startBtn = document.getElementById('startBtn');
const backToHub = document.getElementById('backToHub');
const authContent = document.getElementById('authContent');
const gameArea = document.getElementById('game-area');
const themeOptions = document.querySelectorAll('.theme-option');

// --- CONFIGURATION ET AUTH ---
const urlParams = new URLSearchParams(window.location.search);
const currentPlayer = urlParams.get('player');

if (!currentPlayer) {
    authContent.innerHTML = "<p style='color: #ff4d4d; font-weight: bold; text-align: center; font-size: 14px;'>Veuillez passer par le Hub JOXIA</p>";
    startBtn.style.display = "none";
}

backToHub.addEventListener('click', () => {
    window.location.href = "https://joxiagame.github.io/Joxia-Games/";
});

// --- GESTION DES THÈMES ---
const themes = {
    default: { bg: '#70c5ce', pipe: '#73bf2e', pipeStroke: '#543847', bird: '#f7d018' },
    night: { bg: '#2c3e50', pipe: '#95a5a6', pipeStroke: '#34495e', bird: '#e74c3c' },
    desert: { bg: '#e67e22', pipe: '#d35400', pipeStroke: '#a04010', bird: '#f1c40f' }
};
let currentTheme = themes.default;

themeOptions.forEach(option => {
    option.addEventListener('click', () => {
        document.querySelector('.theme-option.active').classList.remove('active');
        option.classList.add('active');
        const themeName = option.dataset.theme;
        currentTheme = themes[themeName];
        gameArea.style.background = currentTheme.bg;
        // Optionnel : changer la classe du body pour des ajustements CSS spécifiques
        document.body.className = `theme-${themeName}`;
    });
});

// --- PHYSIQUE ET CONSTANTES ---
// Les valeurs de base sont légèrement ajustées pour la fenêtre réduite
const BASE_GRAVITY = 0.45;
const BASE_FLAP = -5.5;
const BASE_PIPE_SPEED = 2.8;
const PIPE_GAP = 160; // Légèrement réduit
const PIPE_INTERVAL = 140;

let currentGravity = BASE_GRAVITY;
let currentFlap = BASE_FLAP;
let currentPipeSpeed = BASE_PIPE_SPEED;

let W, H, bird, pipes, score, frame, running, gameReady;
let lastSpeedUpdate = 0;

function init() {
    // Dimensions fixées basées sur le CSS pour la zone réduite
    W = 320;
    H = 480;
    canvas.width = W;
    canvas.height = H;

    bird = { x: W * 0.25, y: H / 2, vy: 0, r: 12 }; // Légèrement plus petit
    pipes = [];
    score = 0;
    frame = 0;
    gameReady = false;
    lastSpeedUpdate = 0;

    // Reset des valeurs de base
    currentGravity = BASE_GRAVITY;
    currentFlap = BASE_FLAP;
    currentPipeSpeed = BASE_PIPE_SPEED;

    scoreEl.textContent = '0';
    document.getElementById('title').textContent = "Flappy Bird";
}

function flap() {
    if (!running || !currentPlayer) return;
    gameReady = true;
    bird.vy = currentFlap;
}

// --- LOGIQUE DE DIFFICULTÉ PROGRESSIVE ---
function updateDifficulty() {
    if (score > 0 && score % 10 === 0 && score !== lastSpeedUpdate) {
        currentPipeSpeed += 0.4; // Augmentation légèrement réduite
        currentFlap -= 0.3;     // Augmentation légèrement réduite
        lastSpeedUpdate = score;
        console.log(`Difficulté augmentée : Vitesse=${currentPipeSpeed.toFixed(1)}, Saut=${currentFlap.toFixed(1)}`);
    }
}

function update() {
    if (!running || !gameReady) return;

    frame++;
    bird.vy += currentGravity;
    bird.y += bird.vy;

    if (frame % PIPE_INTERVAL === 0) spawnPipe();

    pipes.forEach(p => {
        p.x -= currentPipeSpeed;

        // Hitbox (ajustée pour la taille réduite)
        if (bird.x + 8 > p.x && bird.x - 8 < p.x + 50) {
            if (bird.y - 8 < p.y || bird.y + 8 > p.y + PIPE_GAP) {
                endGame();
            }
        }

        // Score et Difficulté
        if (!p.scored && p.x + 25 < bird.x) {
            p.scored = true;
            score++;
            scoreEl.textContent = score;
            updateDifficulty(); // Appel de la fonction dédiée
        }
    });

    pipes = pipes.filter(p => p.x > -60);

    if (bird.y + bird.r > H - 45) endGame(); // Sol ajusté
    if (bird.y < 0) { bird.y = 0; bird.vy = 0; }
}

function spawnPipe() {
    const minPipeHeight = 40;
    const maxPipeHeight = H - PIPE_GAP - minPipeHeight - 45; // Ajusté pour le sol
    const gapY = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
    pipes.push({ x: W, y: gapY, scored: false });
}

function draw() {
    ctx.clearRect(0, 0, W, H);

    // Background (utilise la couleur du thème)
    ctx.fillStyle = currentTheme.bg;
    ctx.fillRect(0, 0, W, H);

  // Tuyaux (utilisent les couleurs du thème)
    pipes.forEach(p => {
        ctx.fillStyle = currentTheme.pipe;
        ctx.strokeStyle = currentTheme.pipeStroke;
        ctx.lineWidth = 3;
        // Haut
        ctx.fillRect(p.x, 0, 50, p.y);
        ctx.strokeRect(p.x, -5, 50, p.y + 5);
        // Bas
        ctx.fillRect(p.x, p.y + PIPE_GAP, 50, H - p.y - PIPE_GAP);
        ctx.strokeRect(p.x, p.y + PIPE_GAP, 50, H - p.y - PIPE_GAP + 5);
    });

    // Sol (fixe pour l'instant)
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, H - 45, W, 45);
    ctx.fillStyle = '#95e17a';
    ctx.fillRect(0, H - 50, W, 5);

    // Oiseau (utilise la couleur du thème)
    ctx.save();
    ctx.translate(bird.x, bird.y);
    let angle = Math.min(Math.PI/4, Math.max(-Math.PI/8, bird.vy * 0.12)); // Rotation légèrement accentuée
    ctx.rotate(angle);
    ctx.fillStyle = currentTheme.bird;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, bird.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Oeil
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(4, -3, 4, 0, Math.PI*2); ctx.fill(); ctx.stroke(); // Oeil plus petit
    ctx.restore();

    requestAnimationFrame(draw);
}

// Boucle de mise à jour (Physique)
setInterval(update, 1000/60);

function endGame() {
    running = false;
    overlay.classList.remove('hidden');

    // LOGIQUE D'ENVOI FIREBASE (inchangée)
    if (currentPlayer && score > 0) {
        console.log(`Envoi du score de ${currentPlayer} : ${score}`);
        // Code Firebase ici...
    }
}

function startGame() {
    if (!currentPlayer) return;
    init();
    running = true;
    overlay.classList.add('hidden');
}

// Événements
startBtn.addEventListener('click', (e) => { e.stopPropagation(); startGame(); });
window.addEventListener('mousedown', () => flap());
window.addEventListener('touchstart', (e) => { e.preventDefault(); flap(); }, {passive: false});
window.addEventListener('keydown', (e) => { if(e.code === 'Space') flap(); });

// Initialisation au chargement
init();
draw();