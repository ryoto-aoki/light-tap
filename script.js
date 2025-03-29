// ゲームの設定
const config = {
    defaultGridSize: 4,  // デフォルトは4x4
    gameTime: 30,     // ゲーム時間（秒）
    lightInterval: {  // ライトの点灯間隔（ミリ秒）
        min: 800,     // 最小間隔
        max: 1500     // 最大間隔
    },
    pointsPerTap: 10, // 1タップあたりの基本ポイント
    maxRankingEntries: 5, // ランキングの最大表示数
    countdownTime: 3, // カウントダウン時間（秒）
    misTapPenalty: 5, // ミスタップ時の減点
    comboBonus: 2     // コンボボーナス（コンボ数ごとに加算するポイント）
};

// ゲームの状態
let gameState = {
    isPlaying: false,
    score: 0,
    timeLeft: config.gameTime,
    currentLitCell: null,
    timerId: null,
    lightTimerId: null,
    countdownTimerId: null,
    gridSize: config.defaultGridSize,  // 現在のグリッドサイズ
    currentRank: null, // 現在のランキング位置（新記録の場合）
    playerName: '', // プレイヤー名
    isTitle: true, // タイトル画面かどうか
    comboCount: 0  // 連続正解数
};

// DOM要素
const scoreElement = document.getElementById('score');
const timeElement = document.getElementById('time');
const startButton = document.getElementById('start-button');
const gridContainer = document.getElementById('grid');
const gameOverElement = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const titleButton = document.getElementById('title-button');
const difficultySelector = document.getElementById('difficulty');  // 難易度選択要素
const rankingList = document.getElementById('ranking-list');
const rankingDifficulty = document.getElementById('ranking-difficulty');
const newRecordElement = document.getElementById('new-record');
const playerNameInput = document.getElementById('player-name');
const countdownElement = document.getElementById('countdown');
const countdownNumberElement = document.querySelector('.countdown-number');
const missFlashElement = document.getElementById('miss-flash');
const comboDisplayElement = document.getElementById('combo-display');
const comboCountElement = document.getElementById('combo-count');
const resetRankingButton = document.getElementById('reset-ranking');

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
        // コンボカウントを増やす
        gameState.comboCount++;
        
        // タップ成功エフェクト
        showTapSuccessEffect(event.target, event);
        
        // 難易度によってポイントボーナスを追加
        const difficultyBonus = gameState.gridSize - 2; // 3x3で1、4x4で2、...
        
        // コンボボーナスを計算（コンボ数が増えるほどボーナス増加）
        const comboBonus = gameState.comboCount > 1 ? (gameState.comboCount - 1) * config.comboBonus : 0;
        
        // スコア計算
        gameState.score += config.pointsPerTap + difficultyBonus * 2 + comboBonus;
        scoreElement.textContent = gameState.score;
        
        // コンボ表示の更新
        if (gameState.comboCount > 1) {
            comboCountElement.textContent = gameState.comboCount;
            comboDisplayElement.classList.remove('hidden');
            
            // 3秒後にコンボ表示を非表示にする
            setTimeout(() => {
                comboDisplayElement.classList.add('hidden');
            }, 1500);
        }
        
        // 現在光っているセルを消灯
        const currentLitElement = document.querySelector('.cell.lit');
        if (currentLitElement) {
            currentLitElement.classList.remove('lit');
        }
        
        // 次のセルを光らせるタイマーをクリア
        clearTimeout(gameState.lightTimerId);
        
        // 次のセルを光らせる
        lightRandomCell();
    } else {
        // ミスタップした場合の処理
        
        // コンボをリセット
        gameState.comboCount = 0;
        comboDisplayElement.classList.add('hidden');
        
        // ペナルティ（減点）
        gameState.score = Math.max(0, gameState.score - config.misTapPenalty);
        scoreElement.textContent = gameState.score;
        
        // ミスタップ時のフラッシュエフェクト
        showMissFlash();
    }
}

// タップ成功時のエフェクトを表示
function showTapSuccessEffect(cell, event) {
    // セルに一時的にtappedクラスを追加
    cell.classList.add('tapped');
    
    // 波紋エフェクトを作成
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    
    // クリック位置を取得（セル内の相対位置）
    const rect = cell.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 波紋の位置とサイズを設定
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    const diameter = Math.max(rect.width, rect.height);
    ripple.style.width = `${diameter * 0.5}px`;
    ripple.style.height = `${diameter * 0.5}px`;
    
    // 波紋をセルに追加
    cell.appendChild(ripple);
    
    // タップエフェクトを一定時間後に削除
    setTimeout(() => {
        cell.classList.remove('tapped');
        if (ripple.parentNode) {
            ripple.parentNode.removeChild(ripple);
        }
    }, 600);
}

