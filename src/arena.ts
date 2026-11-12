import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Bey } from "./catalog.ts";
import { BEYS } from "./catalog.ts";
import { beyModel, modelSpec } from "./bey-model.ts";
import { type Battle, type BattleEvent, RADIUS } from "./physics.ts";

function metal(color: THREE.ColorRepresentation, roughness = 0.28) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.78, roughness });
}
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
  color: THREE.Color;
}
export function closeUpRange(
  distance: number,
  camera: THREE.PerspectiveCamera,
) {
  const halfFov = Math.atan(
    Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
      Math.min(1, camera.aspect),
  );
  return Math.max(3.7, (distance / 2 + 0.75) / Math.sin(halfFov));
}
export class Arena {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
  stadium = new THREE.Group();
  models: THREE.Group[] = [];
  host: HTMLElement | null = null;
  mode: "home" | "battle" | "inspect" = "home";
  observer: ResizeObserver;
  angle = 0;
  pitch = 0.54;
  exploded = false;
  closeUp = false;
  dragging = false;
  lastX = 0;
  lastY = 0;
  shake = 0;
  eventFlash = 0;
  particles: Particle[] = [];
  particleGeometry = new THREE.BufferGeometry();
  particlePoints: THREE.Points;
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
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, innerWidth < 700 ? 1.35 : 1.75),
    );
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.45;
    const room = new RoomEnvironment(),
      pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(room, 0.06).texture;
    room.dispose();
    pmrem.dispose();
    this.renderer.shadowMap.enabled = innerWidth > 700;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "原創立體陀螺競技場，可拖曳旋轉視角",
    );
    this.renderer.domElement.setAttribute("role", "img");
    this.scene.add(new THREE.HemisphereLight("#dcecff", "#1a2636", 3));
    const key = new THREE.DirectionalLight("#d8f3ff", 4);
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
    this.makeStadium();
    this.scene.add(this.stadium);
    this.beam.visible = false;
    this.scene.add(this.beam);
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
    this.particlePoints = new THREE.Points(
      this.particleGeometry,
      new THREE.PointsMaterial({
        size: 0.075,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.scene.add(this.particlePoints);
    for (const c of ["#8bdfff", "#ff926b"]) {
      const line = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({
          color: c,
          transparent: true,
          opacity: 0.6,
          blending: THREE.AdditiveBlending,
        }),
      );
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
  makeStadium() {
    const floor = mesh(
      new THREE.CylinderGeometry(5.5, 5.7, 0.32, 12),
      metal("#111c29"),
      0,
      -0.6,
    );
    this.stadium.add(floor);
    const bevel = mesh(
      new THREE.CylinderGeometry(5.25, 5.5, 0.13, 12),
      metal("#283443"),
      0,
      -0.37,
    );
    this.stadium.add(bevel);
    const points = [];
    for (let i = 0; i <= 40; i++) {
      const r = (i / 40) * RADIUS;
      points.push(new THREE.Vector2(r, r * r * 0.024 - 0.03));
    }
    const bowl = mesh(
      new THREE.LatheGeometry(points, 96),
      new THREE.MeshPhysicalMaterial({
        color: "#647c8e",
        metalness: 0.38,
        roughness: 0.27,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
      }),
    );
    bowl.receiveShadow = true;
    this.stadium.add(bowl);
    const lower = mesh(
      new THREE.CylinderGeometry(4.18, 4.18, 0.04, 96),
      metal("#172838", 0.65),
      0,
      -0.08,
    );
    this.stadium.add(lower);
    for (const r of [1.3, 2.5, 3.5, 4.25]) {
      const o = ring(r, 0.012, r === 4.25 ? "#caff53" : "#425a6b");
      o.position.y = r * r * 0.024;
      this.stadium.add(o);
    }
    for (let i = 0; i < 100; i++) {
      const a = (i / 100) * Math.PI * 2;
      const rail = mesh(
        new THREE.BoxGeometry(0.035, 0.09, 0.14),
        metal(i % 5 === 0 ? "#dcff6c" : "#65873c"),
        Math.cos(a) * 4.17,
        0.48,
        Math.sin(a) * 4.17,
      );
      rail.rotation.y = -a;
      this.stadium.add(rail);
    }
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      if (Math.abs(Math.sin(a)) < 0.15 || Math.abs(a - Math.PI / 2) < 0.2)
        continue;
      const wall = mesh(
        new THREE.BoxGeometry(0.7, 0.38, 0.13),
        metal("#405366"),
        Math.cos(a) * 4.45,
        0.52,
        Math.sin(a) * 4.45,
      );
      wall.rotation.y = -a + Math.PI / 2;
      this.stadium.add(wall);
    }
    for (const [x, z, extreme] of [
      [-4.8, 0, false],
      [4.8, 0, false],
      [0, 4.85, true],
    ] as const) {
      const pocket = mesh(
        new THREE.BoxGeometry(extreme ? 1.6 : 1.25, 0.12, extreme ? 1.4 : 1.2),
        metal("#652c32"),
        x,
        0.12,
        z,
      );
      this.stadium.add(pocket);
      const marker = mesh(
        new THREE.BoxGeometry(extreme ? 1.5 : 0.1, 0.045, extreme ? 0.1 : 1.2),
        new THREE.MeshBasicMaterial({ color: extreme ? "#ff654d" : "#fba76a" }),
        x,
        0.2,
        z,
      );
      this.stadium.add(marker);
    }
    for (const sign of [-1, 1]) {
      const cross = mesh(
        new THREE.BoxGeometry(0.08, 0.018, 0.9),
        metal("#8caaac"),
        0,
        0.015,
        0,
      );
      cross.rotation.y = sign * 0.7;
      this.stadium.add(cross);
    }
  }
  attach(host: HTMLElement, mode: "home" | "battle" | "inspect" = "home") {
    if (this.host) this.observer.unobserve(this.host);
    this.host = host;
    if (this.mode !== mode) {
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
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
  setBeys(beys: Bey[]) {
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
    this.finished = null;
    this.beam.visible = false;
  }
  event(e: BattleEvent) {
    if (e.type === "hit" || e.type === "finish") {
      this.shake = this.reduced ? 0 : Math.min(0.16, e.strength * 0.008);
      const count = Math.min(
        innerWidth < 700 ? 24 : 60,
        Math.ceil(e.strength * 6),
      );
      for (let i = 0; i < count; i++) {
        const a = i * 2.39996;
        this.particles.push({
          p: new THREE.Vector3(e.x, 0.5, e.z),
          v: new THREE.Vector3(
            Math.cos(a) * (1 + (i % 4)),
            1.3 + (i % 5) * 0.5,
            Math.sin(a) * (1 + (i % 4)),
          ),
          life: 0.4 + (i % 4) * 0.12,
          color: new THREE.Color(i % 3 ? "#ffcb7c" : "#edffb2"),
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
  draw(dt: number, battle: Battle | null = null) {
    this.time += dt;
    const inspecting = this.mode === "inspect";
    const az = inspecting ? this.angle : this.angle * 0.3;
    const previewDistance = this.exploded ? 2.4 : 1.9;
    const base = inspecting
      ? new THREE.Vector3(
          Math.sin(az) * Math.cos(this.pitch) * previewDistance,
          0.25 + Math.sin(this.pitch) * previewDistance,
          Math.cos(az) * Math.cos(this.pitch) * previewDistance,
        )
      : new THREE.Vector3(Math.sin(az) * 12.5, 10.8, Math.cos(az) * 12.5);
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
    const look = new THREE.Vector3(0, inspecting ? 0.25 : 0, 0);
    if (battle && this.closeUp) {
      const [a, b] = battle.tops,
        distance = Math.hypot(a.x - b.x, a.z - b.z);
      look.set((a.x + b.x) / 2, 0.2, (a.z + b.z) / 2);
      const range = closeUpRange(distance, this.camera);
      base.set(
        look.x + Math.sin(az + 0.4) * range,
        3.4,
        look.z + Math.cos(az + 0.4) * range,
      );
    }
    this.camera.position.lerp(base, 0.07);
    this.camera.position.x += Math.sin(this.time * 130) * this.shake;
    this.camera.position.z += Math.cos(this.time * 103) * this.shake;
    this.shake *= 0.86;
    this.camera.lookAt(look);
    this.models.forEach((g, i) => {
      const t = battle?.tops[i];
      if (t) {
        g.position.set(t.x, 0.035 + (t.x * t.x + t.z * t.z) * 0.024, t.z);
        g.rotation.y = t.rotation;
        g.rotation.x = Math.sin(this.time * 22) * t.tilt * 0.3;
        g.rotation.z = Math.cos(this.time * 19) * t.tilt * 0.3;
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
        path.push(t.x, g.position.y + 0.22, t.z);
        if (path.length > 90) path.splice(0, 3);
        const line = this.trails[i];
        line.geometry.dispose();
        line.geometry = new THREE.BufferGeometry();
        line.geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(path, 3),
        );
        line.visible = t.rpm > 0.3;
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
    this.particles = this.particles.filter((p) => p.life > 0).slice(-360);
    const pos = this.particleGeometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute,
      col = this.particleGeometry.getAttribute(
        "color",
      ) as THREE.BufferAttribute;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life -= dt;
      p.v.y -= dt * 6;
      p.p.addScaledVector(p.v, dt);
      pos.setXYZ(i, p.p.x, p.p.y, p.p.z);
      col.setXYZ(i, p.color.r * p.life, p.color.g * p.life, p.color.b * p.life);
    }
    this.particleGeometry.setDrawRange(0, this.particles.length);
    pos.needsUpdate = true;
    col.needsUpdate = true;
    this.eventFlash = Math.max(0, this.eventFlash - dt);
    this.renderer.render(this.scene, this.camera);
  }
}
