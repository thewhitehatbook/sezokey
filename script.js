let players = [];
let currentSecretIdx = 0;
let roundNum = 1;
let soundEnabled = true;
let gameLogs = [];

let nightData = {
    wolfTarget: null,
    doctorTarget: null,
    guardTarget: null,
    witchAction: 'none',
    witchPoisonTarget: null
};

// --- دوال الصوت والتحققات الآمنة ---
function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('sound-toggle-btn');
    if (btn) btn.innerText = soundEnabled ? '🔊 الصوت: مفعل' : '🔇 الصوت: صامت';
}

function playAudioSafe(id) {
    if (!soundEnabled) return;
    try {
        const el = document.getElementById(id);
        if (el) {
            el.currentTime = 0;
            el.play().catch(() => {});
        }
    } catch(e) {}
}

function addLog(text) {
    gameLogs.unshift(`الجولة ${roundNum}: ${text}`);
    updateLogBoard();
}

function updateLogBoard() {
    const ul = document.getElementById('game-log-ul');
    if (!ul) return;
    ul.innerHTML = '';
    gameLogs.forEach(log => {
        const li = document.createElement('li');
        li.innerText = log;
        ul.appendChild(li);
    });
}

// --- إدارة اللاعبين ---
function addPlayer() {
    playAudioSafe('audio-click');
    const input = document.getElementById('name-input');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;

    if (players.some(p => p.name === name)) {
        alert('الاسم موجود مسبقاً!');
        return;
    }

    players.push({ 
        id: Date.now() + Math.random(), 
        name: name, 
        role: '', 
        alive: true,
        hasHeal: true,
        hasPoison: true 
    });
    input.value = '';
    renderTags();
}

function addBulkPlayers() {
    playAudioSafe('audio-click');
    const area = document.getElementById('bulk-input');
    if (!area) return;
    const text = area.value.trim();
    if (!text) return;

    const names = text.split(/[\n,]+/).map(n => n.trim()).filter(n => n.length > 0);
    names.forEach(n => {
        if (!players.some(p => p.name === n)) {
            players.push({ 
                id: Date.now() + Math.random(), 
                name: n, 
                role: '', 
                alive: true,
                hasHeal: true,
                hasPoison: true 
            });
        }
    });
    area.value = '';
    renderTags();
}

function removePlayer(id) {
    playAudioSafe('audio-click');
    players = players.filter(p => p.id !== id);
    renderTags();
}

function renderTags() {
    const ul = document.getElementById('tags-ul');
    const countSpan = document.getElementById('count-span');
    if (!ul) return;
    ul.innerHTML = '';
    players.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `${escapeHtml(p.name)} <span class="delete-tag" onclick="removePlayer(${p.id})">✕</span>`;
        ul.appendChild(li);
    });
    if (countSpan) countSpan.innerText = players.length;
}

function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function goToRolesScreen() {
    playAudioSafe('audio-click');
    if (players.length < 4) {
        alert('يجب أن يكون عدد اللاعبين 4 على الأقل لتبدأ اللعبة!');
        return;
    }
    showScreen('screen-roles');
}

function startSecretDistribution() {
    playAudioSafe('audio-click');
    playAudioSafe('audio-wolf');

    let pool = ['ذئب 🐺', 'مواطن 👤'];
    const chkDoc = document.getElementById('chk-doctor');
    const chkDet = document.getElementById('chk-detective');
    const chkGrd = document.getElementById('chk-guard');
    const chkWit = document.getElementById('chk-witch');
    const chkHun = document.getElementById('chk-hunter');

    if (chkDoc && chkDoc.checked) pool.push('طبيب 💉');
    if (chkDet && chkDet.checked) pool.push('محقق 🔍');
    if (chkGrd && chkGrd.checked) pool.push('حارس 🛡️');
    if (chkWit && chkWit.checked) pool.push('ساحرة 🧪');
    if (chkHun && chkHun.checked) pool.push('قناص 🎯');

    let rolesAssigned = [];
    let wolvesCount = Math.max(1, Math.floor(players.length / 3));
    
    for (let i = 0; i < wolvesCount; i++) rolesAssigned.push('ذئب 🐺');

    let extras = pool.filter(r => r !== 'ذئب 🐺' && r !== 'مواطن 👤');
    players.forEach(() => {
        if (rolesAssigned.length < players.length) {
            if (extras.length > 0) {
                let idx = Math.floor(Math.random() * extras.length);
                rolesAssigned.push(extras[idx]);
                extras.splice(idx, 1);
            } else {
                rolesAssigned.push('مواطن 👤');
            }
        }
    });

    while (rolesAssigned.length < players.length) rolesAssigned.push('مواطن 👤');
    rolesAssigned.sort(() => Math.random() - 0.5);

    players.forEach((p, i) => {
        p.role = rolesAssigned[i];
        p.alive = true;
    });

    currentSecretIdx = 0;
    showScreen('screen-secret');
    prepareSecretStep();
}

