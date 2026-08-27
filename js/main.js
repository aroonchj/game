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

window.QUEST_LIST = [
  { id: 1, title: 'ภารกิจที่ 1: กำจัดหมาป่าทมิฬนอกเมือง', targetType: 'wolf', reqCount: 3, curCount: 0, rewardExp: 150, rewardMoney: 100, done: false },
  { id: 2, title: 'ภารกิจที่ 2: ปราบโจรป่าไผ่', targetType: 'bandit', reqCount: 3, curCount: 0, rewardExp: 300, rewardMoney: 200, done: false },
  { id: 3, title: 'ภารกิจที่ 3: ท้าประลองโกเลมศิลาแดง', targetType: 'golem', reqCount: 2, curCount: 0, rewardExp: 600, rewardMoney: 450, done: false },
  { id: 4, title: 'ภารกิจมหากาพย์: ล่ามังกรศิลาพันปี', targetType: 'boss', reqCount: 1, curCount: 0, rewardExp: 2000, rewardMoney: 1500, done: false }
];

window.myProgress = {
  level: 1, exp: 0, money: 200, swordPlus: 0,
  vipLevel: 0,
  equipment: { helm: 'helm_common', armor: 'armor_common', bracer: null, boots: null, weapon: 'กระบี่เริ่มต้น' },
  inventory: { potion: 3, spiritStone: 2, herb: 4 },
  unlockedCostumes: [0], activeQuestIdx: 0
};

// เลือกอาชีพ & สีชุดหน้าสร้างตัวละคร
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

// Debug Log Panel
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

// คำนวณพลังต่อสู้รวม (RP - Realm Power)
window.calculateRP = function() {
  const atk = window.getBaseAtk();
  const def = window.getBaseDef();
  const hp = window.PlayerManager.me.maxHp;
  const vipBonus = window.myProgress.vipLevel * 200;
  return Math.round((atk * 3.0) + (def * 2.2) + (hp * 0.4) + vipBonus);
};

window.getBaseAtk = function() {
  let extraAtk = 0;
  Object.values(window.myProgress.equipment).forEach(itemKey => {
    if (itemKey && window.CONFIG.EQUIP_DATABASE[itemKey]) {
      extraAtk += window.CONFIG.EQUIP_DATABASE[itemKey].atk || 0;
    }
  });

  const rawAtk = 24 + (window.myProgress.swordPlus * 8) + extraAtk;
  const vipMult = window.CONFIG.VIP_DATA[window.myProgress.vipLevel].atkBonus;
  return Math.round(rawAtk * vipMult);
};

