AFRAME.registerComponent('gorilla-rig', {
  schema: {
    handColor: { type: 'color', default: '#8B4513' },
    handSize: { type: 'number', default: 0.12 },
    handShape: { type: 'string', default: 'sphere' },
    handCollision: { type: 'string', default: 'sphere' },
    handCollisionSize: { type: 'number', default: 0.12 },
    handOffset: { type: 'vec3', default: { x: 0, y: 0, z: -0.2 } },
    
    playerCollision: { type: 'string', default: 'sphere' },    // "sphere", "capsule", "cylinder", "box"
    playerHeight: { type: 'number', default: 0.8 },           // Total height from ground
    playerRadius: { type: 'number', default: 0.25 },         // Body radius
    playerRotate: { type: 'number', default: 0 },             // Y-axis rotation in degrees
    cameraY: { type: 'number', default: 0.8 },               // Head height
    
    pushForce: { type: 'number', default: 1.6 },
    gravity: { type: 'number', default: 12 },
    floorY: { type: 'number', default: 0 }
  },

  init: function () {
    const el = this.el;
    const data = this.data;

    // Apply initial rotation on Y-axis
    el.object3D.rotation.y = THREE.MathUtils.degToRad(data.playerRotate);

    // 1. Camera attached at head height (Y = cameraY)
    const headY = data.cameraY || data.playerHeight;
    this.camera = document.createElement('a-camera');
    this.camera.setAttribute('position', `0 ${headY} 0`);
    el.appendChild(this.camera);

    // 2. Player Body Collider
    this.setupPlayerBody();

    // 3. Left Controller
    this.leftHand = document.createElement('a-entity');
    this.leftHand.setAttribute('hand-tracking-controls', 'hand: left');
    this.leftHand.setAttribute('oculus-touch-controls', 'hand: left');
    el.appendChild(this.leftHand);

    // 4. Right Controller
    this.rightHand = document.createElement('a-entity');
    this.rightHand.setAttribute('hand-tracking-controls', 'hand: right');
    this.rightHand.setAttribute('oculus-touch-controls', 'hand: right');
    el.appendChild(this.rightHand);

    // Build Hand Models & Colliders
    this.setupHands();

    // Reusable math vectors
    this.velocity = new THREE.Vector3();
    this.prevLeftPos = new THREE.Vector3();
    this.prevRightPos = new THREE.Vector3();
    this.currLeftPos = new THREE.Vector3();
    this.currRightPos = new THREE.Vector3();
    this.deltaVector = new THREE.Vector3();

    this.leftHandInit = false;
    this.rightHandInit = false;
  },

  update: function (oldData) {
    // Dynamic update if player-rotate changes at runtime
    if (oldData.playerRotate !== this.data.playerRotate) {
      this.el.object3D.rotation.y = THREE.MathUtils.degToRad(this.data.playerRotate);
    }
  },

  setupPlayerBody: function () {
    const data = this.data;
    const radius = data.playerRadius;
    const height = data.playerHeight;
    const centerY = height / 2;
    const shape = (data.playerCollision || 'sphere').toLowerCase();

    if (shape === 'box') {
      this.bodyEl = document.createElement('a-box');
      this.bodyEl.setAttribute('width', radius * 2);
      this.bodyEl.setAttribute('height', height);
      this.bodyEl.setAttribute('depth', radius * 2);
      this.bodyEl.setAttribute('position', `0 ${centerY} 0`);
      this.bodyEl.setAttribute('visible', 'false');
      this.bodyEl.setAttribute('static-body', `shape: box; halfExtents: ${radius} ${centerY} ${radius}`);
    } else if (shape === 'cylinder') {
      this.bodyEl = document.createElement('a-cylinder');
      this.bodyEl.setAttribute('radius', radius);
      this.bodyEl.setAttribute('height', height);
      this.bodyEl.setAttribute('position', `0 ${centerY} 0`);
      this.bodyEl.setAttribute('visible', 'false');
      this.bodyEl.setAttribute('static-body', `shape: cylinder; radiusTop: ${radius}; radiusBottom: ${radius}; height: ${height}`);
    } else if (shape === 'capsule') {
      this.bodyEl = document.createElement('a-entity');
      const geometry = new THREE.CapsuleGeometry(radius, Math.max(0, height - radius * 2), 8, 16);
      const material = new THREE.MeshBasicMaterial({ visible: false });
      this.bodyEl.setObject3D('mesh', new THREE.Mesh(geometry, material));
      this.bodyEl.setAttribute('position', `0 ${centerY} 0`);
      this.bodyEl.setAttribute('static-body', `shape: capsule; radius: ${radius}; height: ${height}`);
    } else {
      // Stretched Sphere (Default)
      this.bodyEl = document.createElement('a-sphere');
      const scaleY = height / (radius * 2);
      this.bodyEl.setAttribute('radius', radius);
      this.bodyEl.setAttribute('scale', `1 ${scaleY} 1`);
      this.bodyEl.setAttribute('position', `0 ${centerY} 0`);
      this.bodyEl.setAttribute('visible', 'false');
      this.bodyEl.setAttribute('static-body', `shape: sphere; sphereRadius: ${radius}`);
    }

    this.el.appendChild(this.bodyEl);
  },

  setupHands: function () {
    const data = this.data;

    this.leftModel = this.createHandEntity(
      data.handShape, data.handColor, data.handSize, data.handCollision, data.handCollisionSize, data.handOffset
    );
    this.leftHand.appendChild(this.leftModel);

    this.rightModel = this.createHandEntity(
      data.handShape, data.handColor, data.handSize, data.handCollision, data.handCollisionSize, data.handOffset
    );
    this.rightHand.appendChild(this.rightModel);
  },

  createHandEntity: function (shape, color, size, collisionShape, collisionSize, offset) {
    const allowedShapes = ['box', 'sphere', 'cylinder', 'cone', 'torus'];
    const cleanShape = (shape || '').trim().toLowerCase();

    let handEntity;
    if (allowedShapes.includes(cleanShape)) {
      handEntity = document.createElement(`a-${cleanShape}`);
      handEntity.setAttribute('color', color);
      if (cleanShape === 'box') {
        const dim = size * 2;
        handEntity.setAttribute('width', dim);
        handEntity.setAttribute('height', dim);
        handEntity.setAttribute('depth', dim);
      } else {
        handEntity.setAttribute('radius', size);
      }
    } else {
      handEntity = document.createElement('a-sphere');
      handEntity.setAttribute('radius', size);
      handEntity.setAttribute('color', color);
    }

    handEntity.setAttribute('position', `${offset.x} ${offset.y} ${offset.z}`);

    const cleanCollision = (collisionShape || '').trim().toLowerCase();
    if (cleanCollision && cleanCollision !== 'none') {
      const colSize = collisionSize || size;
      let bodyAttr = `shape: ${cleanCollision}`;

      if (cleanCollision === 'sphere') {
        bodyAttr += `; sphereRadius: ${colSize}`;
      } else if (cleanCollision === 'box') {
        bodyAttr += `; halfExtents: ${colSize} ${colSize} ${colSize}`;
      }

      handEntity.setAttribute('static-body', bodyAttr);
    }

    return handEntity;
  },

  tick: function (time, delta) {
    if (!delta) return;
    const dt = delta / 1000;
    const rig = this.el.object3D;

    let leftPushing = false;
    let rightPushing = false;

    // Process Left Hand Pushing
    if (this.leftModel.object3D) {
      this.leftModel.object3D.getWorldPosition(this.currLeftPos);
      if (this.leftHandInit) {
        this.deltaVector.subVectors(this.currLeftPos, this.prevLeftPos);
        if (this.currLeftPos.y <= this.data.floorY + this.data.handSize) {
          leftPushing = true;
          rig.position.sub(this.deltaVector.multiplyScalar(this.data.pushForce));
          this.velocity.x = -this.deltaVector.x / dt * 0.8;
          this.velocity.y = Math.max(this.velocity.y, -this.deltaVector.y / dt * 0.8);
          this.velocity.z = -this.deltaVector.z / dt * 0.8;
        }
      }
      this.prevLeftPos.copy(this.currLeftPos);
      this.leftHandInit = true;
    }

    // Process Right Hand Pushing
    if (this.rightModel.object3D) {
      this.rightModel.object3D.getWorldPosition(this.currRightPos);
      if (this.rightHandInit) {
        this.deltaVector.subVectors(this.currRightPos, this.prevRightPos);
        if (this.currRightPos.y <= this.data.floorY + this.data.handSize) {
          rightPushing = true;
          rig.position.sub(this.deltaVector.multiplyScalar(this.data.pushForce));
          this.velocity.x = -this.deltaVector.x / dt * 0.8;
          this.velocity.y = Math.max(this.velocity.y, -this.deltaVector.y / dt * 0.8);
          this.velocity.z = -this.deltaVector.z / dt * 0.8;
        }
      }
      this.prevRightPos.copy(this.currRightPos);
      this.rightHandInit = true;
    }

    // Gravity & Air Physics
    if (!leftPushing && !rightPushing) {
      this.velocity.y -= this.data.gravity * dt;
      rig.position.x += this.velocity.x * dt;
      rig.position.y += this.velocity.y * dt;
      rig.position.z += this.velocity.z * dt;
      this.velocity.x *= 0.98;
      this.velocity.z *= 0.98;
    }

    // Floor Bounds
    if (rig.position.y < this.data.floorY) {
      rig.position.y = this.data.floorY;
      this.velocity.y = 0;
      this.velocity.x *= 0.85;
      this.velocity.z *= 0.85;
    }
  }
});

AFRAME.registerPrimitive('a-gorilla-tag', {
  defaultComponents: {
    'gorilla-rig': {}
  },
  mappings: {
    'player-position': 'position',
    'hand-color': 'gorilla-rig.handColor',
    'hand-size': 'gorilla-rig.handSize',
    'hand-shape': 'gorilla-rig.handShape',
    'hand-collision': 'gorilla-rig.handCollision',
    'hand-collision-size': 'gorilla-rig.handCollisionSize',
    'hand-offset': 'gorilla-rig.handOffset',
    'player-collision': 'gorilla-rig.playerCollision',
    'player-height': 'gorilla-rig.playerHeight',
    'player-radius': 'gorilla-rig.playerRadius',
    'player-rotate': 'gorilla-rig.playerRotate',
    'camera-y': 'gorilla-rig.cameraY',
    'push-force': 'gorilla-rig.pushForce',
    'gravity': 'gorilla-rig.gravity'
  }
});