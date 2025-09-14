// Three.js Water Shader Demo - Self-contained version

// Water Vertex Shader
const waterVertexShader = `
precision highp float;

uniform float uTime;
uniform float uWavesAmplitude;
uniform float uWavesSpeed;
uniform float uWavesFrequency;
uniform float uWavesPersistence;
uniform float uWavesLacunarity;
uniform float uWavesIterations;

varying vec3 vNormal;
varying vec3 vWorldPosition;

vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float getElevation(float x, float z) {
  vec2 pos = vec2(x, z);
  float elevation = 0.0;
  float amplitude = 1.0;
  float frequency = uWavesFrequency;
  vec2 p = pos.xy;

  for(float i = 0.0; i < uWavesIterations; i++) {
    float noiseValue = snoise(p * frequency + uTime * uWavesSpeed);
    elevation += amplitude * noiseValue;
    amplitude *= uWavesPersistence;
    frequency *= uWavesLacunarity;
  }

  elevation *= uWavesAmplitude;
  return elevation;
}

void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  float elevation = getElevation(modelPosition.x, modelPosition.z);
  modelPosition.y += elevation;

  float eps = 0.001;
  vec3 tangent = normalize(vec3(eps, getElevation(modelPosition.x - eps, modelPosition.z) - elevation, 0.0));
  vec3 bitangent = normalize(vec3(0.0, getElevation(modelPosition.x, modelPosition.z - eps) - elevation, eps));
  vec3 objectNormal = normalize(cross(tangent, bitangent));

  vNormal = objectNormal;
  vWorldPosition = modelPosition.xyz;

  gl_Position = projectionMatrix * viewMatrix * modelPosition;
}
`;

// Water Fragment Shader
const waterFragmentShader = `
precision highp float;

uniform float uOpacity;
uniform vec3 uTroughColor;
uniform vec3 uSurfaceColor;
uniform vec3 uPeakColor;
uniform float uPeakThreshold;
uniform float uPeakTransition;
uniform float uTroughThreshold;
uniform float uTroughTransition;
uniform float uFresnelScale;
uniform float uFresnelPower;

varying vec3 vNormal;
varying vec3 vWorldPosition;

uniform samplerCube uEnvironmentMap;

void main() {
  vec3 viewDirection = normalize(vWorldPosition - cameraPosition);
  vec3 reflectedDirection = reflect(viewDirection, vNormal);
  reflectedDirection.x = -reflectedDirection.x;

  vec4 reflectionColor = textureCube(uEnvironmentMap, reflectedDirection);
  float fresnel = uFresnelScale * pow(1.0 - clamp(dot(viewDirection, vNormal), 0.0, 1.0), uFresnelPower);
  
  float elevation = vWorldPosition.y;
  float peakFactor = smoothstep(uPeakThreshold - uPeakTransition, uPeakThreshold + uPeakTransition, elevation);
  float troughFactor = smoothstep(uTroughThreshold - uTroughTransition, uTroughThreshold + uTroughTransition, elevation);

  vec3 mixedColor1 = mix(uTroughColor, uSurfaceColor, troughFactor);
  vec3 mixedColor2 = mix(mixedColor1, uPeakColor, peakFactor);
  vec3 finalColor = mix(mixedColor2, reflectionColor.rgb, fresnel);

  gl_FragColor = vec4(finalColor, uOpacity);
}
`;

