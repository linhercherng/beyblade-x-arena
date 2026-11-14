import * as THREE from "three";

// Rendering only. These photo approximations must never become combat-profile inputs.
interface VisualDimensions {
  bladeBase: number;
  bladeThickness: number;
  bitHeight: number;
  ratchetHeight: number;
  tipHeight: number;
}

function material(color: string, transparent = false, metal = false) {
  return new THREE.MeshStandardMaterial({ color, transparent,
    opacity: transparent ? .7 : 1, depthWrite: !transparent,
    metalness: metal ? .88 : .04, roughness: metal ? .27 : .35 });
}

function mesh(geometry: THREE.BufferGeometry, surface: THREE.Material, name: string) {
  const result = new THREE.Mesh(geometry, surface);
  result.name = name;
  result.castShadow = result.receiveShadow = true;
  result.userData.geometryApproximate = true;
  return result;
}

function lathe(points: number[][]) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), 48);
}

function replaceContact(bit: THREE.Group, points: number[][]) {
  const contact = bit.getObjectByName("bit-contact") as THREE.Mesh;
  contact.geometry.dispose();
  contact.geometry = lathe(points);
  contact.scale.set(1, 1, 1);
  return contact.material as THREE.MeshStandardMaterial;
}

// A continuous curved band approximates the visible swirl, without assigning a gear count.
function spiralContact() {
  const positions: number[] = [], indices: number[] = [];
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, angle = t * Math.PI * 3.2, radius = .018 + t * .045;
    for (const y of [0, .009])
      for (const offset of [-.004, .004]) {
        const r = radius + offset;
        positions.push(Math.cos(angle) * r, y, Math.sin(angle) * r);
      }
  }
  for (let i = 0; i < steps; i++) {
    const a = i * 4, b = a + 4;
    for (const [u, v] of [[0, 1], [1, 3], [3, 2], [2, 0]])
      indices.push(a + u, b + u, a + v, a + v, b + u, b + v);
  }
  indices.push(0, 1, 2, 1, 3, 2);
  const end = steps * 4;
  indices.push(end, end + 2, end + 1, end + 1, end + 2, end + 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function refineCyclone(bit: THREE.Group, tipHeight: number) {
  const blue = replaceContact(bit, [[0, .012], [.018, .012], [.018, 0], [.023, 0],
    [.023, .009], [.065, .009], [.067, .025], [.083, .045], [.052, tipHeight], [0, tipHeight]]);
  // Both faces are visible from below during the detail view / a burst.
  const relief = blue.clone();
  relief.side = THREE.DoubleSide;
  bit.add(mesh(spiralContact(), relief, "bit-cyclone-spiral-contact"));
}

function refineDot(bit: THREE.Group, tipHeight: number) {
  const green = replaceContact(bit, [[0, .009], [.034, .009], [.038, .024],
    [.048, .065], [.04, tipHeight], [0, tipHeight]]);
  green.color.set("#314b40");
  // Sampling a dotted surface, not a claim about the manufactured number of protrusions.
  const centers: THREE.Vector3[] = [];
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++)
    if (Math.hypot(x, z) <= 2.25) centers.push(new THREE.Vector3(x * .014, .0045, z * .014));
  const pip = new THREE.SphereGeometry(.0045, 12, 8);
  pip.rotateX(.23);
  pip.rotateZ(.31);
  const pips = new THREE.InstancedMesh(pip, green, centers.length);
  const transform = new THREE.Matrix4();
  centers.forEach((center, i) => { transform.makeTranslation(center.x, center.y, center.z); pips.setMatrixAt(i, transform); });
  pips.name = "bit-dot-contact-pips";
  pips.castShadow = pips.receiveShadow = true;
  pips.userData.geometryApproximate = true;
  bit.add(pips);
}

function refineLevel(bit: THREE.Group, tipHeight: number) {
  replaceContact(bit, [[0, .008], [.025, .008], [.025, 0], [.056, 0],
    [.056, .02], [.082, .021], [.082, .047], [.105, .048], [.105, .064],
    [.052, tipHeight], [0, tipHeight]]);
}