function prepareSecretStep() {
    if (currentSecretIdx < players.length) {
        const p = players[currentSecretIdx];
        const nameEl = document.getElementById('secret-player-name');
        if (nameEl) nameEl.innerText = p.name;
        
        document.getElementById('first-pass-section').classList.remove('hidden');
        document.getElementById('secret-card-content').classList.add('hidden');
    } else {
        resolveNightAndStartDay();
    }
}

function revealInitialRole() {
    playAudioSafe('audio-click');
    const p = players[currentSecretIdx];

    document.getElementById('first-pass-section').classList.add('hidden');
    document.getElementById('secret-card-content').classList.remove('hidden');

    document.getElementById('assigned-role-title').innerText = p.role;
    let desc = 'استخدم كلامك وحكمتك بالنهار لاكتشاف الأشرار وحماية نفسك.';
    if (p.role.includes('ذئب')) desc = 'هدفكم تصفية أهل البلدة ليلاً دون كشف هويتكم الحقيقية.';
    else if (p.role.includes('طبيب')) desc = 'يمكنك حماية ومعالجة شخص واحد كل ليلة من موت الذئاب.';
    else if (p.role.includes('محقق')) desc = 'يمكنك سراً كشف هوية أحد اللاعبين إذا كان ذئباً أو بريئاً.';
    else if (p.role.includes('حارس')) desc = 'تقوم بحماية شخص آخر وتأمينه طوال فترة الليل.';
    else if (p.role.includes('ساحرة')) desc = 'لديك جرعة شفاء لإنقاذ شخص وجرعة سم لقتل عدو (تستخدم لمرة واحدة).';
    else if (p.role.includes('قناص')) desc = 'إذا سقطت في المعركة، سيتاح لك إطلاق النار على شخص واصطحابه معك!';
    
    document.getElementById('assigned-role-desc').innerText = desc;

    const actionArea = document.getElementById('secret-action-area');
    const hasNightAction = p.role.includes('ذئب') || p.role.includes('طبيب') || p.role.includes('حارس') || p.role.includes('محقق') || p.role.includes('ساحرة');

    if (hasNightAction && p.alive) {
        actionArea.classList.remove('hidden');
        const sel = document.getElementById('secret-target-select');
        const promptEl = document.getElementById('secret-action-prompt');
        sel.innerHTML = '';

        if (p.role.includes('ساحرة')) {
            let optionsHTML = `<option value="none">لا تقم بشيء هذه الليلة</option>`;
            if (p.hasHeal) {
                optionsHTML += `<option value="heal">استخدام جرعة الشفاء 🧪</option>`;
            }
            if (p.hasPoison) {
                players.forEach(targetP => {
                    if (targetP.alive) {
                        optionsHTML += `<option value="poison_${targetP.id}">☠️ تسميم: ${escapeHtml(targetP.name)}</option>`;
                    }
                });
            }
            sel.innerHTML = optionsHTML;
            if (promptEl) promptEl.innerText = 'اختر تعويذتك السحرية لهذه الليلة:';
        } else {
            players.forEach(targetP => {
                if (targetP.alive) {
                    const opt = document.createElement('option');
                    opt.value = targetP.id;
                    opt.innerText = targetP.name;
                    sel.appendChild(opt);
                }
            });

            let promptTxt = 'اختر هدفاً لعمليتك السرية:';
            if (p.role.includes('ذئب')) promptTxt = 'اختر ضحية لتصفيتها ليلاً 🐺:';
            else if (p.role.includes('طبيب')) promptTxt = 'اختر شخصاً لمعالجته وحمايته 💉:';
            else if (p.role.includes('محقق')) promptTxt = 'اختر شخصاً لكشف هويته السرية 🔍:';
            else if (p.role.includes('حارس')) promptTxt = 'اختر شخصاً لحراسته وتأمينه 🛡️:';
            if (promptEl) promptEl.innerText = promptTxt;
        }
    } else {
        if (actionArea) actionArea.classList.add('hidden');
    }
}

