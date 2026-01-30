/* ============================
   🧠 BRAINFORGE ENGINE v1.3
   Robust Unity Ads Integration
   ============================ */

// --- UNITY ADS CONFIGURATION & LOADING ---
let gameId = '5709035'; // YOUR GAME ID
let rewardedPlacementId = 'rewardedVideo';
let unityAdsLoaded = false;

// Dynamic SDK Loader
function loadUnityAds() {
    // If already loaded via HTML script tag, init immediately
    if (typeof unityAds !== 'undefined') {
        initUnityAds();
        return;
    }

    const script = document.createElement('script');
    script.src = 'https://services.unityads.unity3d.com/web/v1/sdk.js';
    script.async = true;
    
    script.onload = () => {
        // Script file loaded, now initialize the internal logic
        initUnityAds();
    };
    
    script.onerror = () => {
        console.warn('Unity Ads SDK load failed - AdBlock or network issue');
    };
    
    document.head.appendChild(script);
}

// Initialization Logic
function initUnityAds() {
    if (typeof unityAds === 'undefined') return;

    const adListener = {
        onUnityAdsReady: (placementId) => {
            console.log('Ad ready:', placementId);
        },
        onUnityAdsStart: (placementId) => {
            console.log('Ad started');
        },
        onUnityAdsFinish: (placementId, state) => {
            if (state === 'COMPLETED') {
                // Reward the user
                AppStore.data.xp += 50;
                AppStore.save();
                alert('Ad Bonus: +50 XP Awarded! 🚀');
                // Refresh UI to show new XP
                AppStore.updateUI();
            }
        },
        onUnityAdsError: (error, message) => {
            console.error('Unity Ads Error:', error, message);
        }
    };

    try {
        unityAds.setReadyListener(adListener.onUnityAdsReady);
        unityAds.init(gameId, adListener);
        unityAdsLoaded = true;
    } catch (e) {
        console.warn("Error initializing Unity Ads:", e);
    }
}

// Start loading immediately
loadUnityAds();


// --- STATE MANAGEMENT ---
const AppStore = {
    data: {
        iq: 100,
        xp: 0,
        level: 1,
        streak: 0,
        lastPlayed: null,
        scores: { logic: 50, mem: 50, speed: 50, focus: 50 }
    },
    
    init() {
        const saved = localStorage.getItem('brainforge_save');
        if (saved) this.data = JSON.parse(saved);
        this.updateUI();
    },

    save() {
        localStorage.setItem('brainforge_save', JSON.stringify(this.data));
        this.updateUI();
    },

    addXP(amount, type, accuracy) {
        this.data.xp += amount;
        
        // Dynamic IQ Adjustment
        const expectedAcc = 0.7; 
        const diff = accuracy - expectedAcc; 
        
        let iqShift = diff * 5; 
        if (this.data.iq > 140) iqShift *= 0.5; 
        
        this.data.iq = Math.max(70, Math.min(180, Math.floor(this.data.iq + iqShift)));
        
        if(type) {
            this.data.scores[type] = Math.min(100, Math.max(0, this.data.scores[type] + (diff * 10)));
        }

        this.checkLevelUp();
        this.save();
        return Math.floor(iqShift);
    },

    checkLevelUp() {
        const threshold = this.data.level * 500;
        if (this.data.xp >= threshold) {
            this.data.level++;
            alert(`LEVEL UP! You are now level ${this.data.level}`);
        }
    },

    getTitle() {
        const iq = this.data.iq;
        if (iq < 90) return "Novice";
        if (iq < 110) return "Thinker";
        if (iq < 130) return "Analyst";
        if (iq < 145) return "Genius";
        return "Mastermind";
    },

    updateUI() {
        document.getElementById('user-iq').innerText = `IQ: ${this.data.iq}`;
        document.getElementById('user-title').innerText = this.getTitle();
        document.getElementById('xp-bar').style.width = `${(this.data.xp % 500) / 5}%`;
        document.getElementById('streak-count').innerText = this.data.streak;
        
        ['logic', 'mem', 'speed', 'focus'].forEach(k => {
            const el = document.getElementById(`meter-${k}`);
            if(el) el.style.height = `${this.data.scores[k]}%`;
        });
    }
};


