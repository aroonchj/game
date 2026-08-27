window.getItemStats = function(baseKey, color) {
  const base = window.CONFIG.EQUIP_BASE[baseKey];
  if (!base) return null;
  const tier = window.CONFIG.RARITY_TIERS[color] || window.CONFIG.RARITY_TIERS.white;
  const mult = tier.mult;
  return {
    fullName: `[${tier.name}] ${base.baseName}`,
    color: tier.color,
    tierKey: color,
    reqLvl: base.reqLvl,
    slot: base.slot,
    hp: base.baseHp ? Math.round(base.baseHp * mult) : 0,
    def: base.baseDef ? Math.round(base.baseDef * mult) : 0,
    atk: base.baseAtk ? Math.round(base.baseAtk * mult) : 0,
    speed: base.baseSpeed || 1.0
  };
};

// สูตร EXP Hardcore
function expNeeded(lvl) {
  return Math.round(150 * Math.pow(lvl, 1.6));
}

window.calculateRP = function() {
  const atk = window.getBaseAtk();
  const def = window.getBaseDef();
  const hp = window.PlayerManager.me.maxHp;
  const vipBonus = window.myProgress.vipLevel * 100;
  return Math.round((atk * 2.8) + (def * 2.0) + (hp * 0.3) + vipBonus);
};

window.getBaseAtk = function() {
  let extraAtk = 0;
  Object.values(window.myProgress.equipment).forEach(eq => {
    if (eq && eq.baseKey) {
      const s = window.getItemStats(eq.baseKey, eq.color);
      if (s) extraAtk += s.atk || 0;
    }
  });
  const rawAtk = 20 + (window.myProgress.swordPlus * 6) + extraAtk;
  const vipMult = window.CONFIG.VIP_DATA[window.myProgress.vipLevel]?.atkBonus || 1.0;
  return Math.round(rawAtk * vipMult);
};

window.getBaseDef = function() {
  let extraDef = 0;
  Object.values(window.myProgress.equipment).forEach(eq => {
    if (eq && eq.baseKey) {
      const s = window.getItemStats(eq.baseKey, eq.color);
      if (s) extraDef += s.def || 0;
    }
  });
  const rawDef = 10 + (window.myProgress.level * 2) + extraDef;
  const vipMult = window.CONFIG.VIP_DATA[window.myProgress.vipLevel]?.defBonus || 1.0;
  return Math.round(rawDef * vipMult);
};

const startBtnEl = document.getElementById('startBtn');
if (startBtnEl) startBtnEl.addEventListener('click', handleAuth);

