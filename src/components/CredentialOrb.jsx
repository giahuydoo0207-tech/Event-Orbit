import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function createOrbitGeometry(radiusX, radiusY, segments = 160) {
  const positions = new Float32Array(segments * 3);

  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const offset = index * 3;
    positions[offset] = Math.cos(angle) * radiusX;
    positions[offset + 1] = Math.sin(angle) * radiusY;
    positions[offset + 2] = 0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geometry;
}

export function CredentialOrb({ className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.z = 9.8;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    mount.appendChild(renderer.domElement);

const visualRoot = new THREE.Group();
visualRoot.position.set(-0.55, 0.45, 0);
scene.add(visualRoot);

const credential = new THREE.Group();
credential.rotation.x = -0.08;
credential.rotation.z = -0.08;
visualRoot.add(credential);

    const coreGeometry = new THREE.SphereGeometry(0.88, 64, 64);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x00edbe,
      emissive: 0x00edbe,
      emissiveIntensity: 0.06,
      metalness: 0.02,
      roughness: 0.82,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    credential.add(core);

    const glowGeometry = new THREE.SphereGeometry(1, 48, 48);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00edbe,
      transparent: true,
      opacity: 0.015,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    credential.add(new THREE.Mesh(glowGeometry, glowMaterial));

    const orbitGeometry = createOrbitGeometry(2.15, 1.55);
    const orbitMaterial = new THREE.LineBasicMaterial({
      color: 0x141beb,
      transparent: true,
      opacity: 0.48,
    });

    const orbit = new THREE.LineLoop(orbitGeometry, orbitMaterial);
    orbit.rotation.z = -Math.PI * 0.13;
    credential.add(orbit);

    const nodeGeometry = new THREE.SphereGeometry(0.09, 24, 24);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x00edbe });
    const orbitNode = new THREE.Mesh(nodeGeometry, nodeMaterial);
    const nodeGlowGeometry = new THREE.SphereGeometry(0.14, 20, 20);
    const nodeGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00edbe,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    orbitNode.add(new THREE.Mesh(nodeGlowGeometry, nodeGlowMaterial));
    orbit.add(orbitNode);

    scene.add(new THREE.AmbientLight(0xffffff, 0.78));
    const edgeLight = new THREE.PointLight(0x00edbe, 0.28, 16);
    edgeLight.position.set(-3, 3, 4);
    scene.add(edgeLight);

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
    let orbitAngle = 0.6;

    const render = () => {
      if (!prefersReducedMotion) {
        orbitAngle += 0.006;
        orbit.rotation.z -= 0.00018;
      }

      orbitNode.position.set(
        Math.cos(orbitAngle) * 2.15,
        Math.sin(orbitAngle) * 1.55,
        0,
      );
      renderer.render(scene, camera);
      animationFrameId = window.requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize);
    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      coreGeometry.dispose();
      coreMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      orbitGeometry.dispose();
      orbitMaterial.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      nodeGlowGeometry.dispose();
      nodeGlowMaterial.dispose();
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
      aria-label="Open Campus credential orb with an orbiting verification node"
    />
  );
}

export default CredentialOrb;
