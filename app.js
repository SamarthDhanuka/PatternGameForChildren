// --- DOM Elements ---
const gameArea = document.getElementById('game-area');
const scoreBoard = document.getElementById('score');
const highScoreBoard = document.getElementById('high-score');
const timerBoard = document.getElementById('timer');
const levelTitleEl = document.getElementById('level-title');
const levelDescriptionEl = document.getElementById('level-description');
const startScreen = document.getElementById('start-screen');
const playerNameInput = document.getElementById('player-name-input');
const playGameBtn = document.getElementById('play-game-btn');
const levelSelect = document.getElementById('level-select');

// --- Game State Variables ---
let holes = [], selecting = false, score = 0, currentLevel = 1, playerName = "Player";
let correctSet = new Set(), visited = new Set(), selected = new Set(), holesToMark = 0;
let selectedMouse = new Set(), selectedRabbit = new Set();
let visitedCreature = new Map();
let highScore = localStorage.getItem('patternGameHighScore') || 0;
let timer, timerInterval;

// --- UI Buttons (dynamically created) ---
let submitButton, replayButton, nextLevelButton, counterDisplay, feedbackDisplay, solutionArea;
let animalToggleWrap, mouseToggleBtn, rabbitToggleBtn;

let gridSize = 5;
const CREATURES = { mouse: "🐹", rabbit: "🐰" };
let activeAnimal = 'mouse';

// --- Sound Effects using Tone.js ---
const sounds = {
    pop: new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.2 } }).toDestination(),
    select: new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.01, decay: 0.05, sustain: 0.1, release: 0.2 } }).toDestination(),
    success: new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fmsine' }, envelope: { attack: 0.01, decay: 0.2, release: 0.5 } }).toDestination(),
    fail: new Tone.MonoSynth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.2, release: 0.2 }, filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.1, baseFrequency: 150, octaves: 2 } }).toDestination()
};

function idx(row, col) { return row * gridSize + col; }

// --- Levels Data ---
const LEVELS = {
    1: { time: 30, title: "Level 1: Mouse Zigzag", description: "The mouse visits holes in a zigzag pattern.", buildPattern: () => { let p = []; for (let c = 0; c < 5; c += 2) p.push({index: idx(0, c), creature: 'mouse'}); for (let c = 1; c < 5; c += 2) p.push({index: idx(1, c), creature: 'mouse'}); for (let c = 0; c < 5; c += 2) p.push({index: idx(2, c), creature: 'mouse'}); return p; }, buildCorrectSet: () => { let s = new Set(); for (let r = 0; r < 5; r++) { if (r % 2 === 0) { for (let c = 0; c < 5; c += 2) s.add(idx(r, c)); } else { for (let c = 1; c < 5; c += 2) s.add(idx(r, c)); } } return s; } },
    2: { time: 25, title: "Level 2: Corner to Center", description: "The mouse moves from corners toward the center.", buildPattern: () => [{index: idx(0, 0), creature: 'mouse'}, {index: idx(0, 4), creature: 'mouse'}, {index: idx(4, 0), creature: 'mouse'}, {index: idx(4, 4), creature: 'mouse'}, {index: idx(1, 1), creature: 'mouse'}, {index: idx(1, 3), creature: 'mouse'}], buildCorrectSet: () => new Set([idx(0, 0), idx(0, 4), idx(4, 0), idx(4, 4), idx(1, 1), idx(1, 3), idx(3, 1), idx(3, 3), idx(2, 2)]) },
    3: { time: 25, title: "Level 3: Cross Pattern", description: "Animals form a cross. Can you complete it?", buildPattern: () => [{index: idx(2, 0), creature: 'mouse'}, {index: idx(2, 1), creature: 'mouse'}, {index: idx(2, 2), creature: 'mouse'}, {index: idx(0, 2), creature: 'mouse'}, {index: idx(1, 2), creature: 'mouse'}], buildCorrectSet: () => new Set([idx(2, 0), idx(2, 1), idx(2, 2), idx(2, 3), idx(2, 4), idx(0, 2), idx(1, 2), idx(3, 2), idx(4, 2)]) },
    4: { time: 20, title: "Level 4: Master Checkerboard", description: "Mouse and Rabbit alternate in a checkerboard.", buildPattern: () => {
        const seq = [];
        // Preview only first 3 rows (0,1,2)
        for (let r = 0; r < 3; r++) { for (let c = 0; c < 5; c++) { if ((r + c) % 2 === 0) seq.push({ index: idx(r,c), creature: 'mouse' }); } }
        for (let r = 0; r < 3; r++) { for (let c = 0; c < 5; c++) { if ((r + c) % 2 === 1) seq.push({ index: idx(r,c), creature: 'rabbit' }); } }
        return seq;
    }, buildCorrectSet: () => ({
        mouse: new Set(Array.from({length:25}, (_,i)=>i).filter(i=>(((Math.floor(i/5)) + (i%5)) % 2)===0)),
        rabbit: new Set(Array.from({length:25}, (_,i)=>i).filter(i=>(((Math.floor(i/5)) + (i%5)) % 2)===1))
    }) },
    5: { time: 25, title: "Level 5: 6x6 Alternating Blocks", description: "First 4 rows preview; finish last 2 rows.", buildPattern: () => {
        gridSize = 6;
        const seq = [];
        for (let r = 0; r < 4; r++) {
            const mouseFirst = (r % 2 === 0);
            for (let c = 0; c < 3; c++) seq.push({ index: idx(r,c), creature: mouseFirst ? 'mouse' : 'rabbit' });
            for (let c = 3; c < 6; c++) seq.push({ index: idx(r,c), creature: mouseFirst ? 'rabbit' : 'mouse' });
        }
        return seq;
    }, buildCorrectSet: () => {
        const mouse = new Set();
        const rabbit = new Set();
        for (let r = 0; r < 6; r++) {
            const mouseFirst = (r % 2 === 0);
            for (let c = 0; c < 3; c++) (mouseFirst ? mouse : rabbit).add(idx(r,c));
            for (let c = 3; c < 6; c++) (mouseFirst ? rabbit : mouse).add(idx(r,c));
        }
        return { mouse, rabbit };
    } }
};
let currentLevelData, pattern;