async function handleAuth() {
  const nameInput = document.getElementById('nameInput');
  const passInput = document.getElementById('passInput');
  const roomInput = document.getElementById('roomInput');
  const startBtn = document.getElementById('startBtn');

  const nm = nameInput ? nameInput.value.trim() : '';
  const pwd = passInput ? passInput.value.trim() : '';
  const rc = roomInput ? roomInput.value.trim().toLowerCase().replace(/\s+/g, '') : '';

  if (!nm) { alert('กรุณากรอกชื่อจอมยุทธ์'); return; }
  if (!pwd || pwd.length < 6) { alert('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
  if (!rc) { alert('กรุณาระบุรหัสห้อง'); return; }

  window.myName = nm; window.roomCode = rc;
  const myId = 'p_' + Math.random().toString(36).slice(2, 8);
  window.PlayerManager.me.id = myId;

  if (startBtn) {
    startBtn.disabled = true;
    startBtn.textContent = 'กำลังเชื่อมต่อยุทธภพ...';
  }

  try {
    window.sb = window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);
    const { data: prow, error: prowErr } = await window.sb.from('mmo_players').select('*').eq('name', window.myName).maybeSingle();

    if (window.authMode === 'login') {
      if (!prow) throw new Error('ไม่พบบัญชีจอมยุทธ์นี้ กรุณาสมัครสมาชิกใหม่');
      if (prow.password && prow.password !== pwd) throw new Error('รหัสผ่านไม่ถูกต้อง');

      window.myProgress.level = prow.level || 1;
      window.myProgress.exp = prow.exp || 0;
      window.myProgress.money = prow.money != null ? prow.money : 100;
      window.myProgress.swordPlus = prow.sword_plus != null ? prow.sword_plus : 0;
      window.myProgress.vipLevel = prow.vip_level || 0;
      window.myProgress.inventoryMaterials = prow.inventory || { potion: 3, spiritStone: 2, herb: 4 };
      window.myProgress.inventoryItems = prow.inventory_items || [{ id: 'item_init_1', baseKey: 'helm_lv1', color: 'green' }];
      window.myProgress.equipment = prow.equipment || { helm: { baseKey: 'helm_lv1', color: 'white' }, armor: { baseKey: 'armor_lv1', color: 'white' }, bracer: null, boots: { baseKey: 'boots_lv1', color: 'white' }, weapon: 'กระบี่เริ่มต้น' };
      window.myGender = prow.gender || 'male';
      window.myClassIdx = prow.class_idx != null ? prow.class_idx : 0;
      window.myColorIdx = prow.costume || 0;
      window.myProgress.activeQuestIdx = prow.quest_idx || 0;
    } else {
      if (prow) throw new Error('ชื่อจอมยุทธ์นี้มีผู้อื่นใช้งานแล้ว');

      await window.sb.from('mmo_players').insert({
        name: window.myName, password: pwd,
        gender: window.myGender, class_idx: window.myClassIdx,
        level: 1, exp: 0, money: 100, sword_plus: 0, vip_level: 0,
        costume: window.myColorIdx,
        inventory: window.myProgress.inventoryMaterials,
        inventory_items: window.myProgress.inventoryItems,
        equipment: window.myProgress.equipment
      });
    }

    window.channel = window.sb.channel('justice_v22_' + window.roomCode, {
      config: { broadcast: { ack: false, self: false }, presence: { key: myId } }
    });

    window.channel.on('broadcast', { event: 'pos' }, ({ payload }) => {
      if (payload && payload.id && payload.id !== myId) {
        const others = window.PlayerManager.otherPlayers;
        if (!others[payload.id]) {
          const mesh = window.PlayerManager.createHeroMesh(payload.costume || 0, payload.gender || 'male', payload.classIdx || 0, payload.name, payload.level, payload.vipLevel, payload.id);
          window.World3D.scene.add(mesh);
          others[payload.id] = { ...payload, mesh };
        } else {
          Object.assign(others[payload.id], payload);
        }
      }
    });

    window.channel.on('broadcast', { event: 'skill' }, ({ payload }) => {
      if (payload && payload.id !== myId) {
        window.CombatSystem.triggerSkillVFX(payload.skill, payload.x, payload.y, payload.z, payload.yaw, payload.classIdx || 0);
      }
    });

    window.channel.on('broadcast', { event: 'reward' }, ({ payload }) => {
      if (payload && payload.targetName === window.myName) {
        window.gainRewards(payload.exp, payload.money, payload.drops, payload.sourceName, payload.monsterType, payload.droppedEquips);
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
        window.channel.track({ name: window.myName, gender: window.myGender, classIdx: window.myClassIdx, costume: window.myColorIdx, level: window.myProgress.level, vipLevel: window.myProgress.vipLevel, rp: window.calculateRP(), joinedAt: Date.now() });
        
        const loginScr = document.getElementById('login-screen');
        const gameVw = document.getElementById('game-view');
        if (loginScr) loginScr.style.display = 'none';
        if (gameVw) gameVw.style.display = 'block';

        window.World3D.init('canvas3d');
        window.PlayerManager.myHeroMesh = window.PlayerManager.createHeroMesh(window.myColorIdx, window.myGender, window.myClassIdx, window.myName, window.myProgress.level, window.myProgress.vipLevel, myId);
        window.World3D.scene.add(window.PlayerManager.myHeroMesh);
        window.PlayerManager.setupControls();
        window.CombatSystem.initMonsters();

        const curClass = window.CONFIG.CLASS_DATA[window.myClassIdx];
        const btnQ = document.getElementById('nameQ');
        const btnE = document.getElementById('nameE');
        const btnR = document.getElementById('nameR');
        if (btnQ && curClass) btnQ.textContent = curClass.qName;
        if (btnE && curClass) btnE.textContent = curClass.eName;
        if (btnR && curClass) btnR.textContent = curClass.rName;

        window.updateMeHUD();
        window.updateQuestUI();
        window.gameActive = true;
        requestAnimationFrame(gameLoop);
      }
    });

  } catch (e) {
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = window.authMode === 'login' ? 'เข้าสู่ยุทธภพ' : 'สร้างตัวละคร & ก้าวสู่ยุทธภพ';
    }
    alert(e.message);
  }
}

