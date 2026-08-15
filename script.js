/* ==========================================================
   Ultimate Werewolf - النسخة الكلاسيكية (إصلاح الخلفية وتصفير دائرة الأيقونة عند التمرير)
   ========================================================== */

const GameImages = {
    appLogo: "https://placehold.co/150x150/1a1614/d4af37?text=🐺",
    
    roleBackgrounds: {
        werewolf: "wolf.png", 
        doctor: "https://placehold.co/400x800/081a14/10b981?text=---",   
        seer: "https://placehold.co/400x800/08121f/3b82f6?text=---",     
        villager: "https://placehold.co/400x800/141210/d4af37?text=---", 
        default: "https://placehold.co/400x800/12100e/d4af37?text=---"  
    },

    passCardBg: "https://placehold.co/200x250/1a1614/d4af37?text=بطاقة+السر",
    votingIcon: "https://placehold.co/100x100/1a1614/d4af37?text=⚖️",
    winIcon: "https://placehold.co/120x120/1a1614/d4af37?text=🏆",

    modalIcons: {
        doctor: "https://placehold.co/100x100/1a1614/10b981?text=💉",
        werewolf: "wolf.png",
        seer: "https://placehold.co/100x100/1a1614/3b82f6?text=🔮",
        voting: "https://placehold.co/100x100/1a1614/d4af37?text=⚖️",
        default: "https://placehold.co/100x100/1a1614/d4af37?text=📜"
    },

    roles: {
        werewolf: "wolf.png",
        doctor: "https://placehold.co/80x80/10b981/000?text=💉",
        seer: "https://placehold.co/80x80/3b82f6/000?text=🔮",
        villager: "https://placehold.co/80x80/d4af37/000?text=🧑",
        neutral: "https://placehold.co/80x80/1a1614/d4af37?text=❓"
    }
};

let gameSettings = {
    discussionTime: 90,
    votingTime: 45
};

let discussionInterval = null;
let votingInterval = null;

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('app-logo-img').src = GameImages.appLogo;
    document.getElementById('pass-card-bg-img').src = GameImages.passCardBg;
    document.getElementById('voting-screen-img').src = GameImages.votingIcon;
    document.getElementById('gameover-img-icon').src = GameImages.winIcon;
    
    document.getElementById('app-container').style.backgroundImage = `url('${GameImages.roleBackgrounds.default}')`;
    GameSetup.renderList();
});

const App = {
    switchTab(screenId, btnElement) {
        document.getElementById('app-container').style.backgroundImage = `url('${GameImages.roleBackgrounds.default}')`;
        
        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');

        if (btnElement) {
            document.querySelectorAll('.bottom-nav-bar .nav-item').forEach(b => b.classList.remove('active'));
            btnElement.classList.add('active');
        }
    },
    
    toggleTheme() {
        const body = document.body;
        if (body.classList.contains('dark-mode')) {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
        } else {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
        }
    }
};

const ModalSystem = {
    show(title, message, imageKey = 'default') {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-message').innerHTML = message;
        document.getElementById('modal-icon-img').src = GameImages.modalIcons[imageKey] || imageKey;
        document.getElementById('custom-modal-overlay').classList.remove('hidden');
    },
    close() {
        document.getElementById('custom-modal-overlay').classList.add('hidden');
    }
};

let configPlayers = [
    { name: "صالح" },
    { name: "فاطمة" },
    { name: "عمر" },
    { name: "زينب" },
    { name: "خالد" },
    { name: "مريم" },
    { name: "حسين" },
    { name: "سعاد" }
];

