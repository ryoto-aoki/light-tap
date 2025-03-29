// ゲームの設定
const config = {
    defaultGridSize: 4,  // デフォルトは4x4
    gameTime: 30,     // ゲーム時間（秒）
    lightInterval: {  // ライトの点灯間隔（ミリ秒）
        min: 800,     // 最小間隔
        max: 1500     // 最大間隔
    },
    pointsPerTap: 10, // 1タップあたりの基本ポイント
    maxRankingEntries: 5 // ランキングの最大表示数
};

// ゲームの状態管理
let gameState = {
    isPlaying: false,
    score: 0,
    timeLeft: config.gameTime,
    currentLitCell: null,
    timerId: null,
    lightTimerId: null,
    gridSize: config.defaultGridSize,  // 現在のグリッドサイズ
    currentRank: null, // 現在のランキング位置（新記録の場合）
    playerName: '' // プレイヤー名
};

// DOM要素
const scoreElement = document.getElementById('score');
const timeElement = document.getElementById('time');
const startButton = document.getElementById('start-button');
const gridContainer = document.getElementById('grid');
const gameOverElement = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const difficultySelector = document.getElementById('difficulty');  // 難易度選択要素
const rankingList = document.getElementById('ranking-list');
const rankingDifficulty = document.getElementById('ranking-difficulty');
const newRecordElement = document.getElementById('new-record');
const playerNameInput = document.getElementById('player-name');

// 難易度の表示名を取得する関数
function getDifficultyName(size) {
    switch (parseInt(size)) {
        case 3: return 'かんたん (3x3)';
        case 4: return 'ふつう (4x4)';
        case 5: return 'むずかしい (5x5)';
        case 6: return '超むずかしい (6x6)';
        default: return 'ふつう (4x4)';
    }
}

