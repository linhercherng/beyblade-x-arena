import raw from "./catalog-data.json" with { type: "json" };
import additions from "../scripts/catalog-expansion.json" with { type: "json" };
export const NEW_BEY_IDS = new Set(additions.products.map(b => b.id));
const addedById = new Map(additions.products.map(b => [b.id, b]));
import verified from "../scripts/catalog-overrides.json" with { type: "json" };
import names from "./chinese-names.json" with { type: "json" };
export const CHINESE_NAMES = names as Record<
  string,
  { name: string; source: string; status: string; note: string }
>;

export type BeyType = "attack" | "defense" | "stamina" | "balance";
export const SPIN={
  R:{label:"右迴旋",arrow:"↻",description:"由上方看：順時針"},
  L:{label:"左迴旋",arrow:"↺",description:"由上方看：逆時針"},
} as const;
export type SpinDirection=keyof typeof SPIN;
export type Stats = {
  atk: number;
  def: number;
  sta: number;
  dash: number;
  burst: number;
  weight: number;
};
export const TYPE: Record<
  BeyType,
  { label: string; icon: string; color: string; strong: string; weak: string }
> = {
  attack: {
    label: "攻擊",
    icon: "↗",
    color: "#ff7357",
    strong: "持久",
    weak: "防禦",
  },
  defense: {
    label: "防禦",
    icon: "⬡",
    color: "#58baff",
    strong: "攻擊",
    weak: "持久",
  },
  stamina: {
    label: "持久",
    icon: "◎",
    color: "#6de5bd",
    strong: "防禦",
    weak: "攻擊",
  },
  balance: {
    label: "平衡",
    icon: "◇",
    color: "#bd9dff",
    strong: "無固定優勢",
    weak: "無固定劣勢",
  },
};
export const STAT_LABEL: Record<keyof Stats, string> = {
  atk: "攻擊",
  def: "防禦",
  sta: "持久",
  dash: "衝刺",
  burst: "抗爆裂",
  weight: "重量",
};
export interface Bit {
  name: string;
  type: BeyType;
  atk: number;
  def: number;
  sta: number;
  dash: number;
  burst: number;
  provisional: boolean;
}
const bitGroups: [BeyType, string][] = [
  [
    "attack",
    "F:Flat LF:Low_Flat GF:Gear_Flat R:Rush LR:Low_Rush A:Accel Q:Quake C:Cyclone L:Level V:Vortex UF:Under_Flat LC:Low_Cyclone FF:Free_Flat GR:Gear_Rush Tr:Turbo I:Ignition RA:Rubber_Accel",
  ],
  [
    "defense",
    "N:Needle HN:High_Needle S:Spike GN:Gear_Needle D:Dot MN:Metal_Needle UN:Under_Needle BS:Bound_Spike DS:Disk_Spike W:Wedge WW:Wall_Wedge",
  ],
  [
    "stamina",
    "B:Ball O:Orb LO:Low_Orb GB:Gear_Ball DB:Disk_Ball FB:Free_Ball G:Glide WB:Wall_Ball Nr:Narrow",
  ],
  [
    "balance",
    "T:Taper HT:High_Taper P:Point GP:Gear_Point U:Unite E:Elevate H:Hexa TP:Trans_Point M:Merge Z:Zap J:Jolt K:Kick TK:Trans_Kick Op:Operate Y:Yielding GU:Gear_Unite LP:Low_Point MT:Metal_Taper",
  ],
];
const known = new Set(
  "F LF GF R LR A Q C L V UF N HN S GN D MN UN BS B O LO GB DB FB G T HT P GP U E H TP LC".split(
    " ",
  ),
);
const profiles: Record<BeyType, [number, number, number, number, number]> = {
  attack: [84, 59, 80, 88, 76],
  defense: [58, 84, 72, 33, 84],
  stamina: [56, 58, 84, 38, 62],
  balance: [72, 70, 74, 65, 73],
};
export const bits: Record<string, Bit> = {};
for (const [type, group] of bitGroups)
  for (const word of group.split(" ")) {
    const [code, name] = word.split(":");
    const [atk, def, sta, dash, burst] = profiles[type];
    bits[code] = {
      name: name.replaceAll("_", " "),
      type,
      atk,
      def,
      sta,
      dash: Math.min(98, dash + (code.startsWith("G") ? 9 : 0)),
      burst,
      provisional: !known.has(code),
    };
  }
for (const [code, entry] of Object.entries({ ...verified.bits, ...additions.bits })) {
  const type = entry.type as BeyType;
  const [atk, def, sta, dash, burst] = profiles[type];
  Object.assign(bits[code], {
    type,
    atk,
    def,
    sta,
    dash,
    burst,
    provisional: false,
  });
}
const hash = (s: string) =>
  [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 17);