window.getBaseDef = function() {
  let extraDef = 0;
  Object.values(window.myProgress.equipment).forEach(itemKey => {
    if (itemKey && window.CONFIG.EQUIP_DATABASE[itemKey]) {
      extraDef += window.CONFIG.EQUIP_DATABASE[itemKey].def || 0;
    }
  });

  const rawDef = 12 + (window.myProgress.level * 2) + extraDef;
  const vipMult = window.CONFIG.VIP_DATA[window.myProgress.vipLevel].defBonus;
  return Math.round(rawDef * vipMult);
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
      window.myProgress.money = prow.money != null ? prow.money : 200;
      window.myProgress.swordPlus = prow.sword_plus != null ? prow.sword_plus : 0;
      window.myProgress.vipLevel = prow.vip_level || 0;
      window.myProgress.inventory = prow.inventory || { potion: 3, spiritStone: 2, herb: 4 };
      window.myProgress.equipment = prow.equipment || { helm: 'helm_common', armor: 'armor_common', bracer: null, boots: null, weapon: 'กระบี่เริ่มต้น' };
      window.myClassIdx = prow.class_idx != null ? prow.class_idx : 0;
      window.myColorIdx = prow.costume || 0;
      window.myProgress.activeQuestIdx = prow.quest_idx || 0;
    } else {
      if (prow) throw new Error('ชื่อจอมยุทธ์นี้มีผู้อื่นใช้งานแล้ว');

      await window.sb.from('mmo_players').insert({
        name: window.myName,
        password: pwd,
        class_idx: window.myClassIdx,
        level: 1, exp: 0, money: 200, sword_plus: 0,
        vip_level: 0,
        costume: window.myColorIdx,
        inventory: window.myProgress.inventory,
        equipment: window.myProgress.equipment
      });
    }

    window.channel = window.sb.channel('justice_v11_' + window.roomCode, {
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

  const vipSpd = window.CONFIG.VIP_DATA[window.myProgress.vipLevel].speedBonus;
  window.PlayerManager.updatePhysics(vipSpd);
  window.CombatSystem.updateVFX();
  window.CombatSystem.updateMonsterAI();
  window.World3D.updatePetals();

  Object.values(window.PlayerManager.otherPlayers).forEach(p => {
    if (p.mesh) {
      p.mesh.position.set(p.x, p.y || 0, p.z);
      p.mesh.rotation.y = p.yaw || 0;
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

// ---------------- Teleport & Equipment ----------------
window.teleportTo = function(x, z, locationName) {
  window.PlayerManager.me.x = x;
  window.PlayerManager.me.z = z;
  window.PlayerManager.me.y = 1.0;
  window.PlayerManager.me.vy = 0;
  window.closeModal('teleportModal');
  window.showToast(`🌀 วาร์ปมายัง: ${locationName}`);
};

window.equipItem = async function(itemKey) {
  const item = window.CONFIG.EQUIP_DATABASE[itemKey];
  if (!item) return;

  if (window.myProgress.level < item.reqLvl) {
    window.showToast(`เลเวลไม่ถึง! ต้องการ Lv.${item.reqLvl}`);
    return;
  }

  const currentEquipped = window.myProgress.equipment[item.slot];
  if (currentEquipped) {
    window.myProgress.inventory[currentEquipped] = (window.myProgress.inventory[currentEquipped] || 0) + 1;
  }

  window.myProgress.equipment[item.slot] = itemKey;
  window.myProgress.inventory[itemKey] -= 1;
  if (window.myProgress.inventory[itemKey] <= 0) delete window.myProgress.inventory[itemKey];

  window.updateMeHUD();
  window.renderCharUI();
  window.renderInventoryUI();
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
  window.showToast('ถอดอุปกรณ์เรียบร้อย');

  await window.sb.from('mmo_players').update({
    equipment: window.myProgress.equipment,
    inventory: window.myProgress.inventory
  }).eq('name', window.myName);
};

// ---------------- VIP 1-10 Upgrade ----------------
window.upgradeVIP = async function() {
  const curVip = window.myProgress.vipLevel;
  if (curVip >= 10) {
    window.showToast('ท่านบรรลุขั้น VIP 10 สูงสุดแล้ว!'); return;
  }

  const nextVip = curVip + 1;
  const cost = window.CONFIG.VIP_DATA[nextVip].cost;

  if (window.myProgress.money < cost) {
    window.showToast(`ตำลึงไม่พอ! ต้องการ ${cost} ตำลึง`); return;
  }

  window.myProgress.money -= cost;
  window.myProgress.vipLevel = nextVip;
  window.updateMeHUD();
  window.openModal('vipModal');
  window.showToast(`🌟 ยินดีด้วย! เลื่อนขั้นเป็น ${window.CONFIG.VIP_DATA[nextVip].title} (VIP ${nextVip})`);

  await window.sb.from('mmo_players').update({
    money: window.myProgress.money,
    vip_level: window.myProgress.vipLevel
  }).eq('name', window.myName);
};

// ---------------- Rewards & Quests ----------------
window.gainRewards = async function(expAmt, moneyAmt, drops, src, monsterType) {
  const expMult = window.CONFIG.VIP_DATA[window.myProgress.vipLevel].expBonus;
  const finalExp = Math.round(expAmt * expMult);
  const finalMoney = Math.round(moneyAmt * expMult);

  window.myProgress.exp += finalExp;
  window.myProgress.money += finalMoney;

  const curQ = window.QUEST_LIST[window.myProgress.activeQuestIdx];
  if (curQ && curQ.targetType === monsterType && !curQ.done) {
    curQ.curCount += 1;
    if (curQ.curCount >= curQ.reqCount) {
      window.showToast(`🎉 ภารกิจสำเร็จ: ${curQ.title}`);
    }
  }

  if (drops && drops.length) {
    drops.forEach(k => {
      window.myProgress.inventory[k] = (window.myProgress.inventory[k] || 0) + 1;
    });
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

  const vipInfo = window.CONFIG.VIP_DATA[window.myProgress.vipLevel];
  document.getElementById('vipBadge').textContent = `VIP ${vipInfo.level} (${vipInfo.title})`;
};

// ---------------- Modals UI ----------------
window.openModal = function(id) {
  document.getElementById(id).style.display = 'flex';
  if (id === 'charModal') window.renderCharUI();
  if (id === 'invModal') window.renderInventoryUI();
  if (id === 'vipModal') window.renderVipUI();
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
  const db = window.CONFIG.EQUIP_DATABASE;

  ['helm', 'armor', 'bracer', 'boots'].forEach(slot => {
    const key = eq[slot];
    const el = document.getElementById(`eq${slot.charAt(0).toUpperCase() + slot.slice(1)}Text`);
    if (key && db[key]) {
      const color = window.CONFIG.RARITY_COLORS[db[key].tier];
      el.innerHTML = `<span style="color:${color};font-weight:bold;">${db[key].name}</span> <button class="menu-btn-small" onclick="unequipItem('${slot}')">ถอด</button>`;
    } else {
      el.innerHTML = '- ไม่มี -';
    }
  });

  document.getElementById('eqWeaponText').textContent = `กระบี่ +${window.myProgress.swordPlus}`;
  document.getElementById('eqTotalStatsText').innerHTML = `🔥 <b>พลังรบรวม (RP): ${window.calculateRP()}</b> | ATK: ${window.getBaseAtk()} | DEF: ${window.getBaseDef()}`;
};

window.renderInventoryUI = function() {
  const grid = document.getElementById('invGrid');
  let html = `
    <div class="inv-slot"><b>🧪 โอสถ</b><span>x${window.myProgress.inventory.potion || 0}</span><button class="menu-btn-small" onclick="usePotion()">ดื่ม</button></div>
    <div class="inv-slot"><b>💎 หินวิญญาณ</b><span>x${window.myProgress.inventory.spiritStone || 0}</span></div>
    <div class="inv-slot"><b>🌿 สมุนไพร</b><span>x${window.myProgress.inventory.herb || 0}</span></div>
    <div class="inv-slot"><b>💰 ตำลึง</b><span>${window.myProgress.money}</span></div>
  `;

  Object.keys(window.myProgress.inventory).forEach(k => {
    const item = window.CONFIG.EQUIP_DATABASE[k];
    if (item) {
      const color = window.CONFIG.RARITY_COLORS[item.tier];
      html += `
        <div class="inv-slot" style="border-color:${color};">
          <b style="color:${color};">🛡️ ${item.name}</b>
          <span style="font-size:.7em;">Lv.${item.reqLvl} | x${window.myProgress.inventory[k]}</span>
          <button class="menu-btn-small" style="background:${color};color:#000;" onclick="equipItem('${k}')">สวมใส่</button>
        </div>
      `;
    }
  });

  grid.innerHTML = html;
};

window.renderVipUI = function() {
  const curVip = window.myProgress.vipLevel;
  const vipInfo = window.CONFIG.VIP_DATA[curVip];
  const nextVip = curVip < 10 ? window.CONFIG.VIP_DATA[curVip + 1] : null;

  document.getElementById('vipStatusText').textContent = `VIP ${curVip} - ${vipInfo.title}`;
  const box = document.getElementById('vipModalContent');
  if (box && nextVip) {
    box.innerHTML = `
      <p>สิทธิพิเศษขั้นถัดไป (VIP ${nextVip.level} - ${nextVip.title}):</p>
      <ul style="text-align:left; font-size:.85em; padding-left:20px; line-height:1.6;">
        <li>⭐ พลังโจมตี (ATK): +${Math.round((nextVip.atkBonus - 1) * 100)}%</li>
        <li>⭐ พลังป้องกัน (DEF): +${Math.round((nextVip.defBonus - 1) * 100)}%</li>
        <li>⭐ โบนัส EXP & เงิน: +${Math.round((nextVip.expBonus - 1) * 100)}%</li>
        <li>⭐ ความเร็วเคลื่อนที่: +${Math.round((nextVip.speedBonus - 1) * 100)}%</li>
      </ul>
      <p style="margin-top:6px;">ค่าเลื่อนขั้น: <b style="color:#ffd13b">${nextVip.cost} ตำลึง</b></p>
    `;
  }
};

window.usePotion = async function() {
  if ((window.myProgress.inventory.potion || 0) <= 0) { window.showToast('โอสถหมดแล้ว!'); return; }
  window.myProgress.inventory.potion -= 1;
  window.PlayerManager.me.hp = Math.min(window.PlayerManager.me.maxHp, window.PlayerManager.me.hp + 75);
  window.updateMeHUD();
  window.renderInventoryUI();
  window.showToast('ดื่มโอสถ +75 HP!');
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
