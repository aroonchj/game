window.World3D = {
  scene: null, camera: null, renderer: null, petals: [], raycaster: new THREE.Raycaster(), mouse: new THREE.Vector2(),
  cameraAngle: 0, cameraDist: 14, cameraHeight: 12, isDragging: false, previousMousePosition: { x: 0, y: 0 }, clickRingMesh: null,

  init(containerId) {
    const container = document.getElementById(containerId);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06080e);
    this.scene.fog = new THREE.FogExp2(0x080b12, 0.007);

    // มุมกล้อง Quarter-View ที่ปรับหมุนและซูมได้
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0xffecd0, 0x1a2130, 0.7);
    this.scene.add(hemiLight);
    const sun = new THREE.DirectionalLight(0xffdfba, 1.8);
    sun.position.set(70, 95, 45);
    sun.castShadow = true;
    this.scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.85 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = "ground";
    this.scene.add(ground);

    // ลานประลองยุทธ์ PvP Arena (โซนขอบแดง)
    const pvpZone = new THREE.Mesh(
      new THREE.RingGeometry(15, 18, 32),
      new THREE.MeshBasicMaterial({ color: 0xff4d4f, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
    );
    pvpZone.rotation.x = -Math.PI / 2;
    pvpZone.position.set(0, 0.05, 50);
    this.scene.add(pvpZone);

    // วงแหวนเอฟเฟคตอนคลิกเมาส์
    const ringGeo = new THREE.RingGeometry(0.5, 0.8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xd4af37, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    this.clickRingMesh = new THREE.Mesh(ringGeo, ringMat);
    this.clickRingMesh.rotation.x = -Math.PI / 2;
    this.clickRingMesh.position.y = 0.08;
    this.scene.add(this.clickRingMesh);

    this.buildCity();
    this.initControls();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  },

  buildCity() {
    const pagoda = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(22, 7, 16), new THREE.MeshStandardMaterial({ color: 0x2b1510, roughness: 0.7 }));
    base.position.y = 3.5; base.castShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(18, 4.0, 4), new THREE.MeshStandardMaterial({ color: 0x5a141c, roughness: 0.4, metalness: 0.3 }));
    roof.position.y = 8.5; roof.rotation.y = Math.PI / 4;
    pagoda.add(base, roof);
    pagoda.position.set(0, 0, -22);
    this.scene.add(pagoda);

    const bambooMat = new THREE.MeshStandardMaterial({ color: 0x234d2c, roughness: 0.6 });
    for (let i = 0; i < 35; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 10), bambooMat);
      b.position.set(-70 + (Math.random() - 0.5) * 45, 5, 20 + (Math.random() - 0.5) * 45);
      b.castShadow = true;
      this.scene.add(b);
    }
  },

  initControls() {
    // หมุนมุมกล้อง 360 ด้วยคลิกขวา
    window.addEventListener('mousedown', e => { if (e.button === 2) this.isDragging = true; });
    window.addEventListener('mouseup', e => { if (e.button === 2) this.isDragging = false; });
    window.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('mousemove', e => {
      if (this.isDragging) {
        const deltaX = e.movementX || e.clientX - this.previousMousePosition.x;
        this.cameraAngle -= deltaX * 0.008;
      }
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    // ซูมเข้า-ออก (Wheel)
    window.addEventListener('wheel', e => {
      this.cameraDist = Math.max(6, Math.min(25, this.cameraDist + e.deltaY * 0.02));
      this.cameraHeight = Math.max(5, Math.min(20, this.cameraHeight + e.deltaY * 0.015));
    });

    // คลิกซ้ายเดิน + แสดงเอฟเฟกต์คลิก
    window.addEventListener('pointerdown', e => {
      if (!window.gameActive || window.PlayerManager.me.isDead) return;
      if (e.target.closest('#hud') || e.target.closest('.modal') || e.target.closest('#debugPanel')) return;
      if (e.button !== 0) return;

      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);

      // เช็คการคลิกโดนผู้เล่นอื่นเพื่อเช็คข้อมูลเพื่อน
      const otherMeshes = Object.values(window.PlayerManager.otherPlayers).map(p => p.mesh).filter(Boolean);
      const intersectsPlayers = this.raycaster.intersectObjects(otherMeshes, true);
      if (intersectsPlayers.length > 0) {
        let hit = intersectsPlayers[0].object;
        while (hit.parent && !hit.userData.playerId) hit = hit.parent;
        if (hit.userData.playerId) { window.inspectPlayer(hit.userData.playerId); return; }
      }

      const groundObj = this.scene.getObjectByName("ground");
      if (groundObj) {
        const intersects = this.raycaster.intersectObject(groundObj);
        if (intersects.length > 0) {
          const pt = intersects[0].point;
          window.PlayerManager.targetPos = pt;

          // แสดงวงแหวนแสงกระพริบที่พื้น
          if (this.clickRingMesh) {
            this.clickRingMesh.position.set(pt.x, 0.08, pt.z);
            this.clickRingMesh.material.opacity = 1.0;
            this.clickRingMesh.scale.set(0.5, 0.5, 0.5);
          }
        }
      }
    });
  },

  updateEffect() {
    if (this.clickRingMesh && this.clickRingMesh.material.opacity > 0) {
      this.clickRingMesh.material.opacity -= 0.03;
      this.clickRingMesh.scale.addScalar(0.04);
    }
  }
};