// --- Game Flow & Logic ---
function setupLevel(level) {
    currentLevelData = LEVELS[level];
    pattern = currentLevelData.buildPattern();
    const cs = currentLevelData.buildCorrectSet();
    if (level === 4) {
        correctSet = activeAnimal === 'mouse' ? cs.mouse : cs.rabbit;
        // Only first 3 rows were previewed. Count how many of the chosen animal were shown.
        const shownCount = pattern.filter(s => s.creature === activeAnimal).length;
        holesToMark = correctSet.size - shownCount;
    } else if (level === 5) {
        // Dual-species like level 4 but with 6x6 and last 2 rows left
        // Users must mark 6 cells for mouse and 6 for rabbit in rows 4-5
        correctSet = null; // not used directly
        holesToMark = 0; // avoid showing interim "Mark X holes" text
    } else {
        correctSet = cs;
        holesToMark = correctSet.size - pattern.length;
    }
    levelTitleEl.textContent = currentLevelData.title;
    levelDescriptionEl.textContent = currentLevelData.description;
    timer = currentLevelData.time;
    timerBoard.textContent = `Time: ${timer}`;
    if (levelSelect) levelSelect.value = String(level);
}

function createGrid(area, arr, clickable = false) {
    area.innerHTML = "";
    arr.length = 0;
    for (let i = 0; i < gridSize * gridSize; i++) {
        const hole = document.createElement('div');
        hole.className = 'hole';
        if (clickable) {
            hole.addEventListener('click', () => handleSelect(i, hole));
        }
        area.appendChild(hole);
        arr.push(hole);
    }
    // adjust grid columns for 6x6
    if (area === gameArea || area === solutionArea) {
        if (gridSize === 6) {
            area.classList.add('grid-6');
        } else {
            area.classList.remove('grid-6');
        }
    }
}