// ミスタップ時のフラッシュエフェクトを表示
function showMissFlash() {
    missFlashElement.classList.remove('hidden');
    
    // アニメーション終了後に非表示に戻す
    setTimeout(() => {
        missFlashElement.classList.add('hidden');
    }, 300);
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

// カウントダウン処理
function startCountdown() {
    // カウントダウン表示を初期化
    let countdownValue = config.countdownTime;
    countdownNumberElement.textContent = countdownValue;
    countdownElement.classList.remove('hidden');
    
    // カウントダウンタイマーの設定
    gameState.countdownTimerId = setInterval(() => {
        countdownValue--;
        
        if (countdownValue > 0) {
            // カウントダウン数字を更新
            countdownNumberElement.textContent = countdownValue;
        } else {
            // カウントダウン終了
            clearInterval(gameState.countdownTimerId);
            countdownElement.classList.add('hidden');
            
            // 実際のゲーム開始
            startGameMain();
        }
    }, 1000);
}

// ゲーム開始（カウントダウン前の準備）
function startGame() {
    // タイトル画面からゲーム画面へ
    gameState.isTitle = false;
    
    // グリッドを選択された難易度で再初期化
    initGrid();
    
    // 状態をリセット
    gameState.isPlaying = false; // カウントダウン中はまだプレイ中にしない
    gameState.score = 0;
    gameState.timeLeft = config.gameTime;
    gameState.currentLitCell = null;
    gameState.currentRank = null;
    gameState.comboCount = 0; // コンボをリセット
    
    // 表示を更新
    scoreElement.textContent = gameState.score;
    timeElement.textContent = gameState.timeLeft;
    startButton.disabled = true;
    difficultySelector.disabled = true; // ゲーム中は難易度選択を無効化
    gameOverElement.classList.add('hidden');
    newRecordElement.classList.add('hidden');
    comboDisplayElement.classList.add('hidden'); // コンボ表示を非表示
    comboCountElement.textContent = '0';
    
    // カウントダウン開始
    startCountdown();
}

// 実際のゲーム開始（カウントダウン後）
function startGameMain() {
    // ゲーム状態を更新
    gameState.isPlaying = true;
    gameState.comboCount = 0; // コンボをリセット
    
    // タイマーを開始
    gameState.timerId = setInterval(updateTimer, 1000);
    
    // 最初のセルを光らせる
    lightRandomCell();
}

// タイトル画面に戻る
function returnToTitle() {
    // ゲームオーバー画面を非表示
    gameOverElement.classList.add('hidden');
    
    // タイトル画面状態にする
    gameState.isTitle = true;
    
    // ボタンとセレクタを有効化
    startButton.disabled = false;
    difficultySelector.disabled = false;
    
    // グリッドを再初期化（難易度変更の反映のため）
    initGrid();
}

// ゲーム終了
function endGame() {
    gameState.isPlaying = false;
    clearInterval(gameState.timerId);
    clearTimeout(gameState.lightTimerId);
    clearInterval(gameState.countdownTimerId);
    
    // カウントダウン表示を隠す（念のため）
    countdownElement.classList.add('hidden');
    comboDisplayElement.classList.add('hidden'); // コンボ表示も非表示
    
    // 光っているセルを消灯
    const litCell = document.querySelector('.cell.lit');
    if (litCell) {
        litCell.classList.remove('lit');
    }
    
    // ゲームオーバー画面を表示
    finalScoreElement.textContent = gameState.score;
    gameOverElement.classList.remove('hidden');
    
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
        
        // ゲームオーバー画面のボタンを隠す
        document.querySelector('.game-over-buttons').classList.add('hidden');
        
        // Enterキーで名前を確定
        playerNameInput.onkeydown = function(e) {
            if (e.key === 'Enter') {
                submitScore();
            }
        };
    } else {
        // 通常の再プレイとタイトルに戻る
        restartButton.onclick = startGame;
        titleButton.onclick = returnToTitle;
    }
    
    // ランキング表示を更新
    updateRankingDisplay();
}

// スコアを登録して次の画面へ
function submitScore(goToTitle = false) {
    const difficulty = gameState.gridSize;
    const score = gameState.score;
    const name = playerNameInput.value.trim() || 'ゲスト';
    
    // ランキングに追加
    const rank = addScoreToRanking(difficulty, score, name);
    gameState.currentRank = rank;
    
    // ランキング表示を更新
    updateRankingDisplay();
    
    // 名前入力フォームを非表示
    document.querySelector('.name-input').classList.add('hidden');
    
    // 「登録しました」メッセージを表示
    const registeredMsg = document.createElement('p');
    registeredMsg.className = 'registered-message';
    registeredMsg.textContent = '登録しました！';
    
    // すでにメッセージがある場合は追加しない
    if (!document.querySelector('.registered-message')) {
        newRecordElement.appendChild(registeredMsg);
    }
    
    // ボタンを表示して選択可能にする
    document.querySelector('.game-over-buttons').classList.remove('hidden');
    
    // ボタンのイベントリスナーを設定
    restartButton.onclick = startGame;
    titleButton.onclick = returnToTitle;
    
    // タイトルに戻るフラグが立っている場合（前の実装との互換性のため）
    if (goToTitle) {
        returnToTitle();
    }
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

// ランキングをリセットする
function resetRanking() {
    if (confirm('現在の難易度のランキングをリセットしますか？\n※この操作は元に戻せません。')) {
        const difficulty = gameState.gridSize;
        
        // 空のランキングで上書き保存
        saveRanking(difficulty, []);
        
        // ランキング表示を更新
        updateRankingDisplay();
        
        // 確認アラート
        alert(`${getDifficultyName(difficulty)}のランキングをリセットしました。`);
    }
}

// 全難易度のランキングをリセットする
function resetAllRankings() {
    if (confirm('全ての難易度のランキングをリセットしますか？\n※この操作は元に戻せません。')) {
        // 全ての難易度のランキングをリセット
        [3, 4, 5, 6].forEach(difficulty => {
            saveRanking(difficulty, []);
        });
        
        // ランキング表示を更新
        updateRankingDisplay();
        
        // 確認アラート
        alert('全ての難易度のランキングをリセットしました。');
    }
}

// イベントリスナー
startButton.addEventListener('click', startGame);
titleButton.addEventListener('click', returnToTitle);
resetRankingButton.addEventListener('click', function(e) {
    // Shiftキーを押しながらクリックで全難易度リセット
    if (e.shiftKey) {
        resetAllRankings();
    } else {
        // 通常クリックで現在の難易度のみリセット
        resetRanking();
    }
});

// ページロード時にゲームを初期化
window.addEventListener('load', initGame);
