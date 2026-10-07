"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * The hero: a facial depth-field rendered as a point cloud.
 *
 * A grid of points on the XY plane displaced along Z by a face height
 * map — the same thing a depth sensor captures. It was chosen over a
 * modelled 3D head deliberately: a procedural skull is hard to keep out
 * of uncanny-potato territory, whereas a relief reads correctly even
 * when it is loose, and "loosely reconstructed face" is exactly the
 * subject matter.
 *
 * The height map is a sum of Gaussians — brow ridges, nose, eye sockets,
 * cheeks, lips, chin — multiplied by an elliptical mask so the silhouette
 * falls off to nothing at the edge.
 */

const GRID = 300; // points per side before masking

function gauss(
  x: number,
  y: number,
  cx: number,
  cy: number,
  sx: number,
  sy: number,
) {
  const dx = (x - cx) / sx;
  const dy = (y - cy) / sy;
  return Math.exp(-(dx * dx + dy * dy));
}

/**
 * Face relief height at (x, y), both roughly in [-1, 1].
 *
 * Tuned deeper than a gentle relief: the mask reads as a sculpted shell,
 * so the brow overhangs, the sockets sink well behind it, and the nose
 * projects far enough to throw a real shadow under directional light.
 */
function faceHeight(x: number, y: number) {
  const ax = Math.abs(x);

  let h = 0;
  h += 0.42 * gauss(x, y, 0, -0.02, 0.62, 0.8); // overall shell volume
  h += 0.22 * gauss(ax, y, 0.29, 0.33, 0.23, 0.08); // brow ridges
  h += 0.1 * gauss(x, y, 0, 0.3, 0.13, 0.07); // glabella between brows

  // Sockets: deep, and wider than the cutout so the rim reads as a
  // hollow the eye sits inside rather than a hole punched in a plane.
  h -= 0.34 * gauss(ax, y, 0.3, 0.14, 0.2, 0.13);

  h += 0.46 * gauss(x, y, 0, -0.02, 0.075, 0.34); // nose bridge
  h += 0.3 * gauss(x, y, 0, -0.26, 0.1, 0.085); // nose tip
  h -= 0.14 * gauss(ax, y, 0.14, -0.25, 0.055, 0.07); // nostril wings
  h += 0.19 * gauss(ax, y, 0.44, -0.06, 0.2, 0.21); // cheekbones
  h -= 0.12 * gauss(ax, y, 0.5, -0.34, 0.16, 0.16); // cheek hollow

  h -= 0.1 * gauss(x, y, 0, -0.46, 0.24, 0.032); // mouth line
  h += 0.13 * gauss(x, y, 0, -0.4, 0.2, 0.06); // upper lip
  h += 0.12 * gauss(x, y, 0, -0.52, 0.18, 0.058); // lower lip
  h -= 0.07 * gauss(x, y, 0, -0.6, 0.16, 0.05); // chin crease
  h += 0.17 * gauss(x, y, 0, -0.72, 0.2, 0.14); // chin

  return h;
}

/** Height including the silhouette mask — the actual rendered surface. */
function surfaceAt(x: number, y: number) {
  return faceHeight(x, y) * faceMask(x, y);
}

/**
 * Mask silhouette: a rounded cranium that tapers into a jaw and chin,
 * rather than a plain ellipse. Modelling the taper is most of what
 * separates "face mask" from "egg" at a glance.
 */
function faceMask(x: number, y: number) {
  // Half-width narrows as y falls past the cheekbones, so the outline
  // pulls in toward the chin the way a jaw does.
  const taper =
    y > 0.12
      ? 1
      : 1 - 0.42 * THREE.MathUtils.smoothstep(-y, -0.12, 0.85) ** 1.35;
  const halfW = 0.7 * taper;

  const r = Math.sqrt((x / halfW) ** 2 + ((y - 0.02) / 0.97) ** 2);
  return 1 - THREE.MathUtils.smoothstep(r, 0.74, 1.0);
}

/**
 * Eye cutouts — the sockets are voids in the shell, not just shaded
 * dimples. Returns 0 inside the opening, 1 outside, with a short
 * feather so the rim does not alias into a hard stencil edge.
 */
