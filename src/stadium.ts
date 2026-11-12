import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RADIUS } from "./physics.ts";

type Placement = {
  x: number;
  y: number;
  z: number;
  angle?: number;
  scale?: [number, number, number];
};
const surface = (r: number) => r * r * 0.024 - 0.03;
const gates = [
  { angle: 0, half: 0.24 },
  { angle: Math.PI / 2, half: 0.29 },
  { angle: Math.PI, half: 0.24 },
];
function gate(angle: number) {
  return gates.some(
    (g) =>
      Math.abs(
        Math.atan2(Math.sin(angle - g.angle), Math.cos(angle - g.angle)),
      ) < g.half,
  );
}
function material(color: string, metalness = 0.08, roughness = 0.4) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}
function part(
  geometry: THREE.BufferGeometry,
  mat: THREE.Material,
  name: string,
  x = 0,
  y = 0,
  z = 0,
) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
function instances(
  geometry: THREE.BufferGeometry,
  mat: THREE.Material,
  name: string,
  placements: Placement[],
) {
  const mesh = new THREE.InstancedMesh(geometry, mat, placements.length),
    transform = new THREE.Object3D();
  placements.forEach((p, i) => {
    transform.position.set(p.x, p.y, p.z);
    transform.rotation.set(0, p.angle ?? 0, 0);
    transform.scale.set(...(p.scale ?? [1, 1, 1]));
    transform.updateMatrix();
    mesh.setMatrixAt(i, transform.matrix);
  });
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.count = placements.length;
  return mesh;
}
function radial(count: number, r: number, y: number, skipGates = false) {
  const points: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    if (skipGates && gate(a)) continue;
    points.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, angle: -a });
  }
  return points;
}
function band(inner: number, outer: number, bottom: number, height: number) {
  const arcs = [
    [0.24, Math.PI / 2 - 0.29],
    [Math.PI / 2 + 0.29, Math.PI - 0.24],
    [Math.PI + 0.24, Math.PI * 2 - 0.24],
  ];
  return mergeGeometries(
    arcs.map(([start, end]) => {
      const points: THREE.Vector2[] = [],
        steps = Math.ceil((end - start) * 22);
      for (let i = 0; i <= steps; i++) {
        const a = start + ((end - start) * i) / steps;
        points.push(
          new THREE.Vector2(Math.cos(a) * outer, -Math.sin(a) * outer),
        );
      }
      for (let i = steps; i >= 0; i--) {
        const a = start + ((end - start) * i) / steps;
        points.push(
          new THREE.Vector2(Math.cos(a) * inner, -Math.sin(a) * inner),
        );
      }
      const shape = new THREE.Shape(points),
        g = new THREE.ExtrudeGeometry(shape, {
          depth: height,
          bevelEnabled: true,
          bevelSize: 0.008,
          bevelThickness: 0.008,
          bevelSegments: 1,
          steps: 1,
        });
      return g.rotateX(-Math.PI / 2).translate(0, bottom, 0);
    }),
  )!;
}
function ring(
  radius: number,
  tube: number,
  mat: THREE.Material,
  name: string,
  y: number,
) {
  const mesh = part(
    new THREE.TorusGeometry(radius, tube, 6, 128),
    mat,
    name,
    0,
    y,
  );
  mesh.rotation.x = Math.PI / 2;
  mesh.castShadow = false;
  return mesh;
}
function ramp(width: number) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -width / 2,
        0.427,
        0,
        width / 2,
        0.427,
        0,
        -width / 2,
        0.1,
        0.75,
        width / 2,
        0.427,
        0,
        width / 2,
        0.1,
        0.75,
        -width / 2,
        0.1,
        0.75,
      ],
      3,
    ),
  );
  geometry.computeVertexNormals();
  return geometry;
}