function hideAndPassNext() {
    playAudioSafe('audio-click');
    const p = players[currentSecretIdx];

    const hasNightAction = p.role.includes('ذئب') || p.role.includes('طبيب') || p.role.includes('حارس') || p.role.includes('محقق') || p.role.includes('ساحرة');

    if (hasNightAction && p.alive) {
        const sel = document.getElementById('secret-target-select');
        if (sel) {
            const val = sel.value;
            if (p.role.includes('ذئب')) {
                nightData.wolfTarget = val ? parseFloat(val) : null;
            } else if (p.role.includes('طبيب')) {
                nightData.doctorTarget = val ? parseFloat(val) : null;
            } else if (p.role.includes('حارس')) {
                nightData.guardTarget = val ? parseFloat(val) : null;
            } else if (p.role.includes('محقق')) {
                const targetId = parseFloat(val);
                const t = players.find(x => x.id === targetId);
                if (t) {
                    alert(`🕵️ نتيجة التحقيق السري:\n(${t.name}) هو (${t.role.includes('ذئب') ? 'ذئب 🐺' : 'مواطن بريء 👤'})`);
                }
            } else if (p.role.includes('ساحرة')) {
                if (val === 'heal') {
                    nightData.witchAction = 'heal';
                    p.hasHeal = false;
                } else if (val && val.startsWith('poison_')) {
                    nightData.witchAction = 'poison';
                    nightData.witchPoisonTarget = parseFloat(val.replace('poison_', ''));
                    p.hasPoison = false;
                } else {
                    nightData.witchAction = 'none';
                }
            }
        }
    }

    currentSecretIdx++;
    prepareSecretStep();
}

function resolveNightAndStartDay() {
    showScreen('screen-game');
    const titleEl = document.getElementById('phase-header-title');
    const badgeEl = document.getElementById('round-badge');
    if (titleEl) titleEl.innerText = `☀️ مرحلة النهار والتحليل`;
    if (badgeEl) badgeEl.innerText = `الجولة ${roundNum}`;

    let killedList = [];
    let savedMsg = '';

    // معالجة ضحية الذئب
    if (nightData.wolfTarget !== null) {
        let victim = players.find(p => p.id === nightData.wolfTarget);
        if (victim && victim.alive) {
            if (nightData.wolfTarget === nightData.doctorTarget || nightData.wolfTarget === nightData.guardTarget || nightData.witchAction === 'heal') {
                savedMsg = `✨ تمكنت الحماية أو الطبيب أو الساحرة من إنقاذ (${victim.name}) من هجوم الذئاب ليلاً!`;
            } else {
                victim.alive = false;
                killedList.push(victim);
            }
        }
    }

    // معالجة سم الساحرة
    if (nightData.witchAction === 'poison' && nightData.witchPoisonTarget !== null) {
        let poisonedVictim = players.find(p => p.id === nightData.witchPoisonTarget);
        if (poisonedVictim && poisonedVictim.alive) {
            poisonedVictim.alive = false;
            killedList.push(poisonedVictim);
        }
    }

    let msg = savedMsg;
    if (killedList.length > 0) {
        const namesStr = killedList.map(k => k.name).join(' و ');
        msg += ` ❌ فاجعة ليلية! عثر أهل البلدة على جثة (${namesStr}) مقتولاً.`;
        addLog(`مقتل ${namesStr} ليلاً.`);
    } else if (!savedMsg) {
        msg = `✨ مر الليل بسلام تام، ولم تقع أي جرائم.`;
        addLog(`مر الليل بسلام.`);
    }

    const descText = document.getElementById('phase-desc-text');
    if (descText) descText.innerText = msg;
    updateStatusBoard();

    // إعادة تعيين بيانات الليل بأمان
    nightData = { wolfTarget: null, doctorTarget: null, guardTarget: null, witchAction: 'none', witchPoisonTarget: null };

    if (checkWinConditions()) return;
    
    const discussionBox = document.getElementById('day-discussion-box');
    const votingBox = document.getElementById('voting-box');
    const hunterBox = document.getElementById('hunter-revenge-box');
    if (discussionBox) discussionBox.classList.remove('hidden');
    if (votingBox) votingBox.classList.add('hidden');
    if (hunterBox) hunterBox.classList.add('hidden');
}

function openVotingScreen() {
    playAudioSafe('audio-click');
    const discussionBox = document.getElementById('day-discussion-box');
    const votingBox = document.getElementById('voting-box');
    if (discussionBox) discussionBox.classList.add('hidden');
    if (votingBox) votingBox.classList.remove('hidden');

    const container = document.getElementById('voting-rows-container');
    if (!container) return;
    container.innerHTML = '';
    const aliveOnes = players.filter(p => p.alive);

    aliveOnes.forEach(voter => {
        const row = document.createElement('div');
        row.className = 'vote-row';
        
        let opts = '';
        aliveOnes.forEach(t => { opts += `<option value="${t.id}">${escapeHtml(t.name)}</option>`; });

        row.innerHTML = `<span><strong>${escapeHtml(voter.name)}</strong>:</span> <select class="game-select" id="v-sel-${voter.id}" style="width:140px; padding:6px;">${opts}</select>`;
        container.appendChild(row);
    });
}

