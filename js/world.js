window.World3D = {
  scene: null,
  camera: null,
  renderer: null,
  petals: [],

  init(containerId) {
    const container = document.getElementById(containerId);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070503);
    this.scene.fog = new THREE.FogExp2(0x0a0705, 0.012);

    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // ระบบแสงสว่างและดวงอาทิตย์ยามเย็น
    const ambient = new THREE.AmbientLight(0xffecd0, 0.65);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffdfba, 1.5);
    sun.position.set(40, 60, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    this.scene.add(sun);

    // ลานพื้นโลก Open-World 160x160m
    const groundGeo = new THREE.PlaneGeometry(160, 160);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1b130c, roughness: 0.85 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // ท่าเรือและผืนน้ำสะท้อนแสง
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 65),
      new THREE.MeshStandardMaterial({ color: 0x06141c, roughness: 0.1, metalness: 0.85 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.15, -50);
    this.scene.add(water);

    this.buildCityArchitecture();
    this.initPetals();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  },

  buildCityArchitecture() {
    // 1. ศาลาใหญ่เมืองหลวง
    const pagoda = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(18, 5, 12), new THREE.MeshStandardMaterial({ color: 0x3a1910 }));
    base.position.y = 2.5;
    base.castShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(14, 3.2, 4), new THREE.MeshStandardMaterial({ color: 0x6e1b24, roughness: 0.3 }));
    roof.position.y = 6.6;
    roof.rotation.y = Math.PI / 4;
    pagoda.add(base, roof);
    pagoda.position.set(0, 0, -20);
    this.scene.add(pagoda);

    // 2. ซุ้มประตูเมืองหลวง 3 ทิศ
    this.createGate(0, 25, 0);
    this.createGate(-25, 0, Math.PI / 2);
    this.createGate(25, 0, Math.PI / 2);

    // 3. โคมไฟเรืองแสง
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      this.createLantern(Math.cos(ang) * 16, Math.sin(ang) * 16);
    }
  },

  createGate(x, z, rot) {
    const g = new THREE.Group();
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 9), new THREE.MeshStandardMaterial({ color: 0x4a1218 }));
    p1.position.set(-3.5, 4.5, 0);
    const p2 = p1.clone();
    p2.position.set(3.5, 4.5, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7, 2.2, 4), new THREE.MeshStandardMaterial({ color: 0xd4af37 }));
    roof.position.y = 9.8;
    roof.rotation.y = Math.PI / 4;
    g.add(p1, p2, roof);
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    this.scene.add(g);
  },

  createLantern(x, z) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 4.5), new THREE.MeshStandardMaterial({ color: 0x22150c }));
    post.position.y = 2.25;
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
    l.position.y = 4.2;
    const light = new THREE.PointLight(0xff5533, 1.2, 9);
    light.position.y = 4.2;
    g.add(post, l, light);
    g.position.set(x, 0, z);
    this.scene.add(g);
  },

  initPetals() {
    const pGeo = new THREE.PlaneGeometry(0.2, 0.2);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffb7c5, side: THREE.DoubleSide });
    for (let i = 0; i < 50; i++) {
      const petal = new THREE.Mesh(pGeo, pMat);
      petal.position.set((Math.random() - 0.5) * 80, Math.random() * 15, (Math.random() - 0.5) * 80);
      petal.userData = { vy: 0.03 + Math.random() * 0.03, vx: 0.02 + Math.random() * 0.02 };
      this.scene.add(petal);
      this.petals.push(petal);
    }
  },

  updatePetals() {
    this.petals.forEach(p => {
      p.position.y -= p.userData.vy;
      p.position.x += p.userData.vx;
      if (p.position.y < 0) p.position.y = 15;
      if (p.position.x > 40) p.position.x = -40;
    });
  }
};