const GameSetup = {
    renderList() {
        const container = document.getElementById('players-config-container');
        if (!container) return;
        container.innerHTML = '';
        configPlayers.forEach((p, index) => {
            container.innerHTML += `
                <div class="player-config-row">
                    <div class="player-index-badge">${index + 1}</div>
                    <input type="text" value="${p.name}" oninput="configPlayers[${index}].name = this.value">
                    <button class="action-icon-btn" title="تعديل"><i class="fa-solid fa-pen"></i></button>
                    ${configPlayers.length > 3 ? `<button class="action-icon-btn delete" onclick="GameSetup.removePlayer(${index})" title="حذف"><i class="fa-solid fa-trash"></i></button>` : ''}
                </div>
            `;
        });
        document.getElementById('main-players-count').innerText = `${configPlayers.length} سكان`;
    },
    addPlayer() {
        const nextId = configPlayers.length + 1;
        configPlayers.push({ name: `الساكن ${nextId}` });
        this.renderList();
    },
    removePlayer(index) {
        configPlayers.splice(index, 1);
        this.renderList();
    },
    
    adjustTime(type, amount) {
        if (type === 'discussionTime') {
            gameSettings.discussionTime = Math.max(30, gameSettings.discussionTime + amount);
            document.getElementById('setting-discussion-time').innerText = `${gameSettings.discussionTime} ثانية`;
        } else if (type === 'votingTime') {
            gameSettings.votingTime = Math.max(15, gameSettings.votingTime + amount);
            document.getElementById('setting-voting-time').innerText = `${gameSettings.votingTime} ثانية`;
        }
    },

    startDistribution() {
        GameFlow.initGame(1, 1, 1);
    }
};

let gamePlayers = [];
let nightQueue = [];
let currentNightIndex = 0;
let nightState = { targetId: null, protectedId: null };
let lastVictimName = null;
let wasPlayerSaved = false;