function setupUI() {
    document.querySelectorAll('.dynamic-ui').forEach(e => e.remove());

    counterDisplay = document.createElement('div');
    counterDisplay.className = "dynamic-ui";
    document.body.appendChild(counterDisplay);

    // Animal toggle for level 4
    animalToggleWrap = document.createElement('div');
    animalToggleWrap.className = 'dynamic-ui animal-toggle';
    mouseToggleBtn = document.createElement('button');
    mouseToggleBtn.className = 'toggle-btn';
    mouseToggleBtn.textContent = `${CREATURES.mouse} Mouse`;
    rabbitToggleBtn = document.createElement('button');
    rabbitToggleBtn.className = 'toggle-btn';
    rabbitToggleBtn.textContent = `${CREATURES.rabbit} Rabbit`;
    animalToggleWrap.appendChild(mouseToggleBtn);
    animalToggleWrap.appendChild(rabbitToggleBtn);
    document.body.appendChild(animalToggleWrap);

    feedbackDisplay = document.createElement('div');
    feedbackDisplay.className = "dynamic-ui";
    document.body.appendChild(feedbackDisplay);

    submitButton = document.createElement('button');
    submitButton.textContent = "Submit Answer";
    submitButton.className = "primary dynamic-ui";
    document.body.appendChild(submitButton);

    replayButton = document.createElement('button');
    replayButton.textContent = "Replay Level";
    replayButton.className = "primary dynamic-ui";
    document.body.appendChild(replayButton);

    nextLevelButton = document.createElement('button');
    nextLevelButton.textContent = "Next Level";
    nextLevelButton.className = "primary dynamic-ui";
    document.body.appendChild(nextLevelButton);

    solutionArea = document.getElementById('solution-area');
    
    [counterDisplay, animalToggleWrap, feedbackDisplay, submitButton, replayButton, nextLevelButton].forEach(el => el.style.display = 'none');
}

function animatePattern(p, callback) {
    let i = 0;
    function next() {
        if (i > 0) holes[p[i - 1].index].textContent = "";
        if (i < p.length) {
            const step = p[i];
            // Color by creature
            holes[step.index].classList.add(step.creature === 'rabbit' ? 'white' : 'brown', 'pop');
            holes[step.index].textContent = CREATURES[step.creature];
            visited.add(step.index);
            visitedCreature.set(step.index, step.creature);
            if (window.Tone && sounds.pop) sounds.pop.triggerAttackRelease("C4", "8n");
            setTimeout(() => holes[step.index].classList.remove('pop'), 300);
            setTimeout(next, 700);
            i++;
        } else {
            if (i > 0) holes[p[i - 1].index].textContent = "";
            callback();
        }
    }
    next();
}

function startGame() {
    setupLevel(currentLevel);
    [replayButton, nextLevelButton, feedbackDisplay, animalToggleWrap].forEach(el => el.style.display = 'none');
    
    updateScoreboard();
    createGrid(gameArea, holes, false);
    visited = new Set();
    selected = new Set();
    selectedMouse = new Set();
    selectedRabbit = new Set();
    visitedCreature = new Map();
    solutionArea.style.display = "none";

    if (currentLevel === 4) {
        const mouseSteps = pattern.filter(s => s.creature === 'mouse');
        const rabbitSteps = pattern.filter(s => s.creature === 'rabbit');
        animatePattern(mouseSteps, () => {
            animatePattern(rabbitSteps, () => {
                selecting = true;
                animalToggleWrap.style.display = 'inline-flex';
                updateAnimalToggleUI();
                counterDisplay.textContent = `Mouse left: 5 • Rabbit left: 5`;
                counterDisplay.style.display = "block";
                submitButton.style.display = "inline-block";
                submitButton.disabled = true;
                submitButton.onclick = checkAnswer;
                createGrid(gameArea, holes, true);
                visited.forEach(i => {
                    const creature = visitedCreature.get(i);
                    holes[i].classList.add(creature === 'rabbit' ? 'white' : 'brown');
                    holes[i].style.pointerEvents = "none";
                });
                startTimer();
            });
        });
    } else if (currentLevel === 5) {
        const mouseSteps = pattern.filter(s => s.creature === 'mouse');
        const rabbitSteps = pattern.filter(s => s.creature === 'rabbit');
        animatePattern(mouseSteps, () => {
            animatePattern(rabbitSteps, () => {
                selecting = true;
                animalToggleWrap.style.display = 'inline-flex';
                activeAnimal = 'mouse';
                updateAnimalToggleUI();
                counterDisplay.textContent = `Mouse left: 6 • Rabbit left: 6`;
                counterDisplay.style.display = "block";
                submitButton.style.display = "inline-block";
                submitButton.disabled = true;
                submitButton.onclick = checkAnswer;
                createGrid(gameArea, holes, true);
                visited.forEach(i => {
                    const creature = visitedCreature.get(i);
                    holes[i].classList.add(creature === 'rabbit' ? 'white' : 'brown');
                    holes[i].style.pointerEvents = "none";
                });
                startTimer();
            });
        });
    } else {
    animatePattern(pattern, () => {
        selecting = true;
            counterDisplay.textContent = `Mark ${holesToMark} holes!`;
        counterDisplay.style.display = "block";
        submitButton.style.display = "inline-block";
            submitButton.disabled = true;
            submitButton.onclick = checkAnswer;

        createGrid(gameArea, holes, true);
        visited.forEach(i => {
                const creature = visitedCreature.get(i);
                holes[i].classList.add(creature === 'rabbit' ? 'white' : 'brown');
            holes[i].style.pointerEvents = "none";
            });
            startTimer();
        });
    }
}