const clamp = (v: number) => Math.round(Math.min(100, Math.max(1, v)));
export interface Blade {
  name: string;
  spin: SpinDirection;
  atk: number;
  def: number;
  sta: number;
  weight: number;
}
export interface Ratchet {
  sides: number;
  height: number;
  weight: number;
}
export const blades: Record<string, Blade> = {};
export const ratchets: Record<string, Ratchet> = {};
export interface Bey {
  zhName: string;
  spinNote: string;
  id: string;
  code: string;
  line: string;
  name: string;
  combo: string;
  blade: string;
  ratchet: string;
  bit: string;
  spin: SpinDirection;
  feature: string;
  type: BeyType;
  provisional: boolean;
  released: string | null;
  stats: Stats;
  height: number;
  color: string;
  cxParts: string[];
  source: string;
  integrated: "blade" | "bit" | null;
}
// 所有數值均為遊戲平衡參數；產品類型與日期另依官方來源覆寫。
export const BEYS: Bey[] = [...raw, ...additions.products].map((row) => {
  const spin=row.spin;
  if(spin!=="L"&&spin!=="R")throw new Error(`未定義旋向：${row.id}`);
  const added = addedById.get(row.id);
  const bit = bits[row.bit];
  if (!bit) throw new Error(`缺少軸心：${row.bit}`);
  const h = hash(row.blade);
  const base = profiles[bit.type];
  blades[row.blade] ??= {
    name: row.name,
    spin,
    atk: clamp(base[0] + (h % 17) - 8),
    def: clamp(base[1] + ((h >>> 4) % 17) - 8),
    sta: clamp(base[2] + ((h >>> 8) % 17) - 8),
    weight: clamp(
      52 +
        (h % 24) +
        (bit.type === "defense" ? 12 : bit.type === "stamina" ? -5 : 4) +
        (row.line === "UX" ? 10 : row.line === "CX" ? 5 : 0),
    ),
  };
  const [teeth, height] = row.ratchet.split("-");
  ratchets[row.ratchet] ??= {
    sides: teeth === "M" ? 6 : teeth === "integrated" ? 4 : Number(teeth),
    height: teeth === "integrated" ? 65 : Number(height),
    weight: teeth === "integrated" ? 8 : 5 + (Number(teeth) || 6) / 2,
  };
  const blade = blades[row.blade],
    ratchet = ratchets[row.ratchet];
  const release = (
    verified.releases as Record<string, { date: string; source: string }>
  )[row.code];
  return {
    ...row,
    spin,
    zhName: CHINESE_NAMES[row.id].name,
    spinNote: added?.details.spinVerification.startsWith("inferred") ? `右旋依${row.line}相容規格推定，未經逐款官方明示。` : "",
    type: bit.type,
    provisional: bit.provisional,
    released: added?.released ?? release?.date ?? null,
    source: added?.source ?? release?.source ?? "",
    integrated: row.ratchet.startsWith("integrated")
      ? ["UX-19", "UX-20", "UX-21"].includes(row.code)
        ? "blade"
        : "bit"
      : null,
    stats: {
      atk: clamp(blade.atk * 0.78 + bit.atk * 0.22),
      def: clamp(blade.def * 0.78 + bit.def * 0.22),
      sta: clamp(blade.sta * 0.78 + bit.sta * 0.22),
      dash: bit.dash,
      burst: clamp(
        bit.burst + 5 - ratchet.sides * 0.7 + (70 - ratchet.height) * 0.15,
      ),
      weight: clamp(blade.weight + ratchet.weight),
    },
    height: ratchet.height,
    color: TYPE[bit.type].color,
    cxParts: row.line === "CX" ? row.name.split(" ") : [],
  };
});
export function getBey(id: string): Bey {
  const b = BEYS.find((b) => b.id === id);
  if (!b) throw new Error(`未知陀螺 ${id}`);
  return b;
}
export function filterBeys(
  query = "",
  line = "all",
  type = "all",
  sort = "code",
) {
  const q = query.toLowerCase().trim();
  return BEYS.filter(
    (b) =>
      (line === "all" || (line === "new" ? NEW_BEY_IDS.has(b.id) : b.line === line)) &&
      (type === "all" || b.type === type) &&
      `${b.zhName} ${b.name} ${b.code} ${b.combo} ${b.feature} ${TYPE[b.type].label}`
        .toLowerCase()
        .includes(q),
  ).sort((a, b) =>
    sort === "atk"
      ? b.stats.atk - a.stats.atk
      : sort === "sta"
        ? b.stats.sta - a.stats.sta
        : a.code.localeCompare(b.code),
  );
}