function eyeCut(x: number, y: number) {
  const ax = Math.abs(x);
  // Almond: wider than tall, canted slightly up toward the temple.
  const dx = (ax - 0.305) / 0.15;
  const dy = (y - 0.145 - (ax - 0.305) * 0.16) / 0.072;
  const d = Math.sqrt(dx * dx + dy * dy);
  return THREE.MathUtils.smoothstep(d, 0.82, 1.06);
}

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uScan;
  uniform vec2  uPointer;
  uniform float uSize;

  attribute float aHeight;
  attribute float aRand;
  attribute float aMask;
  attribute vec3  aNormal;

  varying float vShade;
  varying float vScan;
  varying float vRand;
  varying float vLight;

  void main() {
    vec3 pos = position;

    // Assemble: points start flat and scattered, then rise into relief.
    float delay = aRand * 0.35;
    float p = clamp((uProgress - delay) / (1.0 - delay), 0.0, 1.0);
    p = p * p * (3.0 - 2.0 * p);

    float drift = sin(uTime * 0.6 + aRand * 20.0) * 0.012;
    pos.z = aHeight * p + drift * aMask;

    // Start dispersed mostly along depth so the assembly reads as the
    // face resolving into focus. A wide XY scatter just looks like dust.
    vec3 scatter = vec3(
      sin(aRand * 91.0) * 0.14,
      cos(aRand * 57.0) * 0.14,
      (aRand - 0.5) * 1.3
    );
    pos = mix(pos + scatter, pos, p);

    // Pointer parallax, damped by depth so it reads as one solid object.
    pos.x += uPointer.x * 0.06 * (0.4 + aHeight);
    pos.y += uPointer.y * 0.06 * (0.4 + aHeight);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);

    // Horizontal scan band travelling up the face — a tight bright core
    // with a longer, dimmer trail behind it, so it reads as a light
    // sweeping through the field rather than a stripe wiping over it.
    float d = pos.y - uScan;
    float core = smoothstep(0.045, 0.0, abs(d));
    float trail = smoothstep(0.34, 0.0, max(0.0, d)) * 0.22;
    // Falls off toward the temples so the band reads as a line drawn
    // across the face, not a wash flooding the whole width.
    float lateral = smoothstep(0.62, 0.2, abs(pos.x));
    vScan = clamp(core + trail, 0.0, 1.0) * lateral * p;

    vShade = aHeight;
    vRand = aRand;

    // Directional shading off the height-field normal. This is what
    // makes the nose, brows and cheekbones read as a face — height
    // alone renders as a flat topographic blob.
    // Near-frontal key, slightly above and to the left. Lighting the
    // mask close to head-on is what keeps the brow, nose and lips
    // reading as form rather than raking everything into silhouette.
    vec3 n = normalize(normalMatrix * aNormal);
    vec3 lightDir = normalize(vec3(-0.22, 0.34, 1.0));
    vLight = max(dot(n, lightDir), 0.0) * p;

    // Perspective-correct sizing against viewport height. The naive
    // 1.0 / -mv.z lands under one pixel and the field disappears.
    gl_PointSize = uSize * (1.0 + vScan * 1.8) * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;

  uniform vec3 uBone;
  uniform vec3 uSignal;
  uniform vec3 uSpark;
  uniform float uLight;

  varying float vShade;
  varying float vScan;
  varying float vRand;
  varying float vLight;

  void main() {
    // Round points; square ones read as compression artefacts.
    vec2 c = gl_PointCoord - 0.5;
    float r = dot(c, c);
    if (r > 0.25) discard;

    float edge = smoothstep(0.25, 0.04, r);

    // Lambert term carries the form; height adds a little lift so the
    // nose and brow stay bright even where they face away. The ambient
    // floor is deliberately generous — the mesh should read as a bright
    // scanned shell everywhere, with shading modulating it, not a dark
    // object with a few lit facets.
    float lift = clamp(vShade * 2.0, 0.0, 1.0);
    float lum = 0.42 + vLight * 0.95 + lift * 0.22;

    // Dark-theme: points glow bone-bright out of a near-black plate, so
    // form comes from colour — brighter where lit. Light-theme: a
    // brighter point would vanish into the page, so form comes from
    // density instead — colour stays a fixed dark ink tone throughout,
    // and unlit points fade toward transparent the way stippling
    // conveys shadow with absence rather than a darker mark.
    vec3 col = mix(uBone * clamp(lum, 0.0, 1.25), uBone, uLight);
    float darkAlpha = clamp(0.2 + lum * 0.85, 0.0, 1.0);
    // Light-theme opacity is remapped across the *lit* range only. The
    // ambient floor that keeps the dark mesh bright would otherwise put
    // every point near full opacity here and flatten the form away.
    float shaped = clamp((lum - 0.42) / 0.95, 0.0, 1.0);
    float lightAlpha = clamp(pow(shaped, 1.35) * 0.95 + 0.04, 0.04, 0.95);
    float alpha = mix(darkAlpha, lightAlpha, uLight) * edge;

    // Scan band: an emissive sweep in both themes, so it always reads
    // as light moving across the surface rather than a flat overlay.
    col = mix(col, uSignal, vScan * 0.92);
    alpha = clamp(alpha + vScan * 0.5, 0.0, 1.0);

    // A sparse few points burn brighter than the field — dark-theme
    // pushes them toward white (a glint), light-theme toward the
    // signal red (a fleck of ink), since white would vanish there.
    if (vRand > 0.988) {
      col = mix(col, mix(vec3(1.0), uSpark, uLight), 0.7);
      alpha = min(1.0, alpha * 1.7);
    }

    gl_FragColor = vec4(col, alpha);
  }