function gameLoop() {
  if (!window.gameActive) return;
  requestAnimationFrame(gameLoop);

  const vipSpd = window.CONFIG.VIP_DATA[window.myProgress.vipLevel]?.speedBonus || 1.0;
  window.PlayerManager.updatePhysics(vipSpd);
  window.World3D.updateEffect();
  window.CombatSystem.updateVFX();
  window.CombatSystem.updateMonsterAI();
  window.CombatSystem.updateAutoBattle();
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
      payload: { id: me.id, name: window.myName, gender: window.myGender, classIdx: window.myClassIdx, costume: window.myColorIdx, level: window.myProgress.level, vipLevel: window.myProgress.vipLevel, rp: window.calculateRP(), x: me.x, y: me.y, z: me.z, yaw: me.yaw, hp: me.hp, isDead: me.isDead }
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

window.equipItem = async function(invItemId) {
  const itemIdx = window.myProgress.inventoryItems.findIndex(i => i.id === invItemId);
  if (itemIdx === -1) return;

  const item = window.myProgress.inventoryItems[itemIdx];
  const stats = window.getItemStats(item.baseKey, item.color);
  if (!stats) return;

  const myLvl = window.myProgress.level;
  if (myLvl < stats.reqLvl) {
    window.showToast(`เลเวลไม่ถึง! ต้องการเลเวล ${stats.reqLvl}`);
    return;
  }

  const currentEquipped = window.myProgress.equipment[stats.slot];
  if (currentEquipped && currentEquipped.baseKey) {
    window.myProgress.inventoryItems.push({
      id: 'item_' + Math.random().toString(36).slice(2, 8),
      baseKey: currentEquipped.baseKey,
      color: currentEquipped.color
    });
  }

  window.myProgress.equipment[stats.slot] = { baseKey: item.baseKey, color: item.color };
  window.myProgress.inventoryItems.splice(itemIdx, 1);

  window.updateMeHUD();
  window.renderCharUI();
  window.renderInventoryUI();
  window.showToast(`สวมใส่ [${stats.fullName}] สำเร็จ!`);

  await window.sb.from('mmo_players').update({
    equipment: window.myProgress.equipment,
    inventory_items: window.myProgress.inventoryItems
  }).eq('name', window.myName);
};

window.unequipItem = async function(slot) {
  const eq = window.myProgress.equipment[slot];
  if (!eq || !eq.baseKey) return;

  window.myProgress.inventoryItems.push({
    id: 'item_' + Math.random().toString(36).slice(2, 8),
    baseKey: eq.baseKey,
    color: eq.color
  });

  window.myProgress.equipment[slot] = null;

  window.updateMeHUD();
  window.renderCharUI();
  window.renderInventoryUI();
  window.showToast('ถอดอุปกรณ์เรียบร้อย');

  await window.sb.from('mmo_players').update({
    equipment: window.myProgress.equipment,
    inventory_items: window.myProgress.inventoryItems
  }).eq('name', window.myName);
};

window.upgradeVIP = async function() {
  const curVip = window.myProgress.vipLevel;
  if (curVip >= 10) { window.showToast('ท่านบรรลุขั้น VIP 10 สูงสุดแล้ว!'); return; }
  const nextVip = curVip + 1;
  const cost = window.CONFIG.VIP_DATA[nextVip].cost;

  if (window.myProgress.money < cost) {
    window.showToast(`ตำลึงไม่พอ! ต้องการ ${cost} ตำลึง`); return;
  }

  window.myProgress.money -= cost;
  window.myProgress.vipLevel = nextVip;
  window.updateMeHUD();
  window.renderVipUI();
  window.showToast(`🌟 บรรลุขั้น ${window.CONFIG.VIP_DATA[nextVip].title} (VIP ${nextVip})`);

  await window.sb.from('mmo_players').update({
    money: window.myProgress.money,
    vip_level: window.myProgress.vipLevel
  }).eq('name', window.myName);
};

window.gainRewards = async function(expAmt, moneyAmt, drops, src, monsterType, droppedEquips = []) {
  const expMult = window.CONFIG.VIP_DATA[window.myProgress.vipLevel]?.expBonus || 1.0;
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
      window.myProgress.inventoryMaterials[k] = (window.myProgress.inventoryMaterials[k] || 0) + 1;
    });
  }

  if (droppedEquips && droppedEquips.length) {
    droppedEquips.forEach(eq => {
      const stats = window.getItemStats(eq.baseKey, eq.color);
      if (stats) {
        window.myProgress.inventoryItems.push({
          id: 'item_' + Math.random().toString(36).slice(2, 8),
          baseKey: eq.baseKey,
          color: eq.color
        });
        window.showToast(`✨ ดรอปไอเทม: ${stats.fullName} !`);
      }
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
    money: window.myProgress.money,
    inventory: window.myProgress.inventoryMaterials,
    inventory_items: window.myProgress.inventoryItems
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
  const pName = document.getElementById('pNameText');
  const pLv = document.getElementById('pLvText');
  const hpBar = document.getElementById('myHpBar');
  const expBar = document.getElementById('myExpBar');
  const money = document.getElementById('moneyText');
  const atk = document.getElementById('atkText');
  const def = document.getElementById('defText');
  const vipBadge = document.getElementById('vipBadge');

  if (pName) pName.textContent = window.myName;
  if (pLv) pLv.textContent = `Lv.${window.myProgress.level}`;
  if (hpBar && window.PlayerManager.me) hpBar.style.width = Math.max(0, (window.PlayerManager.me.hp / window.PlayerManager.me.maxHp) * 100) + '%';
  if (expBar) expBar.style.width = Math.min(100, (window.myProgress.exp / expNeeded(window.myProgress.level)) * 100) + '%';
  if (money) money.textContent = window.myProgress.money;
  if (atk) atk.textContent = window.getBaseAtk();
  if (def) def.textContent = window.getBaseDef();

  const vipInfo = window.CONFIG.VIP_DATA[window.myProgress.vipLevel];
  if (vipBadge && vipInfo) vipBadge.textContent = `VIP ${vipInfo.level}`;
};

window.renderCharUI = function() {
  const eq = window.myProgress.equipment;
  ['helm', 'armor', 'bracer', 'boots'].forEach(slot => {
    const item = eq[slot];
    const el = document.getElementById(`eq${slot.charAt(0).toUpperCase() + slot.slice(1)}Text`);
    if (el) {
      if (item && item.baseKey) {
        const stats = window.getItemStats(item.baseKey, item.color);
        if (stats) {
          el.innerHTML = `<span style="color:${stats.color};font-weight:bold;">${stats.fullName} (Lv.${stats.reqLvl}+)</span> <button class="menu-btn-small" onclick="unequipItem('${slot}')">ถอด</button>`;
        }
      } else {
        el.innerHTML = '- ไม่มี -';
      }
    }
  });
  const className = window.CONFIG.CLASS_DATA[window.myClassIdx]?.name || 'จอมยุทธ์';
  const eqWpn = document.getElementById('eqWeaponText');
  const eqStats = document.getElementById('eqTotalStatsText');
  if (eqWpn) eqWpn.textContent = `${className} (+${window.myProgress.swordPlus})`;
  if (eqStats) eqStats.innerHTML = `🔥 <b>พลังรบรวม (RP): ${window.calculateRP()}</b> | ATK: ${window.getBaseAtk()} | DEF: ${window.getBaseDef()}`;
};

window.renderInventoryUI = function() {
  const grid = document.getElementById('invGrid');
  if (!grid) return;
  let html = `
    <div class="inv-slot"><b>🧪 โอสถ</b><span>x${window.myProgress.inventoryMaterials.potion || 0}</span><button class="menu-btn-small" onclick="usePotion()">ดื่ม</button></div>
    <div class="inv-slot"><b>💎 หินวิญญาณ</b><span>x${window.myProgress.inventoryMaterials.spiritStone || 0}</span></div>
    <div class="inv-slot"><b>🌿 สมุนไพร</b><span>x${window.myProgress.inventoryMaterials.herb || 0}</span></div>
    <div class="inv-slot"><b>💰 ตำลึง</b><span>${window.myProgress.money}</span></div>
  `;

  window.myProgress.inventoryItems.forEach(item => {
    const stats = window.getItemStats(item.baseKey, item.color);
    if (stats) {
      html += `
        <div class="inv-slot" style="border-color:${stats.color};">
          <b style="color:${stats.color}; font-size:.8em;">${stats.fullName}</b>
          <span style="font-size:.68em; color:#a89779;">Lv.${stats.reqLvl}+ | ${stats.atk ? 'ATK +' + stats.atk : 'DEF +' + stats.def}</span>
          <button class="menu-btn-small" style="background:${stats.color}; color:#000; font-weight:700;" onclick="equipItem('${item.id}')">สวมใส่</button>
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

  const vipStatus = document.getElementById('vipStatusText');
  if (vipStatus && vipInfo) {
    vipStatus.textContent = `VIP ${curVip} - ${vipInfo.title}`;
  }
  const box = document.getElementById('vipModalContent');
  if (box && vipInfo) {
    if (nextVip) {
      box.innerHTML = `
        <p>สถานะปัจจุบัน: <b style="color:var(--gold-bright)">VIP ${curVip} (${vipInfo.title})</b></p>
        <p style="margin-top:6px;">สิทธิพิเศษขั้นถัดไป (VIP ${nextVip.level} - ${nextVip.title}):</p>
        <ul style="text-align:left; font-size:.85em; padding-left:20px; line-height:1.6;">
          <li>⭐ พลังโจมตี (ATK): +${Math.round((nextVip.atkBonus - 1) * 100)}%</li>
          <li>⭐ พลังป้องกัน (DEF): +${Math.round((nextVip.defBonus - 1) * 100)}%</li>
          <li>⭐ โบนัส EXP & เงิน: +${Math.round((nextVip.expBonus - 1) * 100)}%</li>
          <li>⭐ ความเร็วเคลื่อนที่: +${Math.round((nextVip.speedBonus - 1) * 100)}%</li>
        </ul>
        <p style="margin-top:6px;">ค่าเลื่อนขั้น: <b style="color:#ffd13b">${nextVip.cost} ตำลึง</b></p>
      `;
    } else {
      box.innerHTML = `
        <p>สถานะปัจจุบัน: <b style="color:var(--gold-bright)">VIP ${curVip} (${vipInfo.title})</b></p>
        <p style="margin-top:6px; color:#22c55e;"><b>ท่านบรรลุขั้น VIP 10 สูงสุดเรียบร้อยแล้ว!</b></p>
      `;
    }
  }
};
