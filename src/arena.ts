import * as THREE from "three";
import { createStadium } from "./stadium.ts";
import { impactProfile, impactShake } from "./impact.ts";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Bey } from "./catalog.ts";
import { BEYS } from "./catalog.ts";
import { beyModel, modelSpec } from "./bey-model.ts";
import {
  interpolatePose,
  spinLean,
  entryPose,
  damping,
  type TopPose,
} from "./motion.ts";
import { type Battle, type BattleEvent } from "./physics.ts";

function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}
function ring(radius: number, tube: number, color: THREE.ColorRepresentation) {
  const o = mesh(
    new THREE.TorusGeometry(radius, tube, 8, 96),
    new THREE.MeshBasicMaterial({ color }),
  );
  o.rotation.x = Math.PI / 2;
  return o;
}
interface Particle {
  p: THREE.Vector3;
  v: THREE.Vector3;
  life: number;
  totalLife: number;
  color: THREE.Color;
}
export function closeUpRange(
  distance: number,
  camera: THREE.PerspectiveCamera,
  openingHeight = 0,
) {
  const halfFov = Math.atan(
    Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
      Math.min(1, camera.aspect),
  );
  const verticalHalfFov = THREE.MathUtils.degToRad(camera.fov / 2);
  return Math.max(
    3.7,
    (distance / 2 + 0.75) / Math.sin(halfFov),
    (0.75 + openingHeight * 0.75) / Math.sin(verticalHalfFov),
  );
}
export function renderPixelRatio(
  width: number,
  height: number,
  deviceRatio: number,
  maxRatio = 1.75,
) {
  return Math.min(
    deviceRatio,
    maxRatio,
    Math.sqrt(2400000 / Math.max(1, width * height)),
  );
}
export class Arena {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
  cameraFocus = new THREE.Vector3();
  cameraBase = new THREE.Vector3();
  cameraTarget = new THREE.Vector3();
  landingRings: THREE.Mesh[] = [];
  stadium = createStadium();
  models: THREE.Group[] = [];
  host: HTMLElement | null = null;
  mode: "home" | "battle" | "inspect" = "home";
  observer: ResizeObserver;
  angle = 0;
  pitch = 0.54;
  exploded = false;
  closeUp = true;
  dragging = false;
  lastX = 0;
  lastY = 0;
  shake = 0;
  shakeAge = 1;
  eventFlash = 0;
  particles: Particle[] = [];
  particleGeometry = new THREE.BufferGeometry();
  particlePoints: THREE.Points;
  sparkStreaks: THREE.LineSegments;
  impactFlashes: THREE.Sprite[] = [];
  impactHeight = .5;
  trails: THREE.Line[] = [];
  trailPositions: number[][] = [[], []];
  beam = mesh(
    new THREE.CylinderGeometry(0.7, 1.1, 6, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: "#ff8561",
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  time = 0;
  finishTime = 0;
  finished: Battle | null = null;
  good = true;
  constructor() {
    this.camera.position.set(9, 10, 12.5);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    const room = new RoomEnvironment(),
      pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(room, 0.06).texture;
    this.scene.environmentIntensity = 0.7;
    room.dispose();
    pmrem.dispose();
    this.renderer.shadowMap.enabled = innerWidth > 700;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "原創立體陀螺競技場，可拖曳旋轉視角",
    );
    this.renderer.domElement.setAttribute("role", "img");
    this.scene.add(new THREE.HemisphereLight("#dcecff", "#1a2636", 1.6));
    const key = new THREE.DirectionalLight("#d8f3ff", 3);
    key.position.set(3, 9, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    this.scene.add(key);
    const lime = new THREE.PointLight("#caff5c", 18, 18);
    lime.position.set(-4, 4, 1);
    this.scene.add(lime);
    const blue = new THREE.PointLight("#428cff", 24, 18);
    blue.position.set(4, 4, -3);
    this.scene.add(blue);
    this.scene.add(this.stadium);
    this.beam.visible = false;
    this.scene.add(this.beam);
    for (const color of ["#a9e8ff", "#ffc7aa"]) {
      const pulse = ring(0.53, 0.009, color);
      const material = pulse.material as THREE.MeshBasicMaterial;
      material.transparent = true;
      material.depthWrite = false;
      material.toneMapped = false;
      pulse.visible = false;
      pulse.castShadow = false;
      pulse.receiveShadow = false;
      this.scene.add(pulse);
      this.landingRings.push(pulse);
    }
    const positions = new Float32Array(360 * 3),
      colors = new Float32Array(360 * 3);
    this.particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    this.particleGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3),
    );
    const pixels = new Uint8Array(32 * 32 * 4);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const i = (y * 32 + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
      pixels[i + 3] = Math.round(255 * Math.pow(Math.max(0, 1 - Math.hypot(x - 15.5, y - 15.5) / 15.5), 1.8));
    }
    const glow = new THREE.DataTexture(pixels, 32, 32);
    glow.magFilter = glow.minFilter = THREE.LinearFilter;
    glow.needsUpdate = true;
    this.particlePoints = new THREE.Points(
      this.particleGeometry,
      new THREE.PointsMaterial({
        size: 0.105,
        map: glow,
        toneMapped: false,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.scene.add(this.particlePoints);
    const streakGeometry = new THREE.BufferGeometry();
    streakGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(360 * 6), 3).setUsage(THREE.DynamicDrawUsage));
    streakGeometry.setDrawRange(0, 0);
    this.sparkStreaks = new THREE.LineSegments(streakGeometry, new THREE.LineBasicMaterial({ color: "#ff963d", transparent: true, opacity: .85, depthWrite: false, toneMapped: false }));
    this.sparkStreaks.frustumCulled = false;
    this.particlePoints.frustumCulled = false;
    this.scene.add(this.sparkStreaks);
    for (let i = 0; i < 4; i++) {
      const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: "#ffb044", transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      flare.userData.life = 0;
      this.impactFlashes.push(flare);
      this.scene.add(flare);
    }
    for (const c of ["#8bdfff", "#ff926b"]) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(90), 3).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
      geometry.setDrawRange(0, 0);
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: c,
          transparent: true,
          opacity: 0.6,
          blending: THREE.AdditiveBlending,
        }),
      );
      line.frustumCulled = false;
      this.scene.add(line);
      this.trails.push(line);
    }
    this.observer = new ResizeObserver(() => this.resize());
    this.renderer.domElement.addEventListener("pointerdown", (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.renderer.domElement.setPointerCapture(e.pointerId);
    });
    this.renderer.domElement.addEventListener("pointermove", (e) => {
      if (this.dragging) {
        this.angle += (e.clientX - this.lastX) * 0.008;
        if (this.mode === "inspect")
          this.pitch = Math.max(
            -0.65,
            Math.min(1.2, this.pitch + (e.clientY - this.lastY) * 0.007),
          );
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    });
    this.renderer.domElement.addEventListener(
      "pointerup",
      () => (this.dragging = false),
    );
    this.setBeys([BEYS[0], BEYS[11]]);
  }
  attach(host: HTMLElement, mode: "home" | "battle" | "inspect" = "home") {
    if (this.host) this.observer.unobserve(this.host);
    this.host = host;
    if (this.mode !== mode) {
      this.cameraFocus.set(0, mode === "inspect" ? 0.25 : 0, 0);
      this.camera.position.set(
        ...((mode === "inspect" ? [0, 1.75, 2.5] : [9, 10, 12.5]) as [
          number,
          number,
          number,
        ]),
      );
    }
    this.mode = mode;
    this.renderer.domElement.style.touchAction =
      mode === "inspect" ? "none" : "pan-y";
    host.append(this.renderer.domElement);
    this.observer.observe(host);
    this.resize();
    this.stadium.visible = mode !== "inspect";
  }
  resize() {
    if (!this.host) return;
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    const ratio = renderPixelRatio(
      w,
      h,
      devicePixelRatio,
      innerWidth < 700 ? 1.35 : 1.75,
    );
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setDrawingBufferSize(w, h, ratio);
    this.renderer.domElement.style.width = w + "px";
    this.renderer.domElement.style.height = h + "px";
  }
  setBeys(beys: Bey[]) {
    this.impactHeight = Math.max(...beys.map(b => {
      const spec = modelSpec(b);
      return spec.bitHeight + spec.ratchetHeight + spec.bladeThickness + spec.profile.coreRise + .055;
    }));
    this.exploded = false;
    this.pitch = 0.54;
    this.renderer.domElement.dataset.assembly = "assembled";
    this.renderer.domElement.setAttribute(
      "aria-label",
      beys.map((b) => b.name).join(" 對 ") +
        "：實物貼圖與輪廓近似立體模型，可拖曳旋轉",
    );
    this.models.forEach((g) => {
      this.scene.remove(g);
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          if (o instanceof THREE.InstancedMesh) o.dispose();
          o.geometry.dispose();
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => {
            const material = m as THREE.MeshStandardMaterial;
            material.map?.dispose();
            if (material.emissiveMap !== material.map)
              material.emissiveMap?.dispose();
            m.dispose();
          });
        }
      });
    });
    this.models = beys.map((b) => {
      const texture = new THREE.TextureLoader().load(modelSpec(b).photo.src);
      const g = beyModel(b, texture);
      this.scene.add(g);
      return g;
    });
    this.trailPositions = [[], []];
    this.particles.length = 0;
    this.shake = 0;
    this.impactFlashes.forEach(f => { f.userData.life = 0; (f.material as THREE.SpriteMaterial).opacity = 0; });
    this.finished = null;
    this.beam.visible = false;
  }
  event(e: BattleEvent) {
    if (e.type === "hit" || e.type === "finish") {
      const profile = impactProfile(e.strength);
      if (!this.reduced && profile.shake > this.shake * Math.exp(-this.shakeAge * 20)) {
        this.shake = profile.shake;
        this.shakeAge = 0;
      }
      const height = this.impactHeight + (e.x * e.x + e.z * e.z) * .024;
      if (!this.reduced && profile.tier > 0) {
        const flare = this.impactFlashes.find(f => f.userData.life <= 0)
          ?? this.impactFlashes.reduce((a, b) => a.userData.life < b.userData.life ? a : b);
        flare.position.set(e.x, height, e.z);
        flare.userData.life = flare.userData.totalLife = .065 + profile.tier * .025;
        flare.userData.size = .3 + profile.gain * .55;
      }
      const count = Math.min(360 - this.particles.length, this.reduced ? 8 : innerWidth < 700 ? 24 : 48, profile.sparks);
      for (let i = 0; i < count; i++) {
        const a = i * 2.39996 + e.time;
        const life = this.reduced ? .08 : .12 + profile.tier * .055 + (i % 4) * .025;
        const speed = this.reduced ? 0 : (.7 + profile.gain) * (1 + (i % 4) * .65);
        this.particles.push({
          p: new THREE.Vector3(e.x, height, e.z),
          v: new THREE.Vector3(
            Math.cos(a) * speed,
            this.reduced ? 0 : .7 + (i % 5) * .35,
            Math.sin(a) * speed,
          ),
          life, totalLife: life,
          color: new THREE.Color(i % 3 ? "#ffbd60" : "#fff5d2"),
        });
      }
    }
    if (e.type === "dash") this.eventFlash = 0.7;
  }
  finish(b: Battle) {
    this.finished = b;
    this.finishTime = this.time;
    if (b.result && ["over", "extreme"].includes(b.result.finish)) {
      const t = b.tops[b.result.winner === 0 ? 1 : 0];
      this.beam.position.set(t.x, 2.3, t.z);
      this.beam.visible = true;
    }
  }
  draw(
    dt: number,
    battle: Battle | null = null,
    previous: readonly TopPose[] = [],
    alpha = 1,
    openingSeconds: number | null = null,
  ) {
    this.time += dt;
    const poses = battle?.tops.map((t, i) =>
      interpolatePose(previous[i] ?? t, t, alpha),
    );
    const inspecting = this.mode === "inspect";
    const entry =
      openingSeconds === null
        ? null
        : entryPose(openingSeconds, 0, this.reduced);
    const openingPhase = entry?.phase ?? "none";
    if (this.renderer.domElement.dataset.opening !== openingPhase)
      this.renderer.domElement.dataset.opening = openingPhase;
    this.landingRings.forEach((r) => (r.visible = false));
    const az = inspecting ? this.angle : this.angle * 0.3;
    const previewDistance = this.exploded ? 2.4 : 1.9;
    const base = inspecting
      ? this.cameraBase.set(
          Math.sin(az) * Math.cos(this.pitch) * previewDistance,
          0.25 + Math.sin(this.pitch) * previewDistance,
          Math.cos(az) * Math.cos(this.pitch) * previewDistance,
        )
      : this.cameraBase.set(Math.sin(az) * 12.5, 10.8, Math.cos(az) * 12.5);
    if (this.mode === "home") {
      base.set(9 + Math.sin(this.time * 0.07) * 1.5, 10, 12.5);
    }
    if (battle && !this.reduced) {
      const distance = Math.hypot(
        battle.tops[0].x - battle.tops[1].x,
        battle.tops[0].z - battle.tops[1].z,
      );
      base.multiplyScalar(0.91 + Math.min(distance, 7) * 0.018);
      if (battle.tops.some((t) => t.dashUntil > battle.time)) {
        base.y *= 0.87;
      }
      if (battle.result) {
        const f = Math.min(1, (this.time - this.finishTime) / 2);
        base.multiplyScalar(1 - f * 0.14);
        base.x += f * 1.8;
      }
    }
    const look = this.cameraTarget.set(0, inspecting ? 0.25 : 0, 0);
    if (battle && !this.closeUp)
      base.multiplyScalar(Math.max(1, 1.1 / this.camera.aspect));
    if (battle && this.closeUp) {
      const [a, b] = poses!,
        distance = Math.hypot(a.x - b.x, a.z - b.z);
      look.set((a.x + b.x) / 2, 0.2, (a.z + b.z) / 2);
      const range = closeUpRange(distance, this.camera, entry?.height ?? 0);
      base.set(
        look.x + Math.sin(az + 0.4) * range,
        3.4,
        look.z + Math.cos(az + 0.4) * range,
      );
    }
    if (entry) {
      look.y += entry.height * 0.25;
      base.y += entry.height * 0.18;
    }
    const cameraBlend = damping(dt, 8);
    this.camera.position.lerp(base, cameraBlend);
    this.cameraFocus.lerp(look, cameraBlend);
    this.camera.lookAt(this.cameraFocus);
    this.shakeAge += dt;
    const kick = impactShake(this.shakeAge, this.shake, this.reduced);
    this.camera.rotateY(kick.x);
    this.camera.rotateX(kick.y);
    this.models.forEach((g, i) => {
      const t = battle?.tops[i];
      if (t) {
        const pose = poses![i],
          lean = spinLean(pose.tilt, pose.rotation, i);
        const opening =
          openingSeconds === null
            ? null
            : entryPose(
                openingSeconds,
                (t.bey.spin === "L" ? -1 : 1) * t.rpm * 65,
                this.reduced,
              );
        const currentLean = (g.userData.lean ??= { x: 0, z: 0 });
        const leanBlend = damping(dt, 12);
        currentLean.x += (lean.x - currentLean.x) * leanBlend;
        currentLean.z += (lean.z - currentLean.z) * leanBlend;
        const ground = 0.035 + (pose.x * pose.x + pose.z * pose.z) * 0.024;
        g.position.set(pose.x, ground + (opening?.height ?? 0), pose.z);
        g.rotation.set(
          currentLean.x,
          0,
          currentLean.z + (opening?.height ?? 0) * 0.025 * (i ? -1 : 1),
        );
        g.rotateY(pose.rotation + (opening?.rotation ?? 0));
        if (opening && opening.pulse > 0) {
          const pulse = this.landingRings[i];
          pulse.visible = true;
          pulse.position.set(pose.x, ground + 0.01, pose.z);
          pulse.scale.setScalar(1 + (1 - opening.pulse) * 0.9);
          (pulse.material as THREE.MeshBasicMaterial).opacity =
            opening.pulse * 0.45;
        }
        if (battle!.result) {
          const elapsed = this.time - this.finishTime;
          const loser =
            battle!.result.winner === null || battle!.result.winner !== i;
          if (loser && battle!.result.finish === "burst")
            (g.userData.parts as THREE.Group[]).forEach((p, j) => {
              const linked = (g.userData.partLinks as number[])[j];
              p.position.set(
                Math.sin(linked * 2.1) * elapsed * 0.7,
                elapsed * (2 - linked) * 0.6,
                Math.cos(linked * 2.1) * elapsed * 0.7,
              );
              p.rotation.z = elapsed * linked;
            });
          else if (loser && battle!.result.finish === "spin")
            g.rotation.z = Math.min(Math.PI / 2, elapsed);
          else if (loser) {
            g.position.y += elapsed * 1.2;
            g.position.z += elapsed * 0.8;
            g.rotation.z = elapsed * 2;
          }
        }
        const path = this.trailPositions[i];
        if (dt > 0 && !opening)
          path.push(g.position.x, g.position.y + 0.22, g.position.z);
        if (path.length > 90) path.splice(0, 3);
        const line = this.trails[i];
        const positions = line.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        (positions.array as Float32Array).set(path);
        positions.needsUpdate = true;
        line.geometry.setDrawRange(0, path.length / 3);
        line.visible = !opening && t.rpm > 0.3;
        (line.material as THREE.LineBasicMaterial).opacity =
          t.dashUntil > battle!.time ? 0.95 : 0.28;
      } else {
        const a = this.time * (i ? -0.7 : 0.55) + i * Math.PI;
        const r = inspecting ? 0 : 2.3;
        g.position.set(
          Math.cos(a) * r,
          inspecting ? 0.04 : 0.2 + r * r * 0.024,
          Math.sin(a) * r,
        );
        g.rotation.y = inspecting
          ? 0
          : this.time * 16 * (i ? -1 : 1) + this.angle;
        g.rotation.z = 0;
        (g.userData.parts as THREE.Group[]).forEach((p, j) => {
          const linked = (g.userData.partLinks as number[])[j];
          p.position.set(
            0,
            inspecting && this.exploded ? [0.29, 0, -0.23][linked] : 0,
            0,
          );
          p.rotation.z = 0;
        });
      }
    });
    if (!battle) this.trails.forEach((l) => (l.visible = false));
    this.particles = this.particles.filter((p) => p.life > dt);
    const pos = this.particleGeometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute,
      col = this.particleGeometry.getAttribute(
        "color",
      ) as THREE.BufferAttribute;
    const streak = this.sparkStreaks.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life -= dt;
      if (!this.reduced) p.v.y -= dt * 8;
      p.p.addScaledVector(p.v, dt);
      pos.setXYZ(i, p.p.x, p.p.y, p.p.z);
      const fade = p.life / p.totalLife;
      col.setXYZ(i, p.color.r * fade, p.color.g * fade, p.color.b * fade);
      streak.setXYZ(i * 2, p.p.x, p.p.y, p.p.z);
      streak.setXYZ(i * 2 + 1, p.p.x - p.v.x * .045 * fade, p.p.y - p.v.y * .045 * fade, p.p.z - p.v.z * .045 * fade);
    }
    this.particleGeometry.setDrawRange(0, this.particles.length);
    pos.needsUpdate = true;
    col.needsUpdate = true;
    streak.needsUpdate = true;
    this.sparkStreaks.geometry.setDrawRange(0, this.reduced ? 0 : this.particles.length * 2);
    this.impactFlashes.forEach(flare => {
      flare.userData.life = Math.max(0, flare.userData.life - dt);
      const fade = flare.userData.life / (flare.userData.totalLife || 1);
      (flare.material as THREE.SpriteMaterial).opacity = this.reduced ? 0 : fade * .7;
      flare.scale.setScalar(flare.userData.size * (1 + (1 - fade) * .5) || 0);
    });
    this.eventFlash = Math.max(0, this.eventFlash - dt);
    this.renderer.render(this.scene, this.camera);
  }
}