// --- GAME ENGINE ---
const GameEngine = {
    activeGame: null,
    timer: null,
    timeLeft: 0,
    score: 0,
    questionsCorrect: 0,
    questionsTotal: 0,
    isPlaying: false,

    startGame(gameId) {
        this.activeGame = Games[gameId];
        this.score = 0;
        this.questionsCorrect = 0;
        this.questionsTotal = 0;
        this.timeLeft = 60; 
        this.isPlaying = true;
        
        UI.showView('view-game');
        document.getElementById('current-score').innerText = '0';
        
        this.nextRound();
        this.startTimer();
    },

    nextRound() {
        if (!this.isPlaying) return;
        
        const difficulty = Math.floor(AppStore.data.iq / 20) + Math.floor(this.questionsCorrect / 3);
        const data = this.activeGame.generate(difficulty);
        
        const canvas = document.getElementById('game-canvas');
        canvas.innerHTML = '';
        canvas.appendChild(data.element);
        
        this.currentAnswer = data.answer;
    },

    checkAnswer(userVal) {
        if (!this.isPlaying) return;

        this.questionsTotal++;
        const isCorrect = userVal === this.currentAnswer;
        
        const feedback = document.getElementById('feedback-overlay');
        feedback.className = `feedback ${isCorrect ? 'correct' : 'wrong'}`;
        feedback.innerHTML = isCorrect ? '&#10003;' : '&#10007;'; 
        feedback.style.opacity = '1';
        
        setTimeout(() => feedback.style.opacity = '0', 300);

        if (isCorrect) {
            this.score += 10 + (Math.floor(this.timeLeft / 10)); 
            this.questionsCorrect++;
            document.getElementById('current-score').innerText = this.score;
        } else {
            document.body.classList.add('shake');
            setTimeout(() => document.body.classList.remove('shake'), 400);
        }

        setTimeout(() => this.nextRound(), 400);
    },

    startTimer() {
        const bar = document.getElementById('timer-fill');
        this.timer = setInterval(() => {
            this.timeLeft--;
            const pct = (this.timeLeft / 60) * 100;
            if(bar) bar.style.width = `${pct}%`;
            
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);
    },

    endGame() {
        clearInterval(this.timer);
        this.isPlaying = false;
        
        const accuracy = this.questionsTotal > 0 ? (this.questionsCorrect / this.questionsTotal) : 0;
        const iqGain = AppStore.addXP(this.score, this.activeGame.type, accuracy);
        
        // Show Results UI
        document.getElementById('result-score').innerText = this.score;
        document.getElementById('result-acc').innerText = Math.round(accuracy * 100) + '%';
        document.getElementById('result-iq').innerText = (iqGain >= 0 ? '+' : '') + iqGain;
        document.getElementById('result-message').innerText = this.score > 300 ? "Brain on Fire!" : "Keep Training!";
        
        UI.showView('view-results');

        // --- UPDATED AD SHOW LOGIC ---
        // Check if loaded, defined, and ready before showing
        if (unityAdsLoaded && typeof unityAds !== 'undefined' && 
            unityAds.getPlacementState(rewardedPlacementId) === 'READY') {
            unityAds.show(rewardedPlacementId);
        } else {
            console.log('Ad skipped - not ready or loaded');
        }
    }
};


// --- GAME MODULES ---
const Games = {
    // 1. MATH RUSH
    math: {
        type: 'speed',
        generate(diff) {
            const ops = ['+', '-', '*'];
            if(diff > 5) ops.push('/');
            
            const op = ops[Math.floor(Math.random() * (diff > 5 ? 4 : 2))]; 
            let a = Math.floor(Math.random() * (diff * 5)) + 1;
            let b = Math.floor(Math.random() * (diff * 5)) + 1;
            let ans;

            if (op === '/') { a = b * (Math.floor(Math.random() * 5) + 1); ans = a / b; }
            else if (op === '*') { a = Math.floor(Math.random() * 10); b = Math.floor(Math.random() * 10); ans = a * b; }
            else if (op === '-') { if(a < b) [a, b] = [b, a]; ans = a - b; }
            else { ans = a + b; }

            let options = new Set([ans]);
            while(options.size < 4) {
                let offset = Math.floor(Math.random() * 10) - 5;
                if (offset !== 0) options.add(ans + offset);
            }
            const optsArr = Array.from(options).sort(() => Math.random() - 0.5);

            const div = document.createElement('div');
            div.innerHTML = `<div class="big-text">${a} ${op.replace('*', '×').replace('/', '÷')} ${b} = ?</div>`;
            
            const grid = document.createElement('div');
            grid.className = 'btn-grid';
            optsArr.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'game-btn';
                btn.innerText = opt;
                btn.onclick = () => GameEngine.checkAnswer(opt);
                grid.appendChild(btn);
            });
            div.appendChild(grid);

            return { element: div, answer: ans };
        }
    },

    // 2. ODD ONE OUT
    odd: {
        type: 'logic',
        generate(diff) {
            const sets = [
                { cat: 'Fruit', items: ['Apple', 'Banana', 'Grape', 'Orange'] },
                { cat: 'Vehicle', items: ['Car', 'Bus', 'Bike', 'Truck'] },
                { cat: 'Color', items: ['Red', 'Blue', 'Green', 'Yellow'] },
                { cat: 'Furniture', items: ['Chair', 'Table', 'Sofa', 'Bed'] },
                { cat: 'Numbers', items: ['2', '4', '6', '8'] } 
            ];

            const targetSet = sets[Math.floor(Math.random() * sets.length)];
            const distractorSet = sets.filter(s => s !== targetSet)[Math.floor(Math.random() * (sets.length - 1))];
            
            const correctItems = targetSet.items.sort(() => 0.5 - Math.random()).slice(0, 3);
            const wrongItem = distractorSet.items[Math.floor(Math.random() * 4)];
            
            const allItems = [...correctItems, wrongItem].sort(() => 0.5 - Math.random());
            
            const div = document.createElement('div');
            div.innerHTML = `<div class="instruction">Select the odd one out</div>`;
            const grid = document.createElement('div');
            grid.className = 'btn-grid'; 
            
            allItems.forEach(item => {
                const btn = document.createElement('button');
                btn.className = 'game-btn';
                btn.innerText = item;
                btn.onclick = () => GameEngine.checkAnswer(item === wrongItem ? 1 : 0);
                grid.appendChild(btn);
            });
            div.appendChild(grid);
            
            return { element: div, answer: 1 };
        }
    },

    // 3. REVERSE THINKING
    reverse: {
        type: 'focus',
        generate(diff) {
            const directions = ['Left', 'Right', 'Up', 'Down'];
            const arrows = ['⬅️', '➡️', '⬆️', '⬇️']; 
            
            const isReverse = Math.random() > 0.5;
            const targetIdx = Math.floor(Math.random() * 4);
            
            const div = document.createElement('div');
            div.innerHTML = `
                <div class="instruction" style="color:${isReverse ? 'var(--error)' : 'var(--success)'}; font-weight:bold; font-size:1.2rem;">
                    ${isReverse ? 'OPPOSITE OF:' : 'MATCH:'}
                </div>
                <div class="big-text">${directions[targetIdx]}</div>
            `;
            
            const grid = document.createElement('div');
            grid.className = 'btn-grid';
            
            let correctIdx = targetIdx;
            if(isReverse) {
                if(targetIdx === 0) correctIdx = 1;
                else if(targetIdx === 1) correctIdx = 0;
                else if(targetIdx === 2) correctIdx = 3;
                else if(targetIdx === 3) correctIdx = 2;
            }

            arrows.forEach((arrow, idx) => {
                const btn = document.createElement('button');
                btn.className = 'game-btn';
                btn.innerText = arrow;
                btn.onclick = () => GameEngine.checkAnswer(idx === correctIdx ? 1 : 0);
                grid.appendChild(btn);
            });
            div.appendChild(grid);

            return { element: div, answer: 1 };
        }
    },

    // 4. MEMORY GRID
    memory: {
        type: 'mem',
        generate(diff) {
            const gridSize = diff > 4 ? 4 : 3; 
            const numTargets = Math.floor(diff / 2) + 3;
            
            const totalCells = gridSize * gridSize;
            let indices = Array.from({length: totalCells}, (_, i) => i);
            indices.sort(() => Math.random() - 0.5);
            const targets = indices.slice(0, numTargets);
            
            const div = document.createElement('div');
            div.className = 'mem-grid';
            div.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
            
            let userSelection = [];
            
            for(let i=0; i<totalCells; i++) {
                const cell = document.createElement('div');
                cell.className = 'mem-cell';
                cell.id = `cell-${i}`;
                cell.onclick = () => {
                    if (cell.classList.contains('active')) return; 
                    
                    if (targets.includes(i)) {
                        cell.classList.add('correct');
                        userSelection.push(i);
                        if (userSelection.length === targets.length) {
                             GameEngine.checkAnswer(true);
                        }
                    } else {
                        cell.classList.add('wrong');
                        setTimeout(() => GameEngine.checkAnswer(false), 200);
                    }
                };
                div.appendChild(cell);
            }

            setTimeout(() => {
                targets.forEach(t => {
                    const c = div.children[t];
                    c.classList.add('active');
                });
                
                setTimeout(() => {
                    targets.forEach(t => {
                        const c = div.children[t];
                        c.classList.remove('active');
                    });
                }, 1000 - (diff * 50));
            }, 500);

            return { element: div, answer: true }; 
        }
    },
    
    // 5. DECISION
    decision: {
        type: 'speed',
        generate(diff) {
            const types = ['math', 'color', 'fact'];
            const type = types[Math.floor(Math.random() * types.length)];
            let question = "", isTrue = false;

            if (type === 'math') {
                const a = Math.floor(Math.random() * 20);
                const b = Math.floor(Math.random() * 20);
                const sum = a + b;
                const fake = sum + (Math.random() > 0.5 ? 1 : -1);
                isTrue = Math.random() > 0.5;
                question = `${a} + ${b} = ${isTrue ? sum : fake}`;
            } else if (type === 'color') {
                const colors = ['Red', 'Blue', 'Green'];
                const text = colors[Math.floor(Math.random()*3)];
                const color = colors[Math.floor(Math.random()*3)]; 
                
                const displayColor = Math.random() > 0.5 ? text : color;
                question = `<span style="color:${displayColor.toLowerCase()}">${text}</span>`; 
                isTrue = (text === displayColor);
            } else {
                 const a = Math.floor(Math.random() * 50);
                 const b = Math.floor(Math.random() * 50);
                 isTrue = a > b;
                 question = `${a} > ${b}`;
            }

            const div = document.createElement('div');
            div.innerHTML = `<div class="big-text">${question}</div>`;
            const grid = document.createElement('div');
            grid.className = 'btn-grid';
            
            const btnYes = document.createElement('button');
            btnYes.className = 'game-btn'; btnYes.innerText = 'YES';
            btnYes.onclick = () => GameEngine.checkAnswer(isTrue);

            const btnNo = document.createElement('button');
            btnNo.className = 'game-btn'; btnNo.innerText = 'NO';
            btnNo.onclick = () => GameEngine.checkAnswer(!isTrue);

            grid.appendChild(btnYes);
            grid.appendChild(btnNo);
            div.appendChild(grid);

            return { element: div, answer: true };
        }
    },
    
    // 6. PATTERN
    pattern: {
        type: 'logic',
        generate(diff) {
            const start = Math.floor(Math.random() * 10);
            const step = Math.floor(Math.random() * 5) + 1;
            const mult = Math.floor(Math.random() * 2) + 1;
            
            let seq = [];
            for(let i=0; i<4; i++) {
                let val = start + (i * step);
                if(diff > 5) val = start * Math.pow(mult, i);
                seq.push(val);
            }
            
            const ans = diff > 5 ? (start * Math.pow(mult, 4)) : (start + (4 * step));
            
            const opts = new Set([ans]);
            while(opts.size < 4) opts.add(ans + Math.floor(Math.random()*10) - 5);
            
            const div = document.createElement('div');
            div.innerHTML = `<div class="big-text">${seq.join(', ')}, ?</div>`;
            const grid = document.createElement('div');
            grid.className = 'btn-grid';
            
            Array.from(opts).sort().forEach(o => {
                const btn = document.createElement('button');
                btn.className = 'game-btn';
                btn.innerText = o;
                btn.onclick = () => GameEngine.checkAnswer(o);
                grid.appendChild(btn);
            });
            div.appendChild(grid);
            
            return { element: div, answer: ans };
        }
    },

    // 7. FOCUS
    focus: {
        type: 'focus',
        generate(diff) {
            const chars = ['R', 'P', 'B', '8', '6', '9'];
            const target = chars[Math.floor(Math.random()*chars.length)];
            const distractor = chars.filter(c => c !== target)[0];
            
            const count = 3 + Math.floor(diff/2);
            let arr = Array(12).fill(distractor);
            for(let i=0; i<count; i++) arr[i] = target;
            arr.sort(() => Math.random() - 0.5);
            
            const div = document.createElement('div');
            div.innerHTML = `<div class="instruction">Tap all <span style="color:var(--primary); font-weight:bold; font-size:1.5rem;">${target}</span></div>`;
            const grid = document.createElement('div');
            grid.className = 'mem-grid';
            grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
            
            let found = 0;
            
            arr.forEach(char => {
                const btn = document.createElement('button');
                btn.className = 'game-btn';
                btn.style.padding = '10px';
                btn.innerText = char;
                btn.onclick = (e) => {
                    if(e.target.disabled) return;
                    if(char === target) {
                        e.target.style.background = 'var(--success)';
                        found++;
                        e.target.disabled = true;
                        if(found === count) GameEngine.checkAnswer(true);
                    } else {
                        e.target.style.background = 'var(--error)';
                        setTimeout(() => GameEngine.checkAnswer(false), 200);
                    }
             
