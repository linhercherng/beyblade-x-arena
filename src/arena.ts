import * as THREE from "three";
import { createStadium } from "./stadium.ts";
import{stadiumSurface,stadiumNormal}from"./stadium-surface.ts";
import{BowlContact}from"./bey-contact.ts";
import{beyEffects,effectMode,effectVertices,hitBey,type BeyEffects}from"./bey-effects.ts";
import { impactProfile, impactShake } from "./impact.ts";
import { dashVisual, hasRail } from "./dash.ts";
import { DashHitPlayback, hitZoomFactor } from "./dash-hit.ts";
import { exitPose, burstPose, finishPlayback, FINISH_COLORS } from "./finish.ts";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Bey } from "./catalog.ts";
import { BEYS,TYPE } from "./catalog.ts";
import { beyModel, modelSpec } from "./bey-model.ts";
import {
  interpolatePose,
  spinLean,
  entryPose,
  damping,
  type TopPose,
} from "./motion.ts";
import { type Battle, type BattleEvent } from "./physics.ts";

export function keepAboveFloor(group: THREE.Object3D, floor: number, bounds = new THREE.Box3()) {
  group.updateMatrixWorld(true);
  bounds.setFromObject(group, true);
  group.position.y += Math.max(0, floor - bounds.min.y);
}
export function settleOnBowl(group:THREE.Object3D,bounds=new THREE.Box3()){
  group.updateMatrixWorld(true);bounds.setFromObject(group,true);
  const r=Math.hypot(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x)),Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z)));
  group.position.y+=Math.max(0,stadiumSurface(r)+.012-bounds.min.y);
}
export function settleBurstParts(group: THREE.Group, bounds = new THREE.Box3(), lift = new THREE.Vector3(), inverse = new THREE.Quaternion()) {
  group.updateMatrixWorld(true);
  const parts = group.userData.parts as THREE.Group[], links = group.userData.partLinks as number[];
  inverse.copy(group.quaternion).invert();
  for (const link of new Set(links)) {
    bounds.makeEmpty();
    parts.forEach((part, i) => { if (links[i] === link) bounds.expandByObject(part, true); });
    const r2 = Math.max(bounds.min.x**2, bounds.max.x**2) + Math.max(bounds.min.z**2, bounds.max.z**2);
    const amount = Math.max(0, stadiumSurface(Math.sqrt(r2))+.012-bounds.min.y);
    lift.set(0, amount, 0).applyQuaternion(inverse);
    parts.forEach((part, i) => { if (links[i] === link) { part.position.add(lift); part.updateMatrixWorld(true); } });
  }
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
  totalLife: number;
  color: THREE.Color;
}
const RIBBON_POINT = [0,0,1,0,1,1], RIBBON_SIDE = [-1,1,-1,1,1,-1];
export function viewRange(radius: number, camera: THREE.PerspectiveCamera) {
  const halfFov=Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.min(1,camera.aspect));
  return radius/Math.sin(halfFov);
}
export function closeUpRange(
  distance: number,
  camera: THREE.PerspectiveCamera,
  openingHeight = 0,
) {
  const verticalHalfFov = THREE.MathUtils.degToRad(camera.fov / 2);
  return Math.max(
    3.7,
    viewRange(distance/2+.75,camera),
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
  needsRender=true;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
  cameraFocus = new THREE.Vector3();
  cameraBase = new THREE.Vector3();
  cameraTarget = new THREE.Vector3();
  landingRings: THREE.Mesh[] = [];
  private launchAt=-Infinity;
  stadium = createStadium();
  models: THREE.Group[] = [];
  host: HTMLElement | null = null;
  mode: "home" | "battle" | "inspect" = "home";
  observer: ResizeObserver;
  angle = 0;
  pitch = 0.54;
  exploded = false;
  closeUp = true;
  replayView:'auto'|'top'|'side'='auto';
  private cameraSnap=false;
  highlightShot: "approach" | "finish" | null = null;
  highlightImpact = new THREE.Vector3();
  highlightImpactActive = false;
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
  finishBounds = new THREE.Box3();
  finishLift = new THREE.Vector3();
  finishInverse = new THREE.Quaternion();
  floorNormal = new THREE.Vector3();
  floorUp = new THREE.Vector3(0,1,0);
  floorRotation = new THREE.Quaternion();
  ringRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);
  traitRings: THREE.Mesh[] = [];
  trails: THREE.Line[] = [];
  trailPositions: number[][] = [[], []];
  trailTimes: number[][] = [[], []];
  dashStates: ({at:number;x:number;z:number;grip:boolean}|null)[] = [null,null];
  dashRibbons: THREE.Mesh[] = [];
  hitPlayback = new DashHitPlayback();
  hitRing = ring(.45,.018,"#b8f6ff");
  get playbackScale() { return this.hitPlayback.sample(this.time,this.reduced).scale; }
  exitTrail = new THREE.Line(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(18 * 3), 3)),
    new THREE.LineBasicMaterial({ color: "#68dbff", transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
  );
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  time = 0;
  finishTime = 0;
  finishRate = 1;
  finishShock = 0;
  finishZoom = 0;
  finishCameraPosition = new THREE.Vector3();
  finishCameraFocus = new THREE.Vector3();
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
    this.renderer.domElement.addEventListener("webglcontextrestored",()=>{this.needsRender=true;});
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
    const hitMaterial=this.hitRing.material as THREE.MeshBasicMaterial;
    hitMaterial.transparent=true;hitMaterial.depthWrite=false;hitMaterial.toneMapped=false;
    this.hitRing.visible=false;this.hitRing.castShadow=this.hitRing.receiveShadow=false;
    this.scene.add(this.hitRing);
    this.exitTrail.visible = false;
    this.scene.add(this.exitTrail);
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
      const auraGeometry=new THREE.BufferGeometry();auraGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(72*18),3).setUsage(THREE.DynamicDrawUsage));
      const aura=new THREE.Mesh(auraGeometry,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));aura.userData.centers=new Float32Array(72*6);
      aura.frustumCulled=false;aura.visible=false;this.scene.add(aura);this.traitRings.push(aura);
      const ribbonGeometry=new THREE.BufferGeometry();
      ribbonGeometry.setAttribute("position",new THREE.BufferAttribute(new Float32Array(30*18),3).setUsage(THREE.DynamicDrawUsage));
      ribbonGeometry.setAttribute("color",new THREE.BufferAttribute(new Float32Array(30*24),4).setUsage(THREE.DynamicDrawUsage));
      ribbonGeometry.setDrawRange(0,0);
      const ribbon=new THREE.Mesh(ribbonGeometry,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
      ribbon.userData.tint=new THREE.Color(this.dashRibbons.length?"#ff743d":"#078bd6");ribbon.frustumCulled=false;ribbon.visible=false;
      this.scene.add(ribbon);this.dashRibbons.push(ribbon);
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
    this.needsRender=true;
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
  setReplayView(view:'auto'|'top'|'side'){this.replayView=view;this.cameraSnap=true;this.needsRender=true;}
  seekBattle(b:Battle){this.resetEffects();this.time=b.time;if(b.result){this.finish(b);this.time+=2;}this.cameraSnap=true;this.needsRender=true;}
  setBeys(beys: Bey[]) {
    this.replayView='auto';
    this.needsRender=true;
    this.highlightShot=null;
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
    this.models = beys.map((b,i) => {
      const texture = new THREE.TextureLoader().load(modelSpec(b).photo.src,()=>{this.needsRender=true;});
      const g = beyModel(b, texture);
        g.userData.spin=b.spin;
      g.userData.contact=new BowlContact(g);
      const fx=beyEffects(b),spec=modelSpec(b);g.userData.effects=fx;g.userData.effectHitAt=-Infinity;g.userData.effectHeight=spec.bitHeight+spec.ratchetHeight+spec.bladeThickness*.5;
      const color=(this.traitRings[i].material as THREE.MeshBasicMaterial).color.set(fx.color),hsl=color.getHSL({h:0,s:0,l:0});
      if(hsl.s<.3)color.set(TYPE[b.type].color);else color.setHSL(hsl.h,Math.max(.55,hsl.s),Math.max(.38,Math.min(.58,hsl.l)));
      (this.trails[i].material as THREE.LineBasicMaterial).color.copy((this.traitRings[i].material as THREE.LineBasicMaterial).color);
      (this.dashRibbons[i].userData.tint as THREE.Color).copy((this.traitRings[i].material as THREE.LineBasicMaterial).color);
      const parts = g.userData.parts as THREE.Group[], links = g.userData.partLinks as number[];
      g.userData.partFloors = [0, 1, 2].map(link => {
        const floors = parts.flatMap((part, i) => links[i] === link ? [new THREE.Box3().setFromObject(part).min.y] : []);
        return floors.length ? Math.min(...floors) : 0;
      });
      this.scene.add(g);
      return g;
    });
    this.resetEffects();
  }
  private placeFloorRing(ring:THREE.Object3D,x:number,z:number){
    stadiumNormal(x,z,this.floorNormal);
    ring.quaternion.setFromUnitVectors(this.floorUp,this.floorNormal).multiply(this.ringRotation);
    ring.position.set(x,stadiumSurface(Math.hypot(x,z))+.035,z);
  }
  launch(b:Battle){
    this.launchAt=this.time;this.needsRender=true;
    this.landingRings.forEach((ring,i)=>{const t=b.tops[i];this.placeFloorRing(ring,t.x,t.z);});
  }
  private resetEffects() {
    this.launchAt=-Infinity;
    this.highlightImpactActive=false;
    this.finishRate=1;this.finishShock=this.finishZoom=0;
    this.hitPlayback.reset();this.hitRing.visible=false;
    (this.hitRing.material as THREE.MeshBasicMaterial).color.set("#b8f6ff");
    this.models.forEach(g=>{g.userData.lean={x:0,z:0};g.userData.contact.reset();g.userData.effectHitAt=-Infinity;(g.userData.parts as THREE.Group[]).forEach(p=>{p.position.set(0,0,0);p.rotation.set(0,0,0);});});
    this.traitRings.forEach(r=>r.visible=false);
    this.trailPositions = [[], []];
    this.trailTimes = [[], []];
    this.dashStates = [null,null];
    this.dashRibbons.forEach(r=>r.visible=false);
    this.particles.length = 0;
    this.shake = 0;
    this.impactFlashes.forEach(f => { f.userData.life = 0; (f.material as THREE.SpriteMaterial).opacity = 0; });
    this.finished = null;
    this.exitTrail.visible = false;
  }
  private frameHighlight(b:Battle) {
    this.draw(0,b);
    this.camera.position.copy(this.cameraBase);this.cameraFocus.copy(this.cameraTarget);
    this.fitHighlight(b,b.tops);
    this.camera.lookAt(this.cameraFocus);
  }
  private fitHighlight(b:Battle,poses:readonly TopPose[]) {
    if(!this.highlightShot)return;
    const focus=this.cameraFocus;
    let radius=0;
    poses.forEach((p,i)=>{
      const margin=b.result?.finish==="burst"?1.62:.8;
      const ground=stadiumSurface(Math.hypot(p.x,p.z))+.065;
      const flight=b.result?.winner!==null&&b.result?.winner!==i&&["over","extreme"].includes(b.result?.finish??"")
        ?exitPose(b.result!.finish as "over"|"extreme",finishPlayback(this.time-this.finishTime,this.finishRate),{x:p.x,y:ground,z:p.z}):{x:p.x,y:ground,z:p.z};
      radius=Math.max(radius,Math.hypot(flight.x-focus.x,flight.y+.35-focus.y,flight.z-focus.z)+margin);
      const state=this.dashStates[i];
      if(!b.result&&state?.grip&&dashVisual(this.time-state.at).latch>0)
        radius=Math.max(radius,Math.hypot(state.x-focus.x,.75-focus.y,state.z-focus.z)+.8);
    });
    if(!this.closeUp)radius=Math.max(radius,6.5+focus.length());
    const distance=this.camera.position.distanceTo(focus),required=viewRange(radius,this.camera);
    if(distance<required)this.camera.position.sub(focus).multiplyScalar(required/Math.max(.001,distance)).add(focus);
  }
  trackHighlight(hold:"impact"|"finish"|null,impact:BattleEvent|null) {
    this.highlightImpactActive=hold==="impact"&&!!impact;
    if(impact)this.highlightImpact.set(impact.x,stadiumSurface(Math.hypot(impact.x,impact.z))+.48,impact.z);
  }
  beginHighlight(b:Battle) {
    this.resetEffects();this.highlightShot="approach";this.frameHighlight(b);
  }
  showHighlightFinish(b:Battle) {
    this.highlightShot="finish";this.finish(b);this.finishRate=1;this.frameHighlight(b);
  }
  endHighlight() {this.highlightShot=null;this.resetEffects();}
  soundPan(x:number,z:number) {
    this.camera.updateMatrixWorld();
    const basis=this.camera.matrixWorld.elements;
    return THREE.MathUtils.clamp(((x-this.cameraFocus.x)*basis[0]+(z-this.cameraFocus.z)*basis[2])/3,-.8,.8);
  }
  event(e: BattleEvent, battle?: Battle): boolean {
    const dashHit=battle ? this.hitPlayback.trigger(e,battle,this.time) : false;
    if (e.type === "hit") {
      this.models.forEach(g=>g.userData.effectHitAt=this.time);
      const lead=battle?beyEffects(hitBey(battle)):null;
      const colors=this.models.map(g=>(g.userData.effects as BeyEffects).color);
      const profile = impactProfile(dashHit ? Math.max(10,e.strength*1.35) : e.strength);
      if(dashHit) {
        profile.shake*=1.5;
        this.dashStates.forEach(s=>{if(s)s.grip=false;});
        this.hitRing.position.set(e.x,stadiumSurface(Math.hypot(e.x,e.z))+.09,e.z);
      }
      if (!this.reduced && profile.shake > this.shake * Math.exp(-this.shakeAge * 20)) {
        this.shake = profile.shake;
        this.shakeAge = 0;
      }
      const height = this.impactHeight+stadiumSurface(Math.hypot(e.x,e.z))+.03;
      if (!this.reduced && profile.tier > 0) {
        const flare = this.impactFlashes.find(f => f.userData.life <= 0)
          ?? this.impactFlashes.reduce((a, b) => a.userData.life < b.userData.life ? a : b);
        flare.position.set(e.x, height, e.z);
        (flare.material as THREE.SpriteMaterial).color.set(lead?.color??(dashHit?"#d7faff":"#ffb044")).lerp(new THREE.Color("#ffffff"),.4);
        flare.userData.life = flare.userData.totalLife = .065 + profile.tier * .025;
        flare.userData.size = .3 + profile.gain * .55;
      }
      const count = Math.min(360 - this.particles.length, this.reduced ? 8 : innerWidth < 700 ? 24 : 48, profile.sparks);
      for (let i = 0; i < count; i++) {
        const a = i * 2.39996 + e.time;
        const life = this.reduced ? .08 : .12 + profile.tier * .055 + (i % 4) * .025;
        const speed = this.reduced ? 0 : (.7 + profile.gain) * (1 + (i % 4) * .65)*(lead?.type==="attack"?1.12:1);
        this.particles.push({
          p: new THREE.Vector3(e.x, height, e.z),
          v: new THREE.Vector3(
            Math.cos(a) * speed,
            this.reduced ? 0 : (lead?.type==="defense"?.3:.7) + (i % 5) * .35,
            Math.sin(a) * speed,
          ),
          life, totalLife: life,
          color: new THREE.Color(battle?(i%3?colors[i%2]:"#fff5d2"):dashHit ? i%3 ? "#8eefff" : "#ffffff" : i % 3 ? "#ffbd60" : "#fff5d2"),
        });
      }
    }
    if (e.type === "dash" && (e.player===0||e.player===1)) {
      const old=this.dashStates[e.player];
      if(old&&this.time-old.at<.12)return false;
      const r=Math.max(.01,Math.hypot(e.x,e.z)),nx=e.x/r,nz=e.z/r;
      const grip=hasRail(e.x,e.z);
      // shortcut: 貼軌位置依現有齒軌與模型外緣近似，盤體尺寸改動時需同步校準。
      this.dashStates[e.player]={at:this.time,x:nx*4,z:nz*4,grip};
      this.trailPositions[e.player]=[];this.trailTimes[e.player]=[];
      if(!grip)return false;
      const x=nx*4.13,z=nz*4.13;
      if(!this.reduced) {
        const flare=this.impactFlashes.find(f=>f.userData.life<=0)??this.impactFlashes[0];
        (flare.material as THREE.SpriteMaterial).color.set("#8eefff");
        flare.position.set(x,.51,z);flare.userData.life=flare.userData.totalLife=.10;flare.userData.size=.65;
      }
      const count=Math.min(360-this.particles.length,this.reduced?4:innerWidth<700?12:24);
      for(let i=0;i<count;i++){
        const tangent=((i%7)-3)*.8,life=this.reduced?.08:.15+(i%4)*.025;
        this.particles.push({p:new THREE.Vector3(x,.51,z),v:this.reduced?new THREE.Vector3():new THREE.Vector3(-nx*(1+i%3)-nz*tangent,.8+(i%4)*.45,-nz*(1+i%3)+nx*tangent),life,totalLife:life,color:new THREE.Color(i%3?"#8eefff":"#fff6d9")});
      }
    }
    return dashHit;
  }
  finish(b: Battle) {
    if (!b.result) return 1;
    const chained=this.hitPlayback.handoff(b,this.time,this.reduced),hit=this.hitPlayback.sample(this.time,this.reduced);
    this.finishRate=chained?Math.max(.35,Math.min(.6,hit.scale)):1;
    this.finishShock=chained?hit.shock:0;this.finishZoom=chained?hit.zoom:0;
    this.finishCameraPosition.copy(this.camera.position);this.finishCameraFocus.copy(this.cameraFocus);
    this.hitPlayback.reset();this.hitRing.visible=false;
    this.finished = b;
    this.dashStates=[null,null];this.dashRibbons.forEach(r=>r.visible=false);
    this.finishTime = this.time;
    const result = b.result, kind = result.winner === null ? "draw" : result.finish;
    if(chained) {
      this.particles.forEach((p,i)=>p.color.set(i%3?FINISH_COLORS[kind]:"#fff7da"));
      this.impactFlashes.forEach(f=>(f.material as THREE.SpriteMaterial).color.set(FINISH_COLORS[kind]));
      (this.hitRing.material as THREE.MeshBasicMaterial).color.set(FINISH_COLORS[kind]);
    }
    this.exitTrail.visible = false;
    const losers = result.winner === null ? [0, 1] : [1 - result.winner];
    for (const index of losers) {
      const top = b.tops[index], start = this.particles.length;
      if(!chained)this.event({type: "hit", x: top.x, z: top.z, strength: kind === "draw" ? 1 : kind === "burst" || kind === "extreme" ? 14 : 4, player:index, time:b.time});
      for (let i = start; i < this.particles.length; i++) this.particles[i].color.set(i % 3 ? FINISH_COLORS[kind] : "#fff7da");
      if ((result.finish === "over" || result.finish === "extreme") && result.winner !== null) {
        const positions = this.exitTrail.geometry.getAttribute("position") as THREE.BufferAttribute;
        const origin = {x:top.x, y:stadiumSurface(Math.hypot(top.x,top.z))+.065, z:top.z};
        for (let i=0; i<18; i++) {
          const pose = exitPose(result.finish, i/17*(result.finish === "over" ? .95 : .55), origin);
          positions.setXYZ(i, pose.x, pose.y+.16, pose.z);
        }
        positions.needsUpdate = true;
        this.exitTrail.geometry.computeBoundingSphere();
        this.exitTrail.geometry.setDrawRange(0,0);
        (this.exitTrail.material as THREE.LineBasicMaterial).color.set(FINISH_COLORS[kind]);
        this.exitTrail.visible = !this.reduced;
      }
    }
    return this.finishRate;
  }
  draw(
    dt: number,
    battle: Battle | null = null,
    previous: readonly TopPose[] = [],
    alpha = 1,
    openingSeconds: number | null = null,
    cameraDt = dt,
  ) {
    this.time += dt;
    const finishAge=Math.max(0,this.time-this.finishTime),finishElapsed=finishPlayback(finishAge,this.finishRate);
    const hit=this.hitPlayback.sample(this.time,this.reduced);
    const shock=battle?.result?this.finishShock*(1-THREE.MathUtils.smoothstep(finishAge,0,.18)):hit.shock;
    this.hitRing.visible=!!battle&&shock>0;
    this.hitRing.scale.setScalar(1+(1-shock)*3.8);
    (this.hitRing.material as THREE.MeshBasicMaterial).opacity=shock*.65;
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
    const launchAge=this.time-this.launchAt,launchPulse=!this.reduced&&battle&&!entry?Math.max(0,1-launchAge/.55):0;
    const launchPhase=launchPulse>0?'burst':'none';if(this.renderer.domElement.dataset.launch!==launchPhase)this.renderer.domElement.dataset.launch=launchPhase;
    this.landingRings.forEach(r=>{r.visible=launchPulse>0;if(launchPulse>0){r.scale.setScalar(1+(1-launchPulse)*3);(r.material as THREE.MeshBasicMaterial).opacity=launchPulse*.7;}});
    const az = inspecting ? this.angle : this.angle * 0.3+(this.highlightShot==="approach"?.75:this.highlightShot==="finish"?-.45:0);
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

    }
    const look = this.cameraTarget.set(0, inspecting ? 0.25 : 0, 0);
    const exitFinish = !!battle?.result && ["over", "extreme"].includes(battle.result.finish);
    if (battle && (!this.closeUp || exitFinish))
      base.multiplyScalar(Math.max(1, 1.1 / this.camera.aspect));
    // 接盤最外緣連同傾斜模型需要6.5的取景半徑。
    if(exitFinish)base.multiplyScalar(Math.max(1,viewRange(6.5,this.camera)/base.length()));
    if (battle && this.closeUp && !exitFinish) {
      const [a, b] = poses!,
        distance = Math.hypot(a.x - b.x, a.z - b.z);
      look.set((a.x + b.x) / 2, 0.2, (a.z + b.z) / 2);
      const spread=battle.result?.finish==="burst" ? 1-Math.pow(1-Math.min(1,finishElapsed/1.25),3) : 0;
      const range = closeUpRange(distance+spread*1.64, this.camera, entry?.height ?? 0);
      base.set(
        look.x + Math.sin(az + 0.4) * range,
        3.4,
        look.z + Math.cos(az + 0.4) * range,
      );
      const zoom=battle.result?this.finishZoom*(1-THREE.MathUtils.smoothstep(finishAge,0,.3)):hit.zoom;
      if(zoom>0) {
        const factor=hitZoomFactor(base.distanceTo(look),range*1.03,zoom);
        base.sub(look).multiplyScalar(factor).add(look);
      }
    }
    if (entry) {
      look.y += entry.height * 0.25;
      base.y += entry.height * 0.18;
    }
    if(this.highlightShot&&battle){
      const oldX=look.x,oldY=look.y,oldZ=look.z;
      let trackingRange:number|null=null;
      if(this.highlightShot==="approach"){
        look.x+=THREE.MathUtils.clamp((battle.tops[0].vx+battle.tops[1].vx)*.025,-.25,.25);
        look.z+=THREE.MathUtils.clamp((battle.tops[0].vz+battle.tops[1].vz)*.025,-.25,.25);
        if(this.highlightImpactActive)look.lerp(this.highlightImpact,.6);
      } else if(battle.result?.winner!==null&&battle.result){
        const loser=1-battle.result.winner,p=poses![loser],winner=poses![battle.result.winner],ground=stadiumSurface(Math.hypot(p.x,p.z))+.065;
        const flight=exitFinish?exitPose(battle.result.finish as "over"|"extreme",finishElapsed,{x:p.x,y:ground,z:p.z}):{x:p.x,y:ground,z:p.z};
        look.set((winner.x+flight.x*2)/3,flight.y*.35+.2,(winner.z+flight.z*2)/3);
        if(exitFinish&&this.closeUp)trackingRange=closeUpRange(Math.hypot(winner.x-flight.x,winner.z-flight.z)+.6,this.camera);
      }
      base.x+=look.x-oldX;base.y+=look.y-oldY;base.z+=look.z-oldZ;
      if(trackingRange!==null)base.set(look.x+Math.sin(az+.4)*trackingRange,look.y+Math.max(3.2,trackingRange*.45),look.z+Math.cos(az+.4)*trackingRange);
    }
    if(battle&&this.replayView==='top'){look.set(0,.2,0);base.set(.001,viewRange(6.5,this.camera),.001);}
    else if(battle&&this.replayView==='side'){const radius=base.distanceTo(look);base.set(look.x+Math.sin(az+.4)*radius,2,look.z+Math.cos(az+.4)*radius);}
    const snapCamera=this.cameraSnap,cameraBlend = snapCamera?1:damping(cameraDt, this.highlightShot?12:8);
    this.cameraSnap=false;
    if(!snapCamera&&battle?.result && this.finishRate<1 && finishAge<.36) {
      const blend=THREE.MathUtils.smoothstep(finishAge,0,.36);
      this.camera.position.lerpVectors(this.finishCameraPosition,base,blend);
      this.cameraFocus.lerpVectors(this.finishCameraFocus,look,blend);
    } else {
      this.camera.position.lerp(base, cameraBlend);
      this.cameraFocus.lerp(look, cameraBlend);
    }
    if(battle&&cameraDt>0)this.fitHighlight(battle,poses!);
    this.camera.lookAt(this.cameraFocus);
    this.shakeAge += dt;
    const kick = impactShake(this.shakeAge, this.shake, this.reduced);
    this.camera.rotateY(kick.x);
    this.camera.rotateX(kick.y);
    this.models.forEach((g, i) => {
      const t = battle?.tops[i];
      this.traitRings[i].visible=false;
      if (t) {
        const pose = poses![i], rotation=-pose.rotation, spin=t.bey.spin==="L"?1:-1,
          lean = spinLean(pose.tilt, pose.rotation, i);
        if(pose.axisX!==undefined){lean.x+=(pose.axisZ??0)*.65;lean.z-=pose.axisX*.65;}
        const state=this.dashStates[i],dash=dashVisual(state?this.time-state.at:Infinity,this.reduced);
        const latch=state?.grip?dash.latch:0;
        const speed=Math.max(.01,Math.hypot(t.vx,t.vz));
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
        const contact=g.userData.contact as BowlContact;
        const grip=state?.grip?{x:state.x,z:state.z,weight:latch}:undefined;
        // Three.js 正 Y 角從上方看為逆時針，顯示角與物理圈數反號。
        contact.place(pose.x,pose.z,currentLean.x+t.vz/speed*dash.lean,
          currentLean.z-t.vx/speed*dash.lean+(opening?.height??0)*.025*(i?-1:1),
          rotation-(opening?.rotation??0),dt,grip);
        if(grip&&state){state.x=grip.x;state.z=grip.z;}
        const ground=g.position.y;g.position.y+=opening?.height??0;
        if (opening && opening.pulse > 0) {
          const pulse = this.landingRings[i];
          pulse.visible = true;
          this.placeFloorRing(pulse,contact.contact.x,contact.contact.z);
          pulse.scale.setScalar(1 + (1 - opening.pulse) * 0.9);
          (pulse.material as THREE.MeshBasicMaterial).opacity =
            opening.pulse * 0.45;
        }
        if (battle!.result) {
          const result = battle!.result, elapsed = finishElapsed;
          const loser = result.winner === null || result.winner !== i;
          if (loser && result.finish === "burst") {
            const upright = this.reduced ? 0 : 1-Math.min(1,elapsed/1.25);
            g.rotation.set(currentLean.x*upright,0,currentLean.z*upright);
            g.rotateY(rotation);
            (g.userData.parts as THREE.Group[]).forEach((part, j) => {
              const link = (g.userData.partLinks as number[])[j];
              const offset = burstPose(elapsed, link, g.userData.partFloors[link], this.reduced);
              const ax = offset.x*Math.cos(rotation)+offset.z*Math.sin(rotation);
              const az = offset.z*Math.cos(rotation)-offset.x*Math.sin(rotation);
              const travel = this.reduced ? 1 : 1-Math.pow(1-Math.min(1,elapsed/1.25),3);
              const surface = stadiumSurface(Math.hypot(pose.x+ax,pose.z+az));
              const slope = (surface-ground)*travel;
              part.position.set(offset.x, offset.y+slope, offset.z);
              part.rotation.set(0, this.reduced ? 0 : spin*Math.min(elapsed,1.25)*(link+1)*3, offset.tilt);
            });
            settleBurstParts(g, this.finishBounds, this.finishLift, this.finishInverse);
          } else if (loser && result.finish === "spin") {
            this.floorRotation.setFromAxisAngle(this.floorUp.set(0,0,1),Math.PI/2*Math.min(1,this.reduced?1:elapsed/1.1));
            g.quaternion.premultiply(this.floorRotation);this.floorUp.set(0,1,0);
            settleOnBowl(g,this.finishBounds);
          } else if (loser) {
            const flight = exitPose(result.finish as "over" | "extreme", elapsed, {x:pose.x,y:ground,z:pose.z}, this.reduced);
            g.position.set(flight.x, flight.y, flight.z);
            g.rotation.z = flight.tilt;
            g.rotateY(this.reduced ? 0 : spin*Math.min(elapsed,.95)*13);
            keepAboveFloor(g, .105, this.finishBounds);
          } else if (!this.reduced) {
            g.rotateY(spin*20*(1-Math.exp(-elapsed*1.4))/1.4);
          }
          if (result.winner !== null) {
            const pulse = this.landingRings[i], mat = pulse.material as THREE.MeshBasicMaterial;
            pulse.visible = true;
            mat.color.set(loser ? FINISH_COLORS[result.finish] : i ? "#ff9a71" : "#b6f55b");
            mat.opacity = loser ? Math.max(0,.55-elapsed*.3) : .5;
            if(loser&&["over","extreme"].includes(result.finish)){pulse.position.set(g.position.x,.115,g.position.z);pulse.quaternion.copy(this.ringRotation);}
            else this.placeFloorRing(pulse,g.position.x,g.position.z);
            pulse.scale.setScalar(loser ? 1+Math.min(1,elapsed)*1.2 : 1.18);
          }
        }
        const fx=g.userData.effects as BeyEffects,aura=this.traitRings[i],hit=Math.max(0,1-(this.time-g.userData.effectHitAt)/.42),style=effectMode(fx,speed,Math.max(pose.tilt,Math.hypot(pose.axisX??0,pose.axisZ??0)));
        aura.userData.mode=style;
        aura.visible=!this.reduced&&!opening&&!battle!.result&&pose.rpm>.08;
        if(aura.visible){
          const positions=aura.geometry.getAttribute('position') as THREE.BufferAttribute;
          const centers=aura.userData.centers as Float32Array;effectVertices(fx,style,this.time,hit,centers);
          const width=.006+hit*.012+dash.intensity*.008;
          for(let segment=0;segment<72;segment++)for(let v=0;v<6;v++){
            const end=RIBBON_POINT[v],side=RIBBON_SIDE[v],at=segment*6+end*3,x=centers[at],z=centers[at+2],r=Math.max(.01,Math.hypot(x,z));
            positions.setXYZ(segment*6+v,x+x/r*width*side,centers[at+1],z+z/r*width*side);
          }
          aura.geometry.setDrawRange(0,72*6);positions.needsUpdate=true;
          aura.position.copy(g.position);aura.quaternion.copy(g.quaternion);aura.translateY(g.userData.effectHeight);
          (aura.material as THREE.MeshBasicMaterial).opacity=Math.min(.82,(style==='attack'?.08+speed*.035:style==='stamina'?.08+pose.rpm*.18:.035)+hit*.7+dash.intensity*.22);
        }
        const path = this.trailPositions[i];
        const times=this.trailTimes[i];
        if (dt > 0 && !opening && !battle!.result && (this.time-(times.at(-1)??-Infinity)>=1/90)) {
          path.push(g.position.x, g.position.y + 0.22, g.position.z);
          times.push(this.time);
        }
        while(path.length>90 || (times.length>1&&this.time-times[0]>fx.trail)) {path.splice(0,3);times.shift();}
        const line = this.trails[i];
        const positions = line.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        (positions.array as Float32Array).set(path);
        positions.needsUpdate = true;
        line.geometry.setDrawRange(0, path.length / 3);
        line.visible = !this.reduced && !opening && !battle!.result && t.rpm > 0.3;
        (line.material as THREE.LineBasicMaterial).opacity =
          t.dashUntil > battle!.time ? 0.95 : 0.28;
        const ribbon=this.dashRibbons[i],rp=ribbon.geometry.getAttribute("position") as THREE.BufferAttribute,rc=ribbon.geometry.getAttribute("color") as THREE.BufferAttribute,tint=ribbon.userData.tint as THREE.Color;
        ribbon.visible=!opening&&!battle!.result&&dash.intensity>.01&&path.length>=6;
        let vertex=0;
        if(ribbon.visible)for(let segment=0;segment<path.length/3-1;segment++){
          const dx=path[(segment+1)*3]-path[segment*3],dz=path[(segment+1)*3+2]-path[segment*3+2],len=Math.max(.001,Math.hypot(dx,dz));
          for(let v=0;v<6;v++){
            const point=segment+RIBBON_POINT[v],sign=RIBBON_SIDE[v],fade=(point/(path.length/3-1))**2;
            const width=(.012+fade*(fx.rubber?.19:.14)*fx.grip)*dash.intensity;
            rp.setXYZ(vertex,path[point*3]-dz/len*width*sign,path[point*3+1],path[point*3+2]+dx/len*width*sign);
            rc.setXYZW(vertex,tint.r,tint.g,tint.b,fade*dash.intensity);vertex++;
          }
        }
        ribbon.geometry.setDrawRange(0,vertex);rp.needsUpdate=rc.needsUpdate=true;
      } else {
        const a = this.time * (i ? -0.7 : 0.55) + i * Math.PI;
        const r = inspecting ? 0 : 2.3;
        g.position.set(
          Math.cos(a) * r,
          inspecting ? 0.04 : stadiumSurface(r)+.23,
          Math.sin(a) * r,
        );
        g.rotation.y = inspecting
          ? 0
          : this.time * 16 * (g.userData.spin==="L"?1:-1) + this.angle;
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
    if (!battle) {this.trails.forEach((l) => (l.visible = false));this.dashRibbons.forEach(r=>r.visible=false);}
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
    if (battle?.result) {
      const age = finishElapsed;
      this.exitTrail.geometry.setDrawRange(0,Math.min(18,1+Math.floor(age/(battle.result.finish==="over"?.95:.55)*17)));
      this.exitTrail.visible = !this.reduced && ["over", "extreme"].includes(battle.result.finish) && age<1.2 && battle.result.winner!==null;
      (this.exitTrail.material as THREE.LineBasicMaterial).opacity = .7*Math.max(0,1-age/1.2);
    }
    this.eventFlash = Math.max(0, this.eventFlash - dt);
    this.renderer.render(this.scene, this.camera);
    this.needsRender=false;
  }
}