// グリッドの初期化
function initGrid() {
    // 現在選択されている難易度からグリッドサイズを取得
    gameState.gridSize = parseInt(difficultySelector.value);
    
    gridContainer.innerHTML = '';
    gridContainer.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`;
    
    for (let i = 0; i < gameState.gridSize * gameState.gridSize; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        cell.addEventListener('click', handleCellClick);
        gridContainer.appendChild(cell);
    }
    
    // 難易度に応じて光る間隔を調整
    adjustDifficulty();
    
    // ランキング表示を更新
    updateRankingDisplay();
}

// 難易度に応じてゲームパラメータを調整
function adjustDifficulty() {
    const size = gameState.gridSize;
    
    // 難易度が上がるほど早く光るように調整
    if (size === 3) {
        config.lightInterval.min = 1000;
        config.lightInterval.max = 1800;
    } else if (size === 4) {
        config.lightInterval.min = 800;
        config.lightInterval.max = 1500;
    } else if (size === 5) {
        config.lightInterval.min = 700;
        config.lightInterval.max = 1300;
    } else if (size === 6) {
        config.lightInterval.min = 600;
        config.lightInterval.max = 1100;
    }
}

// セルをクリックした時の処理
function handleCellClick(event) {
    if (!gameState.isPlaying) return;
    
    const clickedIndex = parseInt(event.target.dataset.index);
    
    // 光っているセルをクリックした場合
    if (gameState.currentLitCell === clickedIndex) {
        // 難易度によってポイントボーナスを追加
        const difficultyBonus = gameState.gridSize - 2; // 3x3で1、4x4で2、...
        gameState.score += config.pointsPerTap + difficultyBonus * 2;
        scoreElement.textContent = gameState.score;
        
        // 現在光っているセルを消灯
        const currentLitElement = document.querySelector('.cell.lit');
        if (currentLitElement) {
            currentLitElement.classList.remove('lit');
        }
        
        // 次のセルを光らせるタイマーをクリア
        clearTimeout(gameState.lightTimerId);
        
        // 次のセルを光らせる
        lightRandomCell();
    }
}

// ランダムなセルを光らせる
function lightRandomCell() {
    const cells = document.querySelectorAll('.cell');
    
    // 前回のセルとは違うセルを選ぶ
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * cells.length);
    } while (randomIndex === gameState.currentLitCell);
    
    gameState.currentLitCell = randomIndex;
    
    // ランダムなセルを光らせる
    cells[randomIndex].classList.add('lit');
    
    // 次のセルを光らせるまでの時間をランダムに設定
    const nextInterval = Math.floor(
        Math.random() * (config.lightInterval.max - config.lightInterval.min) + 
        config.lightInterval.min
    );
    
    // 一定時間後に現在のセルを消灯し、次のセルを光らせる
    gameState.lightTimerId = setTimeout(() => {
        cells[randomIndex].classList.remove('lit');
        if (gameState.isPlaying) {
            lightRandomCell();
        }
    }, nextInterval);
}

// タイマーの更新
function updateTimer() {
    gameState.timeLeft--;
    timeElement.textContent = gameState.timeLeft;
    
    if (gameState.timeLeft <= 0) {
        endGame();
    }
}

// ゲーム開始
function startGame() {
    // グリッドを選択された難易度で再初期化
    initGrid();
    
    // 状態をリセット
    gameState.isPlaying = true;
    gameState.score = 0;
    gameState.timeLeft = config.gameTime;
    gameState.currentLitCell = null;
    gameState.currentRank = null;
    
    // 表示を更新
    scoreElement.textContent = gameState.score;
    timeElement.textContent = gameState.timeLeft;
    startButton.disabled = true;
    difficultySelector.disabled = true; // ゲーム中は難易度選択を無効化
    gameOverElement.classList.add('hidden');
    newRecordElement.classList.add('hidden');
    
    // タイマーを開始
    gameState.timerId = setInterval(updateTimer, 1000);
    
    // 最初のセルを光らせる
    lightRandomCell();
}

// ゲーム終了
function endGame() {
    gameState.isPlaying = false;
    clearInterval(gameState.timerId);
    clearTimeout(gameState.lightTimerId);
    
    // 光っているセルを消灯
    const litCell = document.querySelector('.cell.lit');
    if (litCell) {
        litCell.classList.remove('lit');
    }
    
    // ゲームオーバー画面を表示
    finalScoreElement.textContent = gameState.score;
    gameOverElement.classList.remove('hidden');
    startButton.disabled = false;
    difficultySelector.disabled = false; // ゲーム終了後に難易度選択を有効化
    
    // ランキングをチェック
    checkRanking();
}

// ランキングをロードする
function loadRanking(difficulty) {
    const key = `lightTapRanking_${difficulty}`;
    const rankingData = localStorage.getItem(key);
    
    if (rankingData) {
        return JSON.parse(rankingData);
    } else {
        return []; // ランキングがない場合は空配列を返す
    }
}

// ランキングを保存する
function saveRanking(difficulty, ranking) {
    const key = `lightTapRanking_${difficulty}`;
    localStorage.setItem(key, JSON.stringify(ranking));
}

// スコアをランキングに追加
function addScoreToRanking(difficulty, score, name) {
    const ranking = loadRanking(difficulty);
    
    // 新しい記録を追加
    ranking.push({
        name: name || 'ゲスト',
        score: score,
        date: new Date().toISOString()
    });
    
    // スコアで降順ソート
    ranking.sort((a, b) => b.score - a.score);
    
    // 最大表示数までカット
    const newRanking = ranking.slice(0, config.maxRankingEntries);
    
    // 保存
    saveRanking(difficulty, newRanking);
    
    // 最新のランキングでの位置を返す（0-indexed）
    for (let i = 0; i < newRanking.length; i++) {
        if (newRanking[i].score === score && 
            newRanking[i].date === ranking[ranking.length - 1].date) {
            return i;
        }
    }
    
    return -1; // ランキング外
}

// ランキングをチェックして新記録かどうか判定
function checkRanking() {
    const difficulty = gameState.gridSize;
    const score = gameState.score;
    const ranking = loadRanking(difficulty);
    
    // ランキングが埋まっていない、または最下位よりスコアが高い場合
    if (ranking.length < config.maxRankingEntries || 
        score > 0 && (ranking.length === 0 || score > ranking[ranking.length - 1].score)) {
        
        // 名前入力フォームを表示
        newRecordElement.classList.remove('hidden');
        playerNameInput.value = '';
        playerNameInput.focus();
        
        // Enterキーで名前を確定
        playerNameInput.onkeydown = function(e) {
            if (e.key === 'Enter') {
                submitScore();
            }
        };
        
        // 再プレイボタンクリックでも名前を確定
        restartButton.onclick = submitScore;
    } else {
        // 通常の再プレイ
        restartButton.onclick = startGame;
    }
    
    // ランキング表示を更新
    updateRankingDisplay();
}

// スコアを登録して再プレイ
function submitScore() {
    const difficulty = gameState.gridSize;
    const score = gameState.score;
    const name = playerNameInput.value.trim() || 'ゲスト';
    
    // ランキングに追加
    const rank = addScoreToRanking(difficulty, score, name);
    gameState.currentRank = rank;
    
    // ランキング表示を更新
    updateRankingDisplay();
    
    // 再プレイボタンの動作を元に戻す
    restartButton.onclick = startGame;
    
    // ゲームを開始
    startGame();
}

// ランキング表示を更新
function updateRankingDisplay() {
    // 現在の難易度を表示
    rankingDifficulty.textContent = getDifficultyName(gameState.gridSize);
    
    // ランキングデータをロード
    const ranking = loadRanking(gameState.gridSize);
    
    // ランキングリストを更新
    rankingList.innerHTML = '';
    
    if (ranking.length === 0) {
        const noRecords = document.createElement('div');
        noRecords.className = 'no-records';
        noRecords.textContent = 'まだ記録がありません';
        rankingList.appendChild(noRecords);
        return;
    }
    
    // ランキングアイテムを作成
    ranking.forEach((item, index) => {
        const rankItem = document.createElement('div');
        rankItem.className = 'ranking-item';
        
        // 最新のスコアをハイライト
        if (gameState.currentRank === index) {
            rankItem.classList.add('highlight');
        }
        
        const rankElement = document.createElement('div');
        rankElement.className = 'rank';
        rankElement.textContent = `${index + 1}.`;
        
        const nameElement = document.createElement('div');
        nameElement.className = 'player-name';
        nameElement.textContent = item.name;
        
        const scoreElement = document.createElement('div');
        scoreElement.className = 'player-score';
        scoreElement.textContent = item.score;
        
        rankItem.appendChild(rankElement);
        rankItem.appendChild(nameElement);
        rankItem.appendChild(scoreElement);
        
        rankingList.appendChild(rankItem);
    });
}

// 難易度変更時にグリッドとランキング表示を更新
difficultySelector.addEventListener('change', function() {
    if (!gameState.isPlaying) {
        initGrid();
    }
});

// ゲームの初期化
function initGame() {
    initGrid();
}

// イベントリスナー
startButton.addEventListener('click', startGame);

// ページロード時にゲームを初期化
window.addEventListener('load', initGame);