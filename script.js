// ========== CONFIGURAÇÕES E VARIÁVEIS GLOBAIS ==========
const GRID_SIZE = 15;
let WORD_CHANGE_INTERVAL = 2 * 60 * 1000; // 2 minutos
let currentWords = [];
let selectedCells = [];
let foundWords = [];
let students = [];
let currentCategory = '';
let changeTimer;
let gameActive = false;
let timeLeft = WORD_CHANGE_INTERVAL / 1000;
let totalTime = WORD_CHANGE_INTERVAL / 1000;
let currentPlayer = null;

// ========== ELEMENTOS DO DOM ==========
const playerSetupElement = document.getElementById('player-setup');
const gameContainerElement = document.getElementById('game-container');
const playerNameInput = document.getElementById('player-name');
const startGameButton = document.getElementById('start-game');
const currentPlayerElement = document.getElementById('current-player');
const gridElement = document.getElementById('grid');
const wordListElement = document.getElementById('word-list');
const timeElement = document.getElementById('time');
const foundCountElement = document.getElementById('found-count');
const totalWordsElement = document.getElementById('total-words');
const scoreBodyElement = document.getElementById('score-body');
const newPlayerButton = document.getElementById('new-player');
const resetGameButton = document.getElementById('reset-game');
const congratulationsElement = document.getElementById('congratulations');
const gameOverElement = document.getElementById('game-over');
const overlayElement = document.getElementById('overlay');
const continueButton = document.getElementById('continue-button');
const tryAgainButton = document.getElementById('try-again-button');
const categoryInfoElement = document.getElementById('category-info');
const progressBarElement = document.getElementById('progress-bar');
const congratsPlayerElement = document.getElementById('congrats-player');
const gameoverPlayerElement = document.getElementById('gameover-player');
const playerPositionElement = document.getElementById('player-position');
const congratsFoundElement = document.getElementById('congrats-found');
const congratsTotalElement = document.getElementById('congrats-total');
const congratsScoreElement = document.getElementById('congrats-score');
const congratsTimeElement = document.getElementById('congrats-time');
const gameoverFoundElement = document.getElementById('gameover-found');
const gameoverTotalElement = document.getElementById('gameover-total');
const gameoverScoreElement = document.getElementById('gameover-score');

// ========== LISTA DE PALAVRAS ==========
const wordCategories = {
    personagens: ["ABRAO", "MOISES", "DAVI", "SALOMAO", "RAFAEL", "ISAIAS", "JEREMIAS", 
                 "DANIEL", "JONAS", "MARIA", "JOSE", "PEDRO", "PAULO", "JOAO"],
    livros: ["GENESIS", "EXODO", "LEVITICO", "NUMEROS", "DEUTERONOMIO", "JOSUE", 
            "SALMOS", "PROVERBIOS", "ECLESIASTES", "CANTARES", "ISAIAS", "MATEUS", 
            "MARCOS", "LUCAS", "JOAO", "ROMANOS", "CORINTIOS", "GALATAS", "EFESIOS"],
    conceitos: ["GRAÇA", "MISERICORDIA", "REDENCAO", "SALVACAO", "ARREPENDIMENTO", 
               "CONVERSAO", "BATISMO", "COMUNHAO", "ADORACAO", "ORACAO", "JEJUM", 
               "CARIDADE", "PERDAO", "HUMILDADE", "SANTIDADE", "JUSTICA", "AMOR", "PAZ"],
    eventos: ["CRIACAO", "DILUVIO", "EXODO", "CONQUISTA", "EXILIO", "ENCARNACAO", 
             "NATIVIDADE", "BATISMO", "TRANSFIGURACAO", "PASCOA", "PENTECOSTES", 
             "ASCENSAO", "RESSURREICAO", "PAROUSIA"]
};

// ========== INICIALIZAÇÃO DO JOGO ==========
function initializeGame() {
    createGrid();
    selectNewWords();
    loadStudents();
    updateScoreboard();
    
    // Event listeners
    startGameButton.addEventListener('click', startGame);
    newPlayerButton.addEventListener('click', showPlayerSetup);
    resetGameButton.addEventListener('click', resetGame);
    continueButton.addEventListener('click', continueGame);
    tryAgainButton.addEventListener('click', tryAgain);
    
    // Permitir Enter no campo de nome
    playerNameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            startGame();
        }
    });
    
    // Focar no campo de nome
    playerNameInput.focus();
}

// ========== FUNÇÕES DO JOGO ==========

function startGame() {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
        alert('Por favor, digite seu nome!');
        playerNameInput.focus();
        return;
    }
    
    currentPlayer = playerName;
    currentPlayerElement.textContent = currentPlayer;
    
    // Esconder tela de setup e mostrar jogo
    playerSetupElement.style.display = 'none';
    gameContainerElement.style.display = 'block';
    
    // Adicionar jogador se não existir
    if (!students.find(s => s.name === currentPlayer)) {
        students.push({
            name: currentPlayer,
            score: 0,
            wordsFound: 0,
            timeLeft: 0
        });
    }
    
    // Reiniciar estatísticas do jogador
    resetCurrentPlayerStats();
    
    // Iniciar jogo
    gameActive = true;
    startTimers();
}