// Caustics Vertex Shader
const causticsVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Caustics Fragment Shader
const causticsFragmentShader = `
uniform float uTime;
uniform sampler2D uTexture;
uniform vec3 uCausticsColor;
uniform float uCausticsIntensity;
uniform float uCausticsOffset;
uniform float uCausticsScale;
uniform float uCausticsSpeed;
uniform float uCausticsThickness;

varying vec2 vUv;

vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}
vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

void main() {
  vec4 texColor = texture2D(uTexture, vUv);
  float caustics = 0.0;

  caustics += uCausticsIntensity * (uCausticsOffset - abs(snoise(vec3(vUv.xy * uCausticsScale, uTime * uCausticsSpeed))));
  caustics += uCausticsIntensity * (uCausticsOffset - abs(snoise(vec3(vUv.yx * uCausticsScale, -uTime * uCausticsSpeed))));

  caustics = smoothstep(0.5 - uCausticsThickness, 0.5 + uCausticsThickness, caustics);
  vec3 finalColor = texColor.rgb + caustics * uCausticsColor;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Water class
class Water extends THREE.Mesh {
  constructor(options = {}) {
    super();

    this.material = new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.8 },
        uEnvironmentMap: { value: options.environmentMap },
        uWavesAmplitude: { value: 0.025 },
        uWavesFrequency: { value: 1.07 },
        uWavesPersistence: { value: 0.3 },
        uWavesLacunarity: { value: 2.18 },
        uWavesIterations: { value: 8 },
        uWavesSpeed: { value: 0.4 },
        uTroughColor: { value: new THREE.Color('#186691') },
        uSurfaceColor: { value: new THREE.Color('#9bd8c0') },
        uPeakColor: { value: new THREE.Color('#bbd8e0') },
        uPeakThreshold: { value: 0.08 },
        uPeakTransition: { value: 0.05 },
        uTroughThreshold: { value: -0.01 },
        uTroughTransition: { value: 0.15 },
        uFresnelScale: { value: 0.8 },
        uFresnelPower: { value: 0.5 }
      },
      transparent: true,
      depthTest: true,
      side: THREE.DoubleSide
    });

    this.geometry = new THREE.PlaneGeometry(2, 2, options.resolution || 512, options.resolution || 512);
    this.rotation.x = Math.PI * 0.5;
    this.position.y = 0;
  }

  update(time) {
    this.material.uniforms.uTime.value = time;
  }
}

// Ground class
class Ground extends THREE.Mesh {
  constructor(options = {}) {
    super();
    this.material = new THREE.ShaderMaterial({
      vertexShader: causticsVertexShader,
      fragmentShader: causticsFragmentShader,
      uniforms: {
        uTexture: { value: options.texture },
        uTime: { value: 0 },
        uCausticsColor: { value: new THREE.Color('#ffffff') },
        uCausticsIntensity: { value: 0.2 },
        uCausticsScale: { value: 20.0 },
        uCausticsSpeed: { value: 1.0 },
        uCausticsThickness: { value: 0.4 },
        uCausticsOffset: { value: 0.75 }
      }
    });

    this.geometry = new THREE.PlaneGeometry(2, 2);
    this.rotation.x = -Math.PI * 0.5;
    this.position.y = -0.12;
  }

  update(time) {
    this.material.uniforms.uTime.value = time;
  }
}

// UI Setup function
function setupUI({ waterResolution, water, ground }) {
  const pane = new Tweakpane.Pane();

  const waterFolder = pane.addFolder({ title: 'Water' });
  const geometryFolder = waterFolder.addFolder({ title: 'Geometry' });

  geometryFolder.addBinding(waterResolution, 'size', { 
    min: 2, max: 1024, step: 2, label: 'Resolution' 
  }).on('change', ({ value }) => {
    const newGeometry = new THREE.PlaneGeometry(2, 2, waterResolution.size, waterResolution.size);
    water.geometry.dispose();
    water.geometry = newGeometry;
  });

  const wavesFolder = waterFolder.addFolder({ title: 'Waves' });
  wavesFolder.addBinding(water.material.uniforms.uWavesAmplitude, 'value', {
    min: 0, max: 0.1, label: 'Amplitude'
  });
  wavesFolder.addBinding(water.material.uniforms.uWavesFrequency, 'value', {
    min: 0.1, max: 10, label: 'Frequency'
  });
  wavesFolder.addBinding(water.material.uniforms.uWavesPersistence, 'value', {
    min: 0, max: 1, label: 'Persistence'
  });
  wavesFolder.addBinding(water.material.uniforms.uWavesLacunarity, 'value', {
    min: 0, max: 3, label: 'Lacunarity'
  });
  wavesFolder.addBinding(water.material.uniforms.uWavesIterations, 'value', {
    min: 1, max: 10, step: 1, label: 'Iterations'
  });
  wavesFolder.addBinding(water.material.uniforms.uWavesSpeed, 'value', {
    min: 0, max: 1, label: 'Speed'
  });

  const colorFolder = waterFolder.addFolder({ title: 'Color' });
  colorFolder.addBinding(water.material.uniforms.uOpacity, 'value', {
    min: 0, max: 1, step: 0.01, label: 'Opacity'
  });

  colorFolder.addBinding(water.material.uniforms.uTroughColor, 'value', {
    label: 'Trough Color', view: 'color', color: { type: 'float' }
  });
  colorFolder.addBinding(water.material.uniforms.uSurfaceColor, 'value', {
    label: 'Surface Color', view: 'color', color: { type: 'float' }
  });
  colorFolder.addBinding(water.material.uniforms.uPeakColor, 'value', {
    label: 'Peak Color', view: 'color', color: { type: 'float' }
  });
  colorFolder.addBinding(water.material.uniforms.uPeakThreshold, 'value', {
    min: 0, max: 0.5, label: 'Peak Threshold'
  });
  colorFolder.addBinding(water.material.uniforms.uPeakTransition, 'value', {
    min: 0, max: 0.5, label: 'Peak Transition'
  });
  colorFolder.addBinding(water.material.uniforms.uTroughThreshold, 'value', {
    min: -0.5, max: 0, label: 'Trough Threshold'
  });
  colorFolder.addBinding(water.material.uniforms.uTroughTransition, 'value', {
    min: 0, max: 0.5, label: 'Trough Transition'
  });

  const fresnelFolder = waterFolder.addFolder({ title: 'Fresnel' });
  fresnelFolder.addBinding(water.material.uniforms.uFresnelScale, 'value', {
    min: 0, max: 1, label: 'Scale'
  });
  fresnelFolder.addBinding(water.material.uniforms.uFresnelPower, 'value', {
    min: 0, max: 3, label: 'Power'
  });

  const causticsFolder = waterFolder.addFolder({ title: 'Caustics' });
  causticsFolder.addBinding(ground.material.uniforms.uCausticsColor, 'value', {
    label: 'Color', view: 'color', color: { type: 'float' }
  });
  causticsFolder.addBinding(ground.material.uniforms.uCausticsIntensity, 'value', {
    min: 0, max: 2, label: 'Intensity'
  });
  causticsFolder.addBinding(ground.material.uniforms.uCausticsScale, 'value', {
    min: 0, max: 200, label: 'Scale'
  });
  causticsFolder.addBinding(ground.material.uniforms.uCausticsSpeed, 'value', {
    min: 0, max: 1, label: 'Speed'
  });
  causticsFolder.addBinding(ground.material.uniforms.uCausticsOffset, 'value', {
    min: 0, max: 2, label: 'Offset'
  });
  causticsFolder.addBinding(ground.material.uniforms.uCausticsThickness, 'value', {
    min: 0, max: 1, label: 'Thickness'
  });
}

// Main application
const clock = new THREE.Clock();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.001, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Environment map
const cubeTextureLoader = new THREE.CubeTextureLoader();
const environmentMap = cubeTextureLoader.load([
  'px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'
]);

const poolTexture = new THREE.TextureLoader().load('ocean_floor.png');

scene.background = environmentMap;
scene.environment = environmentMap;

camera.position.set(0.8, 0.03, 0);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const waterResolution = { size: 512 };
const water = new Water({
  environmentMap,
  resolution: waterResolution.size
});
scene.add(water);

const ground = new Ground({
  texture: poolTexture
});
scene.add(ground);

function animate() {
  const elapsedTime = clock.getElapsedTime();
  water.update(elapsedTime);
  ground.update(elapsedTime);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
// setupUI({ waterResolution, water, ground });