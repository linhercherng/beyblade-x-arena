import * as THREE from "three";
import type { Bey } from "./catalog.ts";
import { PRODUCT_IMAGES, type ProductImage } from "./appearance.ts";
import references from "./model-references.json" with { type: "json" };
import shapes from "./part-shapes.json" with { type: "json" };

export interface ModelReference {
  source: string;
  top: ProductImage;
  side: { src: string; imageSource: string } | null;
  ratchetPhoto?: { src: string; imageSource: string } | null;
  bitPhoto?: { src: string; imageSource: string } | null;
  colors: {
    bladePlastic: string | null;
    bladeMetal: string | null;
    ratchet: string | null;
    bit: string | null;
  };
  confidence: string;
  note: string;
}
interface PartShape {
  family: string;
  height: string;
  gearTeeth: number | null;
  metalTip: boolean;
  freeRing: boolean;
  offsetTip: boolean;
  integrated: boolean;
  source: string;
  note: string;
  confidence: string;
}
export const MODEL_REFERENCES = references as unknown as Record<
  string,
  ModelReference
>;
const PART_SHAPES = shapes as unknown as Record<string, PartShape>;

export function modelSpec(b: Bey) {
  const reference = MODEL_REFERENCES[b.id];
  const photo = reference?.top ?? PRODUCT_IMAGES[b.id];
  const part = PART_SHAPES[b.bit];
  const integrated = b.integrated;
  const height =
    part?.height === "low" ? 0.145 : part?.height === "high" ? 0.205 : 0.175;
  const bitHeight = integrated === "bit" ? 0.255 : height;
  return {
    reference,
    photo,
    part,
    tipFamily: part?.family ?? "taper",
    // shortcut: 未確認的齒輪採12齒近似，取得官方逐齒資料後更新。
    gearTeeth: part?.gearTeeth ?? 12,
    ratchetLobes:
      integrated || b.ratchet.startsWith("M")
        ? 0
        : Number(b.ratchet.split("-")[0]),
    ratchetHeight:
      integrated === "blade"
        ? 0.085
        : integrated === "bit"
          ? 0.06
          : b.height * 0.00165,
    integration: integrated,
    bitHeight,
    // shortcut: 厚度依系列估算，取得逐顆量測或掃描時改用實際尺寸。
    bladeThickness: b.line === "UX" ? 0.125 : b.line === "CX" ? 0.112 : 0.095,
    colors: {
      blade: reference?.colors.bladePlastic ?? photo.primaryColor,
      metal: reference?.colors.bladeMetal ?? "#bbc4ce",
      ratchet: reference?.colors.ratchet ?? photo.secondaryColor,
      bit: reference?.colors.bit ?? photo.primaryColor,
    },
  };
}
function solid(color: string, metal = false, transparent = false) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: metal ? 0.88 : 0.04,
    roughness: metal ? 0.25 : 0.31,
    transparent,
    opacity: transparent ? 0.76 : 1,
    depthWrite: !transparent,
  });
}
function piece(
  g: THREE.BufferGeometry,
  m: THREE.Material,
  name: string,
  x = 0,
  y = 0,
  z = 0,
) {
  const mesh = new THREE.Mesh(g, m);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
function torus(
  r: number,
  t: number,
  m: THREE.Material,
  name: string,
  y: number,
) {
  const mesh = piece(new THREE.TorusGeometry(r, t, 8, 48), m, name, 0, y);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}
function radial(
  g: THREE.BufferGeometry,
  m: THREE.Material,
  count: number,
  r: number,
  y: number,
  name: string,
) {
  const mesh = new THREE.InstancedMesh(g, m, count),
    matrix = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    matrix.makeRotationY(-a);
    matrix.setPosition(Math.cos(a) * r, y, Math.sin(a) * r);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.name = name;
  mesh.userData.count = count;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
function lathe(profile: number[][], m: THREE.Material, name: string) {
  return piece(
    new THREE.LatheGeometry(
      profile.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)),
      32,
    ),
    m,
    name,
  );
}

