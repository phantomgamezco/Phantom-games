AFRAME.registerShader('three-color-gradient', {
        schema: {
          topColor: { type: 'color', is: 'uniform', default: '#0055ff' },    // Zenith
          middleColor: { type: 'color', is: 'uniform', default: '#80b3ff' }, // Horizon/Middle
          bottomColor: { type: 'color', is: 'uniform', default: '#ffffff' }  // Ground
        },
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 middleColor;
          uniform vec3 bottomColor;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition).y;
            vec3 color = h > 0.0 
              ? mix(middleColor, topColor, clamp(h, 0.0, 1.0)) 
              : mix(middleColor, bottomColor, clamp(-h, 0.0, 1.0));
            gl_FragColor = vec4(color, 1.0);
          }
        `
      });