export function createStadium(): THREE.Group {
  const stadium = new THREE.Group();
  stadium.name = "spinforge-stadium";
  stadium.userData.surfaceRadius = RADIUS;
  stadium.userData.exits = [
    { x: -RADIUS, z: 0, finish: "over" },
    { x: RADIUS, z: 0, finish: "over" },
    { x: 0, z: RADIUS, finish: "extreme" },
  ];
  const white = material("#cbd7da", 0.04, 0.34),
    chassis = material("#152a38", 0.24, 0.44),
    black = material("#08141c", 0.03, 0.76);
  const blue = material("#06667f", 0.28, 0.27),
    steel = material("#9bb4bf", 0.72, 0.26),
    ink = material("#567b8d", 0, 0.75);
  const cyan = new THREE.MeshBasicMaterial({
    color: "#56dce6",
    toneMapped: false,
  });
  const orange = material("#ed8b39", 0.05, 0.46),
    red = material("#d84f38", 0.05, 0.46);
  const guard = material("#b8e7ed", 0.02, 0.14);
  guard.transparent = true;
  guard.opacity = 0.19;
  guard.depthWrite = false;
  guard.side = THREE.DoubleSide;

  stadium.add(
    part(
      new THREE.CylinderGeometry(5.26, 5.48, 0.28, 96),
      chassis,
      "lower-chassis",
      0,
      -0.53,
    ),
  );
  stadium.add(
    part(
      new THREE.CylinderGeometry(4.94, 5.25, 0.22, 96),
      black,
      "under-bowl-support",
      0,
      -0.28,
    ),
  );
  stadium.add(ring(5.22, 0.035, steel, "chassis-edge-bead", -0.38));
  stadium.add(ring(5.25, 0.012, cyan, "lower-light-pipe", -0.3));
  stadium.add(
    instances(
      new THREE.CylinderGeometry(0.31, 0.35, 0.15, 12),
      black,
      "rubber-feet",
      [
        { x: -3.2, y: -0.72, z: -3.2 },
        { x: 3.2, y: -0.72, z: -3.2 },
        { x: -3.2, y: -0.72, z: 3.2 },
        { x: 3.2, y: -0.72, z: 3.2 },
      ],
    ),
  );
  stadium.add(
    instances(
      new THREE.BoxGeometry(0.1, 0.19, 0.25),
      blue,
      "chassis-cooling-ribs",
      radial(40, 5.28, -0.49),
    ),
  );

  const bowlProfile = [
    new THREE.Vector2(0, -0.13),
    new THREE.Vector2(4.34, 0.27),
    new THREE.Vector2(4.34, 0.37),
  ];
  for (let i = 48; i >= 0; i--) {
    const r = (RADIUS * i) / 48;
    bowlProfile.push(new THREE.Vector2(r, surface(r)));
  }
  stadium.add(
    part(new THREE.LatheGeometry(bowlProfile, 128), white, "bowl-surface"),
  );
  stadium.add(part(band(4.29, 5.05, -0.15, 0.55), white, "molded-rim-deck"));
  stadium.add(part(band(4.29, 4.53, 0.4, 0.066), blue, "rail-carrier"));
  stadium.add(part(band(4.96, 5.01, 0.405, 0.012), cyan, "rim-light-guides"));
  stadium.add(part(band(4.57, 4.65, 0.48, 0.54), guard, "guard-panels"));
  stadium.add(
    instances(
      new THREE.BoxGeometry(0.105, 0.65, 0.13),
      blue,
      "guard-posts",
      radial(24, 4.67, 0.7, true),
    ),
  );
  stadium.add(
    instances(
      new THREE.CylinderGeometry(0.055, 0.055, 0.014, 8),
      steel,
      "guard-fasteners",
      radial(24, 4.67, 1.034, true),
    ),
  );
  stadium.add(
    instances(
      new THREE.BoxGeometry(0.13, 0.035, 0.19),
      chassis,
      "deck-latch-pads",
      radial(24, 4.87, 0.435, true),
    ),
  );
  stadium.add(
    instances(
      new THREE.CylinderGeometry(0.045, 0.045, 0.016, 8),
      steel,
      "deck-bolts",
      radial(24, 4.87, 0.46, true),
    ),
  );
  const teeth = instances(
    new THREE.BoxGeometry(0.073, 0.095, 0.095),
    steel,
    "x-rail-teeth",
    radial(128, 4.18, 0.465, true),
  );
  for (let i = 0; i < teeth.count; i++)
    teeth.setColorAt(i, new THREE.Color(i % 8 === 0 ? "#bcf66b" : "#91beca"));
  stadium.add(teeth);
  stadium.add(
    instances(
      new THREE.BoxGeometry(0.04, 0.017, 0.13),
      ink,
      "rim-mold-details",
      radial(64, 4.83, 0.423, true),
    ),
  );

  for (const r of [1.3, 2.5, 3.5])
    stadium.add(
      ring(r, 0.012, ink, "engraved-circle-" + r, surface(r) + 0.014),
    );
  const center = instances(
    new THREE.BoxGeometry(0.075, 0.006, 0.67),
    blue,
    "center-x",
    [
      { x: 0, y: surface(0) + 0.006, z: 0, angle: 0.72 },
      { x: 0, y: surface(0) + 0.006, z: 0, angle: -0.72 },
    ],
  );
  center.castShadow = false;
  stadium.add(center);
  const marks: Placement[] = [];
  for (const side of [-1, 1])
    for (let i = 0; i < 5; i++) {
      const x = side * (2.58 + i * 0.12);
      marks.push({
        x,
        y: surface(Math.abs(x)) + 0.008,
        z: 0,
        angle: side * 0.14,
        scale: [1, 1, 1 - i * 0.11],
      });
    }
  const launchMarks = instances(
    new THREE.BoxGeometry(0.032, 0.006, 0.62),
    blue,
    "launch-zone-hatching",
    marks,
  );
  launchMarks.castShadow = false;
  stadium.add(launchMarks);
  const ticks = instances(
    new THREE.BoxGeometry(0.045, 0.006, 0.015),
    ink,
    "bowl-calibration-marks",
    radial(48, 3.15, surface(3.15) + 0.006),
  );
  ticks.castShadow = false;
  stadium.add(ticks);

  for (const { name, angle, extreme } of [
    { name: "exit-over-right", angle: 0, extreme: false },
    { name: "exit-over-left", angle: Math.PI, extreme: false },
    { name: "exit-extreme", angle: Math.PI / 2, extreme: true },
  ]) {
    const pocket = new THREE.Group(),
      width = extreme ? 2.5 : 2.1,
      accent = extreme ? red : orange;
    pocket.name = name;
    pocket.userData.finish = extreme ? "extreme" : "over";
    pocket.position.set(Math.cos(angle) * 4.2, 0, Math.sin(angle) * 4.2);
    pocket.rotation.y = Math.PI / 2 - angle;
    pocket.add(
      part(
        new THREE.BoxGeometry(width, 0.1, 1.2),
        black,
        "receiver-floor",
        0,
        0.045,
        1.28,
      ),
    );
    const slope = part(ramp(width - 0.12), accent, "entry-ramp");
    (slope.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    pocket.add(slope);
    pocket.add(
      instances(
        new THREE.BoxGeometry(0.1, 0.33, 1.86),
        white,
        "receiver-sidewalls",
        [
          { x: -width / 2, y: 0.235, z: 0.93 },
          { x: width / 2, y: 0.235, z: 0.93 },
        ],
      ),
    );
    pocket.add(
      part(
        new THREE.BoxGeometry(width + 0.1, 0.33, 0.1),
        white,
        "receiver-backstop",
        0,
        0.235,
        1.88,
      ),
    );
    pocket.add(
      instances(
        new THREE.BoxGeometry(0.115, 0.026, 1.85),
        accent,
        "receiver-edge-trim",
        [
          { x: -width / 2, y: 0.413, z: 0.93 },
          { x: width / 2, y: 0.413, z: 0.93 },
        ],
      ),
    );
    const arrows: Placement[] = [];
    for (let i = 0; i < 3; i++)
      for (const sign of [-1, 1])
        arrows.push({
          x: sign * 0.13,
          y: 0.103,
          z: 0.91 + i * 0.25,
          angle: sign * 0.7,
        });
    const arrowsMesh = instances(
      new THREE.BoxGeometry(0.035, 0.007, 0.34),
      accent,
      "receiver-direction-arrows",
      arrows,
    );
    arrowsMesh.castShadow = false;
    pocket.add(arrowsMesh);
    stadium.add(pocket);
  }
  return stadium;
}