export function beyModel(b: Bey, texture: THREE.Texture) {
  const spec = modelSpec(b),
    reference = spec.photo;
  const group = new THREE.Group(),
    blade = new THREE.Group(),
    ratchet = new THREE.Group(),
    bit = new THREE.Group();
  blade.name = "blade";
  ratchet.name = "ratchet";
  bit.name = "bit";
  const metal = solid(spec.colors.metal, true),
    plastic = solid(spec.colors.blade),
    ratchetPlastic = solid(spec.colors.ratchet, false, true),
    bitPlastic = solid(spec.colors.bit);
  const dark = solid("#182432"),
    tipMaterial = spec.part?.metalTip ? solid("#cbd0d5", true) : bitPlastic;
  const gearY = spec.bitHeight * 0.72;
  const tipHeight = spec.integration === "bit" ? 0.105 : spec.bitHeight * 0.58;
  const f = spec.tipFamily;
  let tip: number[][];
  if (f === "needle")
    tip = [
      [0.002, 0],
      [0.012, 0.022],
      [0.045, tipHeight * 0.75],
      [0.052, tipHeight],
    ];
  else if (f === "ball" || f === "orb")
    tip = [
      [0.002, 0],
      [0.038, 0.012],
      [b.bit === "Nr" ? 0.035 : 0.064, 0.041],
      [0.065, tipHeight * 0.76],
      [0.048, tipHeight],
    ];
  else if (f === "point")
    tip = [
      [0.008, 0],
      [0.02, 0.021],
      [0.075, 0.037],
      [0.082, 0.05],
      [0.058, tipHeight],
    ];
  else if (f === "flat")
    tip = [
      [0.075, 0],
      [0.085, 0.013],
      [0.083, 0.032],
      [0.049, tipHeight],
    ];
  else if (f === "stepped")
    tip = [
      [0.056, 0],
      [0.056, 0.02],
      [0.082, 0.021],
      [0.082, 0.047],
      [0.105, 0.048],
      [0.105, 0.064],
      [0.052, tipHeight],
    ];
  else if (f === "hexa")
    tip = [
      [0.068, 0],
      [0.083, 0.025],
      [0.052, tipHeight],
    ];
  else if (f === "wedge")
    tip = [
      [0.012, 0],
      [0.048, 0.023],
      [0.074, 0.052],
      [0.056, tipHeight],
    ];
  else
    tip = [
      [0.034, 0],
      [0.05, 0.016],
      [0.084, 0.056],
      [0.053, tipHeight],
    ];
  const foot =
    f === "hexa" || f === "wedge"
      ? piece(
          new THREE.CylinderGeometry(
            0.056,
            f === "hexa" ? 0.085 : 0.012,
            tipHeight,
            f === "hexa" ? 6 : 3,
          ),
          tipMaterial,
          "bit-contact",
          0,
          tipHeight / 2,
        )
      : lathe([[0, 0], ...tip, [0, tipHeight]], tipMaterial, "bit-contact");
  if (spec.part?.offsetTip) foot.position.x = 0.035;
  bit.add(foot);
  bit.add(
    lathe(
      [
        [0.05, tipHeight * 0.75],
        [0.05, gearY],
        [0.064, gearY + 0.025],
        [0.055, spec.bitHeight],
      ],
      bitPlastic,
      "bit-shaft",
    ),
  );
  const gearRadius =
    spec.integration === "bit"
      ? 0.19
      : ["J", "Z"].includes(b.bit)
        ? 0.112
        : 0.083;
  bit.add(
    piece(
      new THREE.CylinderGeometry(
        gearRadius - 0.009,
        gearRadius - 0.009,
        0.036,
        24,
      ),
      bitPlastic,
      "bit-gear-hub",
      0,
      gearY,
    ),
  );
  bit.add(
    radial(
      new THREE.BoxGeometry(0.022, 0.04, 0.016),
      bitPlastic,
      spec.gearTeeth,
      gearRadius,
      gearY,
      "bit-gear",
    ),
  );
  if (spec.integration === "bit")
    bit.add(
      lathe(
        [
          [0.054, tipHeight],
          [0.14, tipHeight + 0.025],
          [0.19, gearY],
          [0.2, spec.bitHeight],
        ],
        bitPlastic,
        "integrated-bit-body",
      ),
    );
  bit.add(
    torus(0.059, 0.008, bitPlastic, "bit-lock-collar", spec.bitHeight - 0.007),
  );
  if (spec.part?.freeRing || ["DB", "E", "DS"].includes(b.bit)) {
    const disc = spec.tipFamily === "needle" ? 0.13 : 0.115;
    bit.add(
      torus(disc, 0.018, bitPlastic, "bit-contact-disc", tipHeight * 0.68),
    );
    if (["DB", "DS"].includes(b.bit))
      bit.add(
        radial(
          new THREE.BoxGeometry(0.095, 0.012, 0.018),
          bitPlastic,
          6,
          0.075,
          tipHeight * 0.68,
          "bit-disc-spokes",
        ),
      );
    if (b.bit === "E")
      bit.add(
        lathe(
          [
            [0.045, tipHeight * 0.68 - 0.006],
            [0.116, tipHeight * 0.68 - 0.006],
            [0.116, tipHeight * 0.68 + 0.006],
            [0.045, tipHeight * 0.68 + 0.006],
          ],
          bitPlastic,
          "bit-guide-disc",
        ),
      );
  }
  if (["WB", "WW"].includes(b.bit))
    bit.add(
      lathe(
        [
          [0.09, 0.03],
          [0.13, 0.03],
          [0.13, 0.075],
          [0.09, 0.075],
        ],
        bitPlastic,
        "bit-wall",
      ),
    );
  if (b.bit === "BS")
    bit.add(
      radial(
        new THREE.BoxGeometry(0.01, 0.065, 0.019),
        bitPlastic,
        6,
        0.06,
        tipHeight * 0.8,
        "bit-bound-spike-ribs",
      ),
    );
  if (b.bit === "M")
    bit.add(torus(0.072, 0.015, solid("#3aa59a"), "bit-rubber-contact", 0.023));
  if (b.bit === "Y")
    bit.add(
      radial(
        new THREE.BoxGeometry(0.075, 0.04, 0.055),
        bitPlastic,
        4,
        0.085,
        tipHeight * 0.8,
        "bit-weight-shoulders",
      ),
    );
  if (b.bit === "LC")
    bit.add(
      radial(
        new THREE.BoxGeometry(0.035, 0.018, 0.026),
        bitPlastic,
        6,
        0.073,
        0.025,
        "bit-cyclone-edge",
      ),
    );

  const ry = spec.bitHeight,
    rh = spec.ratchetHeight;
  const rr = spec.integration === "blade" ? 0.36 : 0.285;
  ratchet.add(
    lathe(
      [
        [0.075, ry],
        [rr * 0.86, ry],
        [rr, ry + 0.023],
        [rr, ry + rh - 0.018],
        [rr * 0.88, ry + rh],
        [0.075, ry + rh],
      ],
      ratchetPlastic,
      "ratchet-annulus",
    ),
  );
  ratchet.add(
    torus(rr * 0.92, 0.011, ratchetPlastic, "ratchet-lower-flange", ry + 0.015),
  );
  ratchet.add(
    torus(
      rr * 0.91,
      0.009,
      ratchetPlastic,
      "ratchet-upper-flange",
      ry + rh - 0.01,
    ),
  );
  ratchet.add(
    piece(
      new THREE.CylinderGeometry(0.105, 0.095, rh * 0.72, 16),
      dark,
      "ratchet-lock",
      0,
      ry + rh * 0.48,
    ),
  );
  if (spec.ratchetLobes > 0)
    ratchet.add(
      radial(
        new THREE.BoxGeometry(0.073, rh * 0.8, 0.075),
        ratchetPlastic,
        spec.ratchetLobes,
        rr,
        ry + rh * 0.48,
        "ratchet-lugs",
      ),
    );
  if (b.ratchet.startsWith("M"))
    ratchet.add(
      torus(rr * 0.91, 0.02, metal, "ratchet-metal-joint", ry + 0.018),
    );
  ratchet.add(
    radial(
      new THREE.BoxGeometry(0.115, 0.018, 0.02),
      ratchetPlastic,
      6,
      rr * 0.62,
      ry + rh * 0.75,
      "ratchet-lock-spokes",
    ),
  );

  const bladeBase = ry + rh - 0.009,
    thickness = spec.bladeThickness;
  const contour = reference.shape;
  const vertices: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  const tiers = [
    [0.84, 0],
    [1, 0.026],
    [1.0, thickness * 0.74],
    [0.94, thickness],
  ];
  const metalColor = new THREE.Color(spec.colors.metal);
  for (const [scale, y] of tiers)
    for (let i = 0; i < contour.length; i++) {
      const a = (i / contour.length) * Math.PI * 2,
        r = contour[i] * 0.52 * scale;
      vertices.push(Math.cos(a) * r, bladeBase + y, Math.sin(a) * r);
      const shade = 0.88 + Math.sin(a * reference.teeth) * 0.07;
      colors.push(
        metalColor.r * shade,
        metalColor.g * shade,
        metalColor.b * shade,
      );
    }
  for (let t = 0; t < tiers.length - 1; t++)
    for (let i = 0; i < contour.length; i++) {
      const j = (i + 1) % contour.length,
        a = t * contour.length + i,
        c = (t + 1) * contour.length + i;
      indices.push(
        a,
        t * contour.length + j,
        c,
        t * contour.length + j,
        (t + 1) * contour.length + j,
        c,
      );
    }
  const outer = new THREE.BufferGeometry();
  outer.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  outer.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  outer.setIndex(indices);
  outer.computeVertexNormals();
  const rim = solid("#ffffff", true);
  rim.vertexColors = true;
  rim.side = THREE.DoubleSide;
  blade.add(piece(outer, rim, "blade-metal-shoulders"));
  blade.add(
    torus(0.31, 0.022, plastic, "blade-plastic-underframe", bladeBase + 0.01),
  );
  blade.add(
    radial(
      new THREE.BoxGeometry(0.28, 0.037, 0.075),
      plastic,
      reference.teeth,
      0.25,
      bladeBase + 0.035,
      "blade-underframe-spokes",
    ),
  );
  blade.add(
    piece(
      new THREE.CylinderGeometry(0.19, 0.23, thickness * 0.8, 16),
      plastic,
      "blade-center-core",
      0,
      bladeBase + thickness * 0.49,
    ),
  );
  blade.add(torus(0.12, 0.009, dark, "blade-lock-ring", bladeBase + 0.008));
  if (b.line === "CX") {
    blade.add(
      torus(
        0.205,
        0.014,
        plastic,
        "cx-lock-chip-rim",
        bladeBase + thickness * 0.9,
      ),
    );
    blade.add(
      radial(
        new THREE.BoxGeometry(0.15, 0.025, 0.038),
        plastic,
        3,
        0.35,
        bladeBase + 0.026,
        "cx-assist-blade",
      ),
    );
  }
  if (b.name === "Silver Wolf")
    blade.add(
      torus(0.385, 0.027, plastic, "blade-free-ring", bladeBase - 0.006),
    );
  // 分層頂面沿各顆照片輪廓建立，側面與厚度依參考圖近似。
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const topVertices: number[] = [],
    uvs: number[] = [],
    topIndices: number[] = [];
  const [bx, by, bw, bh] = reference.imageBounds;
  const radiusPixels =
    Math.max(bw * reference.width, bh * reference.height) / 2;
  const topRings = [0, 0.38, 0.69, 0.94];
  for (const scale of topRings)
    for (let i = 0; i < contour.length; i++) {
      const a = (i / contour.length) * Math.PI * 2,
        r = contour[i] * 0.52 * scale;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      const height =
        scale < 0.4
          ? thickness + 0.016
          : scale < 0.7
            ? thickness - 0.012
            : thickness;
      topVertices.push(x, bladeBase + height, z);
      uvs.push(
        bx + bw / 2 + ((x / 0.52) * radiusPixels) / reference.width,
        1 - by - bh / 2 - ((z / 0.52) * radiusPixels) / reference.height,
      );
    }
  for (let t = 0; t < topRings.length - 1; t++)
    for (let i = 0; i < contour.length; i++) {
      const j = (i + 1) % contour.length,
        a = t * contour.length + i,
        c = (t + 1) * contour.length + i;
      topIndices.push(
        a,
        c,
        t * contour.length + j,
        t * contour.length + j,
        c,
        (t + 1) * contour.length + j,
      );
    }
  const surface = new THREE.BufferGeometry();
  surface.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(topVertices, 3),
  );
  surface.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  surface.setIndex(topIndices);
  surface.computeVertexNormals();
  blade.add(
    piece(
      surface,
      new THREE.MeshBasicMaterial({
        map: texture,
        toneMapped: false,
        transparent: true,
        alphaTest: 0.08,
        side: THREE.DoubleSide,
      }),
      "blade-product-surface",
    ),
  );
  group.add(blade, ratchet, bit);
  group.userData.parts = [blade, ratchet, bit];
  group.userData.partLinks =
    spec.integration === "blade"
      ? [0, 0, 2]
      : spec.integration === "bit"
        ? [0, 1, 1]
        : [0, 1, 2];
  group.userData.productImage = reference.src;
  group.userData.spec = spec;
  return group;
}