const GameFlow = {
    initGame(ww, doc, seer) {
        gamePlayers = configPlayers.map((p, idx) => ({
            id: idx, name: p.name, role: 'villager', isAlive: true
        }));

        let assigned = 0;
        while (assigned < ww) {
            let r = Math.floor(Math.random() * gamePlayers.length);
            if (gamePlayers[r].role === 'villager') { gamePlayers[r].role = 'werewolf'; assigned++; }
        }
        assigned = 0;
        while (assigned < doc) {
            let r = Math.floor(Math.random() * gamePlayers.length);
            if (gamePlayers[r].role === 'villager') { gamePlayers[r].role = 'doctor'; assigned++; }
        }
        assigned = 0;
        while (assigned < seer) {
            let r = Math.floor(Math.random() * gamePlayers.length);
            if (gamePlayers[r].role === 'villager') { gamePlayers[r].role = 'seer'; assigned++; }
        }

        this.startNightPhase();
    },

    startNightPhase() {
        if (discussionInterval) clearInterval(discussionInterval);
        if (votingInterval) clearInterval(votingInterval);

        nightState.targetId = null;
        nightState.protectedId = null;
        nightQueue = [];

        gamePlayers.forEach(p => {
            if (p.isAlive) nightQueue.push({ type: p.role, player: p });
        });

        currentNightIndex = 0;
        this.loadNextNightStep();
    },

    loadNextNightStep() {
        if (currentNightIndex >= nightQueue.length) {
            this.resolveNight();
            return;
        }

        const step = nightQueue[currentNightIndex];
        
        // 1. إعادة الخلفية للوضع الافتراضي تماماً عند التمرير
        document.getElementById('app-container').style.backgroundImage = `url('${GameImages.roleBackgrounds.default}')`;

        // 2. تصفير وإعادة تعيين دائرة الأيقونة لشكل محايد لمنع كشف الدور السابق
        document.getElementById('current-role-img-badge').src = GameImages.roles.neutral;

        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
        document.getElementById('pass-screen').classList.add('active');

        // إخفاء صندوق رقم الساكن تماماً إذا لم تقم بحذفه من الـ HTML
document.getElementById('pass-player-number-badge').style.display = 'none';

// إظهار اسم الشخص فقط
document.getElementById('pass-player-name-text').innerText = step.player.name;

        document.getElementById('role-reveal-box').classList.remove('revealed');
        document.getElementById('reveal-btn').classList.remove('hidden');
        document.getElementById('next-night-btn').classList.add('hidden');
    },

    revealNightAction() {
        const step = nightQueue[currentNightIndex];
        
        // تغيير الخلفية ودائرة الأيقونة الآن فقط بعد ضغط زر كشف الدور
        const bgUrl = GameImages.roleBackgrounds[step.type] || GameImages.roleBackgrounds.default;
        document.getElementById('app-container').style.backgroundImage = `url('${bgUrl}')`;

        document.getElementById('role-reveal-box').classList.add('revealed');
        document.getElementById('current-role-img-badge').src = GameImages.roles[step.type];

        const titleEl = document.getElementById('role-name-display');
        const descEl = document.getElementById('role-desc-display');
        const container = document.getElementById('night-action-buttons-container');
        container.innerHTML = '';

        if (step.type === 'villager') {
            titleEl.innerText = 'مواطن بريء';
            descEl.innerText = 'أنت من سكان القرية الأبرياء. نم بسلام وانتظر الصباح.';
        } else if (step.type === 'seer') {
            titleEl.innerText = 'عراف القرية';
            descEl.innerText = 'استخدم بصيرتك لكشف حقيقة أحد السكان سراً.';
            gamePlayers.forEach(p => {
                if (p.isAlive) container.innerHTML += `<button class="btn-classic" style="margin:4px 0; padding:8px; font-size:0.85rem;" onclick="GameFlow.doSeerAction(${p.id})">فحص: ${p.name}</button>`;
            });
        } else if (step.type === 'doctor') {
            titleEl.innerText = 'طبيب القرية';
            descEl.innerText = 'اختر شخصاً لحمايته من مخالب الذئاب هذه الليلة.';
            gamePlayers.forEach(p => {
                if (p.isAlive) container.innerHTML += `<button class="btn-classic" style="margin:4px 0; padding:8px; font-size:0.85rem; border-color:#10b981; color:#10b981;" onclick="GameFlow.doDoctorAction(${p.id})">حماية: ${p.name}</button>`;
            });
        } else if (step.type === 'werewolf') {
            titleEl.innerText = 'مستذئب';
            descEl.innerText = 'الظلام يحالفك. اختر ضحيتك التالية من القرية بحذر.';
            gamePlayers.forEach(p => {
                if (p.isAlive) container.innerHTML += `<button class="btn-classic" style="margin:4px 0; padding:8px; font-size:0.85rem; border-color:#8b0000; color:#ef4444;" onclick="GameFlow.doWerewolfAction(${p.id})">افتراس: ${p.name}</button>`;
            });
        }

        document.getElementById('reveal-btn').classList.add('hidden');
        if (step.type === 'villager') {
            document.getElementById('next-night-btn').classList.remove('hidden');
        }
    },

    doSeerAction(targetId) {
        const target = gamePlayers.find(p => p.id === targetId);
        const isWW = target.role === 'werewolf';
        ModalSystem.show('نتيجة البصيرة', `بعد التمعن، تبين أن (${target.name}):<br><strong>${isWW ? 'مستذئب يتربص بالقرية 🐺!' : 'مواطن بريء 🧑'}</strong>`, 'seer');
        this.finishStep();
    },

    doDoctorAction(targetId) {
        nightState.protectedId = targetId;
        ModalSystem.show('حماية الطبيب', 'تم وضع الحراسة الطبية المطلوبة.', 'doctor');
        this.finishStep();
    },

    doWerewolfAction(targetId) {
        nightState.targetId = targetId;
        ModalSystem.show('قرار الافتراس', 'تم اختيار الضحية في الظلام الدامس.', 'werewolf');
        this.finishStep();
    },

    finishStep() {
        // إعادة الخلفية وتصفير دائرة الأيقونة للوضع الافتراضي فوراً عند اختيار القرار
        document.getElementById('app-container').style.backgroundImage = `url('${GameImages.roleBackgrounds.default}')`;
        document.getElementById('current-role-img-badge').src = GameImages.roles.neutral;
        
        document.getElementById('role-reveal-box').classList.remove('revealed');
        document.getElementById('next-night-btn').classList.remove('hidden');
        document.getElementById('night-action-buttons-container').innerHTML = '';
    },

    proceedNextNightStep() {
        currentNightIndex++;
        this.loadNextNightStep();
    },

    resolveNight() {
        document.getElementById('app-container').style.backgroundImage = `url('${GameImages.roleBackgrounds.default}')`;
        document.getElementById('current-role-img-badge').src = GameImages.roles.neutral;

        if (nightState.targetId !== null) {
            const target = gamePlayers.find(p => p.id === nightState.targetId);
            if (target) {
                lastVictimName = target.name;
                if (nightState.targetId === nightState.protectedId) {
                    wasPlayerSaved = true;
                } else {
                    wasPlayerSaved = false;
                    target.isAlive = false;
                }
            }
        } else {
            lastVictimName = "أحد السكان";
            wasPlayerSaved = true;
        }
        this.startDayPhase();
    },

    startDayPhase() {
        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
        document.getElementById('day-screen').classList.add('active');
        const resBox = document.getElementById('night-result-box');
        if (wasPlayerSaved) {
            resBox.innerHTML = `<strong>✨ معجزة الصباح:</strong> حاول المستذئبون الهجوم على <strong>${lastVictimName}</strong>، ولكن تدخل الطبيب أنقذه في اللحظة الأخيرة!`;
        } else {
            resBox.innerHTML = `<strong>💀 فاجعة القرية:</strong> استيقظ السكان على خبر افتراس <strong>${lastVictimName}</strong> في ظلام الليلة!`;
        }

        let timeLeft = gameSettings.discussionTime;
        const timerEl = document.getElementById('discussion-timer');
        timerEl.innerText = timeLeft;

        if (discussionInterval) clearInterval(discussionInterval);
        discussionInterval = setInterval(() => {
            timeLeft--;
            timerEl.innerText = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(discussionInterval);
            }
        }, 1000);
    },

    goToVoting() {
        if (discussionInterval) clearInterval(discussionInterval);
        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
        document.getElementById('voting-screen').classList.add('active');
        
        const list = document.getElementById('voting-list-container');
        list.innerHTML = '';

        gamePlayers.forEach(p => {
            if (p.isAlive) {
                list.innerHTML += `
                    <div class="player-config-row">
                        <span style="font-weight:600; font-size:0.88rem;">${p.name}</span>
                        <button class="btn-classic" style="width: auto; padding:4px 10px; margin:0; font-size:0.78rem; border-color:#b91c1c; color:#ef4444;" onclick="GameFlow.executePlayer(${p.id})">إعدام</button>
                    </div>
                `;
            }
        });

        let voteTimeLeft = gameSettings.votingTime;
        const voteTimerEl = document.getElementById('vote-timer-count');
        voteTimerEl.innerText = voteTimeLeft;

        if (votingInterval) clearInterval(votingInterval);
        votingInterval = setInterval(() => {
            voteTimeLeft--;
            voteTimerEl.innerText = voteTimeLeft;
            if (voteTimeLeft <= 0) {
                clearInterval(votingInterval);
            }
        }, 1000);
    },

    executePlayer(id) {
        if (votingInterval) clearInterval(votingInterval);
        const target = gamePlayers.find(p => p.id === id);
        target.isAlive = false;
        const isWW = target.role === 'werewolf';
        ModalSystem.show('حكم المحكمة', `تم تنفيذ حكم الإعدام بحق <strong>${target.name}</strong>.<br>اتضح أنه: <strong>${isWW ? 'مستذئب 🐺' : 'مواطن بريء 🧑'}</strong>`, 'voting');
        
        document.querySelector('.modal-card .btn-classic').onclick = () => {
            ModalSystem.close();
            this.checkWinCondition();
        };
    },

    checkWinCondition() {
        const alive = gamePlayers.filter(p => p.isAlive);
        const aliveWW = alive.filter(p => p.role === 'werewolf');
        const aliveVillagers = alive.filter(p => p.role !== 'werewolf');

        if (aliveWW.length === 0) {
            this.showGameOver('📜 انتصار القرويين', 'تم تطهير القرية بالكامل من المستذئبين.');
            return;
        }
        if (aliveWW.length >= aliveVillagers.length) {
            this.showGameOver('🐺 سيطرة الذئب', 'التهمت المستذئبين القرية بكاملها.');
            return;
        }
        this.startNightPhase();
    },

    showGameOver(title, desc) {
        if (discussionInterval) clearInterval(discussionInterval);
        if (votingInterval) clearInterval(votingInterval);
        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
        document.getElementById('gameover-screen').classList.add('active');
        document.getElementById('winner-title').innerText = title;
        document.getElementById('winner-desc').innerText = desc;
    }
};