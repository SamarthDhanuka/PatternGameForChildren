// This file contains the game logic for the Whack-a-Mole game. 

const gameArea = document.getElementById('game-area');
const scoreBoard = document.getElementById('score');
const patternDisplay = document.getElementById('pattern-display');

// UI elements
let startButton, submitButton, replayButton, nextLevelButton, counterDisplay, instructionDisplay, solutionArea, feedbackDisplay;

let holes = [];
let selecting = false;
let correctSet = new Set();
let visited = new Set();
let selected = new Set();
let holesToMark = 0;
let score = 0;

// 5x5 grid
const GRID_SIZE = 5;

// Helper to get index from row, col
function idx(row, col) {
    return row * GRID_SIZE + col;
}

// Build the spatial pattern for level 1 (first 3 rows)
function buildPattern() {
    let pattern = [];
    // Row 0: alternate odd holes (cols 0,2,4)
    for (let c = 0; c < GRID_SIZE; c += 2) pattern.push(idx(0, c));
    // Row 1: alternate even holes (cols 1,3)
    for (let c = 1; c < GRID_SIZE; c += 2) pattern.push(idx(1, c));
    // Row 2: alternate odd holes (cols 0,2,4)
    for (let c = 0; c < GRID_SIZE; c += 2) pattern.push(idx(2, c));
    return pattern;
}

// Build the correct answer set: alternate odd holes in odd rows, alternate even holes in even rows
function buildCorrectSet() {
    let set = new Set();
    for (let row = 0; row < GRID_SIZE; row++) {
        if (row % 2 === 0) {
            for (let c = 0; c < GRID_SIZE; c += 2) set.add(idx(row, c));
        } else {
            for (let c = 1; c < GRID_SIZE; c += 2) set.add(idx(row, c));
        }
    }
    return set;
}

const pattern = buildPattern();
correctSet = buildCorrectSet();
holesToMark = correctSet.size - pattern.length;

// UI setup
function createGrid(area, arr, clickable = false) {
    area.innerHTML = "";
    arr.length = 0;
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const hole = document.createElement('div');
        hole.className = 'hole';
        if (clickable) {
            hole.addEventListener('click', () => handleSelect(i, hole));
        }
        area.appendChild(hole);
        arr.push(hole);
    }
}

function setupUI() {
    // Remove all dynamic elements
    document.querySelectorAll('.dynamic-ui').forEach(e => e.remove());

    // Start button
    startButton = document.createElement('button');
    startButton.textContent = "Start Game";
    startButton.className = "primary dynamic-ui";
    startButton.onclick = startGame;
    document.body.appendChild(startButton);

    // Counter
    counterDisplay = document.createElement('div');
    counterDisplay.className = "dynamic-ui";
    counterDisplay.style.display = "none";
    document.body.appendChild(counterDisplay);

    // Instruction
    instructionDisplay = document.createElement('div');
    instructionDisplay.className = "dynamic-ui";
    instructionDisplay.style.display = "none";
    document.body.appendChild(instructionDisplay);

    // Feedback
    feedbackDisplay = document.createElement('div');
    feedbackDisplay.className = "dynamic-ui";
    feedbackDisplay.style.display = "none";
    feedbackDisplay.style.fontWeight = "bold";
    feedbackDisplay.style.fontSize = "1.1rem";
    document.body.appendChild(feedbackDisplay);

    // Submit button
    submitButton = document.createElement('button');
    submitButton.textContent = "Submit Answer";
    submitButton.className = "primary dynamic-ui";
    submitButton.disabled = true;
    submitButton.style.display = "none";
    submitButton.onclick = checkAnswer;
    document.body.appendChild(submitButton);

    // Solution area
    solutionArea = document.getElementById('solution-area');
    solutionArea.style.marginTop = "0";
    solutionArea.style.display = "none";
    solutionArea.style.marginLeft = "0";
    solutionArea.style.verticalAlign = "top";
    // Do NOT appendChild here

    // Replay and Next Level buttons
    replayButton = document.createElement('button');
    replayButton.textContent = "Replay";
    replayButton.className = "primary dynamic-ui";
    replayButton.style.display = "none";
    replayButton.onclick = () => window.location.reload();
    document.body.appendChild(replayButton);

    nextLevelButton = document.createElement('button');
    nextLevelButton.textContent = "Next Level";
    nextLevelButton.className = "primary dynamic-ui";
    nextLevelButton.style.display = "none";
    nextLevelButton.onclick = () => alert("Next level coming soon!");
    document.body.appendChild(nextLevelButton);
}

