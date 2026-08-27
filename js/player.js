window.PlayerManager = {
  me: { id: '', x: 0, z: 0, yaw: 0, hp: 200, maxHp: 200, isDead: false, respawnAt: 0 },
  myHeroMesh: null, petMesh: null, auraMesh: null, targetPos: null, otherPlayers: {},

  createNameplateSprite(name, lvl, vip, isMe = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.roundRect(10, 20, 492, 88, 16);
    ctx.fill();
    ctx.strokeStyle = isMe ? '#fae17d' : '#4299e1';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.font = 'bold 38px "Noto Sans Thai", sans-serif';
    ctx.fillStyle = '#efe6d5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${name} [Lv.${lvl}] (VIP ${vip})`, 256, 64);
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    sprite.scale.set(3.6, 0.9, 1.0);
    return sprite;
  },

  createHeroMesh(colorIdx = 0, gender = 'male', classIdx = 0, name = 'จอมยุทธ์', lvl = 1, vip = 0, playerId = '') {
    const hero = new THREE.Group();
    hero.userData.playerId = playerId;
    const cColor = window.CONFIG.ROBE_COLORS[colorIdx] || window.CONFIG.ROBE_COLORS[0];
    const isFemale = gender === 'female';

    const bodyMat = new THREE.MeshStandardMaterial({ color: cColor, roughness: 0.35, metalness: 0.2 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfce5cd, roughness: 0.6 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.3 });

    const bodyW = isFemale ? 0.3 : 0.38;
    const bodyBottom = isFemale ? 0.55 : 0.68;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(bodyW, bodyBottom, 1.7, 12), bodyMat);
    body.position.y = 1.0; body.castShadow = true;
    hero.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(isFemale ? 0.3 : 0.34, 16, 16), skinMat);
    head.position.y = 2.05; head.castShadow = true;
    hero.add(head);

    const nameSprite = this.createNameplateSprite(name, lvl, vip, playerId === this.me.id);
    nameSprite.position.set(0, 2.8, 0);
    hero.add(nameSprite);

    const auraGeo = new THREE.RingGeometry(0.8, 1.2, 32);
    const auraMat = new THREE.MeshBasicMaterial({ color: 0xd4af37, side: THREE.DoubleSide, transparent: true, opacity: 0.45 });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.05;
    hero.add(aura);
    if (playerId === this.me.id) this.auraMesh = aura;

    // รูปร่างแยกตามอาชีพ
    if (classIdx === 0) {
      const sword = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.0, 0.2), goldMat);
      sword.position.set(0.35, 1.2, -0.42); sword.rotation.z = Math.PI / 6;
      hero.add(sword);
    } else if (classIdx === 1) {
      const broadSword = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 0.5), ironMat);
      broadSword.position.set(0.25, 1.3, -0.45); broadSword.rotation.z = Math.PI / 5;
      hero.add(broadSword);
    } else if (classIdx === 2) {
      const gloveL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), goldMat);
      gloveL.position.set(-0.45, 0.8, 0.2);
      const gloveR = gloveL.clone(); gloveR.position.set(0.45, 0.8, 0.2);
      hero.add(gloveL, gloveR);
    } else if (classIdx === 3) {
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.05, 8, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.6 }));
      bow.position.set(-0.35, 1.2, -0.35); bow.rotation.y = Math.PI / 2;
      hero.add(bow);
    }

    return hero;
  },

  updatePhysics(speedMult = 1.0) {
    if (this.me.isDead) {
      if (Date.now() > this.me.respawnAt) {
        this.me.isDead = false; this.me.hp = this.me.maxHp; this.me.x = 0; this.me.z = 0;
        window.updateMeHUD(); window.showToast('ฟื้นคืนชีพ ณ ลานเมือง!');
      }
      return;
    }

    const baseSpeed = 0.22 * speedMult;
    if (this.targetPos) {
      const dx = this.targetPos.x - this.me.x;
      const dz = this.targetPos.z - this.me.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.3) {
        this.me.yaw = Math.atan2(-dx, -dz);
        this.me.x += (dx / dist) * baseSpeed;
        this.me.z += (dz / dist) * baseSpeed;
      } else {
        this.targetPos = null;
      }
    }

    if (this.myHeroMesh) {
      this.myHeroMesh.position.set(this.me.x, 0, this.me.z);
      this.myHeroMesh.rotation.y = this.me.yaw;
    }

    if (this.auraMesh) this.auraMesh.rotation.z += 0.02;
    this.updatePetFollow();

    // หมุนมุมกล้องอิสระรอบตัว
    const cam = window.World3D.camera;
    cam.position.x = this.me.x + Math.sin(World3D.cameraAngle) * World3D.cameraDist;
    cam.position.y = World3D.cameraHeight;
    cam.position.z = this.me.z + Math.cos(World3D.cameraAngle) * World3D.cameraDist;
    cam.lookAt(this.me.x, 0, this.me.z);
  },

  updatePetFollow() {
    if (!this.petMesh) {
      const petGroup = new THREE.Group();
      const petBody = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), new THREE.MeshStandardMaterial({ color: 0x4299e1, roughness: 0.2 }));
      const petWing = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 4), new THREE.MeshBasicMaterial({ color: 0x90cdf4 }));
      petWing.position.set(0.3, 0.2, 0); petWing.rotation.z = -Math.PI / 3;
      petGroup.add(petBody, petWing);
      this.petMesh = petGroup;
      window.World3D.scene.add(petGroup);
    }
    const targetX = this.me.x + Math.sin(this.me.yaw + 2.2) * 1.8;
    const targetZ = this.me.z + Math.cos(this.me.yaw + 2.2) * 1.8;
    const targetY = 1.3 + Math.sin(Date.now() * 0.005) * 0.25;
    this.petMesh.position.x += (targetX - this.petMesh.position.x) * 0.1;
    this.petMesh.position.y += (targetY - this.petMesh.position.y) * 0.1;
    this.petMesh.position.z += (targetZ - this.petMesh.position.z) * 0.1;
  }
};

window.inspectPlayer = function(targetId) {
  const p = window.PlayerManager.otherPlayers[targetId];
  if (!p) return;
  const modal = document.getElementById('inspectModal');
  const title = document.getElementById('inspectTitle');
  const content = document.getElementById('inspectContent');
  if (title) title.textContent = `ข้อมูลจอมยุทธ์: ${p.name}`;
  if (content) {
    content.innerHTML = `
      <p>⭐ สำนัก: <b>${window.CONFIG.CLASS_DATA[p.classIdx || 0].name}</b></p>
      <p>⭐ เลเวล: <b>Lv.${p.level || 1}</b></p>
      <p>👑 สถานะ: <b>VIP ${p.vipLevel || 0}</b></p>
      <p>🔥 พลังรบรวม (RP): <b style="color:var(--gold-bright);">${p.rp || 150}</b></p>
    `;
  }
  if (modal) modal.style.display = 'flex';
};
