window.CombatSystem = {
  cooldowns: {
    atk: { cd: 280, until: 0, mult: 1.0, range: 5.5 },
    Q: { cd: 1800, until: 0, mult: 2.2, range: 10.0 },
    E: { cd: 4000, until: 0, mult: 3.4, range: 12.5 },
    R: { cd: 7500, until: 0, mult: 5.2, range: 16.0 }
  },
  vfxObjects: [],
  monsters: [
    // ทุ่งหญ้าหมาป่าทมิฬ (Lv.1 - 3)
    { id: 'w1', type: 'wolf', name: 'หมาป่าทมิฬ', lvl: 2, x: 25, z: -50, hp: 120, maxHp: 120, atk: 12, aggroRange: 10, alive: true, mesh: null, hpBarMesh: null, isBoss: false },
    { id: 'w2', type: 'wolf', name: 'หมาป่าทมิฬ', lvl: 2, x: -30, z: -60, hp: 120, maxHp: 120, atk: 12, aggroRange: 10, alive: true, mesh: null, hpBarMesh: null, isBoss: false },
    // ป่าไผ่ซ่อนพยัคฆ์ (Lv.10 - 15)
    { id: 'b1', type: 'bandit', name: 'โจรป่าไผ่', lvl: 10, x: -65, z: 15, hp: 380, maxHp: 380, atk: 26, aggroRange: 12, alive: true, mesh: null, hpBarMesh: null, isBoss: false },
    { id: 'b2', type: 'bandit', name: 'มือสังหารเงาไผ่', lvl: 15, x: -55, z: 45, hp: 550, maxHp: 550, atk: 38, aggroRange: 12, alive: true, mesh: null, hpBarMesh: null, isBoss: false },
    // หุบเขาโกเลมศิลา (Lv.25 - 30)
    { id: 'g1', type: 'golem', name: 'โกเลมหินผา', lvl: 25, x: 65, z: 20, hp: 850, maxHp: 850, atk: 50, aggroRange: 14, alive: true, mesh: null, hpBarMesh: null, isBoss: false },
    // บอสใหญ่ประจำยุทธภพ (World Boss Lv.50)
    { id: 'boss_dragon', type: 'boss', name: 'มังกรศิลาพันปี', lvl: 50, x: 90, z: -70, hp: 4500, maxHp: 4500, atk: 120, aggroRange: 26, alive: true, mesh: null, hpBarMesh: null, isBoss: true }
  ],

  createNameplateSprite(text, isBoss = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.roundRect(10, 20, 492, 88, 16);
    ctx.fill();
    ctx.strokeStyle = isBoss ? '#f56565' : '#d4af37';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.font = 'bold 44px "Noto Sans Thai", sans-serif';
    ctx.fillStyle = isBoss ? '#ff4d4f' : '#fae17d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    sprite.scale.set(isBoss ? 4.8 : 3.4, isBoss ? 1.2 : 0.85, 1.0);
    return sprite;
  },

  initMonsters() {
    this.monsters.forEach(m => {
      const scale = m.isBoss ? 2.6 : (m.type === 'golem' ? 1.5 : 1.0);
      const mon = new THREE.Group();
      let color = 0x3d3936;
      if (m.type === 'wolf') color = 0x242a33;
      if (m.type === 'bandit') color = 0x542c1f;
      if (m.isBoss) color = 0x661118;

      const body = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 * scale), new THREE.MeshStandardMaterial({ color, roughness: 0.4 }));
      body.position.y = 1.2 * scale; body.castShadow = true;
      mon.add(body);

      const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.35), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.26), new THREE.MeshBasicMaterial({ color: m.isBoss ? 0xff3b30 : 0x22c55e }));
      hpFill.position.z = 0.01;
      hpBg.add(hpFill);
      hpBg.position.set(0, scale * 2.3 + 0.6, 0);
      mon.add(hpBg);

      const nameplateText = `${m.isBoss ? '👑 ' : ''}${m.name} [Lv.${m.lvl}]`;
      const nameSprite = this.createNameplateSprite(nameplateText, m.isBoss);
      nameSprite.position.set(0, scale * 2.3 + 1.3, 0);
      mon.add(nameSprite);

      m.mesh = mon;
      m.hpBarMesh = hpFill;
      m.mesh.position.set(m.x, 0, m.z);
      window.World3D.scene.add(m.mesh);
    });
  },

  updateMonsterAI() {
    const me = window.PlayerManager.me;
    if (me.isDead) return;

    const bossEl = document.getElementById('boss-bar-box');
    let bossTargeted = false;

    this.monsters.forEach(m => {
      if (!m.alive || !m.mesh) return;
      const dx = me.x - m.x;
      const dz = me.z - m.z;
      const dist = Math.hypot(dx, dz);

      if (m.isBoss && dist < 35) {
        bossTargeted = true;
        if (bossEl) {
          bossEl.style.display = 'flex';
          const bossName = document.getElementById('bossNameText');
          const bossLvl = document.getElementById('bossLvlText');
          const bossHp = document.getElementById('bossHpFill');
          if (bossName) bossName.textContent = `🐉 ${m.name}`;
          if (bossLvl) bossLvl.textContent = `Lv.${m.lvl} [World Boss]`;
          if (bossHp) bossHp.style.width = Math.max(0, (m.hp / m.maxHp) * 100) + '%';
        }
      }

      if (dist < m.aggroRange && dist > 2.2) {
        const moveSpd = m.isBoss ? 0.09 : 0.06;
        m.x += (dx / dist) * moveSpd;
        m.z += (dz / dist) * moveSpd;
        m.mesh.position.set(m.x, 0, m.z);
        m.mesh.lookAt(me.x, 0, me.z);
      }

      // โดนโจมตี & กฎเลเวลแกป
      if (dist <= 3.2 && Date.now() > (m.lastAttackTime || 0)) {
        m.lastAttackTime = Date.now() + (m.isBoss ? 1600 : 2200);

        const myLvl = window.myProgress.level;
        const lvlDiff = m.lvl - myLvl;
        let gapMult = 1.0;
        if (lvlDiff > 2) gapMult = 2.2; // มอนเวลห่างเกิน ตีแรงคูณสอง

        const myDef = window.getBaseDef();
        let rawDmg = m.atk * gapMult;
        const actualDmg = Math.max(8, Math.round(rawDmg - (myDef * 0.35)));

        me.hp = Math.max(0, me.hp - actualDmg);
        window.updateMeHUD();

        if (lvlDiff > 2) window.showToast(`⚠️ โดน [${m.name}] ฟาดแรงคูณ 2! (-${actualDmg} HP)`);
        else window.showToast(`โดน [${m.name}] โจมตี! -${actualDmg} HP`);

        if (me.hp <= 0) {
          me.isDead = true;
          me.respawnAt = Date.now() + 4000;
          window.showToast('ท่านหมดสติในยุทธภพ! กำลังฟื้นคืนชีพ...');
        }
      }
    });

    if (!bossTargeted && bossEl) bossEl.style.display = 'none';
  },

  updateAutoBattle() {
    if (!window.isAutoBattle || window.PlayerManager.me.isDead) return;
    const me = window.PlayerManager.me;

    this.monsters.forEach(m => {
      if (!m.alive) return;
      const dist = Math.hypot(m.x - me.x, m.z - me.z);
      if (dist < 8.0) {
        if (Date.now() > this.cooldowns.R.until) this.castSkill('R');
        else if (Date.now() > this.cooldowns.E.until) this.castSkill('E');
        else if (Date.now() > this.cooldowns.Q.until) this.castSkill('Q');
        else if (Date.now() > this.cooldowns.atk.until) this.castSkill('atk');
      }
    });
  },

  castSkill(k) {
    const me = window.PlayerManager.me;
    if (!window.gameActive || me.isDead) return;
    const sk = this.cooldowns[k];
    const now = Date.now();
    if (now < sk.until) return;

    sk.until = now + sk.cd;
    this.triggerSkillVFX(k, me.x, me.y, me.z, me.yaw, window.myClassIdx);

    const baseAtk = window.getBaseAtk();
    const totalDmg = Math.round(baseAtk * sk.mult);
    const payload = { id: me.id, name: window.myName, x: me.x, y: me.y, z: me.z, yaw: me.yaw, skill: k, classIdx: window.myClassIdx, dmg: totalDmg, range: sk.range };

    if (window.channel) window.channel.send({ type: 'broadcast', event: 'skill', payload });
    if (window.isHost) this.checkMonsterHit(payload);
  },

  triggerSkillVFX(skill, x, y, z, yaw, classIdx = 0) {
    const scene = window.World3D.scene;
    let skillColor = 0xfae17d;
    if (classIdx === 1) skillColor = 0xff4500;
    if (classIdx === 2) skillColor = 0x9f7aea;
    if (classIdx === 3) skillColor = 0x48bb78;

    if (skill === 'atk') {
      const slash = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.5, 4.2, 8), new THREE.MeshBasicMaterial({ color: skillColor }));
      slash.position.set(x - Math.sin(yaw) * 2, y + 1.2, z - Math.cos(yaw) * 2);
      slash.rotation.y = yaw + Math.PI / 2;
      slash.rotation.z = Math.PI / 4;
      scene.add(slash);
      this.vfxObjects.push({ mesh: slash, life: 1.0, decay: 0.08, scaleSpeed: 0.1 });
    } else if (skill === 'R') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.5, 16, 32), new THREE.MeshBasicMaterial({ color: skillColor, wireframe: true }));
      ring.position.set(x, y + 1.5, z);
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);
      this.vfxObjects.push({ mesh: ring, life: 1.0, decay: 0.03, rotSpeed: 0.12, scaleSpeed: 0.4 });
    }
  },

  checkMonsterHit(atk) {
    this.monsters.forEach(m => {
      if (!m.alive) return;
      const dist = Math.hypot((atk.x || 0) - m.x, (atk.z || 0) - m.z);
      if (dist < (atk.range || 5.2)) {
        const myLvl = window.myProgress.level;
        const lvlDiff = m.lvl - myLvl;

        let finalDmg = atk.dmg || 24;
        if (lvlDiff > 2) {
          finalDmg = Math.max(1, Math.round(finalDmg * 0.12));
          window.showToast(`พลังปราณไม่ถึง! ตีเข้าเพียง [${finalDmg}] ดาเมจ`);
        }

        m.hp = Math.max(0, m.hp - finalDmg);
        if (m.hpBarMesh) m.hpBarMesh.scale.x = Math.max(0.01, m.hp / m.maxHp);

        if (m.hp <= 0 && m.alive) {
          m.alive = false;
          m.mesh.visible = false;

          const rewardExp = m.isBoss ? 550 : Math.round(m.lvl * 18);
          const rewardMoney = m.isBoss ? 400 : Math.round(m.lvl * 8);
          const droppedEquips = this.rollDynamicEquips(m);

          if (window.channel) {
            window.channel.send({
              type: 'broadcast', event: 'reward',
              payload: { targetName: atk.name, exp: rewardExp, money: rewardMoney, drops: ['spiritStone', 'potion'], droppedEquips, sourceName: m.name, monsterType: m.type }
            });
          }
          if (atk.name === window.myName) {
            window.gainRewards(rewardExp, rewardMoney, ['spiritStone', 'potion'], m.name, m.type, droppedEquips);
          }

          setTimeout(() => {
            m.hp = m.maxHp; m.alive = true; m.mesh.visible = true;
            if (m.hpBarMesh) m.hpBarMesh.scale.x = 1.0;
          }, m.isBoss ? 25000 : 8000);
        }
      }
    });
  },

  // สุ่มดรอปไอเทม พร้อมสุ่มระดับสี (Dynamic Rarity)
  rollDynamicEquips(m) {
    const dropped = [];
    let pool = ['helm_lv1', 'armor_lv1', 'boots_lv1'];

    if (m.isBoss) pool = ['helm_lv40', 'boots_lv40', 'armor_lv30', 'wpn_dragon_pink'];
    else if (m.type === 'golem') pool = ['armor_lv20', 'bracer_lv20', 'helm_lv15'];
    else if (m.type === 'bandit') pool = ['helm_lv10', 'armor_lv10', 'bracer_lv10'];
    else if (m.type === 'wolf') pool = ['helm_lv5', 'armor_lv5', 'boots_lv5'];

    const dropChance = m.isBoss ? 0.90 : 0.40;
    if (Math.random() < dropChance) {
      const chosenBase = pool[Math.floor(Math.random() * pool.length)];
      
      const randC = Math.random() * 100;
      let rolledColor = 'white';
      if (m.isBoss) {
        if (randC < 3) rolledColor = 'pink';
        else if (randC < 12) rolledColor = 'red';
        else if (randC < 30) rolledColor = 'orange';
        else if (randC < 60) rolledColor = 'purple';
        else rolledColor = 'blue';
      } else {
        if (randC < 0.5) rolledColor = 'pink';
        else if (randC < 2.5) rolledColor = 'red';
        else if (randC < 8.0) rolledColor = 'orange';
        else if (randC < 20.0) rolledColor = 'purple';
        else if (randC < 45.0) rolledColor = 'blue';
        else if (randC < 75.0) rolledColor = 'green';
      }
      dropped.push({ baseKey: chosenBase, color: rolledColor });
    }
    return dropped;
  },

  updateVFX() {
    for (let i = this.vfxObjects.length - 1; i >= 0; i--) {
      const p = this.vfxObjects[i];
      p.life -= p.decay;
      if (p.scaleSpeed) p.mesh.scale.addScalar(p.scaleSpeed);
      if (p.life <= 0) {
        window.World3D.scene.remove(p.mesh);
        this.vfxObjects.splice(i, 1);
      }
    }
  }
};