function showPlayerSetup() {
    gameActive = false;
    clearInterval(changeTimer);
    
    playerSetupElement.style.display = 'block';
    gameContainerElement.style.display = 'none';
    congratulationsElement.style.display = 'none';
    gameOverElement.style.display = 'none';
    overlayElement.style.display = 'none';
    
    playerNameInput.value = '';
    playerNameInput.focus();
}

function createGrid() {
    gridElement.innerHTML = '';
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            
            cell.addEventListener('mousedown', startSelection);
            cell.addEventListener('mouseenter', continueSelection);
            cell.addEventListener('mouseup', endSelection);
            
            gridElement.appendChild(cell);
        }
    }
}

function selectNewWords() {
    const categories = Object.keys(wordCategories);
    currentCategory = categories[Math.floor(Math.random() * categories.length)];
    categoryInfoElement.textContent = `Categoria: ${currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)}`;
    
    const availableWords = [...wordCategories[currentCategory]];
    currentWords = [];
    foundWords = [];
    
    const numWords = Math.min(8 + Math.floor(Math.random() * 3), availableWords.length);
    for (let i = 0; i < numWords; i++) {
        const randomIndex = Math.floor(Math.random() * availableWords.length);
        currentWords.push(availableWords[randomIndex]);
        availableWords.splice(randomIndex, 1);
    }
    
    updateWordList();
    fillGridWithWords();
    updateFoundCount();
}

function fillGridWithWords() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('found');
    });
    
    for (const word of currentWords) {
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 100) {
            attempts++;
            const directions = [
                { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, 
                { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
            ];
            const direction = directions[Math.floor(Math.random() * directions.length)];
            
            const startRow = Math.floor(Math.random() * GRID_SIZE);
            const startCol = Math.floor(Math.random() * GRID_SIZE);
            const endRow = startRow + direction.dr * (word.length - 1);
            const endCol = startCol + direction.dc * (word.length - 1);
            
            if (endRow < 0 || endRow >= GRID_SIZE || endCol < 0 || endCol >= GRID_SIZE) {
                continue;
            }
            
            let conflict = false;
            for (let i = 0; i < word.length; i++) {
                const row = startRow + i * direction.dr;
                const col = startCol + i * direction.dc;
                const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                
                if (cell.textContent && cell.textContent !== word[i]) {
                    conflict = true;
                    break;
                }
            }
            
            if (conflict) continue;
            
            for (let i = 0; i < word.length; i++) {
                const row = startRow + i * direction.dr;
                const col = startCol + i * direction.dc;
                const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                cell.textContent = word[i];
            }
            
            placed = true;
        }
    }
    
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    cells.forEach(cell => {
        if (!cell.textContent) {
            cell.textContent = letters[Math.floor(Math.random() * letters.length)];
        }
    });
}

function updateWordList() {
    wordListElement.innerHTML = '';
    totalWordsElement.textContent = currentWords.length;
    
    currentWords.forEach(word => {
        const wordElement = document.createElement('div');
        wordElement.className = 'word-item';
        wordElement.textContent = word;
        wordElement.dataset.word = word;
        wordListElement.appendChild(wordElement);
    });
}

