import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PARTICLE_COUNT = 180;
const GLOBE_RADIUS = 2.35;
const CONNECTION_DISTANCE = 0.72;

function createGlobePositions() {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const y = 1 - (index / (PARTICLE_COUNT - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const angle = goldenAngle * index;
    const offset = index * 3;

    positions[offset] = Math.cos(angle) * radiusAtY * GLOBE_RADIUS;
    positions[offset + 1] = y * GLOBE_RADIUS;
    positions[offset + 2] = Math.sin(angle) * radiusAtY * GLOBE_RADIUS;
  }

  return positions;
}

function createConnectionPositions(points) {
  const connections = [];

  for (let first = 0; first < PARTICLE_COUNT; first += 1) {
    const firstOffset = first * 3;
    for (let second = first + 1; second < PARTICLE_COUNT; second += 1) {
      const secondOffset = second * 3;
      const dx = points[firstOffset] - points[secondOffset];
      const dy = points[firstOffset + 1] - points[secondOffset + 1];
      const dz = points[firstOffset + 2] - points[secondOffset + 2];

      if (dx * dx + dy * dy + dz * dz < CONNECTION_DISTANCE * CONNECTION_DISTANCE) {
        connections.push(
          points[firstOffset], points[firstOffset + 1], points[firstOffset + 2],
          points[secondOffset], points[secondOffset + 1], points[secondOffset + 2],
        );
      }
    }
  }

  return new Float32Array(connections);
}

function createHelixPositions(phase, direction) {
  const segments = 150;
  const positions = new Float32Array(segments * 2 * 3);

  for (let index = 0; index < segments; index += 1) {
    const start = (index / segments) * Math.PI * 2;
    const end = ((index + 1) / segments) * Math.PI * 2;

    [start, end].forEach((angle, pointIndex) => {
      const offset = (index * 2 + pointIndex) * 3;
      const wave = Math.sin(angle * 2 + phase) * 0.34;
      positions[offset] = Math.cos(angle) * (GLOBE_RADIUS + 0.45);
      positions[offset + 1] = wave * direction;
      positions[offset + 2] = Math.sin(angle) * (GLOBE_RADIUS + 0.45);
    });
  }

  return positions;
}

export function ParticleGlobe({ className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.z = 8.55;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const globe = new THREE.Group();
    globe.rotation.x = -0.18;
    globe.rotation.z = -0.1;
    scene.add(globe);

    const pointPositions = createGlobePositions();
    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
    const pointsMaterial = new THREE.PointsMaterial({
      color: 0x00edbe,
      size: 0.045,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
    });
    globe.add(new THREE.Points(pointsGeometry, pointsMaterial));

    const linesGeometry = new THREE.BufferGeometry();
    linesGeometry.setAttribute('position', new THREE.BufferAttribute(createConnectionPositions(pointPositions), 3));
    const linesMaterial = new THREE.LineBasicMaterial({
      color: 0x00edbe,
      transparent: true,
      opacity: 0.15,
    });
    globe.add(new THREE.LineSegments(linesGeometry, linesMaterial));

    const orbitMaterial = new THREE.LineBasicMaterial({
      color: 0x00edbe,
      transparent: true,
      opacity: 0.3,
    });
    const orbitGeometries = [
      new THREE.BufferGeometry(),
      new THREE.BufferGeometry(),
    ];
    orbitGeometries[0].setAttribute('position', new THREE.BufferAttribute(createHelixPositions(0, 1), 3));
    orbitGeometries[1].setAttribute('position', new THREE.BufferAttribute(createHelixPositions(Math.PI, -1), 3));

    const firstOrbit = new THREE.LineSegments(orbitGeometries[0], orbitMaterial);
    firstOrbit.rotation.x = Math.PI * 0.3;
    firstOrbit.rotation.z = Math.PI * 0.12;
    globe.add(firstOrbit);

    const secondOrbit = new THREE.LineSegments(orbitGeometries[1], orbitMaterial);
    secondOrbit.rotation.x = -Math.PI * 0.32;
    secondOrbit.rotation.z = -Math.PI * 0.16;
    globe.add(secondOrbit);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    let animationFrameId;
    const render = () => {
      if (!prefersReducedMotion) {
        globe.rotation.y += 0.0024;
        firstOrbit.rotation.y += 0.0013;
        secondOrbit.rotation.y -= 0.001;
      }
      renderer.render(scene, camera);
      animationFrameId = window.requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize);
    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      pointsGeometry.dispose();
      pointsMaterial.dispose();
      linesGeometry.dispose();
      linesMaterial.dispose();
      orbitGeometries.forEach((geometry) => geometry.dispose());
      orbitMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      scene.clear();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`h-full w-full ${className}`}
      role="img"
      aria-label="Rotating network globe representing verified campus connections"
    />
  );
}

export default ParticleGlobe;
