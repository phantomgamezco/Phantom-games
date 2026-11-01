// =============================================================================
// 1. REGISTER CUSTOM PRIMITIVES
// =============================================================================

AFRAME.registerPrimitive('safe-zone', {
  defaultComponents: {
    'safe-zone': {}
  },
  mappings: {
    width: 'safe-zone.width',
    height: 'safe-zone.height',
    depth: 'safe-zone.depth',
    shape: 'safe-zone.shape',
    color: 'safe-zone.color',
    'show-safe-zone': 'safe-zone.showSafeZone'
  }
});

AFRAME.registerPrimitive('enemy-walk-path', {
  defaultComponents: {
    'enemy-walk-path': {}
  },
  mappings: {
    width: 'enemy-walk-path.width',
    height: 'enemy-walk-path.height',
    depth: 'enemy-walk-path.depth',
    shape: 'enemy-walk-path.shape',
    color: 'enemy-walk-path.color',
    'show-walk-path': 'enemy-walk-path.showWalkPath'
  }
});

AFRAME.registerPrimitive('a-enemy-model', {
  defaultComponents: {
    'enemy-model': {},
    'enemy-ai': {}
  },
  mappings: {
    model: 'enemy-model.model',           // GLTF / GLB file path or asset selector
    obj: 'enemy-model.obj',               // OBJ file path
    mtl: 'enemy-model.mtl',               // MTL material file path (optional)
    fbx: 'enemy-model.fbx',               // FBX file path
    animation: 'enemy-model.animation',   // Name of animation clip
    loop: 'enemy-model.loop',             // Loop animation boolean
    speed: 'enemy-ai.speed',              // Enemy movement speed
    'kill-distance': 'enemy-ai.killDistance',
    'spawn-position': 'enemy-ai.spawnPosition',
    'enemy-radius': 'enemy-ai.enemyRadius'
  }
});

// =============================================================================
// 2. ENEMY MODEL COMPONENT (GLTF / OBJ / FBX & SKELETAL ANIMATIONS)
// =============================================================================

