AFRAME.registerComponent('camera-lock', {
  schema: { type: 'boolean', default: true },

  init: function () {
    this.savedPosition = new THREE.Vector3();
    this.hasSavedPosition = false;

    this.onEnterVR = this.onEnterVR.bind(this);
    this.onExitVR = this.onExitVR.bind(this);

    // Listen for VR mode transitions
    this.el.sceneEl.addEventListener('enter-vr', this.onEnterVR);
    this.el.sceneEl.addEventListener('exit-vr', this.onExitVR);
  },

  onEnterVR: function () {
    if (this.data) {
      // Lock current position before VR tracking applies offsets
      this.savedPosition.copy(this.el.object3D.position);
      this.hasSavedPosition = true;
    }
  },

  onExitVR: function () {
    this.hasSavedPosition = false;
  },

  update: function (oldData) {
    // Save position immediately if enabled dynamically while already in VR
    if (this.data && this.el.sceneEl.is('vr-mode') && !this.hasSavedPosition) {
      this.savedPosition.copy(this.el.object3D.position);
      this.hasSavedPosition = true;
    } else if (!this.data) {
      this.hasSavedPosition = false;
    }
  },

  tick: function () {
    // When enabled in VR mode, prevent WebXR positional tracking from overriding coordinates
    if (this.data && this.el.sceneEl.is('vr-mode')) {
      if (!this.hasSavedPosition) {
        this.savedPosition.copy(this.el.object3D.position);
        this.hasSavedPosition = true;
      }
      // Revert position changes while preserving head rotation
      this.el.object3D.position.copy(this.savedPosition);
    }
  },

  remove: function () {
    this.el.sceneEl.removeEventListener('enter-vr', this.onEnterVR);
    this.el.sceneEl.removeEventListener('exit-vr', this.onExitVR);
  }
});