setupUI();
createGrid(gameArea, holes, false);

function animatePattern(pattern, callback) {
    let i = 0;
    function next() {
        if (i > 0) {
            holes[pattern[i - 1]].textContent = "";
        }
        if (i < pattern.length) {
            holes[pattern[i]].classList.add('brown');
            holes[pattern[i]].textContent = "🐹";
            visited.add(pattern[i]);
            setTimeout(() => {
                i++;
                next();
            }, 700);
        } else {
            if (i > 0) holes[pattern[i - 1]].textContent = "";
            callback();
        }
    }
    next();
}

function startGame() {
    // Hide start, show animation
    startButton.style.display = "none";
    scoreBoard.textContent = "Score: " + score;
    holes.forEach(hole => {
        hole.className = 'hole';
        hole.textContent = "";
    });
    visited = new Set();
    selected = new Set();
    feedbackDisplay.style.display = "none";
    solutionArea.style.display = "none";
    animatePattern(pattern, () => {
        // After animation, allow selection
        selecting = true;
        instructionDisplay.textContent = "Now, mark all the holes where the mole will visit next (follow the pattern)!";
        instructionDisplay.style.display = "block";
        counterDisplay.style.display = "block";
        updateCounter();
        submitButton.style.display = "inline-block";
        createGrid(gameArea, holes, true);
        // Keep already visited holes brown and unclickable
        visited.forEach(i => {
            holes[i].classList.add('brown');
            holes[i].style.pointerEvents = "none";
        });
    });
}

function handleSelect(i, hole) {
    if (!selecting) return;
    if (visited.has(i)) return;
    if (selected.has(i)) {
        selected.delete(i);
        hole.classList.remove('brown');
    } else {
        if (selected.size < holesToMark) {
            selected.add(i);
            hole.classList.add('brown');
        }
    }
    updateCounter();
    submitButton.disabled = selected.size !== holesToMark;
}

function updateCounter() {
    counterDisplay.textContent = `Holes left to mark: ${holesToMark - selected.size}`;
}

function checkAnswer() {
    selecting = false;
    submitButton.style.display = "none";
    instructionDisplay.style.display = "none";
    counterDisplay.style.display = "none";
    let correct = true;
    // Mark wrong (yellow inner border) and missed (brown inner border)
    selected.forEach(i => {
        if (!correctSet.has(i)) {
            holes[i].classList.add('wrong-inner');
            correct = false;
        }
    });
    correctSet.forEach(i => {
        if (!visited.has(i) && !selected.has(i)) {
            holes[i].classList.add('missed-inner');
            correct = false;
        }
    });
    // Remove any previous label
    const prevLabel = document.getElementById('your-answer-label');
    if (prevLabel) prevLabel.remove();

    if (correct) {
        score++;
        scoreBoard.textContent = "Score: " + score;
        feedbackDisplay.textContent = "🎉 Great job! You got the answer right!";
        feedbackDisplay.style.display = "block";
        replayButton.style.display = "inline-block";
        nextLevelButton.style.display = "inline-block";
        solutionArea.style.display = "none";
    } else {
        feedbackDisplay.textContent = "";
        // Add "Your answer" label above game grid
        const yourLabel = document.createElement('div');
        yourLabel.id = 'your-answer-label';
        yourLabel.textContent = "Your answer";
        yourLabel.style.gridColumn = "span 5";
        yourLabel.style.textAlign = "center";
        yourLabel.style.marginBottom = "8px";
        yourLabel.style.fontWeight = "bold";
        gameArea.parentNode.insertBefore(yourLabel, gameArea);

        // Show solution grid next to current grid
        solutionArea.style.display = "grid";
        solutionArea.innerHTML = `<div style="grid-column: span 5; text-align:center; margin-bottom:8px; font-weight:bold;">Actual Solution</div>`;
        let solutionHoles = [];
        for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
            const hole = document.createElement('div');
            hole.className = 'hole';
            if (correctSet.has(i)) hole.classList.add('brown');
            solutionArea.appendChild(hole);
            solutionHoles.push(hole);
        }
        replayButton.style.display = "inline-block";
        nextLevelButton.style.display = "inline-block";
    }
}