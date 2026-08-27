(function(){
"use strict";

window.sb = null;
window.channel = null;
window.myName = "";
window.roomCode = "";
window.myClassIdx = 0;
window.myColorIdx = 0;
window.gameActive = false;
window.isHost = false;
window.authMode = 'login';
let lastSyncTime = 0;

// โครงสร้างไอเทมอุปกรณ์ (Equipment Stats Database)
window.EQUIP_DB = {
  // หมวก
  'helm_bronze': { name: 'หมวกเหล็กสำริด', slot: 'helm', hp: 50, def: 5 },
  'helm_dragon': { name: 'หมวกเกล็ดมังกรทอง', slot: 'helm', hp: 120, def: 15 },
  // เสื้อเกราะ
  'armor_leather': { name: 'เสื้อเกราะหนังเสือดาว', slot: 'armor', hp: 40, def: 12 },
  'armor_steel': { name: 'เกราะเหล็กไหลพันปี', slot: 'armor', hp: 100, def: 28 },
  // ปลอกแขน
  'bracer_tiger': { name: 'ปลอกแขนพยัคฆ์เหิน', slot: 'bracer', atk: 12, crit: 5 },
  // สนับแข้ง
  'boots_wind': { name: 'สนับแข้งวายุสลาตัน', slot: 'boots', speed: 1.15, def: 6 }
};

window.QUEST_LIST = [
  { id: 1, title: 'ภารกิจที่ 1: กำจัดหมาป่าทมิฬนอกเมือง', targetType: 'wolf', reqCount: 3, curCount: 0, rewardExp: 150, rewardMoney: 100, done: false },
  { id: 2, title: 'ภารกิจที่ 2: ปราบโจรป่าไผ่', targetType: 'bandit', reqCount: 3, curCount: 0, rewardExp: 300, rewardMoney: 200, done: false },
  { id: 3, title: 'ภารกิจที่ 3: ท้าประลองโกเลมหินผา', targetType: 'golem', reqCount: 2, curCount: 0, rewardExp: 500, rewardMoney: 350, done: false },
  { id: 4, title: 'ภารกิจมหากาพย์: ล่ามังกรศิลาพันปี', targetType: 'boss', reqCount: 1, curCount: 0, rewardExp: 1000, rewardMoney: 800, done: false }
];

window.myProgress = {
  level: 1, exp: 0, money: 150, swordPlus: 0,
  isVip1: false,
  equipment: { helm: null, armor: null, bracer: null, boots: null, weapon: 'กระบี่เริ่มต้น' },
  inventory: { potion: 2, spiritStone: 2, herb: 4, helm_bronze: 1 },
  unlockedCostumes: [0], activeQuestIdx: 0
};

// Direct Selectors
window.selectClass = function(idx, el) {
  window.myClassIdx = idx;
  document.querySelectorAll('#classGrid .opt-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
};

window.selectColor = function(idx, el) {
  window.myColorIdx = idx;
  document.querySelectorAll('#colorGrid .opt-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
};

// Debug Panel
const debugLinesEl = document.getElementById('debugLines');
if (document.getElementById('clearDebugBtn')) {
  document.getElementById('clearDebugBtn').addEventListener('click', () => { debugLinesEl.innerHTML = ''; });
}
window.debugLog = function(msg, level = 'info') {
  const time = new Date().toLocaleTimeString('th-TH', { hour12: false });
  const div = document.createElement('div');
  div.className = 'line' + (level === 'error' ? ' err' : level === 'warn' ? ' warn' : '');
  div.textContent = `[${time}] ${msg}`;
  if (debugLinesEl) {
    debugLinesEl.appendChild(div);
    debugLinesEl.parentElement.scrollTop = debugLinesEl.parentElement.scrollHeight;
  }
};

window.onerror = function(msg, url, line) { window.debugLog(`JS Error: ${msg} (Line ${line})`, 'error'); };
window.onunhandledrejection = function(e) { window.debugLog(`Promise Rejection: ${e.reason}`, 'error'); };

function expNeeded(lvl) { return 100 * lvl; }

// คำนวณสเตตัสรวมอุปกรณ์สวมใส่
window.getBaseAtk = function() {
  let extraAtk = 0;
  if (window.myProgress.equipment.bracer && window.EQUIP_DB[window.myProgress.equipment.bracer]) {
    extraAtk += window.EQUIP_DB[window.myProgress.equipment.bracer].atk || 0;
  }
  const rawAtk = 24 + (window.myProgress.swordPlus * 8) + extraAtk;
  return window.myProgress.isVip1 ? Math.round(rawAtk * 1.2) : rawAtk;
};

window.getBaseDef = function() {
  let extraDef = 0;
  ['helm', 'armor', 'boots'].forEach(slot => {
    const itemKey = window.myProgress.equipment[slot];
    if (itemKey && window.EQUIP_DB[itemKey]) {
      extraDef += window.EQUIP_DB[itemKey].def || 0;
    }
  });
  const rawDef = 12 + (window.myProgress.level * 2) + extraDef;
  return window.myProgress.isVip1 ? Math.round(rawDef * 1.15) : rawDef;
};

window.showToast = function(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(window.showToast._t);
  window.showToast._t = setTimeout(() => { t.style.display = 'none'; }, 3000);
};

// ---------------- Auth System ----------------
window.switchAuthTab = function(mode) {
  window.authMode = mode;
  const loginBtn = document.getElementById('tabLoginBtn');
  const regBtn = document.getElementById('tabRegisterBtn');
  const extraFields = document.getElementById('registerExtraFields');
  const startBtn = document.getElementById('startBtn');
  const authTitle = document.getElementById('authTitle');

  if (mode === 'login') {
    loginBtn.classList.add('active');
    regBtn.classList.remove('active');
    extraFields.style.display = 'none';
    startBtn.textContent = 'เข้าสู่ยุทธภพ';
    authTitle.textContent = 'เข้าสู่ระบบยุทธภพ';
  } else {
    regBtn.classList.add('active');
    loginBtn.classList.remove('active');
    extraFields.style.display = 'flex';
    startBtn.textContent = 'สร้างตัวละคร & ก้าวสู่ยุทธภพ';
    authTitle.textContent = 'สร้างจอมยุทธ์ใหม่';
  }
};

document.getElementById('startBtn').addEventListener('click', handleAuth);

async function handleAuth() {
  const nameInput = document.getElementById('nameInput');
  const passInput = document.getElementById('passInput');
  const roomInput = document.getElementById('roomInput');
  const startBtn = document.getElementById('startBtn');

  const nm = nameInput.value.trim();
  const pwd = passInput.value.trim();
  const rc = roomInput.value.trim().toLowerCase().replace(/\s+/g, '');

  if (!nm) { alert('กรุณากรอกชื่อจอมยุทธ์'); return; }
  if (!pwd || pwd.length < 6) { alert('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
  if (!rc) { alert('กรุณาระบุรหัสห้อง'); return; }

  window.myName = nm;
  window.roomCode = rc;
  const myId = 'p_' + Math.random().toString(36).slice(2, 8);
  window.PlayerManager.me.id = myId;

  startBtn.disabled = true;
  startBtn.textContent = 'กำลังตรวจสอบข้อมูล...';

  try {
    window.sb = window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);

    const { data: prow, error: prowErr } = await window.sb.from('mmo_players').select('*').eq('name', window.myName).maybeSingle();
    if (prowErr) window.debugLog('DB Load: ' + prowErr.message, 'warn');

    if (window.authMode === 'login') {
      if (!prow) throw new Error('ไม่พบบัญชีจอมยุทธ์นี้ กรุณาสมัครสมาชิกใหม่');
      if (prow.password && prow.password !== pwd) throw new Error('รหัสผ่านไม่ถูกต้อง');

      window.myProgress.level = prow.level || 1;
      window.myProgress.exp = prow.exp || 0;
      window.myProgress.money = prow.money != null ? prow.money : 150;
      window.myProgress.swordPlus = prow.sword_plus != null ? prow.sword_plus : 0;
      window.myProgress.inventory = prow.inventory || { potion: 2, spiritStone: 2, herb: 4 };
      window.myProgress.equipment = prow.equipment || { helm: null, armor: null, bracer: null, boots: null, weapon: 'กระบี่เริ่มต้น' };
      window.myProgress.isVip1 = !!prow.is_vip1;
      window.myClassIdx = prow.class_idx != null ? prow.class_idx : 0;
      window.myColorIdx = prow.costume || 0;
      window.myProgress.activeQuestIdx = prow.quest_idx || 0;
    } else {
      if (prow) throw new Error('ชื่อจอมยุทธ์นี้มีผู้อื่นใช้งานแล้ว');

      await window.sb.from('mmo_players').insert({
        name: window.myName,
        password: pwd,
        class_idx: window.myClassIdx,
        level: 1, exp: 0, money: 150, sword_plus: 0,
        costume: window.myColorIdx,
        inventory: window.myProgress.inventory,
        equipment: window.myProgress.equipment
      });
    }

    window.channel = window.sb.channel('justice_v10_' + window.roomCode, {
      config: { broadcast: { ack: false, self: false }, presence: { key: myId } }
    });

    window.channel.on('broadcast', { event: 'pos' }, ({ payload }) => {
      if (payload && payload.id && payload.id !== myId) {
        const others = window.PlayerManager.otherPlayers;
        if (!others[payload.id]) {
          const mesh = window.PlayerManager.createHeroMesh(payload.costume || 0);
          window.World3D.scene.add(mesh);
          others[payload.id] = { ...payload, mesh };
        } else {
          Object.assign(others[payload.id], payload);
        }
      }
    });

    window.channel.on('broadcast', { event: 'skill' }, ({ payload }) => {
      if (payload && payload.id !== myId) {
        window.CombatSystem.triggerSkillVFX(payload.skill, payload.x, payload.y, payload.z, payload.yaw);
      }
    });

    window.channel.on('broadcast', { event: 'reward' }, ({ payload }) => {
      if (payload && payload.targetName === window.myName) {
        window.gainRewards(payload.exp, payload.money, payload.drops, payload.sourceName, payload.monsterType);
      }
    });

    window.channel.on('presence', { event: 'sync' }, () => {
      const state = window.channel.presenceState();
      const keys = Object.keys(state);
      const others = window.PlayerManager.otherPlayers;

      Object.keys(others).forEach(id => {
        if (!state[id]) {
          if (others[id].mesh) window.World3D.scene.remove(others[id].mesh);
          delete others[id];
        }
      });

      let earliest = myId;
      keys.forEach(k => {
        const u = state[k]?.[0];
        if (u && u.joinedAt < (window.PlayerManager.me.joinedAt || 0)) earliest = k;
      });
      window.isHost = (earliest === myId);
    });

    window.channel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        window.channel.track({ name: window.myName, costume: window.myColorIdx, joinedAt: Date.now() });
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('game-view').style.display = 'block';

        window.World3D.init('canvas3d');
        window.PlayerManager.myHeroMesh = window.PlayerManager.createHeroMesh(window.myColorIdx);
        window.World3D.scene.add(window.PlayerManager.myHeroMesh);
        window.PlayerManager.setupControls();
        window.CombatSystem.initMonsters();

        const curClass = window.CONFIG.CLASS_DATA[window.myClassIdx];
        document.getElementById('nameQ').textContent = curClass.qName;
        document.getElementById('nameE').textContent = curClass.eName;
        document.getElementById('nameR').textContent = curClass.rName;

        window.updateMeHUD();
        window.updateQuestUI();
        window.gameActive = true;
        requestAnimationFrame(gameLoop);
      }
    });

  } catch (e) {
    startBtn.disabled = false;
    startBtn.textContent = window.authMode === 'login' ? 'เข้าสู่ยุทธภพ' : 'สร้างตัวละคร & ก้าวสู่ยุทธภพ';
    alert(e.message);
  }
}

// ---------------- Game Loop ----------------
function gameLoop() {
  if (!window.gameActive) return;
  requestAnimationFrame(gameLoop);

  window.PlayerManager.updatePhysics(window.myProgress.isVip1);
  window.CombatSystem.updateVFX();
  window.World3D.updatePetals();

  Object.values(window.PlayerManager.otherPlayers).forEach(p => {
    if (p.mesh) {
      p.mesh.position.set(p.x, p.y || 0, p.z);
      p.mesh.rotation.y = p.yaw || 0;
    }
  });

  window.CombatSystem.monsters.forEach((m, idx) => {
    if (m.mesh && m.alive) {
      m.mesh.position.y = 1.0 + Math.sin(Date.now() * 0.003 + idx) * 0.3;
      m.mesh.rotation.y += 0.015;
      if (m.hpBarMesh && m.hpBarMesh.parent) {
        m.hpBarMesh.parent.lookAt(window.World3D.camera.position);
      }
    }
  });

  const now = Date.now();
  if (now - lastSyncTime > 150 && window.channel) {
    lastSyncTime = now;
    const me = window.PlayerManager.me;
    window.channel.send({
      type: 'broadcast', event: 'pos',
      payload: { id: me.id, name: window.myName, costume: window.myColorIdx, x: me.x, y: me.y, z: me.z, yaw: me.yaw, hp: me.hp, isDead: me.isDead }
    });
  }

  ['Q','E','R'].forEach(k => {
    const el = document.getElementById('cd' + k);
    if (el) {
      const rem = Math.max(0, window.CombatSystem.cooldowns[k].until - now);
      el.style.height = (rem / window.CombatSystem.cooldowns[k].cd) * 100 + '%';
    }
  });

  window.World3D.renderer.render(window.World3D.scene, window.World3D.camera);
}

// ---------------- Teleportation & Equipment System ----------------
window.teleportTo = function(x, z, locationName) {
  window.PlayerManager.me.x = x;
  window.PlayerManager.me.z = z;
  window.PlayerManager.me.y = 1.0;
  window.PlayerManager.me.vy = 0;
  window.closeModal('teleportModal');
  window.showToast(`🌀 วาร์ปมายัง: ${locationName}`);
};

window.equipItem = async function(itemKey) {
  const item = window.EQUIP_DB[itemKey];
  if (!item) return;

  const currentEquipped = window.myProgress.equipment[item.slot];
  if (currentEquipped) {
    window.myProgress.inventory[currentEquipped] = (window.myProgress.inventory[currentEquipped] || 0) + 1;
  }

  window.myProgress.equipment[item.slot] = itemKey;
  window.myProgress.inventory[itemKey] -= 1;
  if (window.myProgress.inventory[itemKey] <= 0) delete window.myProgress.inventory[itemKey];

  window.updateMeHUD();
  window.renderCharUI();
  window.openModal('invModal');
  window.showToast(`สวมใส่ [${item.name}] สำเร็จ!`);

  await window.sb.from('mmo_players').update({
    equipment: window.myProgress.equipment,
    inventory: window.myProgress.inventory
  }).eq('name', window.myName);
};

window.unequipItem = async function(slot) {
  const itemKey = window.myProgress.equipment[slot];
  if (!itemKey) return;

  window.myProgress.equipment[slot] = null;
  window.myProgress.inventory[itemKey] = (window.myProgress.inventory[itemKey] || 0) + 1;

  window.updateMeHUD();
  window.renderCharUI();
  window.showToast(`ถอดอุปกรณ์เรียบร้อย`);

  await window.sb.from('mmo_players').update({
    equipment: window.myProgress.equipment,
    inventory: window.myProgress.inventory
  }).eq('name', window.myName);
};

// ---------------- Rewards & Quests ----------------
window.gainRewards = async function(expAmt, moneyAmt, drops, src, monsterType) {
  const expBonus = window.myProgress.isVip1 ? 1.3 : 1.0;
  const finalExp = Math.round(expAmt * expBonus);
  const finalMoney = Math.round(moneyAmt * expBonus);

  window.myProgress.exp += finalExp;
  window.myProgress.money += finalMoney;

  const curQ = window.QUEST_LIST[window.myProgress.activeQuestIdx];
  if (curQ && curQ.targetType === monsterType && !curQ.done) {
    curQ.curCount += 1;
    if (curQ.curCount >= curQ.reqCount) {
      window.showToast(`🎉 ภารกิจสำเร็จ: ${curQ.title}`);
    }
  }

  // ระบบสุ่มดรอปเกราะ/อาวุธ
  if (drops && drops.length) {
    drops.forEach(k => {
      window.myProgress.inventory[k] = (window.myProgress.inventory[k] || 0) + 1;
    });
  }

  // โอกาสสุ่มดรอปเกราะจากมอนสเตอร์ (Drop Rates)
  if (monsterType === 'bandit' && Math.random() < 0.35) {
    window.myProgress.inventory['armor_leather'] = (window.myProgress.inventory['armor_leather'] || 0) + 1;
    window.showToast('✨ ดรอปไอเทมแรร์: [เสื้อเกราะหนังเสือดาว] !');
  } else if (monsterType === 'golem' && Math.random() < 0.30) {
    window.myProgress.inventory['bracer_tiger'] = (window.myProgress.inventory['bracer_tiger'] || 0) + 1;
    window.showToast('✨ ดรอปไอเทมแรร์: [ปลอกแขนพยัคฆ์เหิน] !');
  } else if (monsterType === 'boss') {
    window.myProgress.inventory['armor_steel'] = (window.myProgress.inventory['armor_steel'] || 0) + 1;
    window.myProgress.inventory['boots_wind'] = (window.myProgress.inventory['boots_wind'] || 0) + 1;
    window.showToast('🔥 บอสดรอปยุทธภัณฑ์ระดับตำนาน: [เกราะเหล็กไหลพันปี] & [สนับแข้งวายุ] !');
  }

  window.showToast(`+${finalExp} EXP | +${finalMoney} ตำลึง (${src})`);

  while (window.myProgress.exp >= expNeeded(window.myProgress.level)) {
    window.myProgress.exp -= expNeeded(window.myProgress.level);
    window.myProgress.level += 1;
    window.showToast(`🌟 บรรลุวิชา! เลเวลอัปเป็น Lv.${window.myProgress.level} 🌟`);
  }

  window.updateMeHUD();
  window.updateQuestUI();

  await window.sb.from('mmo_players').update({
    exp: window.myProgress.exp, level: window.myProgress.level,
    money: window.myProgress.money, inventory: window.myProgress.inventory
  }).eq('name', window.myName);
};

window.updateQuestUI = function() {
  const curQ = window.QUEST_LIST[window.myProgress.activeQuestIdx];
  const qBox = document.getElementById('quest-box');
  if (!qBox) return;
  if (curQ) {
    qBox.innerHTML = `
      <b>📜 ${curQ.title}</b><br>
      <span style="color:${curQ.curCount >= curQ.reqCount ? '#22c55e' : '#a89679'}">ความคืบหน้า (${curQ.curCount}/${curQ.reqCount})</span><br>
      <button class="menu-btn-small" onclick="claimQuest()">รับรางวัลเควสต์</button>
    `;
  } else {
    qBox.innerHTML = `<b>🎉 ท่านสำเร็จภารกิจทั้งหมดในยุทธภพแล้ว!</b>`;
  }
};

window.claimQuest = async function() {
  const curQ = window.QUEST_LIST[window.myProgress.activeQuestIdx];
  if (!curQ || curQ.curCount < curQ.reqCount) {
    window.showToast('ยังทำเงื่อนไขภารกิจไม่ครบ!'); return;
  }

  curQ.done = true;
  window.myProgress.activeQuestIdx += 1;
  window.gainRewards(curQ.rewardExp, curQ.rewardMoney, ['spiritStone', 'potion'], 'รางวัลภารกิจ');
  window.updateQuestUI();
  await window.sb.from('mmo_players').update({ quest_idx: window.myProgress.activeQuestIdx }).eq('name', window.myName);
};

window.updateMeHUD = function() {
  document.getElementById('pNameText').textContent = window.myName;
  document.getElementById('pLvText').textContent = `Lv.${window.myProgress.level}`;
  document.getElementById('myHpBar').style.width = Math.max(0, (window.PlayerManager.me.hp / window.PlayerManager.me.maxHp) * 100) + '%';
  document.getElementById('myExpBar').style.width = Math.min(100, (window.myProgress.exp / expNeeded(window.myProgress.level)) * 100) + '%';
  document.getElementById('moneyText').textContent = window.myProgress.money;
  document.getElementById('atkText').textContent = window.getBaseAtk();
  document.getElementById('defText').textContent = window.getBaseDef();
  document.getElementById('vipBadge').textContent = window.myProgress.isVip1 ? 'VIP 1' : 'VIP 0';
};

// ---------------- Modals UI ----------------
window.openModal = function(id) {
  document.getElementById(id).style.display = 'flex';
  if (id === 'charModal') window.renderCharUI();
  if (id === 'invModal') window.renderInventoryUI();
  if (id === 'forgeModal') {
    document.getElementById('forgeCurLvl').textContent = `+${window.myProgress.swordPlus}`;
    document.getElementById('forgeAtk').textContent = `${window.getBaseAtk()} ATK`;
    document.getElementById('forgeNextAtk').textContent = `${window.getBaseAtk() + 8} ATK`;
    document.getElementById('stoneCountText').textContent = window.myProgress.inventory.spiritStone || 0;
  }
};
window.closeModal = function(id) { document.getElementById(id).style.display = 'none'; };

window.renderCharUI = function() {
  const eq = window.myProgress.equipment;
  document.getElementById('eqHelmText').innerHTML = eq.helm ? `${window.EQUIP_DB[eq.helm].name} <button class="menu-btn-small" onclick="unequipItem('helm')">ถอด</button>` : '- ไม่มี -';
  document.getElementById('eqArmorText').innerHTML = eq.armor ? `${window.EQUIP_DB[eq.armor].name} <button class="menu-btn-small" onclick="unequipItem('armor')">ถอด</button>` : '- ไม่มี -';
  document.getElementById('eqBracerText').innerHTML = eq.bracer ? `${window.EQUIP_DB[eq.bracer].name} <button class="menu-btn-small" onclick="unequipItem('bracer')">ถอด</button>` : '- ไม่มี -';
  document.getElementById('eqBootsText').innerHTML = eq.boots ? `${window.EQUIP_DB[eq.boots].name} <button class="menu-btn-small" onclick="unequipItem('boots')">ถอด</button>` : '- ไม่มี -';
  document.getElementById('eqWeaponText').textContent = `กระบี่ +${window.myProgress.swordPlus}`;
  document.getElementById('eqTotalStatsText').textContent = `ATK: ${window.getBaseAtk()} | DEF: ${window.getBaseDef()}`;
};

window.renderInventoryUI = function() {
  const grid = document.getElementById('invGrid');
  let html = `
    <div class="inv-slot"><b>🧪 โอสถ</b><span>x${window.myProgress.inventory.potion || 0}</span><button class="menu-btn-small" onclick="usePotion()">ดื่ม</button></div>
    <div class="inv-slot"><b>💎 หินวิญญาณ</b><span>x${window.myProgress.inventory.spiritStone || 0}</span></div>
    <div class="inv-slot"><b>🌿 สมุนไพร</b><span>x${window.myProgress.inventory.herb || 0}</span></div>
    <div class="inv-slot"><b>💰 ตำลึง</b><span>${window.myProgress.money}</span></div>
  `;

  // แสดงผลชิ้นส่วนอุปกรณ์ในกระเป๋า
  Object.keys(window.myProgress.inventory).forEach(k => {
    if (window.EQUIP_DB[k]) {
      html += `
        <div class="inv-slot" style="border-color:var(--gold);">
          <b>🛡️ ${window.EQUIP_DB[k].name}</b>
          <span>x${window.myProgress.inventory[k]}</span>
          <button class="menu-btn-small" style="background:var(--gold);color:#000;" onclick="equipItem('${k}')">สวมใส่</button>
        </div>
      `;
    }
  });

  grid.innerHTML = html;
};

window.usePotion = async function() {
  if ((window.myProgress.inventory.potion || 0) <= 0) { window.showToast('โอสถหมดแล้ว!'); return; }
  window.myProgress.inventory.potion -= 1;
  window.PlayerManager.me.hp = Math.min(window.PlayerManager.me.maxHp, window.PlayerManager.me.hp + 60);
  window.updateMeHUD();
  window.renderInventoryUI();
  window.showToast('ดื่มโอสถ +60 HP!');
  await window.sb.from('mmo_players').update({ inventory: window.myProgress.inventory }).eq('name', window.myName);
};

window.upgradeSwordAction = async function() {
  if ((window.myProgress.inventory.spiritStone || 0) < 1 || window.myProgress.money < 80) {
    window.showToast('หินวิญญาณหรือตำลึงไม่พอ!'); return;
  }
  window.myProgress.inventory.spiritStone -= 1;
  window.myProgress.money -= 80;
  window.myProgress.swordPlus += 1;
  window.updateMeHUD();
  window.openModal('forgeModal');
  window.showToast(`⚔️ ตีบวกสำเร็จ! กระบี่กลายเป็น +${window.myProgress.swordPlus}`);
  await window.sb.from('mmo_players').update({ money: window.myProgress.money, sword_plus: window.myProgress.swordPlus, inventory: window.myProgress.inventory }).eq('name', window.myName);
};

window.unlockVip1 = async function() {
  if (window.myProgress.isVip1) { window.showToast('ท่านเปิดใช้งาน VIP 1 อยู่แล้ว!'); return; }
  if (window.myProgress.money < 300) { window.showToast('ตำลึงไม่พอ! ต้องการ 300 ตำลึง'); return; }
  window.myProgress.money -= 300;
  window.myProgress.isVip1 = true;
  window.updateMeHUD();
  document.getElementById('vipStatusText').textContent = 'VIP 1 (เปิดใช้งานแล้ว)';
  window.showToast('👑 ยินดีด้วย! ปลดล็อกสถานะ VIP 1 สำเร็จ!');
  await window.sb.from('mmo_players').update({ money: window.myProgress.money, is_vip1: true }).eq('name', window.myName);
};

window.changeCostume = async function(idx) {
  window.myColorIdx = idx;
  if (window.PlayerManager.myHeroMesh) window.World3D.scene.remove(window.PlayerManager.myHeroMesh);
  window.PlayerManager.myHeroMesh = window.PlayerManager.createHeroMesh(idx);
  window.World3D.scene.add(window.PlayerManager.myHeroMesh);
  window.showToast('เปลี่ยนชุดยุทธภพเรียบร้อย!');
  await window.sb.from('mmo_players').update({ costume: idx }).eq('name', window.myName);
};

document.getElementById('chatform').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  const d = document.createElement('div');
  d.innerHTML = `<b style="color:var(--gold-bright)">${window.myName}:</b> ${text}`;
  document.getElementById('chatlog').prepend(d);
});

})();
