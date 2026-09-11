'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const COLORS = {
  purple: 0x9333ea,
  glow: 0xc084fc,
  fuchsia: 0xd946ef,
  cyan: 0xe6e6fa
};

export default function NeuralBrain({ active = false }) {
  const mountRef = useRef(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.rotateSpeed = 0.85;
    controls.zoomSpeed = 1.15;
    controls.minDistance = 5.5;
    controls.maxDistance = 24;

    const brain = new THREE.Group();
    const pulses = new THREE.Group();
    const orbitals = new THREE.Group();
    brain.scale.setScalar(1.18);
    brain.add(pulses);
    scene.add(brain, orbitals);

    const nodeCount = 1100;
    const positions = new Float32Array(nodeCount * 3);
    const colors = new Float32Array(nodeCount * 3);
    const sizes = new Float32Array(nodeCount);
    const nodes = [];
    const purple = new THREE.Color(COLORS.purple);
    const fuchsia = new THREE.Color(COLORS.fuchsia);
    const cyan = new THREE.Color(COLORS.cyan);

    for (let index = 0; index < nodeCount; index += 1) {
      const hemisphere = Math.random() > 0.5 ? -1 : 1;
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * Math.PI - Math.PI / 2;
      const offset = hemisphere * 0.48;
      let x = 3.05 * Math.cos(v) * Math.cos(u) + offset;
      let y = 2.25 * Math.sin(v);
      let z = 3.35 * Math.cos(v) * Math.sin(u);

      if (y < -0.7 && z < -0.8) {
        x *= 0.78;
        y -= 0.25;
        z -= 0.2;
      }

      const fold = 1 + 0.15 * Math.sin(x * 3.5) * Math.cos(y * 3.5) * Math.sin(z * 3.5);
      x *= fold;
      y *= fold;
      z *= fold;
      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;
      nodes.push(new THREE.Vector3(x, y, z));

      const color = purple.clone().lerp(fuchsia, Math.random() * 0.7);
      if (z > 1.2 && Math.random() > 0.55) color.lerp(cyan, 0.8);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
      sizes[index] = 0.16 + Math.random() * 0.18;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const particleTexture = new THREE.CanvasTexture(createGlowTexture());
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.38,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particleMesh = new THREE.Points(particleGeometry, particleMaterial);
    brain.add(particleMesh);

    const linePositions = [];
    const lineColors = [];
    for (let index = 0; index < nodes.length; index += 2) {
      for (let next = index + 1; next < nodes.length; next += 3) {
        const distance = nodes[index].distanceTo(nodes[next]);
        if (distance < 1.38) {
          linePositions.push(nodes[index].x, nodes[index].y, nodes[index].z, nodes[next].x, nodes[next].y, nodes[next].z);
          const color = Math.random() > 0.78 ? fuchsia : purple;
          lineColors.push(color.r, color.g, color.b, color.r, color.g, color.b);
        }
      }
    }
    const linesGeometry = new THREE.BufferGeometry();
    linesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    linesGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
    const linesMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
    brain.add(new THREE.LineSegments(linesGeometry, linesMaterial));

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.05, 2),
      new THREE.MeshBasicMaterial({ color: COLORS.fuchsia, wireframe: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }),
    );
    brain.add(core);

    const ringOne = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.018, 12, 64), new THREE.MeshBasicMaterial({ color: COLORS.glow, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
    const ringTwo = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.014, 12, 64), new THREE.MeshBasicMaterial({ color: COLORS.fuchsia, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending }));
    ringTwo.rotation.x = Math.PI / 3;
    brain.add(ringOne, ringTwo);

    const orbitalOne = new THREE.Mesh(new THREE.RingGeometry(4.7, 4.76, 64), new THREE.MeshBasicMaterial({ color: COLORS.fuchsia, side: THREE.DoubleSide, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending }));
    orbitalOne.rotation.x = Math.PI / 2;
    const orbitalTwo = new THREE.Mesh(new THREE.RingGeometry(5.55, 5.59, 64), new THREE.MeshBasicMaterial({ color: COLORS.cyan, side: THREE.DoubleSide, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending }));
    orbitalTwo.rotation.x = Math.PI / 3;
    orbitals.add(orbitalOne, orbitalTwo);

    const pulseConnections = [];
    for (let index = 0; index < nodes.length - 12; index += 18) {
      pulseConnections.push({ start: nodes[index], end: nodes[index + 3] });
    }
    const activePulses = [];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frameId;
    let lastTime = 0;

    const spawnPulse = () => {
      if (!pulseConnections.length || activePulses.length > 60) return;
      const connection = pulseConnections[Math.floor(Math.random() * pulseConnections.length)];
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color: activeRef.current ? COLORS.fuchsia : COLORS.cyan, blending: THREE.AdditiveBlending }));
      mesh.position.copy(connection.start);
      pulses.add(mesh);
      activePulses.push({ mesh, ...connection, progress: 0, speed: 0.004 + Math.random() * 0.003 });
    };

    const resize = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      const mobileOffset = isMobile ? -1.25 : 0;
      brain.position.x = mobileOffset;
      orbitals.position.x = mobileOffset;
      brain.scale.setScalar(isMobile ? 0.92 : 1.18);
      orbitals.scale.setScalar(isMobile ? 0.9 : 1);
      controls.target.set(0, 0, 0);
      controls.update();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const animate = (time) => {
      const delta = Math.min((time - lastTime) / 16.67 || 1, 2);
      lastTime = time;
      const engaged = activeRef.current;
      controls.update();
      const speed = reducedMotion ? 0.0002 : engaged ? 0.009 : 0.0022;
      brain.rotation.y += speed * delta;
      orbitals.rotation.z -= speed * 0.8 * delta;
      core.rotation.x += speed * 2.2 * delta;
      core.rotation.y += speed * 3 * delta;
      ringOne.rotation.x += 0.012 * delta;
      ringTwo.rotation.y -= 0.016 * delta;
      const glow = engaged ? 1.45 : 1;
      core.scale.setScalar(1 + Math.sin(time * 0.004) * 0.08 * glow);
      particleMaterial.opacity = 0.72 + (engaged ? 0.2 : 0) + Math.sin(time * 0.003) * 0.08;
      if (!reducedMotion) {
        if (Math.random() > 0.35) spawnPulse();
        if (Math.random() > 0.55) spawnPulse();
        if (Math.random() > 0.7) spawnPulse();
      }

      for (let index = activePulses.length - 1; index >= 0; index -= 1) {
        const pulse = activePulses[index];
        pulse.progress += pulse.speed * delta * (engaged ? 1.5 : 1);
        if (pulse.progress >= 1) {
          pulses.remove(pulse.mesh);
          pulse.mesh.geometry.dispose();
          pulse.mesh.material.dispose();
          activePulses.splice(index, 1);
        } else {
          pulse.mesh.position.lerpVectors(pulse.start, pulse.end, pulse.progress);
        }
      }
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      controls.dispose();
      resizeObserver.disconnect();
      activePulses.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      particleTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="neuralBrainCanvas" aria-label="Interactive animated neural network visualization" role="img" />;
}

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(217,70,239,0.95)');
  gradient.addColorStop(0.7, 'rgba(147,51,234,0.25)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return canvas;
}
