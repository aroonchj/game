window.CombatSystem = {
  cooldowns: {
    atk: { cd: 280, until: 0, mult: 1.0, range: 5.5 },
    Q: { cd: 1800, until: 0, mult: 2.2, range: 10.0 },
    E: { cd: 4000, until: 0, mult: 3.4, range: 12.5 },
    R: { cd: 7500, until: 0, mult: 5.2, range: 16.0 }
  },
  vfxObjects: [],
  monsters: [
    { id: 'm1', x: 26, z: -22, hp: 280, maxHp: 280, alive: true, mesh: null, hpBarMesh: null, isBoss: false },
    { id: 'm2', x: 28, z: 22, hp: 280, maxHp: 280, alive: true, mesh: null, hpBarMesh: null, isBoss: false },
    { id: 'boss', x: 44, z: 0, hp: 850, maxHp: 850, alive: true, mesh: null, hpBarMesh: null, isBoss: true }
  ],

  initMonsters() {
    this.monsters.forEach(m => {
      const scale = m.isBoss ? 1.8 : 1.0;
      const mon = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.2 * scale),
        new THREE.MeshStandardMaterial({ color: m.isBoss ? 0x2d182e : 0x4a1843, roughness: 0.5 })
      );
      body.position.y = 1.2 * scale;
      body.castShadow = true;

      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.18 * scale, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2233 }));
      eyeL.position.set(-0.35 * scale, 1.4 * scale, 0.95 * scale);
      const eyeR = eyeL.clone();
      eyeR.position.set(0.35 * scale, 1.4 * scale, 0.95 * scale);
      mon.add(body, eyeL, eyeR);

      // หลอดเลือด 3D บนหัวมอนสเตอร์
      const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.3), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.22), new THREE.MeshBasicMaterial({ color: 0xe63950 }));
      hpFill.position.z = 0.01;
      hpBg.add(hpFill);
      hpBg.position.set(0, m.isBoss ? 3.8 : 2.6, 0);
      mon.add(hpBg);

      m.mesh = mon;
      m.hpBarMesh = hpFill;
      m.mesh.position.set(m.x, 0, m.z);
      window.World3D.scene.add(m.mesh);
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
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 6), new THREE.MeshBasicMaterial({ color: 0xfae17d }));
      beam.position.set(x - Math.sin(yaw) * 4, y + 1.0, z - Math.cos(yaw) * 4);
      beam.rotation.y = yaw;
      scene.add(beam);
      this.vfxObjects.push({ mesh: beam, life: 1.0, decay: 0.04, vx: -Math.sin(yaw) * 0.85, vz: -Math.cos(yaw) * 0.85 });
    } else if (skill === 'E') {
      for (let i = 0; i < 12; i++) {
        setTimeout(() => {
          const sw = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.0, 0.35), new THREE.MeshBasicMaterial({ color: 0x48bb78 }));
          sw.position.set(x + (Math.random() - 0.5) * 10, y + 14, z + (Math.random() - 0.5) * 10);
          scene.add(sw);
          this.vfxObjects.push({ mesh: sw, vy: -0.9, life: 1.0, decay: 0.03 });
        }, i * 30);
      }
    } else if (skill === 'R') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.0, 0.4, 16, 32), new THREE.MeshBasicMaterial({ color: 0xff3b30, wireframe: true }));
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
          const rewardExp = m.isBoss ? 260 : 60;
          const rewardMoney = m.isBoss ? 200 : 35;
          const drops = m.isBoss ? ['spiritStone', 'spiritStone', 'potion'] : ['herb', 'spiritStone'];

          if (window.channel) {
            window.channel.send({
              type: 'broadcast', event: 'reward',
              payload: { targetName: atk.name, exp: rewardExp, money: rewardMoney, drops, sourceName: m.isBoss ? 'จอมอสูรหิน' : 'อสูร' }
            });
          }
          if (atk.name === window.myName) {
            window.gainRewards(rewardExp, rewardMoney, drops, m.isBoss ? 'จอมอสูรหิน' : 'อสูร');
          }

          setTimeout(() => {
            m.hp = m.maxHp;
            m.alive = true;
            m.mesh.visible = true;
            if (m.hpBarMesh) m.hpBarMesh.scale.x = 1.0;
          }, 8000);
        }
      }
    });
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