function curvedLug(height: number) {
  const shape = new THREE.Shape();
  const inner = .265, outer = .321, span = .34, steps = 12;
  for (let i = 0; i <= steps; i++) {
    const a = -span + i / steps * span * 2;
    const x = Math.cos(a) * outer, y = Math.sin(a) * outer;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  for (let i = steps; i >= 0; i--) {
    const a = -span + i / steps * span * 2;
    shape.lineTo(Math.cos(a) * inner, Math.sin(a) * inner);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, height / 2, 0);
  return geometry;
}

function refineTwoLobeRatchet(ratchet: THREE.Group, dimensions: VisualDimensions, color: string) {
  const { bitHeight: y, ratchetHeight: h } = dimensions;
  const shell = ratchet.getObjectByName("ratchet-annulus") as THREE.Mesh;
  shell.geometry.dispose();
  shell.geometry = lathe([[.205, y], [.245, y], [.285, y + .023],
    [.285, y + h - .018], [.25, y + h], [.205, y + h], [.205, y]]);
  const clear = material(color, true);
  ratchet.add(mesh(lathe([[.075, y - .002], [.208, y - .002], [.216, y + .016],
    [.205, y + h - .006], [.075, y + h - .006], [.075, y - .002]]), clear, "ratchet-inner-insert"));
  for (const name of ["ratchet-lock", "ratchet-lock-spokes"])
    (ratchet.getObjectByName(name) as THREE.Mesh).material = clear;
  const lugs = ratchet.getObjectByName("ratchet-lugs") as THREE.InstancedMesh;
  lugs.geometry.dispose();
  lugs.geometry = curvedLug(h * .8);
  const transform = new THREE.Matrix4();
  for (let i = 0; i < 2; i++) {
    transform.makeRotationY(i * Math.PI);
    transform.setPosition(0, y + h * .48, 0);
    lugs.setMatrixAt(i, transform);
  }
  lugs.instanceMatrix.needsUpdate = true;
}

function downwardGuards(blade: THREE.Group, dimensions: VisualDimensions) {
  const group = new THREE.Group();
  group.name = "blade-downward-guards";
  // Eight downward-facing blades are explicitly described in Takara Tomy's BX-35 detail image.
  const points = [[.35, -.075], [.40, -.09], [.495, -.065], [.495, .065], [.40, .09], [.35, .075]];
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, z)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .012, bevelEnabled: false });
  geometry.rotateX(Math.PI / 2);
  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const radius = Math.hypot(positions.getX(i), positions.getZ(i));
    positions.setY(i, positions.getY(i) + dimensions.bladeBase +
      dimensions.bladeThickness * .78 - (radius - .35) * .42);
  }
  geometry.computeVertexNormals();
  const silver = material("#b9c0c5", false, true);
  silver.side = THREE.DoubleSide;
  for (let i = 0; i < 8; i++) {
    const guard = mesh(geometry, silver, "blade-downward-guard");
    guard.rotation.y = i / 8 * Math.PI * 2;
    group.add(guard);
  }
  blade.add(group);
}

function wingPivots(blade: THREE.Group, dimensions: VisualDimensions) {
  const geometry = new THREE.CylinderGeometry(.025, .03, .018, 16);
  const pivots = new THREE.InstancedMesh(geometry, material("#a3abb1", false, true), 2);
  pivots.name = "blade-wing-pivots";
  const transform = new THREE.Matrix4();
  for (let i = 0; i < 2; i++) {
    const angle = .8 + i * Math.PI;
    transform.makeTranslation(Math.cos(angle) * .36,
      dimensions.bladeBase + dimensions.bladeThickness - .003, Math.sin(angle) * .36);
    pivots.setMatrixAt(i, transform);
  }
  pivots.castShadow = pivots.receiveShadow = true;
  blade.add(pivots);
}

/** Local, static refinements for three photographed factory combinations; not measured CAD. */
export function refineBeyVisuals(id: string, blade: THREE.Group, ratchet: THREE.Group,
  bit: THREE.Group, dimensions: VisualDimensions) {
  if (id === "bx-34-cobalt-dragoon") {
    refineCyclone(bit, dimensions.tipHeight);
    refineTwoLobeRatchet(ratchet, dimensions, "#c02b35");
    (blade.getObjectByName("blade-center-core") as THREE.Mesh).material = material("#ba2633", true);
  } else if (id === "bx-35-black-shell") {
    refineDot(bit, dimensions.tipHeight);
    downwardGuards(blade, dimensions);
  } else if (id === "ux-09-samurai-saber") {
    refineLevel(bit, dimensions.tipHeight);
    refineTwoLobeRatchet(ratchet, dimensions, "#e4eee7");
    wingPivots(blade, dimensions);
  }
}
