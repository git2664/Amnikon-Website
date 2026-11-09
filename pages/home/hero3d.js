(() => {
// =======================================
// HERO 3D SCENE
// =======================================

const canvas = document.querySelector("#hero-canvas");
if (!canvas || typeof THREE === "undefined") return;

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.z = 5;

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true
});

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
);

// =======================================
// MAIN SHAPE
// =======================================

const geometry = new THREE.IcosahedronGeometry(
  2,
  1
);

const material = new THREE.MeshPhysicalMaterial({
  color: "#3b82f6",

  metalness: 1,

  roughness: 0.05,

  clearcoat: 1,

  clearcoatRoughness: 0,

  reflectivity: 1
});

const shape = new THREE.Mesh(
  geometry,
  material
);

scene.add(shape);

// =======================================
// LIGHTING
// =======================================

const ambientLight =
  new THREE.AmbientLight(
    0xffffff,
    1.5
  );

scene.add(ambientLight);

const blueLight =
  new THREE.PointLight(
    0x2563eb,
    40
  );

blueLight.position.set(
  5,
  5,
  5
);

scene.add(blueLight);

const cyanLight =
  new THREE.PointLight(
    0x38bdf8,
    30
  );

cyanLight.position.set(
  -5,
  -5,
  5
);

scene.add(cyanLight);

// =======================================
// PARTICLES
// =======================================

const particlesCount = 2000;

const particlesGeometry =
  new THREE.BufferGeometry();

const positions =
  new Float32Array(
    particlesCount * 3
  );

for (let i = 0; i < particlesCount * 3; i++) {
  positions[i] =
    (Math.random() - 0.5) * 25;
}

particlesGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(
    positions,
    3
  )
);

const particlesMaterial =
  new THREE.PointsMaterial({
    color: "#60a5fa",

    size: 0.02,

    transparent: true,

    opacity: 0.8
  });

const particles =
  new THREE.Points(
    particlesGeometry,
    particlesMaterial
  );

scene.add(particles);

// =======================================
// MOUSE TRACKING
// =======================================

const mouse = {
  x: 0,
  y: 0
};

window.addEventListener(
  "mousemove",
  (event) => {

    mouse.x =
      (event.clientX /
        window.innerWidth) *
        2 -
      1;

    mouse.y =
      -(
        event.clientY /
        window.innerHeight
      ) *
        2 +
      1;
  }
);

// =======================================
// ANIMATION
// =======================================

const clock = new THREE.Clock();

function animate() {

  requestAnimationFrame(
    animate
  );

  const elapsed =
    clock.getElapsedTime();

  // Floating motion
  shape.position.y =
    Math.sin(elapsed) * 0.25;

  // Slow rotation
  shape.rotation.x += 0.002;
  shape.rotation.y += 0.003;

  // Mouse follow
  shape.rotation.x +=
    (
      mouse.y * 0.4 -
      shape.rotation.x
    ) *
    0.02;

  shape.rotation.y +=
    (
      mouse.x * 0.4 -
      shape.rotation.y
    ) *
    0.02;

  // Particle movement
  particles.rotation.y +=
    0.0002;

  particles.rotation.x +=
    0.0001;

  renderer.render(
    scene,
    camera
  );
}

animate();

// =======================================
// RESIZE
// =======================================

window.addEventListener(
  "resize",
  () => {

    camera.aspect =
      window.innerWidth /
      window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        2
      )
    );
  }
);
})();