// Level selector wiring
if (levelSelect) {
    levelSelect.value = String(currentLevel);
    levelSelect.addEventListener('change', (e) => {
        const parsed = parseInt(e.target.value, 10);
        if (LEVELS[parsed]) {
            currentLevel = parsed;
            // reset grid size when switching
            gridSize = parsed === 5 ? 6 : 5;
            // Reset score and timer contextually when switching levels mid-session
            selecting = false;
            clearInterval(timerInterval);
            startGame();
        }
    });
}
        
function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timer--;
        timerBoard.textContent = `Time: ${timer}`;
        if (timer <= 0) {
            clearInterval(timerInterval);
            timerBoard.textContent = "Time's up!";
            if (window.Tone && sounds.fail) sounds.fail.triggerAttackRelease("A2", "0.5s");
            selecting = false;
            showSolution();
        }
    }, 1000);
}

function handleSelect(i, hole) {
    if (!selecting || visited.has(i)) return;
    if (window.Tone && sounds.select) sounds.select.triggerAttackRelease(selected.has(i) ? "C3" : "C4", "8n");
    if (currentLevel === 4) {
        // Determine target set by active animal
        let targetSet = activeAnimal === 'mouse' ? selectedMouse : selectedRabbit;
        let maxForAnimal = 5;
        if (targetSet.has(i)) {
            targetSet.delete(i);
            hole.classList.remove('brown');
            hole.classList.remove('white');
        } else if (targetSet.size < maxForAnimal) {
            targetSet.add(i);
            hole.classList.add(activeAnimal === 'mouse' ? 'brown' : 'white');
        }
        const leftMouse = 5 - selectedMouse.size;
        const leftRabbit = 5 - selectedRabbit.size;
        counterDisplay.textContent = `Mouse left: ${leftMouse} • Rabbit left: ${leftRabbit}`;
        submitButton.disabled = !(selectedMouse.size === 5 && selectedRabbit.size === 5);
    } else if (currentLevel === 5) {
        let targetSet = activeAnimal === 'mouse' ? selectedMouse : selectedRabbit;
        let maxForAnimal = 6;
        if (targetSet.has(i)) {
            targetSet.delete(i);
            hole.classList.remove('brown');
            hole.classList.remove('white');
        } else if (targetSet.size < maxForAnimal) {
            targetSet.add(i);
            hole.classList.add(activeAnimal === 'mouse' ? 'brown' : 'white');
        }
        const leftMouse = 6 - selectedMouse.size;
        const leftRabbit = 6 - selectedRabbit.size;
        counterDisplay.textContent = `Mouse left: ${leftMouse} • Rabbit left: ${leftRabbit}`;
        submitButton.disabled = !(selectedMouse.size === 6 && selectedRabbit.size === 6);
    } else {
    if (selected.has(i)) {
        selected.delete(i);
        hole.classList.remove('brown');
            hole.classList.remove('white');
        } else if (selected.size < holesToMark) {
            selected.add(i);
            hole.classList.add('brown');
        }
        counterDisplay.textContent = `Holes left: ${holesToMark - selected.size}`;
    submitButton.disabled = selected.size !== holesToMark;
}
}

