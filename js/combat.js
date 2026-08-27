window.CombatSystem = {
  cooldowns: {
    atk: { cd: 280, until: 0, mult: 1.0, range: 5.5 },
    Q: { cd: 1800, until: 0, mult: 2.2, range: 10.0 },
    E: { cd: 4000, until: 0, mult: 3.4, range: 12.5 },
    R: { cd: 7500, until: 0, mult: 5.2, range: 16.0 }
  },
  vfxObjects: [],

  // รายการมอนสเตอร์และบอสทั่วแผนที่ 300x300 เมตร
  monsters: [
    // โซน 1: ชายป่าลานเมือง (Lv.1 - 5)
    { id: 'm1', type: 'wolf', name: 'หมาป่าทมิฬ', lvl: 3, x: 20, z: -40, hp: 180, maxHp: 180, atk: 14, aggroRange: 10, alive: true, mesh: null, hpBarMesh: null, isBoss: false },
    { id: 'm2', type: 'wolf', name: 'หมาป่าทมิฬ', lvl: 3, x: -20, z: -40, hp: 180, maxHp: 180, atk: 14, aggroRange: 10, alive: true, mesh: null, hpBarMesh: null, isBoss: false },

    // โซน 2: ป่าไผ่ซ่อนพยัคฆ์ (Lv.10 - 20)
    { id: 'm3', type: 'bandit', name: 'จอมโจรป่าไผ่', lvl: 12, x: -65, z: 20, hp: 450, maxHp: 450, atk: 28, aggroRange: 12, alive: true, mesh: null, hpBarMesh: null, isBoss: false },
    { id: 'm4', type: 'bandit', name: 'จอมโจรป่าไผ่', lvl: 14, x: -75, z: -10, hp: 520, maxHp: 520, atk: 32, aggroRange: 12, alive: true, mesh: null, hpBarMesh: null, isBoss: false },

    // โซน 3: หุบเขาหินผา (Lv.25 - 35)
    { id: 'm5', type: 'golem', name: 'โกเลมศิลาแดง', lvl: 28, x: 70, z: 30, hp: 950, maxHp: 950, atk: 52, aggroRange: 14, alive: true, mesh: null, hpBarMesh: null, isBoss: false },

    // โซน 4: บอสใหญ่ระดับโลก (World Boss Lv.50)
    { id: 'boss_dragon', type: 'boss', name: 'มังกรศิลาพันปี [World Boss]', lvl: 50, x: 80, z: -50, hp: 3500, maxHp: 3500, atk: 95, aggroRange: 22, alive: true, mesh: null, hpBarMesh: null, isBoss: true }
  ],

  initMonsters() {
    this.monsters.forEach(m => {
      const scale = m.isBoss ? 2.4 : (m.type === 'golem' ? 1.5 : 1.0);
      const mon = new THREE.Group();

      let color = 0x3d3936;
      if (m.type === 'wolf') color = 0x242a33;
      if (m.type === 'bandit') color = 0x542c1f;
      if (m.isBoss) color = 0x661118;

      const body = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.2 * scale),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4 })
      );
      body.position.y = 1.2 * scale;
      body.castShadow = true;

      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.16 * scale, 8, 8), new THREE.MeshBasicMaterial({ color: m.isBoss ? 0xffcc00 : 0xff2233 }));
      eyeL.position.set(-0.35 * scale, 1.4 * scale, 0.95 * scale);
      const eyeR = eyeL.clone();
      eyeR.position.set(0.35 * scale, 1.4 * scale, 0.95 * scale);
      mon.add(body, eyeL, eyeR);

      // หลอดเลือด 3D เหนือหัว
      const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.35), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.26), new THREE.MeshBasicMaterial({ color: m.isBoss ? 0xff3b30 : 0x22c55e }));
      hpFill.position.z = 0.01;
      hpBg.add(hpFill);
      hpBg.position.set(0, scale * 2.3 + 0.6, 0);
      mon.add(hpBg);

      m.mesh = mon;
      m.hpBarMesh = hpFill;
      m.mesh.position.set(m.x, 0, m.z);
      window.World3D.scene.add(m.mesh);
    });
  },

  // บอส & มอนสเตอร์ AI วิ่งตามและโจมตีผู้เล่น
  updateMonsterAI() {
    const me = window.PlayerManager.me;
    if (me.isDead) return;

    this.monsters.forEach(m => {
      if (!m.alive || !m.mesh) return;

      const dx = me.x - m.x;
      const dz = me.z - m.z;
      const dist = Math.hypot(dx, dz);

      // ถ้าผู้เล่นเข้าใกล้ระยะ Aggro มอนจะเดินเข้าหา
      if (dist < m.aggroRange && dist > 2.2) {
        const moveSpd = m.isBoss ? 0.09 : 0.06;
        m.x += (dx / dist) * moveSpd;
        m.z += (dz / dist) * moveSpd;
        m.mesh.position.set(m.x, 0, m.z);
        m.mesh.lookAt(me.x, 0, me.z);
      }

      // มอนสเตอร์โจมตีผู้เล่นคืน
      if (dist <= 3.2 && Date.now() > (m.lastAttackTime || 0)) {
        m.lastAttackTime = Date.now() + (m.isBoss ? 1600 : 2200);

        const myDef = window.getBaseDef();
        const rawDmg = m.atk;
        const actualDmg = Math.max(8, rawDmg - Math.round(myDef * 0.35));

        me.hp = Math.max(0, me.hp - actualDmg);
        window.updateMeHUD();
        window.showToast(`โดน [${m.name}] โจมตี! -${actualDmg} HP`);

        if (me.hp <= 0) {
          me.isDead = true;
          me.respawnAt = Date.now() + 4000;
          window.showToast('ท่านหมดสติในยุทธภพ! กำลังฟื้นคืนชีพ...');
        }
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
    this.triggerSkillVFX(k, me.x, me.y, me.z, me.yaw);

    const baseAtk = window.getBaseAtk();
    const totalDmg = Math.round(baseAtk * sk.mult);

    const payload = {
      id: me.id, name: window.myName,
      x: me.x, y: me.y, z: me.z, yaw: me.yaw,
      skill: k, dmg: totalDmg, range: sk.range
    };

    if (window.channel) window.channel.send({ type: 'broadcast', event: 'skill', payload });
    if (window.isHost) this.checkMonsterHit(payload);
  },

  triggerSkillVFX(skill, x, y, z, yaw) {
    const scene = window.World3D.scene;
    if (skill === 'atk') {
      const slash = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.5, 4.2, 8), new THREE.MeshBasicMaterial({ color: 0xffaa33 }));
      slash.position.set(x - Math.sin(yaw) * 2, y + 1.2, z - Math.cos(yaw) * 2);
      slash.rotation.y = yaw + Math.PI / 2;
      slash.rotation.z = Math.PI / 4;
      scene.add(slash);
      this.vfxObjects.push({ mesh: slash, life: 1.0, decay: 0.08, scaleSpeed: 0.1 });
    } else if (skill === 'Q') {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 7), new THREE.MeshBasicMaterial({ color: 0xfae17d }));
      beam.position.set(x - Math.sin(yaw) * 4, y + 1.0, z - Math.cos(yaw) * 4);
      beam.rotation.y = yaw;
      scene.add(beam);
      this.vfxObjects.push({ mesh: beam, life: 1.0, decay: 0.04, vx: -Math.sin(yaw) * 0.85, vz: -Math.cos(yaw) * 0.85 });
    } else if (skill === 'E') {
      for (let i = 0; i < 12; i++) {
        setTimeout(() => {
          const sw = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.0, 0.35), new THREE.MeshBasicMaterial({ color: 0x48bb78 }));
          sw.position.set(x + (Math.random() - 0.5) * 12, y + 15, z + (Math.random() - 0.5) * 12);
          scene.add(sw);
          this.vfxObjects.push({ mesh: sw, vy: -0.9, life: 1.0, decay: 0.03 });
        }, i * 30);
      }
    } else if (skill === 'R') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.5, 16, 32), new THREE.MeshBasicMaterial({ color: 0xff3b30, wireframe: true }));
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
        m.hp = Math.max(0, m.hp - (atk.dmg || 24));
        if (m.hpBarMesh) m.hpBarMesh.scale.x = Math.max(0.01, m.hp / m.maxHp);

        if (m.hp <= 0 && m.alive) {
          m.alive = false;
          m.mesh.visible = false;

          const rewardExp = m.isBoss ? 1200 : (m.lvl * 25);
          const rewardMoney = m.isBoss ? 800 : (m.lvl * 15);
          const drops = this.rollMonsterDrops(m);

          if (window.channel) {
            window.channel.send({
              type: 'broadcast', event: 'reward',
              payload: { targetName: atk.name, exp: rewardExp, money: rewardMoney, drops, sourceName: m.name, monsterType: m.type }
            });
          }
          if (atk.name === window.myName) {
            window.gainRewards(rewardExp, rewardMoney, drops, m.name, m.type);
          }

          setTimeout(() => {
            m.hp = m.maxHp;
            m.alive = true;
            m.mesh.visible = true;
            if (m.hpBarMesh) m.hpBarMesh.scale.x = 1.0;
          }, m.isBoss ? 20000 : 7000);
        }
      }
    });
  },

  // สุ่มดรอปไอเทมตามระดับเลเวลและบอส
  rollMonsterDrops(monster) {
    const drops = ['spiritStone', 'potion'];
    const rand = Math.random() * 100;

    if (monster.isBoss) {
      if (rand < 5) drops.push('wpn_dragon_pink');     // อาวุธสีชมพู (5%)
      else if (rand < 20) drops.push('helm_boss_pink'); // หมวกสีชมพู (15%)
      else if (rand < 50) drops.push('armor_boss_red');  // เกราะสีแดง (30%)
      else drops.push('boots_boss_pink');
    } else if (monster.type === 'golem') {
      if (rand < 25) drops.push('armor_purple');
      else if (rand < 50) drops.push('bracer_orange');
    } else if (monster.type === 'bandit') {
      if (rand < 35) drops.push('helm_blue');
      else if (rand < 60) drops.push('bracer_blue');
    } else if (monster.type === 'wolf') {
      if (rand < 40) drops.push('helm_green');
      else if (rand < 70) drops.push('boots_green');
    }

    return drops;
  },

  updateVFX() {
    for (let i = this.vfxObjects.length - 1; i >= 0; i--) {
      const p = this.vfxObjects[i];
      p.life -= p.decay;
      if (p.vy) p.mesh.position.y += p.vy;
      if (p.vx) p.mesh.position.x += p.vx;
      if (p.vz) p.mesh.position.z += p.vz;
      if (p.rotSpeed) p.mesh.rotation.z += p.rotSpeed;
      if (p.scaleSpeed) p.mesh.scale.addScalar(p.scaleSpeed);

      if (p.life <= 0) {
        window.World3D.scene.remove(p.mesh);
        this.vfxObjects.splice(i, 1);
      }
    }
  }
};