`;

export function FaceCloud({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }
    if (!renderer.getContext()) {
      setFailed(true);
      return;
    }

    renderer.setClearAlpha(0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      width: "100%",
      height: "100%",
      display: "block",
    });

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 3.05);

    // ── Geometry ────────────────────────────────────────────────────
    const SX = 0.88;
    const SY = 0.98;
    const EPS = 1 / GRID;

    const positions: number[] = [];
    const heights: number[] = [];
    const rands: number[] = [];
    const masks: number[] = [];
    const normals: number[] = [];

    for (let iy = 0; iy < GRID; iy++) {
      for (let ix = 0; ix < GRID; ix++) {
        // Light jitter only. The grid is meant to read as a scanned
        // mesh, so the rows and columns should stay legible — a heavy
        // scatter dissolves it into dust.
        const jx = (Math.random() - 0.5) * 0.35;
        const jy = (Math.random() - 0.5) * 0.35;
        const x = ((ix + jx) / (GRID - 1)) * 2 - 1;
        const y = ((iy + jy) / (GRID - 1)) * 2 - 1;

        const m = faceMask(x, y);
        if (m <= 0.001) continue;
        // Eye openings are holes in the shell — drop those points
        // entirely rather than shading them dark.
        if (eyeCut(x, y) <= 0.001) continue;

        positions.push(x * SX, y * SY, 0);
        heights.push(surfaceAt(x, y));
        masks.push(m);
        rands.push(Math.random());

        // Analytic-ish normal from central differences of the surface.
        // N = ∂P/∂x × ∂P/∂y for P = (SX·x, SY·y, h)
        const dhx = (surfaceAt(x + EPS, y) - surfaceAt(x - EPS, y)) / (2 * EPS);
        const dhy = (surfaceAt(x, y + EPS) - surfaceAt(x, y - EPS)) / (2 * EPS);
        const nx = -SY * dhx;
        const ny = -SX * dhy;
        const nz = SX * SY;
        const len = Math.hypot(nx, ny, nz) || 1;
        normals.push(nx / len, ny / len, nz / len);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setAttribute("aHeight", new THREE.Float32BufferAttribute(heights, 1));
    geo.setAttribute("aRand", new THREE.Float32BufferAttribute(rands, 1));
    geo.setAttribute("aMask", new THREE.Float32BufferAttribute(masks, 1));
    geo.setAttribute("aNormal", new THREE.Float32BufferAttribute(normals, 3));

    const readBone = () => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue("--color-bone")
        .trim();
      return new THREE.Color(v || "#ede9e1");
    };
    const isLight = () =>
      document.documentElement.getAttribute("data-theme") === "light";

    const uniforms = {
      uTime: { value: 0 },
      uProgress: { value: reduced ? 1 : 0 },
      uScan: { value: -1.4 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uSize: { value: 0.011 },
      uBone: { value: readBone() },
      uSignal: { value: new THREE.Color("#ff3b2f") },
      uSpark: { value: new THREE.Color("#c81e34") },
      uLight: { value: isLight() ? 1 : 0 },
    };

    // Theme flips `data-theme` on <html>; re-sample the bone colour and
    // the light/dark switch so the point cloud stays legible either way.
    const themeObserver = new MutationObserver(() => {
      uniforms.uBone.value.copy(readBone());
      uniforms.uLight.value = isLight() ? 1 : 0;
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const points = new THREE.Points(geo, material);
    scene.add(points);

    // ── Sizing ──────────────────────────────────────────────────────
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Point size tracks canvas height so density looks the same at
      // any viewport, and DPR so it is not chunky on retina.
      uniforms.uSize.value = (h / 900) * 0.0115 * renderer.getPixelRatio();
      // The camera's FOV is vertical, so distance alone controls how
      // tall the face renders — width only changes how much empty
      // canvas sits either side of it, never the face's own size. A
      // fixed distance (with a small pull-back only once the canvas
      // gets genuinely narrow, e.g. under `lg`) keeps the face the same
      // size at every width instead of ballooning on a wide box.
      camera.position.z = 4.5 / Math.min(1, Math.max(0.6, w / 480));
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // ── Pointer ─────────────────────────────────────────────────────
    const pointerTarget = new THREE.Vector2(0, 0);
    const onPointer = (e: PointerEvent) => {
      pointerTarget.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1),
      );
    };
    if (!reduced) window.addEventListener("pointermove", onPointer);

    // ── Loop ────────────────────────────────────────────────────────
    let raf = 0;
    let running = true;
    // Timer only recomputes on update(), so getDelta/getElapsed can be
    // read freely within a frame. Both already return seconds.
    const timer = new THREE.Timer();

    // Pause when off-screen — this canvas is not worth a frame budget
    // once the reader has scrolled past it.
    const io = new IntersectionObserver(
      ([entry]) => {
        running = entry.isIntersecting;
        if (running) {
          // Drop the gap spent off-screen so the animation resumes
          // rather than jumping forward by however long it was hidden.
          timer.reset();
          raf = requestAnimationFrame(tick);
        } else {
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 },
    );
    io.observe(el);

    function tick() {
      if (!running) return;
      timer.update();
      const dt = Math.min(timer.getDelta(), 0.05);
      const t = timer.getElapsed();
      uniforms.uTime.value = t;

      if (!reduced) {
        uniforms.uProgress.value = Math.min(
          1,
          uniforms.uProgress.value + dt * 0.42,
        );

        // Scan sweeps up the mask, then dwells across the eyes — the
        // read is "it found the face and is now examining it", which a
        // uniform back-and-forth wipe never conveys.
        const EYE_Y = 0.145; // matches the socket centre in faceHeight
        const PERIOD = 7.2;
        const phase = (t % PERIOD) / PERIOD;
        let scanY: number;
        if (phase < 0.42) {
          // Travel: bottom of the chin up to the eye line.
          const k = phase / 0.42;
          const eased = k * k * (3 - 2 * k);
          scanY = -1.15 + eased * (EYE_Y + 1.15);
        } else if (phase < 0.72) {
          // Dwell: hold on the eyes with a slight live tremor.
          scanY = EYE_Y + Math.sin(t * 2.6) * 0.012;
        } else {
          // Release: continue up and off the crown, then wrap.
          const k = (phase - 0.72) / 0.28;
          const eased = k * k;
          scanY = EYE_Y + eased * (1.5 - EYE_Y);
        }
        uniforms.uScan.value = scanY;

        // Slow idle "breathing" scale so the field has life even with
        // no pointer input — small enough to read as presence, not
        // pulsing.
        const breathe = 1 + Math.sin(t * 0.5) * 0.012;
        points.scale.setScalar(breathe);

        uniforms.uPointer.value.lerp(pointerTarget, 0.045);
        // Yaw is kept shallow: the mask is a frontal portrait, and past
        // roughly ten degrees the sockets foreshorten into slits and it
        // stops reading as a face at all.
        points.rotation.y = THREE.MathUtils.lerp(
          points.rotation.y,
          pointerTarget.x * 0.1 + Math.sin(t * 0.22) * 0.035,
          0.04,
        );
        points.rotation.x = THREE.MathUtils.lerp(
          points.rotation.x,
          -pointerTarget.y * 0.07 + Math.sin(t * 0.17) * 0.015,
          0.04,
        );
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onPointer);
      timer.dispose();
      geo.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) {
        el.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (failed) {
    // WebGL unavailable — the page must still have a hero.
    return (
      <div className={className} aria-hidden="true">
        <div className="h-full w-full bg-[radial-gradient(circle_at_50%_45%,var(--color-hair-2),transparent_62%)]" />
      </div>
    );
  }

  return <div ref={host} className={className} aria-hidden="true" />;
}