function finishVotingAndExecute() {
    playAudioSafe('audio-click');
    const aliveOnes = players.filter(p => p.alive);
    let counts = {};

    aliveOnes.forEach(voter => {
        const selectEl = document.getElementById(`v-sel-${voter.id}`);
        if (selectEl && selectEl.value) {
            const val = parseFloat(selectEl.value);
            if (!isNaN(val)) {
                counts[val] = (counts[val] || 0) + 1;
            }
        }
    });

    let max = 0;
    let targetId = null;
    for (let id in counts) {
        if (counts[id] > max) {
            max = counts[id];
            targetId = parseFloat(id);
        }
    }

    const votingBox = document.getElementById('voting-box');
    if (votingBox) votingBox.classList.add('hidden');
    const descText = document.getElementById('phase-desc-text');

    if (targetId !== null) {
        let executed = players.find(p => p.id === targetId);
        if (executed) {
            executed.alive = false;
            if (descText) descText.innerText = `⚖️ قررت البلدة إعدام (${executed.name}) بالأغلبية! وكان دوره السري: (${executed.role})`;
            addLog(`إعدام ${executed.name} (${executed.role}) بالتصويت.`);

            if (executed.role.includes('قناص')) {
                triggerHunterRevenge();
                return;
            }
        }
    } else {
        if (descText) descText.innerText = `انتهى التصويت بالتعادل ولم يتم إعدام أحد.`;
    }

    updateStatusBoard();
    if (checkWinConditions()) return;

    roundNum++;
    setTimeout(() => { 
        playAudioSafe('audio-wolf');
        currentSecretIdx = 0;
        showScreen('screen-secret');
        prepareSecretStep(); 
    }, 4000);
}

function triggerHunterRevenge() {
    const hunterBox = document.getElementById('hunter-revenge-box');
    if (hunterBox) hunterBox.classList.remove('hidden');
    const sel = document.getElementById('hunter-target-select');
    if (!sel) return;
    sel.innerHTML = '';
    players.forEach(p => {
        if (p.alive) {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.innerText = p.name;
            sel.appendChild(opt);
        }
    });
}

function submitHunterRevenge() {
    playAudioSafe('audio-click');
    const sel = document.getElementById('hunter-target-select');
    const descText = document.getElementById('phase-desc-text');
    if (!sel) return;
    const targetId = parseFloat(sel.value);
    const target = players.find(p => p.id === targetId);
    
    if (target) {
        target.alive = false;
        addLog(`القناص أخذ معه ${target.name} عند وفاته.`);
        if (descText) descText.innerText += `\n🎯 أطلق القناص النار قبل وفاته على (${target.name}) فمات معه!`;
    }
    
    const hunterBox = document.getElementById('hunter-revenge-box');
    if (hunterBox) hunterBox.classList.add('hidden');
    updateStatusBoard();

    if (checkWinConditions()) return;

    roundNum++;
    setTimeout(() => { 
        playAudioSafe('audio-wolf');
        currentSecretIdx = 0;
        showScreen('screen-secret');
        prepareSecretStep(); 
    }, 4000);
}

function checkWinConditions() {
    const alive = players.filter(p => p.alive);
    const wolves = alive.filter(p => p.role.includes('ذئب'));
    const citizens = alive.filter(p => !p.role.includes('ذئب'));

    let winner = '';
    if (wolves.length === 0) winner = 'المواطنون والأبرار 🏆 (تم القضاء على الذئاب تماماً)';
    else if (wolves.length >= citizens.length) winner = 'الذئاب الشريرة 🐺 (سيطرت على البلدة بالكامل)';

    if (winner) {
        triggerGameOver(winner);
        return true;
    }
    return false;
}

function triggerGameOver(winner) {
    showScreen('screen-gameover');
    const winEl = document.getElementById('winner-announcement');
    if (winEl) winEl.innerText = `الفريق الفائز: ${winner}`;

    const ul = document.getElementById('recap-ul');
    if (!ul) return;
    ul.innerHTML = '';
    players.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${escapeHtml(p.name)}</strong> — الدور: <span style="color:#fbbf24">${escapeHtml(p.role)}</span> — الحالة: ${p.alive ? 'حي ✅' : 'ميت ❌'}`;
        ul.appendChild(li);
    });
}

function showScreen(id) {
    document.querySelectorAll('.screen-panel').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
}

function updateStatusBoard() {
    const ul = document.getElementById('players-status-ul');
    if (!ul) return;
    ul.innerHTML = '';
    players.forEach(p => {
        const li = document.createElement('li');
        if (!p.alive) li.className = 'is-dead';
        li.innerHTML = `<span>${escapeHtml(p.name)}</span> <span>${p.alive ? 'حي ✅' : `ميت ❌ (${escapeHtml(p.role)})`}</span>`;
        ul.appendChild(li);
    });
}