AFRAME.registerComponent('enemy-model', {
  schema: {
    model: { type: 'string', default: '' },
    obj: { type: 'string', default: '' },
    mtl: { type: 'string', default: '' },
    fbx: { type: 'string', default: '' },
    animation: { type: 'string', default: '' },
    loop: { type: 'boolean', default: true }
  },

  init: function () {
    this.mixer = null;
    this.activeAction = null;
    this.animations = null;

    this.onModelLoaded = this.onModelLoaded.bind(this);
    this.el.addEventListener('model-loaded', this.onModelLoaded);

    this.applyModel();
  },

  update: function (oldData) {
    if (
      oldData.model !== this.data.model ||
      oldData.obj !== this.data.obj ||
      oldData.fbx !== this.data.fbx ||
      oldData.mtl !== this.data.mtl
    ) {
      this.applyModel();
    }

    if (this.mixer && (oldData.animation !== this.data.animation || oldData.loop !== this.data.loop)) {
      this.playAnimation();
    }
  },

  applyModel: function () {
    // 1. FBX Model Loading
    if (this.data.fbx) {
      if (typeof THREE.FBXLoader === 'undefined') {
        console.error('[enemy-model] THREE.FBXLoader is missing. Include FBXLoader script in <head>.');
        return;
      }
      const loader = new THREE.FBXLoader();
      const url = this.data.fbx.replace(/^url\((['"]?)(.*?)\1\)$/, '$2');

      loader.load(
        url,
        (fbxGroup) => {
          this.el.setObject3D('mesh', fbxGroup);
          if (fbxGroup.animations && fbxGroup.animations.length > 0) {
            this.setupAnimations(fbxGroup, fbxGroup.animations);
          }
        },
        undefined,
        (err) => console.error('[enemy-model] Error loading FBX:', err)
      );
      return;
    }

    // 2. OBJ Model Loading
    if (this.data.obj) {
      const objConfig = { obj: this.data.obj };
      if (this.data.mtl) objConfig.mtl = this.data.mtl;
      this.el.setAttribute('obj-model', objConfig);
      return;
    }

    // 3. GLTF / GLB Model Loading
    if (this.data.model) {
      this.el.setAttribute('gltf-model', this.data.model);
    }
  },

  onModelLoaded: function (evt) {
    const model = evt.detail.model;
    if (!model) return;

    if (model.animations && model.animations.length > 0) {
      this.setupAnimations(model, model.animations);
    }
  },

  setupAnimations: function (targetObject, animations) {
    this.mixer = new THREE.AnimationMixer(targetObject);
    this.animations = animations;
    this.playAnimation();
  },

  playAnimation: function () {
    if (!this.mixer) return;

    const animations =
      this.animations ||
      (this.el.getObject3D('mesh') ? this.el.getObject3D('mesh').animations : null);

    if (!animations || animations.length === 0) return;

    let clip = null;
    if (this.data.animation) {
      clip = THREE.AnimationClip.findByName(animations, this.data.animation);
    }
    if (!clip && animations.length > 0) clip = animations[0];

    if (clip) {
      if (this.activeAction) this.activeAction.stop();
      this.activeAction = this.mixer.clipAction(clip);
      this.activeAction.setLoop(
        this.data.loop ? THREE.LoopRepeat : THREE.LoopOnce,
        this.data.loop ? Infinity : 1
      );
      this.activeAction.clampWhenFinished = !this.data.loop;
      this.activeAction.play();
    }
  },

  tick: function (t, dt) {
    if (this.mixer) {
      this.mixer.update(dt / 1000);
    }
  },

  remove: function () {
    this.el.removeEventListener('model-loaded', this.onModelLoaded);
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
  }
});

// =============================================================================
// 3. ZONE COMPONENTS
// =============================================================================

AFRAME.registerComponent('safe-zone', {
  schema: {
    width: { type: 'number', default: 1 },
    height: { type: 'number', default: 1 },
    depth: { type: 'number', default: 1 },
    shape: { type: 'string', default: 'box' },
    color: { type: 'color', default: 'lime' },
    showSafeZone: { type: 'boolean', default: false }
  },
  init: function () {
    this.el.setAttribute('geometry', {
      primitive: 'box',
      width: this.data.width,
      height: this.data.height,
      depth: this.data.depth
    });
    this.el.setAttribute('material', {
      color: this.data.color,
      opacity: this.data.showSafeZone ? 0.3 : 0,
      transparent: true,
      visible: this.data.showSafeZone
    });
  }
});

AFRAME.registerComponent('enemy-walk-path', {
  schema: {
    width: { type: 'number', default: 1 },
    height: { type: 'number', default: 1 },
    depth: { type: 'number', default: 1 },
    shape: { type: 'string', default: 'box' },
    color: { type: 'color', default: 'cyan' },
    showWalkPath: { type: 'boolean', default: true }
  },
  init: function () {
    this.el.setAttribute('geometry', {
      primitive: 'box',
      width: this.data.width,
      height: this.data.height,
      depth: this.data.depth
    });
    this.el.setAttribute('material', {
      color: this.data.color,
      opacity: this.data.showWalkPath ? 0.3 : 0,
      transparent: true,
      visible: this.data.showWalkPath
    });
  }
});

// =============================================================================
// 4. ADVANCED ENEMY-AI COMPONENT
// =============================================================================

AFRAME.registerComponent('enemy-ai', {
  schema: {
    speed: { type: 'number', default: 0.05 },
    killDistance: { type: 'number', default: 1.0 },
    spawnPosition: { type: 'vec3', default: { x: 0, y: 1.6, z: 0 } },
    enemyRadius: { type: 'number', default: 0.6 }
  },

  init: function () {
    this.player = document.querySelector('#player');
    this.direction = new THREE.Vector3();
    this.wanderTarget = null;

    this.safeZoneEls = [];
    this.walkPathEls = [];

    // Reusable math structures to prevent garbage collection frame drops
    this.tempCenter = new THREE.Vector3();
    this.tempScale = new THREE.Vector3();
    this.tempQuat = new THREE.Quaternion();

    if (this.el.sceneEl.hasLoaded) {
      this.cacheZones();
    } else {
      this.el.sceneEl.addEventListener('loaded', () => this.cacheZones());
    }
  },

  cacheZones: function () {
    this.safeZoneEls = Array.from(document.querySelectorAll('safe-zone, [safe-zone]'));
    this.walkPathEls = Array.from(document.querySelectorAll('enemy-walk-path, [enemy-walk-path]'));
  },

  getSafeZoneBoundsData: function (el, padding = 0) {
    el.object3D.updateMatrixWorld(true);
    el.object3D.matrixWorld.decompose(this.tempCenter, this.tempQuat, this.tempScale);

    const componentData = el.components['safe-zone'] ? el.components['safe-zone'].data : {};
    const baseWidth = componentData.width || 1;
    const baseHeight = componentData.height || 1;
    const baseDepth = componentData.depth || 1;

    const halfWidth = (baseWidth * this.tempScale.x) / 2 + padding;
    const halfHeight = (baseHeight * this.tempScale.y) / 2 + padding;
    const halfDepth = (baseDepth * this.tempScale.z) / 2 + padding;

    return {
      center: this.tempCenter.clone(),
      minX: this.tempCenter.x - halfWidth,
      maxX: this.tempCenter.x + halfWidth,
      minZ: this.tempCenter.z - halfDepth,
      maxZ: this.tempCenter.z + halfDepth
    };
  },

  isInSafeZone: function (pos, padding = this.data.enemyRadius) {
    for (let el of this.safeZoneEls) {
      const zone = this.getSafeZoneBoundsData(el, padding);
      if (
        pos.x >= zone.minX && pos.x <= zone.maxX &&
        pos.z >= zone.minZ && pos.z <= zone.maxZ
      ) {
        return true;
      }
    }
    return false;
  },

  segmentIntersectsZone: function (p1, p2, zone) {
    if (
      (p1.x >= zone.minX && p1.x <= zone.maxX && p1.z >= zone.minZ && p1.z <= zone.maxZ) ||
      (p2.x >= zone.minX && p2.x <= zone.maxX && p2.z >= zone.minZ && p2.z <= zone.maxZ)
    ) {
      return true;
    }

    const ccw = (A, B, C) => (C.z - A.z) * (B.x - A.x) > (B.z - A.z) * (C.x - A.x);
    const intersect = (A, B, C, D) => (ccw(A, C, D) !== ccw(B, C, D)) && (ccw(A, B, C) !== ccw(A, B, D));

    const corners = [
      { x: zone.minX, z: zone.minZ },
      { x: zone.maxX, z: zone.minZ },
      { x: zone.maxZ, z: zone.minZ },
      { x: zone.minX, z: zone.maxZ }
    ];

    for (let i = 0; i < 4; i++) {
      if (intersect(p1, p2, corners[i], corners[(i + 1) % 4])) return true;
    }

    return false;
  },

  getNavTarget: function (enemyPos, finalTargetPos) {
    let blockingZone = null;

    for (let el of this.safeZoneEls) {
      const zone = this.getSafeZoneBoundsData(el, this.data.enemyRadius);
      if (this.segmentIntersectsZone(enemyPos, finalTargetPos, zone)) {
        blockingZone = zone;
        break;
      }
    }

    if (!blockingZone) return finalTargetPos;

    const clearance = 0.2;
    const corners = [
      new THREE.Vector3(blockingZone.minX - clearance, enemyPos.y, blockingZone.minZ - clearance),
      new THREE.Vector3(blockingZone.maxX + clearance, enemyPos.y, blockingZone.minZ - clearance),
      new THREE.Vector3(blockingZone.maxX + clearance, enemyPos.y, blockingZone.maxZ + clearance),
      new THREE.Vector3(blockingZone.minX - clearance, enemyPos.y, blockingZone.maxZ + clearance)
    ];

    let bestCorner = null;
    let minCost = Infinity;

    for (let corner of corners) {
      if (this.isInSafeZone(corner, this.data.enemyRadius)) continue;

      const cost = enemyPos.distanceTo(corner) + corner.distanceTo(finalTargetPos);
      if (cost < minCost) {
        minCost = cost;
        bestCorner = corner;
      }
    }

    return bestCorner || finalTargetPos;
  },

  getNewWanderTarget: function () {
    const enemyPos = this.el.object3D.position;

    if (this.walkPathEls.length > 0) {
      const el = this.walkPathEls[Math.floor(Math.random() * this.walkPathEls.length)];
      const zone = this.getSafeZoneBoundsData(el, 0);
      const randomX = THREE.MathUtils.randFloat(zone.minX, zone.maxX);
      const randomZ = THREE.MathUtils.randFloat(zone.minZ, zone.maxZ);
      const target = new THREE.Vector3(randomX, enemyPos.y, randomZ);
      if (!this.isInSafeZone(target, this.data.enemyRadius)) return target;
    }

    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = THREE.MathUtils.randFloat(4, 12);
      const target = new THREE.Vector3(
        enemyPos.x + Math.cos(angle) * radius,
        enemyPos.y,
        enemyPos.z + Math.sin(angle) * radius
      );
      if (!this.isInSafeZone(target, this.data.enemyRadius)) return target;
    }
    return null;
  },

  moveTowardTarget: function (targetPos, moveSpeed) {
    const currentPos = this.el.object3D.position;
    const navTarget = this.getNavTarget(currentPos, targetPos);

    this.direction.subVectors(navTarget, currentPos).normalize();

    const nextX = currentPos.x + this.direction.x * moveSpeed;
    const nextZ = currentPos.z + this.direction.z * moveSpeed;
    const stepPos = new THREE.Vector3(nextX, currentPos.y, nextZ);

    if (!this.isInSafeZone(stepPos, this.data.enemyRadius)) {
      currentPos.x = nextX;
      currentPos.z = nextZ;
    } else {
      const slideX = new THREE.Vector3(nextX, currentPos.y, currentPos.z);
      if (!this.isInSafeZone(slideX, this.data.enemyRadius)) {
        currentPos.x = nextX;
      } else {
        const slideZ = new THREE.Vector3(currentPos.x, currentPos.y, nextZ);
        if (!this.isInSafeZone(slideZ, this.data.enemyRadius)) {
          currentPos.z = nextZ;
        }
      }
    }

    this.el.object3D.lookAt(navTarget.x, currentPos.y, navTarget.z);
  },

  tick: function (time, timeDelta) {
    if (!this.player) return;

    const enemyPos = this.el.object3D.position;
    const playerPos = this.player.object3D.position;
    const playerInSafeZone = this.isInSafeZone(playerPos, 0.1);

    if (playerInSafeZone) {
      if (!this.wanderTarget || enemyPos.distanceTo(this.wanderTarget) < 0.5) {
        this.wanderTarget = this.getNewWanderTarget();
      }

      if (this.wanderTarget) {
        this.moveTowardTarget(this.wanderTarget, this.data.speed * 0.5);
      }
      return;
    }

    this.wanderTarget = null;
    const distance = enemyPos.distanceTo(playerPos);

    if (distance < this.data.killDistance) {
      const spawn = this.data.spawnPosition;
      this.player.setAttribute('position', `${spawn.x} ${spawn.y} ${spawn.z}`);
      return;
    }

    this.moveTowardTarget(playerPos, this.data.speed);
  }
});