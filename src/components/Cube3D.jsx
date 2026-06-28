import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Corner sticker mappings to indices in the 24-character sticker string
// U: 0..3, D: 4..7, F: 8..11, B: 12..15, L: 16..19, R: 20..23
const CORNER_STICKERS_MAPPING = [
  { U: 2, F: 8, L: 17 },  // 0: UFL
  { U: 3, F: 9, R: 20 },  // 1: UFR
  { U: 1, B: 12, R: 21 }, // 2: UBR
  { U: 0, B: 13, L: 16 }, // 3: UBL
  { D: 4, F: 10, L: 19 }, // 4: DFL
  { D: 5, F: 11, R: 22 }, // 5: DFR
  { D: 7, B: 14, R: 23 }, // 6: DBR
  { D: 6, B: 15, L: 18 }  // 7: DBL
];

// Color mapping for characters to Hex colors
const CHAR_TO_COLOR = {
  'W': '#ffffff', // White
  'Y': '#facc15', // Yellow
  'G': '#10b981', // Green
  'B': '#2563eb', // Blue
  'O': '#f97316', // Orange
  'R': '#e11d48'  // Red
};
const BLACK_COLOR = '#1e293b'; // Inside plastic color (slate-800)

export default function Cube3D({ stickers, currentMove, moveSpeed = 300, onMoveComplete, heightClass = "h-[320px] md:h-[400px]" }) {
  const mountRef = useRef(null);
  const cubeStateRef = useRef({
    stickers,
    cubies: [],
    scene: null,
    isAnimating: false
  });

  // Keep stickers string up-to-date in ref
  useEffect(() => {
    cubeStateRef.current.stickers = stickers;
    if (!cubeStateRef.current.isAnimating) {
      updateStickerColors();
    }
  }, [stickers]);

  // Update colors of all cubie faces based on current stickers
  const updateStickerColors = () => {
    const { stickers: currentStickers, cubies } = cubeStateRef.current;
    if (cubies.length === 0) return;

    cubies.forEach((cubie, i) => {
      // Reset position & rotation to standard layout
      cubie.position.set(cubie.userData.defaultX, cubie.userData.defaultY, cubie.userData.defaultZ);
      cubie.rotation.set(0, 0, 0);
      cubie.updateMatrixWorld(true);

      const mapping = CORNER_STICKERS_MAPPING[i];
      const materials = [];

      // Order of materials in THREE.BoxGeometry:
      // index 0: Right (+X)
      // index 1: Left (-X)
      // index 2: Top (+Y)
      // index 3: Bottom (-Y)
      // index 4: Front (+Z)
      // index 5: Back (-Z)

      // Right (+X)
      if (cubie.userData.defaultX > 0) {
        materials.push(new THREE.MeshLambertMaterial({ color: new THREE.Color(CHAR_TO_COLOR[currentStickers[mapping.R]]) }));
      } else {
        materials.push(new THREE.MeshLambertMaterial({ color: new THREE.Color(BLACK_COLOR) }));
      }

      // Left (-X)
      if (cubie.userData.defaultX < 0) {
        materials.push(new THREE.MeshLambertMaterial({ color: new THREE.Color(CHAR_TO_COLOR[currentStickers[mapping.L]]) }));
      } else {
        materials.push(new THREE.MeshLambertMaterial({ color: new THREE.Color(BLACK_COLOR) }));
      }

      // Top (+Y)
      if (cubie.userData.defaultY > 0) {
        materials.push(new THREE.MeshLambertMaterial({ color: new THREE.Color(CHAR_TO_COLOR[currentStickers[mapping.U]]) }));
      } else {
        materials.push(new THREE.MeshLambertMaterial({ color: new THREE.Color(BLACK_COLOR) }));
      }

      // Bottom (-Y)
      if (cubie.userData.defaultY < 0) {
        materials.push(new THREE.MeshLambertMaterial({ color: new THREE.Color(CHAR_TO_COLOR[currentStickers[mapping.D]]) }));
      } else {
        materials.push(new THREE.MeshLambertMaterial({ color: new THREE.Color(BLACK_COLOR) }));
      }

      // Front (+Z)
      if (cubie.userData.defaultZ > 0) {
        materials.push(new THREE.MeshLambertMaterial({ color: new THREE.Color(CHAR_TO_COLOR[currentStickers[mapping.F]]) }));
      } else {
        materials.push(new THREE.MeshLambertMaterial({ color: new THREE.Color(BLACK_COLOR) }));
      }

      // Back (-Z)
      if (cubie.userData.defaultZ < 0) {
        materials.push(new THREE.MeshLambertMaterial({ color: new THREE.Color(CHAR_TO_COLOR[currentStickers[mapping.B]]) }));
      } else {
        materials.push(new THREE.MeshLambertMaterial({ color: new THREE.Color(BLACK_COLOR) }));
      }

      // Dispose old materials to prevent WebGL memory leaks
      if (cubie.material && Array.isArray(cubie.material)) {
        cubie.material.forEach(m => m.dispose());
      }

      cubie.material = materials;
    });
  };

  // Perform rotation animation in 3D
  const animateRotation = (move) => {
    if (!move) return;
    
    const { cubies, scene } = cubeStateRef.current;
    if (cubies.length === 0 || !scene) return;

    cubeStateRef.current.isAnimating = true;

    // Parse move (e.g., U, U', U2, R, R', R2)
    const face = move[0];
    const isCCW = move.includes("'");
    const isDouble = move.includes('2');

    // 1. Select the 4 cubie meshes on the face based on current 3D position
    const threshold = 0.1;
    const faceCubies = cubies.filter(cubie => {
      const pos = new THREE.Vector3();
      cubie.getWorldPosition(pos);
      
      switch (face) {
        case 'U': return pos.y > threshold;
        case 'D': return pos.y < -threshold;
        case 'R': return pos.x > threshold;
        case 'L': return pos.x < -threshold;
        case 'F': return pos.z > threshold;
        case 'B': return pos.z < -threshold;
        default: return false;
      }
    });

    if (faceCubies.length !== 4) {
      // Fallback if float rounding caused incorrect selection
      cubeStateRef.current.isAnimating = false;
      if (onMoveComplete) onMoveComplete();
      return;
    }

    // 2. Create temporary pivot group
    const pivot = new THREE.Group();
    scene.add(pivot);

    // Attach meshes to pivot
    faceCubies.forEach(cubie => {
      pivot.attach(cubie);
    });

    // 3. Set up axis and rotation angle
    let axis = new THREE.Vector3(0, 1, 0); // Default Y axis
    let baseAngle = Math.PI / 2;

    switch (face) {
      case 'U':
        axis.set(0, 1, 0);
        baseAngle = -Math.PI / 2;
        break;
      case 'D':
        axis.set(0, 1, 0);
        baseAngle = -Math.PI / 2;
        break;
      case 'R':
        axis.set(1, 0, 0);
        baseAngle = -Math.PI / 2;
        break;
      case 'L':
        axis.set(1, 0, 0);
        baseAngle = Math.PI / 2;
        break;
      case 'F':
        axis.set(0, 0, 1);
        baseAngle = -Math.PI / 2;
        break;
      case 'B':
        axis.set(0, 0, 1);
        baseAngle = Math.PI / 2;
        break;
      default:
        break;
    }

    let targetAngle = baseAngle;
    if (isCCW) targetAngle *= -1;
    if (isDouble) targetAngle *= 2;

    // 4. Animation loop
    const startTime = performance.now();
    
    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / moveSpeed, 1.0);
      
      // Cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);
      
      // Reset rotation and apply incremental rotated amount
      pivot.rotation.set(0, 0, 0);
      pivot.rotateOnAxis(axis, targetAngle * ease);

      if (progress < 1.0) {
        requestAnimationFrame(animate);
      } else {
        // Complete animation: detach meshes back to scene, clean up pivot
        faceCubies.forEach(cubie => {
          scene.attach(cubie);
        });
        scene.remove(pivot);
        
        cubeStateRef.current.isAnimating = false;
        
        // Let parent state update its stickers representation
        if (onMoveComplete) {
          onMoveComplete();
        }
      }
    };

    requestAnimationFrame(animate);
  };

  // Trigger animation when currentMove changes
  useEffect(() => {
    if (currentMove) {
      animateRotation(currentMove);
    }
  }, [currentMove]);

  // Initial Three.js mounting
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Dimensions
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 1. Scene
    const scene = new THREE.Scene();
    cubeStateRef.current.scene = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(4, 4, 6);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // 5. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.enablePan = false;

    // 6. Create 8 cubies
    const cubies = [];
    const size = 0.95; // Small bevel gap
    const geom = new THREE.BoxGeometry(size, size, size);
    
    // Coordinates offset from center (0.52 to spacing apart slightly)
    const offset = 0.52;
    const positions = [
      { x: -offset, y: offset, z: offset },  // 0: UFL
      { x: offset, y: offset, z: offset },   // 1: UFR
      { x: offset, y: offset, z: -offset },  // 2: UBR
      { x: -offset, y: offset, z: -offset }, // 3: UBL
      { x: -offset, y: -offset, z: offset }, // 4: DFL
      { x: offset, y: -offset, z: offset },  // 5: DFR
      { x: offset, y: -offset, z: -offset }, // 6: DBR
      { x: -offset, y: -offset, z: -offset } // 7: DBL
    ];

    positions.forEach((pos) => {
      // Default color black initially, updated immediately after
      const materials = Array(6).fill(new THREE.MeshLambertMaterial({ color: BLACK_COLOR }));
      const mesh = new THREE.Mesh(geom, materials);
      mesh.position.set(pos.x, pos.y, pos.z);
      
      // Store initial coordinate metadata in userData
      mesh.userData = {
        defaultX: pos.x,
        defaultY: pos.y,
        defaultZ: pos.z
      };
      
      scene.add(mesh);
      cubies.push(mesh);
    });

    cubeStateRef.current.cubies = cubies;
    
    // Paint stickers
    updateStickerColors();

    // 7. Render Loop
    let animationFrameId;
    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    // 8. Resize Listener
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      
      // Dispose meshes and geometries
      cubies.forEach(mesh => {
        scene.remove(mesh);
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        }
      });
      geom.dispose();
      
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={`w-full ${heightClass} relative rounded-2xl overflow-hidden glass-panel border border-slate-800/60 shadow-xl flex items-center justify-center`}>
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute bottom-3 left-3 text-[10px] text-slate-500 font-mono pointer-events-none select-none bg-slate-950/60 px-2.5 py-1 rounded-full border border-slate-800/40">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
}
