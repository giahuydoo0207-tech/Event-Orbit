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
    camera.position.z = 8.6;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    mount.appendChild(renderer.domElement);

    const credential = new THREE.Group();
    credential.rotation.x = -0.08;
    credential.rotation.z = -0.08;
    scene.add(credential);

    const coreGeometry = new THREE.SphereGeometry(1.48, 64, 64);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x00edbe,
      emissive: 0x00edbe,
      emissiveIntensity: 0.2,
      metalness: 0.08,
      roughness: 0.26,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    credential.add(core);

    const glowGeometry = new THREE.SphereGeometry(1.7, 48, 48);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00edbe,
      transparent: true,
      opacity: 0.07,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    credential.add(new THREE.Mesh(glowGeometry, glowMaterial));

    const innerOrbitGeometry = createOrbitGeometry(2.3, 0.72);
    const outerOrbitGeometry = createOrbitGeometry(2.72, 0.88);
    const innerOrbitMaterial = new THREE.LineBasicMaterial({
      color: 0x00edbe,
      transparent: true,
      opacity: 0.42,
    });
    const outerOrbitMaterial = new THREE.LineBasicMaterial({
      color: 0x141beb,
      transparent: true,
      opacity: 0.58,
    });

    const innerOrbit = new THREE.LineLoop(innerOrbitGeometry, innerOrbitMaterial);
    innerOrbit.rotation.x = Math.PI * 0.42;
    innerOrbit.rotation.z = Math.PI * 0.08;
    credential.add(innerOrbit);

    const outerOrbit = new THREE.LineLoop(outerOrbitGeometry, outerOrbitMaterial);
    outerOrbit.rotation.x = -Math.PI * 0.34;
    outerOrbit.rotation.z = -Math.PI * 0.13;
    credential.add(outerOrbit);

    const nodeGeometry = new THREE.SphereGeometry(0.105, 24, 24);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x00edbe });
    const orbitNode = new THREE.Mesh(nodeGeometry, nodeMaterial);
    outerOrbit.add(orbitNode);

    scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    const keyLight = new THREE.PointLight(0xffffff, 1.35, 20);
    keyLight.position.set(-3, 4, 6);
    scene.add(keyLight);
    const edgeLight = new THREE.PointLight(0x141beb, 1.2, 16);
    edgeLight.position.set(4, -2, 3);
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
        credential.rotation.y += 0.0012;
        innerOrbit.rotation.z += 0.00045;
        outerOrbit.rotation.z -= 0.0003;
      }

      orbitNode.position.set(
        Math.cos(orbitAngle) * 2.72,
        Math.sin(orbitAngle) * 0.88,
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
      innerOrbitGeometry.dispose();
      outerOrbitGeometry.dispose();
      innerOrbitMaterial.dispose();
      outerOrbitMaterial.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
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