function checkAnswer() {
    selecting = false;
    clearInterval(timerInterval);
    submitButton.style.display = "none";
    counterDisplay.style.display = "none";

    let correct;
    if (currentLevel === 4) {
        const cs = LEVELS[4].buildCorrectSet();
        // Restrict to last two rows (rows 3 and 4)
        const isInLastTwoRows = (i) => Math.floor(i / 5) >= 3;
        const targetMouse = new Set([...cs.mouse].filter(isInLastTwoRows));
        const targetRabbit = new Set([...cs.rabbit].filter(isInLastTwoRows));
        const mouseOk = selectedMouse.size === 5 && [...selectedMouse].every(i => targetMouse.has(i));
        const rabbitOk = selectedRabbit.size === 5 && [...selectedRabbit].every(i => targetRabbit.has(i));
        correct = mouseOk && rabbitOk;
    } else if (currentLevel === 5) {
        const cs = LEVELS[5].buildCorrectSet();
        // Restrict to last two rows (rows 4 and 5 in 0-based index)
        const isInLastTwoRows6 = (i) => Math.floor(i / 6) >= 4;
        const targetMouse = new Set([...cs.mouse].filter(isInLastTwoRows6));
        const targetRabbit = new Set([...cs.rabbit].filter(isInLastTwoRows6));
        const mouseOk = selectedMouse.size === 6 && [...selectedMouse].every(i => targetMouse.has(i));
        const rabbitOk = selectedRabbit.size === 6 && [...selectedRabbit].every(i => targetRabbit.has(i));
        correct = mouseOk && rabbitOk;
    } else {
        correct = correctSet.size === (visited.size + selected.size) && [...selected].every(i => correctSet.has(i));
    }

    // --- SHOW GRAPHICAL TOAST HERE ---
    const toast = document.getElementById('simple-toast');
    let toastMsg = "";
    let imgHtml = "";

    if (correct) {
        if (currentLevel === 4 || currentLevel === 5) {
            toastMsg = "You caught the mouse and rabbit!";
            imgHtml = `<img src="https://cdn.dribbble.com/userupload/24624684/file/original-dc342c0cf122c78431da856f8e15d452.gif" alt="Mouse caught">`;
        } else {
            toastMsg = "You caught the mouse!";
            imgHtml = `<img src="https://cdn.dribbble.com/userupload/24624684/file/original-dc342c0cf122c78431da856f8e15d452.gif" alt="Mouse caught">`;
        }
    } else {
        if (currentLevel === 4 || currentLevel === 5) {
            toastMsg = "The mouse and rabbit escaped!";
            imgHtml = `<img src="https://cdnb.artstation.com/p/assets/images/images/030/203/517/original/teadora-kankaanpaa-runcycle.gif?1599908953" alt="Mouse escaped">`;
        } else {
            toastMsg = "The mouse escaped!";
            imgHtml = `<img src="https://cdnb.artstation.com/p/assets/images/images/030/203/517/original/teadora-kankaanpaa-runcycle.gif?1599908953" alt="Mouse escaped">`;
        }
    }
    toast.innerHTML = imgHtml + toastMsg;
    toast.style.display = 'flex';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 4000);
    // --- END TOAST ---

    if (correct) {
        score += 10 + timer;
        if (window.Tone && sounds.success) sounds.success.triggerAttackRelease(["C4", "E4", "G4"], "0.5s");
        updateScoreboard();
        feedbackDisplay.textContent = `🎉 Well done, ${playerName}! Correct!`;
        feedbackDisplay.style.display = "block";
        replayButton.style.display = "inline-block";
        replayButton.onclick = () => startGame();
        if (LEVELS[currentLevel + 1]) {
            nextLevelButton.style.display = "inline-block";
            nextLevelButton.onclick = nextLevel;
        } else {
            feedbackDisplay.textContent += " You've completed all levels!";
        }
    } else {
        if (window.Tone && sounds.fail) sounds.fail.triggerAttackRelease("A2", "0.5s");
        if (currentLevel === 4) {
            const cs = LEVELS[4].buildCorrectSet();
            const isInLastTwoRows = (i) => Math.floor(i / 5) >= 3;
            const targetMouse = new Set([...cs.mouse].filter(isInLastTwoRows));
            const targetRabbit = new Set([...cs.rabbit].filter(isInLastTwoRows));
            // Mark wrongs/missed for mouse
            selectedMouse.forEach(i => { if (!targetMouse.has(i)) holes[i].classList.add('wrong-inner'); });
            targetMouse.forEach(i => { if (!selectedMouse.has(i)) holes[i].classList.add('missed-inner'); });
            // Mark wrongs/missed for rabbit
            selectedRabbit.forEach(i => { if (!targetRabbit.has(i)) holes[i].classList.add('wrong-inner'); });
            targetRabbit.forEach(i => { if (!selectedRabbit.has(i)) holes[i].classList.add('missed-inner'); });
        } else if (currentLevel === 5) {
            const cs = LEVELS[5].buildCorrectSet();
            const isInLastTwoRows6 = (i) => Math.floor(i / 6) >= 4;
            const targetMouse = new Set([...cs.mouse].filter(isInLastTwoRows6));
            const targetRabbit = new Set([...cs.rabbit].filter(isInLastTwoRows6));
            selectedMouse.forEach(i => { if (!targetMouse.has(i)) holes[i].classList.add('wrong-inner'); });
            targetMouse.forEach(i => { if (!selectedMouse.has(i)) holes[i].classList.add('missed-inner'); });
            selectedRabbit.forEach(i => { if (!targetRabbit.has(i)) holes[i].classList.add('wrong-inner'); });
            targetRabbit.forEach(i => { if (!selectedRabbit.has(i)) holes[i].classList.add('missed-inner'); });
        } else {
            selected.forEach(i => { if (!correctSet.has(i)) holes[i].classList.add('wrong-inner'); });
            correctSet.forEach(i => { if (!visited.has(i) && !selected.has(i)) holes[i].classList.add('missed-inner'); });
        }
        showSolution();
    }
}