function startTimers() {
    clearInterval(changeTimer);
    timeLeft = WORD_CHANGE_INTERVAL / 1000;
    totalTime = timeLeft;
    updateTimerDisplay();
    updateProgressBar();
    
    changeTimer = setInterval(() => {
        if (!gameActive) return;
        
        timeLeft--;
        updateTimerDisplay();
        updateProgressBar();
        
        if (timeLeft <= 0) {
            clearInterval(changeTimer);
            if (foundWords.length === currentWords.length) {
                showCongratulations();
            } else {
                showGameOver();
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (timeLeft <= 30) {
        timeElement.className = 'time-warning';
    } else {
        timeElement.className = '';
    }
}

function updateProgressBar() {
    const progress = ((totalTime - timeLeft) / totalTime) * 100;
    progressBarElement.style.width = `${progress}%`;
    
    if (progress > 80) {
        progressBarElement.style.backgroundColor = '#e74c3c';
    } else if (progress > 60) {
        progressBarElement.style.backgroundColor = '#f39c12';
    } else {
        progressBarElement.style.backgroundColor = '#27ae60';
    }
}

// ========== SISTEMA DE SELEÇÃO ==========
let isSelecting = false;

function startSelection(e) {
    if (!gameActive) return;
    isSelecting = true;
    selectedCells = [this];
    this.classList.add('selected');
}

function continueSelection(e) {
    if (!isSelecting || !gameActive) return;
    if (!selectedCells.includes(e.target)) {
        selectedCells.push(e.target);
        e.target.classList.add('selected');
    }
}

function endSelection() {
    if (!isSelecting || !gameActive) return;
    isSelecting = false;
    
    checkSelection();
    
    selectedCells.forEach(cell => {
        cell.classList.remove('selected');
    });
    selectedCells = [];
}

function checkSelection() {
    if (selectedCells.length < 3) return;
    
    const selectedWord = selectedCells.map(cell => cell.textContent).join('');
    const reversedWord = selectedWord.split('').reverse().join('');
    
    let foundWord = null;
    for (const word of currentWords) {
        if (word === selectedWord || word === reversedWord) {
            foundWord = word;
            break;
        }
    }
    
    if (foundWord && !foundWords.includes(foundWord)) {
        foundWords.push(foundWord);
        
        selectedCells.forEach(cell => {
            cell.classList.add('found');
        });
        
        const wordElement = document.querySelector(`.word-item[data-word="${foundWord}"]`);
        if (wordElement) {
            wordElement.classList.add('found');
        }
        
        updateFoundCount();
        
        // Atualizar pontuação
        const student = students.find(s => s.name === currentPlayer);
        if (student) {
            student.score += foundWord.length * 10;
            student.wordsFound++;
            student.timeLeft = timeLeft;
            updateScoreboard();
            saveStudents();
            
            if (foundWords.length === currentWords.length) {
                showCongratulations();
            }
        }
    }
}

function updateFoundCount() {
    foundCountElement.textContent = foundWords.length;
}

// ========== SISTEMA DE PONTUAÇÃO ==========
function loadStudents() {
    const savedStudents = localStorage.getItem('religiousWordSearchStudents');
    students = savedStudents ? JSON.parse(savedStudents) : [];
}

function saveStudents() {
    localStorage.setItem('religiousWordSearchStudents', JSON.stringify(students));
}

function updateScoreboard() {
    scoreBodyElement.innerHTML = '';
    
    // Ordenar por pontuação (maior primeiro)
    const sortedStudents = [...students].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.timeLeft - a.timeLeft;
    });
    
    sortedStudents.forEach((student, index) => {
        const row = document.createElement('tr');
        if (student.name === currentPlayer) {
            row.classList.add('current-player');
        }
        
        const positionCell = document.createElement('td');
        positionCell.textContent = getMedal(index + 1);
        
        const nameCell = document.createElement('td');
        nameCell.textContent = student.name;
        
        const scoreCell = document.createElement('td');
        scoreCell.textContent = student.score;
        
        const wordsCell = document.createElement('td');
        wordsCell.textContent = student.wordsFound;
        
        const timeCell = document.createElement('td');
        timeCell.textContent = formatTime(student.timeLeft);
        
        row.appendChild(positionCell);
        row.appendChild(nameCell);
        row.appendChild(scoreCell);
        row.appendChild(wordsCell);
        row.appendChild(timeCell);
        
        scoreBodyElement.appendChild(row);
    });
}

function getMedal(position) {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return position;
}

function getPlayerPosition() {
    const sortedStudents = [...students].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.timeLeft - a.timeLeft;
    });
    
    for (let i = 0; i < sortedStudents.length; i++) {
        if (sortedStudents[i].name === currentPlayer) {
            return i + 1;
        }
    }
    return students.length;
}

function resetCurrentPlayerStats() {
    const student = students.find(s => s.name === currentPlayer);
    if (student) {
        student.score = 0;
        student.wordsFound = 0;
        student.timeLeft = 0;
        updateScoreboard();
        saveStudents();
    }
}

// ========== FUNÇÕES DE CONTROLE ==========
function resetGame() {
    if (confirm('Reiniciar o jogo? Sua pontuação atual será perdida.')) {
        resetCurrentPlayerStats();
        selectNewWords();
        startTimers();
        gameActive = true;
    }
}

function continueGame() {
    congratulationsElement.style.display = 'none';
    overlayElement.style.display = 'none';
    selectNewWords();
    startTimers();
    gameActive = true;
}

function tryAgain() {
    gameOverElement.style.display = 'none';
    overlayElement.style.display = 'none';
    selectNewWords();
    startTimers();
    gameActive = true;
}

// ========== MENSAGENS ==========
function showCongratulations() {
    gameActive = false;
    clearInterval(changeTimer);
    
    const student = students.find(s => s.name === currentPlayer);
    if (student) {
        congratsPlayerElement.textContent = currentPlayer;
        congratsFoundElement.textContent = foundWords.length;
        congratsTotalElement.textContent = currentWords.length;
        congratsScoreElement.textContent = student.score;
        congratsTimeElement.textContent = formatTime(timeLeft);
        playerPositionElement.textContent = getPlayerPosition();
    }
    
    congratulationsElement.style.display = 'block';
    overlayElement.style.display = 'block';
}

function showGameOver() {
    gameActive = false;
    clearInterval(changeTimer);
    
    const student = students.find(s => s.name === currentPlayer);
    if (student) {
        gameoverPlayerElement.textContent = currentPlayer;
        gameoverFoundElement.textContent = foundWords.length;
        gameoverTotalElement.textContent = currentWords.length;
        gameoverScoreElement.textContent = student.score;
    }
    
    gameOverElement.style.display = 'block';
    overlayElement.style.display = 'block';
}

// ========== UTILITÁRIOS ==========
function formatTime(seconds) {
    if (!seconds) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ========== INICIALIZAR O JOGO ==========

window.addEventListener('load', initializeGame);
