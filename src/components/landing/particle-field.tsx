"use client";

import * as React from "react";
import * as THREE from "three";

/**
 * Particle network animation (Three.js).
 * - 220 partikel saling terhubung kalau jaraknya dekat
 * - interaksi mouse (partikel tertarik / menjauh)
 * - fallback gradient kalau WebGL nggak tersedia
 */
export default function ParticleField({ className = "" }: { className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    const mount = ref.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }

    const w = mount.clientWidth || window.innerWidth;
    const h = mount.clientHeight || window.innerHeight;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 1, 3000);
    camera.position.z = 500;

    const COUNT = 220;
    const positions = new Float32Array(COUNT * 3);
    const velocities: number[] = [];
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 800;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 600;
      velocities.push((Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.35);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size: 3.2,
      color: new THREE.Color("#00f0ff"),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color("#7c3aed"),
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
    });
    const lineGeo = new THREE.BufferGeometry();
    const maxLines = COUNT * 6;
    const linePositions = new Float32Array(maxLines * 6);
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    const mouse = { x: 0, y: 0 };
    const onMouse = (e: MouseEvent) => {
      const r = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    window.addEventListener("mousemove", onMouse);

    let raf = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const pos = geo.attributes.position.array as Float32Array;

      for (let i = 0; i < COUNT; i++) {
        const ix = i * 3;
        pos[ix] += velocities[ix];
        pos[ix + 1] += velocities[ix + 1];
        pos[ix + 2] += velocities[ix + 2];

        // tarik halus ke arah mouse
        pos[ix] += mouse.x * 0.25;
        pos[ix + 1] += mouse.y * 0.25;

        if (pos[ix] < -600 || pos[ix] > 600) velocities[ix] *= -1;
        if (pos[ix + 1] < -400 || pos[ix + 1] > 400) velocities[ix + 1] *= -1;
        if (pos[ix + 2] < -300 || pos[ix + 2] > 300) velocities[ix + 2] *= -1;

        pos[ix + 1] += Math.sin(t + i) * 0.05;
      }
      geo.attributes.position.needsUpdate = true;

      // bangun jaringan
      const lp = lineGeo.attributes.position.array as Float32Array;
      let li = 0;
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = pos[i * 3] - pos[j * 3];
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < 20000) {
            if (li >= maxLines * 6 - 6) break;
            lp[li++] = pos[i * 3];
            lp[li++] = pos[i * 3 + 1];
            lp[li++] = pos[i * 3 + 2];
            lp[li++] = pos[j * 3];
            lp[li++] = pos[j * 3 + 1];
            lp[li++] = pos[j * 3 + 2];
          }
        }
      }
      for (let k = li; k < linePositions.length; k++) linePositions[k] = 0;
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.setDrawRange(0, li / 3);

      points.rotation.y += 0.0006;
      lines.rotation.y = points.rotation.y;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      geo.dispose();
      lineGeo.dispose();
      mat.dispose();
      lineMat.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  if (failed) {
    return (
      <div className={className}>
        <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(0,240,255,.25),transparent_60%),radial-gradient(circle_at_70%_60%,rgba(255,0,229,.25),transparent_60%)]" />
      </div>
    );
  }

  return <div ref={ref} className={className} aria-hidden />;
}