function showSolution() {
    feedbackDisplay.textContent = "Not quite! Here's the solution.";
    feedbackDisplay.style.display = "block";
    solutionArea.style.display = "grid";
    solutionArea.innerHTML = ""; // Clear previous

    // Determine grid size and correct set for current level
    let gridSize = (currentLevel === 5) ? 6 : 5;

    // Level 4 and 5 use mouse/rabbit sets, others use a single set
    if (currentLevel === 4 || currentLevel === 5) {
        const cs = currentLevelData.buildCorrectSet();
        const totalCells = gridSize * gridSize;
        for (let i = 0; i < totalCells; i++) {
            const hole = document.createElement('div');
            hole.className = 'hole';
            if (cs.mouse.has(i)) hole.classList.add('brown');
            if (cs.rabbit.has(i)) hole.classList.add('white');
            solutionArea.appendChild(hole);
        }
    } else {
        // For levels 1-3
        const cs = currentLevelData.buildCorrectSet();
        for (let i = 0; i < gridSize * gridSize; i++) {
            const hole = document.createElement('div');
            hole.className = 'hole';
            if (cs.has(i)) hole.classList.add('brown');
            solutionArea.appendChild(hole);
        }
    }
    replayButton.style.display = "inline-block";
    replayButton.onclick = () => startGame();
}
        
function nextLevel() {
    if (LEVELS[currentLevel + 1]) {
        currentLevel++;
        activeAnimal = 'mouse';
        startGame();
    }
}
        
function updateScoreboard() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('patternGameHighScore', highScore);
    }
    scoreBoard.textContent = `Score: ${score}`;
    highScoreBoard.textContent = `High Score: ${highScore}`;
}
        
// --- Initial Setup ---
playGameBtn.addEventListener('click', () => {
    if (window.Tone && Tone.start) Tone.start();
    playerName = (playerNameInput && playerNameInput.value.trim()) || "Player";
    if (startScreen) {
        startScreen.style.opacity = '0';
        setTimeout(() => {
            startScreen.style.display = 'none';
            startGame();
        }, 300);
    } else {
        startGame();
    }
});
        
highScoreBoard.textContent = `High Score: ${highScore}`;
setupUI();
createGrid(gameArea, holes, false);

// Toggle handlers
function updateAnimalToggleUI() {
    mouseToggleBtn.classList.toggle('active', activeAnimal === 'mouse');
    rabbitToggleBtn.classList.toggle('active', activeAnimal === 'rabbit');
}
document.addEventListener('click', (e) => {
    if (!animalToggleWrap) return;
    if (e.target === mouseToggleBtn) {
        activeAnimal = 'mouse';
        updateAnimalToggleUI();
        if (currentLevel === 4) {
            const leftMouse = 5 - selectedMouse.size;
            const leftRabbit = 5 - selectedRabbit.size;
            counterDisplay.textContent = `Mouse left: ${leftMouse} • Rabbit left: ${leftRabbit}`;
        } else if (currentLevel === 5) {
            const leftMouse = 6 - selectedMouse.size;
            const leftRabbit = 6 - selectedRabbit.size;
            counterDisplay.textContent = `Mouse left: ${leftMouse} • Rabbit left: ${leftRabbit}`;
        }
    }
    if (e.target === rabbitToggleBtn) {
        activeAnimal = 'rabbit';
        updateAnimalToggleUI();
        if (currentLevel === 4) {
            const leftMouse = 5 - selectedMouse.size;
            const leftRabbit = 5 - selectedRabbit.size;
            counterDisplay.textContent = `Mouse left: ${leftMouse} • Rabbit left: ${leftRabbit}`;
        } else if (currentLevel === 5) {
            const leftMouse = 6 - selectedMouse.size;
            const leftRabbit = 6 - selectedRabbit.size;
            counterDisplay.textContent = `Mouse left: ${leftMouse} • Rabbit left: ${leftRabbit}`;
        }
    }
});
