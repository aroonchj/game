window.PlayerManager = {
  me: {
    id: '', x: 0, y: 0, z: 0,
    vy: 0, isGrounded: true, jumpsLeft: 2, isFlying: false,
    yaw: 0, pitch: 0.24,
    hp: 200, maxHp: 200,
    isDead: false, respawnAt: 0, joinedAt: 0
  },
  myHeroMesh: null,
  otherPlayers: {},
  keys: {},
  isRightMouseDown: false,

  createHeroMesh(colorIdx = 0) {
    const hero = new THREE.Group();
    const cColor = window.CONFIG.ROBE_COLORS[colorIdx] || window.CONFIG.ROBE_COLORS[0];

    const bodyMat = new THREE.MeshStandardMaterial({ color: cColor, roughness: 0.35 });
    const goldTrim = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfce5cd });

    // ลำตัวชุดจอมยุทธ์
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.65, 1.7, 12), bodyMat);
    body.position.y = 1.0;
    body.castShadow = true;
    hero.add(body);

    // ผ้าคลุมโปร่งแสงพริ้วไหว
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.6, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }));
    cape.position.set(0, 1.0, -0.38);
    hero.add(cape);

    // ศีรษะและเส้นผม
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 16), skinMat);
    head.position.y = 2.05;
    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x110d0a }));
    hair.position.set(0, 1.9, -0.2);
    hair.rotation.x = -0.3;
    hero.add(head, hair);

    // กระบี่สะพายหลัง
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.9, 0.2), goldTrim);
    sword.position.set(0.35, 1.2, -0.42);
    sword.rotation.z = Math.PI / 6;
    hero.add(sword);

    return hero;
  },

  setupControls() {
    window.addEventListener('keydown', e => {
      if (!e || !e.key) return;
      const k = e.key.toLowerCase();
      this.keys[k] = true;

      // วิชาตัวเบา / Double Jump / Flight
      if (e.key === ' ') {
        e.preventDefault();
        if (this.me.jumpsLeft > 0) {
          this.me.vy = this.me.jumpsLeft === 2 ? 0.40 : 0.30;
          if (this.me.jumpsLeft === 1) {
            this.me.isFlying = true;
            window.showToast('วิชาตัวเบา: เหาะเหินกลางเวหา!');
          }
          this.me.jumpsLeft -= 1;
        }
      }

      if (k === 'f') window.CombatSystem.castSkill('atk');
      if (k === 'q') window.CombatSystem.castSkill('Q');
      if (k === 'e') window.CombatSystem.castSkill('E');
      if (k === 'r') window.CombatSystem.castSkill('R');
    });

    window.addEventListener('keyup', e => {
      if (e && e.key) this.keys[e.key.toLowerCase()] = false;
    });

    window.addEventListener('mousedown', e => {
      if (e.button === 2) this.isRightMouseDown = true;
      if (e.button === 0 && window.gameActive) window.CombatSystem.castSkill('atk');
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 2) this.isRightMouseDown = false;
    });
    window.addEventListener('contextmenu', e => e.preventDefault());

    // หมุนมุมกล้อง 360 องศา
    window.addEventListener('mousemove', e => {
      if (this.isRightMouseDown) {
        this.me.yaw -= e.movementX * 0.0035;
        this.me.pitch = Math.max(0.05, Math.min(1.2, this.me.pitch + e.movementY * 0.0035));
      }
    });
  },

  updatePhysics(isVip1 = false) {
    if (this.me.isDead) {
      if (Date.now() > this.me.respawnAt) {
        this.me.isDead = false;
        this.me.hp = this.me.maxHp;
        this.me.x = 0; this.me.y = 0; this.me.z = 0;
        window.updateMeHUD();
        window.showToast('ฟื้นคืนชีพ ณ ลานเมือง!');
      }
      return;
    }

    const baseSpeed = this.me.isFlying ? 0.44 : 0.24;
    const moveSpeed = isVip1 ? baseSpeed * 1.25 : baseSpeed;

    let forward = 0;
    let strafe = 0;

    if (this.keys['w']) forward += 1;
    if (this.keys['s']) forward -= 1;
    if (this.keys['a']) strafe -= 1; // เดินซ้าย
    if (this.keys['d']) strafe += 1; // เดินขวา

    // คำนวณเวกเตอร์มุมการเดินให้สัมพันธ์กับทิศทางของมุมกล้อง (แก้ปัญหากลับทิศสมบูรณ์)
    if (forward !== 0 || strafe !== 0) {
      const moveAng = this.me.yaw + Math.atan2(strafe, forward);
      this.me.x -= Math.sin(moveAng) * moveSpeed;
      this.me.z -= Math.cos(moveAng) * moveSpeed;
    }

    // ฟิสิกส์แรงโน้มถ่วงและการร่อนกลางเวหา
    this.me.y += this.me.vy;
    if (this.me.y > 0) {
      this.me.vy -= this.me.isFlying ? 0.008 : 0.022;
      this.me.isGrounded = false;
    } else {
      this.me.y = 0;
      this.me.vy = 0;
      this.me.isGrounded = true;
      this.me.jumpsLeft = 2;
      this.me.isFlying = false;
    }

    // กำหนดขอบเขตแผนที่
    this.me.x = Math.max(-75, Math.min(75, this.me.x));
    this.me.z = Math.max(-75, Math.min(75, this.me.z));

    // อัปเดตโมเดลตัวละคร 3D
    if (this.myHeroMesh) {
      this.myHeroMesh.position.set(this.me.x, this.me.y + (this.me.isDead ? -0.8 : 0), this.me.z);
      this.myHeroMesh.rotation.y = this.me.yaw;
    }

    // กล้องบุคคลที่สาม (3rd Person Camera Smooth Follow)
    const camDist = 8.5;
    const cam = window.World3D.camera;
    cam.position.x = this.me.x + Math.sin(this.me.yaw) * Math.cos(this.me.pitch) * camDist;
    cam.position.y = this.me.y + Math.sin(this.me.pitch) * camDist + 2.0;
    cam.position.z = this.me.z + Math.cos(this.me.yaw) * Math.cos(this.me.pitch) * camDist;
    cam.lookAt(this.me.x, this.me.y + 1.5, this.me.z);
  }
};
