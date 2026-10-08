// Un dibujo por ejercicio del catálogo. Cada uno son dos posturas del esqueleto (ver figure-rig.ts)
// más el equipo que lo distingue: disco de barra, riel del Smith, mancuerna, polea o máquina.
//
// Este archivo solo importa figure-rig: también lo usa el script que genera la lámina de revisión.

import { FLOOR as FLOOR_Y, FigureDef, FrontPose, GROUND as G, Gear, LEN, Limb, P, Prop, SidePose, add, dir } from './figure-rig';

const FLOOR: Prop = { k: 'floor' };

const side = (a: SidePose, b: Partial<SidePose>, gear: Gear[] = [], props: Prop[] = [FLOOR], extra: Partial<FigureDef> = {}): FigureDef => ({ view: 'side', a, b: { ...a, ...b }, gear, props, ...extra });
const front = (a: FrontPose, b: Partial<FrontPose>, gear: Gear[] = [], props: Prop[] = [FLOOR], extra: Partial<FigureDef> = {}): FigureDef => ({ view: 'front', a, b: { ...a, ...b }, gear, props, ...extra });

/** Pie apoyado en el piso en x. `b`: hacia dónde dobla la rodilla. */
const foot = (x: number, b = 1, ft = 90): Limb => ({ to: [x, G], b, ft });
const shoulderOf = (hip: P, torso: number): P => add(hip, dir(torso), LEN.torso);
const post = (x: number, top = 6): Prop => ({ k: 'line', p: [[x, top], [x, FLOOR_Y]] });
const stack = (x: number, y = 24): Prop => ({ k: 'stack', at: [x, y], w: 6, h: FLOOR_Y - y });
const box = (x1: number, x2: number, top: number): Prop => ({ k: 'line', p: [[x1, FLOOR_Y], [x1, top], [x2, top], [x2, FLOOR_Y]] });
const block: Prop = { k: 'pad', p: [[30.5, 60], [40, 60]] };

/** Banco plano visto de lado: colchón entre x1 y x2 con sus patas. */
function flatBench(x1: number, x2: number, y: number): Prop[] {
  return [{ k: 'pad', p: [[x1, y], [x2, y]] }, { k: 'line', p: [[x1 + 3, y + 1.8], [x1 + 3, FLOOR_Y]] }, { k: 'line', p: [[x2 - 3, y + 1.8], [x2 - 3, FLOOR_Y]] }];
}

/** Respaldo paralelo al torso (detrás, o al frente con `chest`), asiento y soportes. */
function bench(hip: P, torso: number, chest = false): Prop[] {
  const t = dir(torso);
  const back: P = chest ? [-t[1], t[0]] : [t[1], -t[0]];
  const base = add(hip, back, 3.5);
  const from = add(base, t, -2);
  const to = add(base, t, 23);
  // Casi horizontal: es un banco plano.
  if (Math.abs(t[1]) < 0.25) return flatBench(Math.min(from[0], to[0]), Math.max(from[0], to[0]), base[1]);
  const support = add(base, t, 13);
  const seat: Prop[] = chest ? [] : [{ k: 'pad', p: [[hip[0] - 2.5, hip[1] + 3.5], [hip[0] + 9, hip[1] + 3.5]] }, { k: 'line', p: [[hip[0] + 4, hip[1] + 5.2], [hip[0] + 4, FLOOR_Y]] }];
  return [{ k: 'pad', p: [from, to] }, { k: 'line', p: [support, [support[0], FLOOR_Y]] }, ...seat];
}

// ---------------------------------------------------------------- Posturas base

/** De pie, de lado. */
const stand = (over: Partial<SidePose> = {}): SidePose => ({ hip: [29, G - 22], torso: 180, arm: [2, 6], leg: foot(30), leg2: foot(26.5), ...over });
/** Sentado erguido, de lado: muslo horizontal y espinilla vertical. */
const SEAT: P = [23, G - 11];
const sit = (over: Partial<SidePose> = {}): SidePose => ({ hip: SEAT, torso: 182, arm: [4, 30], leg: [90, 0, 90], ...over });
const stool = (hip: P = SEAT): Prop[] => flatBench(hip[0] - 5, hip[0] + 9, hip[1] + 3.5);
const gripSeat: Limb = { on: 'hip', d: [3.5, 1], b: -1 };

/** De pie, de frente. */
const FRONT_HIP: P = [32, G - 22];
const fstand = (over: Partial<FrontPose> = {}): FrontPose => ({ hip: FRONT_HIP, lift: 0, arm: [6, 3], leg: [4, 0], ...over });
/** Sentado, de frente: el muslo se ve corto porque apunta hacia quien mira. */
const FRONT_SEAT: P = [32, G - 14.94];
const fsit = (over: Partial<FrontPose> = {}): FrontPose => ({ hip: FRONT_SEAT, thigh: 4, arm: [8, 2], leg: [10, 0], ...over });
const fseat: Prop[] = [FLOOR, { k: 'pad', p: [[23.5, FRONT_SEAT[1] + 3], [40.5, FRONT_SEAT[1] + 3]] }, { k: 'line', p: [[32, FRONT_SEAT[1] + 4.6], [32, FLOOR_Y]] }];

const plate = (at = 'hand', r = 4.2): Gear => ({ k: 'plate', at, r });
const db = (at = 'hand', perp = false): Gear => ({ k: 'db', at, perp });
const dbs: Gear[] = [db('handL'), db('handR')];
const barbell = (ext = 9): Gear => ({ k: 'bar', ext });

type Tool = 'bar' | 'db' | 'smith' | 'ez';
const held = (tool: Tool, at = 'hand'): Gear => (tool === 'bar' ? plate(at) : tool === 'smith' ? { k: 'smith', at, r: 4.2 } : tool === 'ez' ? { k: 'ez', at } : db(at));

// ---------------------------------------------------------------- Pecho

/** Press acostado visto de lado: la barra baja al pecho y sube sobre los hombros. */
function benchPress(incline: number, tool: Tool): FigureDef {
  const hip: P = incline ? [40, 47.6] : [40, 44.4];
  const torso = -90 - incline;
  const sh = shoulderOf(hip, torso);
  const x = sh[0] + (incline ? 3 : 2);
  const a: SidePose = { hip, torso, arm: { to: [x + (tool === 'smith' ? 0 : 1.5), sh[1] - 6.2], b: -1 }, leg: { to: [hip[0] + 11.5, G], b: 1 } };
  return side(a, { arm: { to: [x, sh[1] - 16.6], b: -1 } }, [held(tool)], [FLOOR, ...bench(hip, torso)]);
}

/** Acostado en banco, visto desde los pies: muestra el ancho del agarre y las aperturas. */
const lying = (over: Partial<FrontPose>): FrontPose => ({ hip: [32, 44.2], len: 6, headDy: 2.4, thigh: 5, leg: [28, 0], arm: [90, 90], ...over });
const lyingBench: Prop[] = [FLOOR, { k: 'pad', p: [[21, 46.8], [43, 46.8]] }, { k: 'line', p: [[32, 48.6], [32, FLOOR_Y]] }];

function dips(lean: number): FigureDef {
  const hand: P = [31, 39];
  const leg: Limb = [8, -68, -20];
  return side(
    { hip: [30.5 - lean * 0.08, 36.4], torso: 178 - lean * 0.4, arm: { to: hand, b: -1 }, leg },
    { hip: [29.5 - lean * 0.12, 44], torso: 176 - lean },
    [],
    [{ k: 'line', p: [[21, 40.7], [41, 40.7]] }, post(24, 40.7), post(38, 40.7)],
  );
}

const pushup = (): FigureDef =>
  side(
    { hip: [30.5, 47.8], torso: 110.9, arm: { to: [44, G], b: -1 }, leg: { to: [10, 55.6], b: -1, ft: 0 } },
    { hip: [31.75, 53.74], torso: 94.9 },
    [{ k: 'db', at: 'chest', d: [-1.2, -3.8], ang: 103, len: 9 }],
  );

const machinePress = (): FigureDef => {
  const hip: P = [22, G - 11];
  const sh = shoulderOf(hip, 184);
  return side(
    sit({ hip, torso: 184, arm: { to: [sh[0] + 6.5, sh[1] + 2.5], b: -1 } }),
    { arm: { to: [sh[0] + 16.5, sh[1] + 1], b: -1 } },
    [{ k: 'lever', from: [37, 9], at: 'hand' }],
    [FLOOR, ...bench(hip, 184), stack(52)],
  );
};

const pecDeck = (): FigureDef =>
  front(fsit({ arm: [90, 180] }), { arm: [-35, 180] }, [{ k: 'roller', at: 'foreL', r: 2.4 }, { k: 'roller', at: 'foreR', r: 2.4 }], fseat);

function crossover(high: boolean): FigureDef {
  const pulleys: Gear[] = [
    { k: 'cable', from: [5, high ? 5 : 59], at: 'handL', end: 'none' },
    { k: 'cable', from: [59, high ? 5 : 59], at: 'handR', end: 'none' },
  ];
  const a: Limb = high ? { to: [15, 13.5], b: -1 } : { to: [13.5, 46], b: -1 };
  const b: Limb = high ? { to: [30.5, 41], b: -1 } : { to: [29.5, 27.5], b: -1 };
  return front(fstand({ arm: a, leg: [7, 0] }), { arm: b }, pulleys, [FLOOR, post(5, 3), post(59, 3)]);
}

// ---------------------------------------------------------------- Espalda

/** Remo sentado en máquina. Codos abiertos: el codo sube a la altura del hombro; pegados: baja junto al torso. */
function machineRow(open: boolean, chestPad: boolean, plateLoaded: boolean): FigureDef {
  const hip: P = [20, G - 11];
  const sh = shoulderOf(hip, 176);
  const b = -1;
  const props: Prop[] = [FLOOR, ...stool(hip)];
  if (chestPad) props.push({ k: 'pad', p: [[sh[0] + 3.8, sh[1] + 1], [sh[0] + 3.8, sh[1] + 11]] }, { k: 'line', p: [[sh[0] + 5.6, sh[1] + 8], [sh[0] + 5.6, FLOOR_Y]] });
  if (!plateLoaded) props.push(stack(53));
  return side(
    sit({ hip, torso: 176, arm: { to: [sh[0] + 16.4, sh[1] + 2.5], b } }),
    { arm: { to: open ? [sh[0] + 4.5, sh[1] + 1.5] : [sh[0] + 3, sh[1] + 9.5], b } },
    [plateLoaded ? { k: 'lever', from: [50, 58], at: 'hand', plate: true } : { k: 'lever', from: [sh[0] + 15, 8], at: 'hand' }],
    props,
  );
}

function cableRow(open: boolean): FigureDef {
  const hip: P = [19, 50];
  const b = -1;
  const sa = shoulderOf(hip, 170);
  const sb = shoulderOf(hip, 187);
  const leg: Limb = { to: [39, 53.5], b: 1, ft: 172 };
  return side(
    { hip, torso: 170, arm: { to: [sa[0] + 16, sa[1] + 4], b }, leg },
    { torso: 187, arm: { to: open ? [sb[0] + 5.5, sb[1] + 3] : [sb[0] + 4, sb[1] + 9.5], b } },
    [{ k: 'cable', from: [50, 47], at: 'hand', end: open ? 'bar' : 'none' }],
    [FLOOR, ...flatBench(12, 30, 53.5), { k: 'pad', p: [[41.6, 46], [41.6, 58]] }, stack(54)],
  );
}

/** Remo con mancuerna: mano y rodilla lejanas apoyadas en el banco. */
function dumbbellRow(open: boolean): FigureDef {
  const hip: P = [29, 39.5];
  const sh = shoulderOf(hip, 96);
  return side(
    { hip, torso: 96, arm: { to: [sh[0], sh[1] + 16.6], b: -1 }, arm2: { to: [sh[0] + 1, 49.6], b: -1 }, leg: foot(26), leg2: [8, -88, -90] },
    { arm: { to: open ? [sh[0] - 0.5, sh[1] + 6.5] : [sh[0] - 6.5, sh[1] + 7], b: -1 } },
    [db()],
    [FLOOR, ...flatBench(17, 52, 52.4)],
  );
}

function bentRow(torso: number, low: P, high: P, gear: Gear[]): FigureDef {
  return side({ hip: [24, 40], torso, arm: { to: low, b: -1 }, leg: foot(28), leg2: foot(24.5) }, { arm: { to: high, b: -1 } }, gear);
}

const invertedRow = (): FigureDef =>
  side(
    { hip: [28.9, 53.6], torso: -105.9, arm: { to: [16, 33], b: -1 }, leg: { to: [50, G], b: 1, ft: 160 } },
    { hip: [30.7, 49.3], torso: -118 },
    [],
    [FLOOR, post(8, 22), { k: 'line', p: [[8, 33], [16, 33]] }, { k: 'ring', at: [16, 33], r: 1.6 }],
  );

/** Jalón de cable de pie o sentado: los brazos van de un punto a otro con el codo hacia `b`. */
function cablePull(pose: SidePose, from: P, to: P, pulley: P, end: 'rope' | 'bar' | 'none', props: Prop[], b = 1): FigureDef {
  return side({ ...pose, arm: { to: from, b } }, { arm: { to, b } }, [{ k: 'cable', from: pulley, at: 'hand', end }], [FLOOR, ...props]);
}

function pulldownFront(oneArm: boolean): FigureDef {
  const hip: P = [32, 46];
  const seat: Prop[] = [FLOOR, { k: 'pad', p: [[23.5, 49], [40.5, 49]] }, { k: 'line', p: [[32, 50.6], [32, FLOOR_Y]] }];
  if (oneArm) {
    return front(
      fsit({ hip, arm: { to: [22, 15], b: 1 }, armR: [10, -8], leg: [10, 0] }),
      { arm: { to: [20.5, 31], b: 1 } },
      [{ k: 'cable', from: [22, 3], at: 'handL', end: 'bar' }],
      seat,
    );
  }
  return front(fsit({ hip, arm: { to: [18.5, 15], b: 1 } }), { arm: { to: [20, 29.5], b: 1 } }, [{ k: 'bar', ext: 2.5, plates: false }, { k: 'cable', from: [32, 3], at: 'mid', end: 'none' }], seat);
}

function pullup(weighted: boolean): FigureDef {
  const hands: Limb = { to: [23.5, 9], b: 1 };
  return front(
    { hip: [32, 39.5], arm: hands, leg: [3, 0] },
    { hip: [32, 29] },
    weighted ? [{ k: 'weight', at: 'hip', d: [0, 8] }] : [],
    [{ k: 'line', p: [[13, 4], [13, 9], [51, 9], [51, 4]] }],
  );
}

// ---------------------------------------------------------------- Hombro

function overheadFront(seated: boolean, start: P, gear: Gear[]): FigureDef {
  const base = seated ? fsit({ arm: { to: start, b: 1 } }) : fstand({ arm: { to: start, b: 1 }, leg: [6, 0] });
  const sy = base.hip[1] - LEN.torso;
  return front(base, { arm: { to: [seated ? 25 : 24.5, sy - 16.4], b: 1 } }, gear, seated ? fseat : [FLOOR]);
}

function seatedPressSide(handX: number, gear: Gear[], props: Prop[]): FigureDef {
  const hip: P = [24, G - 11];
  const sh = shoulderOf(hip, 184);
  return side(sit({ hip, torso: 184, arm: { to: [sh[0] + handX, sh[1] - 3], b: -1 } }), { arm: { to: [sh[0] + handX, sh[1] - 16.7], b: -1 } }, gear, [FLOOR, ...bench(hip, 184), ...props]);
}

const frontRaise = (cable: boolean): FigureDef =>
  side(stand({ arm: [4, 8], arm2: [-2, 3] }), { arm: [88, 92] }, cable ? [{ k: 'cable', from: [8, 59], at: 'hand', end: 'bar' }] : [db('hand', true)], cable ? [FLOOR, post(5, 30)] : [FLOOR]);

/** Tumbado boca abajo en banco inclinado (pecho apoyado). */
const proneIncline = (arm: Limb): SidePose => ({ hip: [22, 44], torso: 140, arm, leg: { to: [12, G], b: 1, ft: 60 } });
const proneBench = bench([22, 44], 140, true);

// ---------------------------------------------------------------- Brazos

/** Curl de pie: el brazo no se mueve, el antebrazo sube. */
const curl = (gear: Gear[], props: Prop[] = [FLOOR], over: Partial<SidePose> = {}): FigureDef => side(stand({ arm: [0, 6], ...over }), { arm: [-2, 150] }, gear, props);

function preacher(gear: Gear[], machine: boolean): FigureDef {
  const hip: P = [19, G - 11];
  return side(
    sit({ hip, torso: 168, arm: [45, 50] }),
    { arm: [45, 195] },
    gear,
    [FLOOR, ...stool(hip), { k: 'pad', p: [[25, 34.5], [37, 46.5]] }, { k: 'line', p: [[33.5, 44.5], [33.5, FLOOR_Y]] }, ...(machine ? [stack(52)] : [])],
  );
}

/** Extensión de tríceps en polea alta, de pie frente a la máquina. */
function pushdown(end: 'rope' | 'bar' | 'none', oneArm: boolean): FigureDef {
  return side(
    stand({ hip: [24, G - 22], torso: 172, arm: [0, 125], ...(oneArm ? { arm2: { on: 'hip', d: [1.5, -1], b: -1 } } : {}), leg: foot(25.5), leg2: foot(22) }),
    { arm: [0, 12] },
    [{ k: 'cable', from: [41, 6], at: 'hand', end }],
    [FLOOR, post(46, 4), { k: 'line', p: [[41, 4], [46, 4]] }, stack(48, 26)],
  );
}

const skullCrusher = (gear: Gear[]): FigureDef => {
  const hip: P = [40, 44.4];
  return side({ hip, torso: -90, arm: [-170, -100], leg: { to: [51.5, G], b: 1 } }, { arm: [-176, -180] }, gear, [FLOOR, ...bench(hip, -90)]);
};

function wristCurl(from: number, to: number, r: number): FigureDef {
  const hip: P = [21, G - 11];
  return side(sit({ hip, torso: 150, arm: { to: [35, 46], b: -1 }, wrist: from }), { wrist: to }, [plate('tip', r)], [FLOOR, ...stool(hip)]);
}

// ---------------------------------------------------------------- Pierna

/** Sentadilla: el tobillo no se mueve; la cadera baja y se va hacia atrás. */
function squat(top: Partial<SidePose>, bottom: Partial<SidePose>, gear: Gear[], props: Prop[] = [FLOOR]): FigureDef {
  return side({ hip: [29, G - 22], torso: 176, arm: { on: 'back', b: 1 }, leg: foot(30), ...top }, { hip: [23.5, 48.5], torso: 150, ...bottom }, gear, props);
}

/** Prensa a 45°: la plataforma viaja sobre el riel; `oneLeg` deja la otra pierna abajo. */
function legPress(feet: 'mid' | 'high', oneLeg = false): FigureDef {
  const hip: P = [24, 51];
  const shift = feet === 'high' ? -1.6 : 0;
  const leg = (x: number, y: number): Limb => ({ to: [x + shift, y + shift], b: 1, ft: -135 });
  return side(
    { hip, torso: 235, arm: gripSeat, leg: leg(33, 43), ...(oneLeg ? { leg2: foot(39) } : {}) },
    { leg: leg(39.5, 36.5) },
    [{ k: 'plat', at: 'ankle', d: feet === 'high' ? [1.6, -1.2] : [-0.2, -3], ang: 45, len: 13 }, { k: 'plate', at: 'ankle', d: [6.5 - shift, -7.5 - shift], r: 3.4 }],
    [FLOOR, ...bench(hip, 235), { k: 'line', p: [[30, 59], [58, 31]] }],
  );
}

/** Zancada: dos apoyos separados; la cadera baja en vertical. */
function lunge(frontX: number, torso: number, rear: Limb, rearEnd: Limb, props: Prop[] = [FLOOR], hipY: [number, number] = [42.5, 49.5]): FigureDef {
  return side(
    { hip: [27, hipY[0]], torso, arm: [2, 2], leg: foot(frontX), leg2: rear },
    { hip: [27, hipY[1]], leg2: rearEnd },
    [db()],
    props,
  );
}

function stepUp(top: number): FigureDef {
  const y = top - 2.2;
  return side(
    { hip: [29, 38.6], torso: 165, arm: [4, 8], leg: { to: [40, y], b: 1 }, leg2: foot(27) },
    { hip: [41, y - 22], torso: 180, leg2: { to: [44, y], b: 1 } },
    [db()],
    [FLOOR, box(35, 55, top)],
  );
}

/** Bisagra de cadera de pie: el torso baja y la cadera se va hacia atrás. */
function hinge(bottom: { hip: P; torso: number; hand: P }, footX: number, gear: Gear[], topHand: P = [30.5, 39.8]): FigureDef {
  return side(
    { hip: [29, G - 22], torso: 180, arm: { to: topHand, b: -1 }, leg: foot(footX), leg2: foot(footX - 3) },
    { hip: bottom.hip, torso: bottom.torso, arm: { to: bottom.hand, b: -1 } },
    gear,
  );
}

/** Elevación de talones: la punta del pie queda fija en el escalón y el cuerpo sube. */
function calfRaise(toe: P, over: Partial<SidePose>, gear: Gear[], props: Prop[]): FigureDef {
  const ankle = (ft: number): P => add(toe, dir(ft), -LEN.foot);
  const [low, high] = [ankle(104), ankle(52)];
  return side(
    { hip: [low[0], low[1] - 22], torso: 180, arm: [2, 4], leg: { to: low, b: 1, ft: 104 }, ...over },
    { hip: [high[0], high[1] - 22], leg: { to: high, b: 1, ft: 52 } },
    gear,
    [FLOOR, ...props],
  );
}

function seatedCalf(gear: Gear[], arm: Limb, props: Prop[]): FigureDef {
  const toe: P = [37.5, 57.5];
  const ankle = (ft: number): P => add(toe, dir(ft), -LEN.foot);
  const hip: P = [22.1, 47.6];
  return side(
    { hip, torso: 178, arm, leg: { to: ankle(104), b: 1, ft: 104 } },
    { leg: { to: ankle(52), b: 1, ft: 52 } },
    gear,
    [FLOOR, { k: 'pad', p: [[34.5, 60], [44, 60]] }, ...stool(hip), ...props],
  );
}

/** Abducción / aducción sentado, de frente: las rodillas se separan a la misma altura. */
function hipMachine(open: boolean, lean: boolean, hold = 0): FigureDef {
  const closed = { thigh: 4, leg: [10, 0] as Limb };
  const wide = { thigh: 8, leg: [60.6, 4] as Limb };
  const pad = open ? -2.9 : 2.9;
  const base = fsit({ ...(lean ? { len: 9.5, headDy: 2 } : {}), arm: { on: 'hip', d: [-7, 1.5], b: -1 } });
  return front(
    { ...base, ...(open ? closed : wide) },
    open ? wide : closed,
    [{ k: 'roller', at: 'kneeL', d: [pad, 0], r: 2.3 }, { k: 'roller', at: 'kneeR', d: [-pad, 0], r: 2.3 }],
    fseat,
    hold ? { hold } : {},
  );
}

/** Hip thrust y puente: los hombros quedan fijos y la cadera sube en arco. */
function bridge(shoulder: P, angles: [number, number, number], footX: number, gear: Gear[], props: Prop[]): FigureDef {
  const pose = (torso: number): SidePose => ({ hip: add(shoulder, dir(torso), -LEN.torso), torso, arm: { on: 'lap', d: [-1, 0], b: 1 }, leg: foot(footX) });
  return { view: 'side', a: pose(angles[0]), m: pose(angles[1]), b: pose(angles[2]), gear, props: [FLOOR, ...props] };
}

// ---------------------------------------------------------------- Catálogo

export interface FigureEntry {
  key: string;
  group: string;
  name: string;
  def: FigureDef;
}

const LIBRARY: [string, [string, FigureDef][]][] = [
  [
    'Pectoral',
    [
      ['Press de banca plano con barra', benchPress(0, 'bar')],
      ['Press de banca inclinado con barra', benchPress(40, 'bar')],
      ['Press plano con mancuernas', benchPress(0, 'db')],
      ['Press inclinado con mancuernas', benchPress(40, 'db')],
      ['Press en máquina convergente', machinePress()],
      ['Press inclinado en Smith', benchPress(40, 'smith')],
      ['Aperturas en máquina (pec deck)', pecDeck()],
      ['Cruce de poleas altas', crossover(true)],
      ['Cruce de poleas bajas', crossover(false)],
      ['Aperturas con mancuernas en banco inclinado', front(lying({ arm: [98, 94] }), { arm: [170, 178] }, dbs, lyingBench)],
      ['Fondos en paralelas (énfasis pectoral)', dips(26)],
      ['Flexiones lastradas', pushup()],
    ],
  ],
  [
    'Espalda alta',
    [
      ['Remo en máquina con pecho apoyado agarre abierto', machineRow(true, true, false)],
      ['Remo Pendlay con barra', bentRow(98, [38.5, 54.6], [37, 45.5], [plate('hand', 5)])],
      ['Remo en polea baja agarre abierto', cableRow(true)],
      ['Remo con mancuerna a una mano (codo abierto)', dumbbellRow(true)],
      ['Remo en barra T', bentRow(120, [36, 49], [33, 42], [{ k: 'lever', from: [6, 60], at: 'hand' }, { k: 'plate', at: 'hand', d: [2.5, 1.5], r: 4 }])],
      ['Remo invertido', invertedRow()],
      ['Remo alto en polea con cuerda', cablePull(sit({ hip: [22, G - 11], torso: 186 }), [36, 24.5], [26.5, 30], [56, 8], 'rope', [...stool([22, G - 11]), post(58, 5), { k: 'line', p: [[56, 5], [58, 5]] }], -1)],
      ['Remo en máquina agarre prono (codos abiertos)', machineRow(true, false, true)],
    ],
  ],
  [
    'Dorsal',
    [
      ['Jalón al pecho agarre prono', pulldownFront(false)],
      [
        'Jalón al pecho agarre neutro',
        side(
          sit({ hip: [24, G - 11], torso: 180, arm: { to: [30, 17.5], b: -1 } }),
          { torso: 191, arm: { to: [28.5, 33], b: -1 } },
          [{ k: 'cable', from: [34, 4], at: 'hand', end: 'none' }],
          [FLOOR, ...stool([24, G - 11]), { k: 'pad', p: [[28, 45.4], [36, 45.4]] }, { k: 'line', p: [[38, 45.4], [38, FLOOR_Y]] }, stack(52)],
        ),
      ],
      ['Pulldown supino unilateral', pulldownFront(true)],
      ['Dominadas', pullup(false)],
      ['Dominadas lastradas', pullup(true)],
      ['Remo con barra (codos pegados)', bentRow(125, [36, 48.5], [31.5, 41.5], [plate()])],
      ['Remo en polea baja agarre neutro cerrado', cableRow(false)],
      ['Remo con mancuerna a una mano (codo pegado)', dumbbellRow(false)],
      ['Pullover en polea alta', side(stand({ hip: [24, G - 22], torso: 165, arm: [125, 130], leg: foot(27), leg2: foot(22) }), { arm: [10, 14] }, [{ k: 'cable', from: [56, 5], at: 'hand', end: 'rope' }], [FLOOR, post(59, 3), { k: 'line', p: [[56, 3], [59, 3]] }])],
      ['Pullover con mancuerna', side({ hip: [40, 44.4], torso: -90, arm: [-95, -100], leg: { to: [51.5, G], b: 1 } }, { arm: [-172, -176] }, [db('hand', true)], [FLOOR, ...bench([40, 44.4], -90)])],
      ['Jalón con brazos rectos en polea', side(stand({ hip: [24, G - 22], torso: 176, arm: [105, 108], leg: foot(26), leg2: foot(22.5) }), { arm: [12, 16] }, [{ k: 'cable', from: [54, 8], at: 'hand', end: 'bar' }], [FLOOR, post(57, 5), { k: 'line', p: [[54, 5], [57, 5]] }, stack(54, 30)])],
      ['Remo en máquina agarre neutro (codos pegados)', machineRow(false, true, false)],
    ],
  ],
  [
    'Deltoides anterior',
    [
      ['Press militar con barra de pie', overheadFront(false, [22.5, 21.5], [barbell(9)])],
      ['Press militar sentado con mancuernas', overheadFront(true, [20.5, 28.5], dbs)],
      ['Press de hombro en máquina', seatedPressSide(4.5, [{ k: 'lever', from: [9, 20], at: 'hand' }], [stack(3, 28)])],
      ['Press Arnold', front(fsit({ arm: [15, 185] }), { arm: [168, 184] }, dbs, fseat)],
      ['Elevaciones frontales con mancuernas', frontRaise(false)],
      ['Elevaciones frontales en polea', frontRaise(true)],
    ],
  ],
  [
    'Deltoides lateral',
    [
      ['Elevaciones laterales con mancuernas', front(fstand({ arm: [8, 6] }), { arm: [86, 90] }, dbs)],
      ['Elevaciones laterales en polea unilateral', front(fstand({ arm: [6, 4], armR: { to: [51, 28], b: -1 } }), { arm: [86, 90] }, [{ k: 'cable', from: [52, 59], at: 'handL', end: 'none' }], [FLOOR, post(52.5, 6)])],
      ['Elevaciones laterales en máquina', front(fsit({ arm: [12, 12] }), { arm: [84, 84] }, [{ k: 'roller', at: 'foreL', d: [0, -2.4], r: 2.4 }, { k: 'roller', at: 'foreR', d: [0, -2.4], r: 2.4 }], fseat)],
      ['Elevaciones laterales inclinado (Y-raise)', side(proneIncline([0, 0]), { arm: [128, 132] }, [db('hand', true)], [FLOOR, ...proneBench])],
      ['Press tras nuca en Smith', seatedPressSide(-1.5, [{ k: 'smith', at: 'hand', r: 4.2 }], [])],
      ['Remo al mentón agarre abierto', front(fstand({ arm: { to: [27.5, 39.5], b: -1 } }), { arm: { to: [27, 25.5], b: -1 } }, [barbell(8)])],
    ],
  ],
  [
    'Deltoides posterior',
    [
      ['Apertura posterior en máquina (pec deck inverso)', front(fsit({ arm: { to: [30.5, 33], b: -1 } }), { arm: { to: [11, 31], b: -1 } }, [{ k: 'roller', at: 'handL', r: 1.7 }, { k: 'roller', at: 'handR', r: 1.7 }], [...fseat, { k: 'pad', p: [[32, 33], [32, 43]] }])],
      ['Apertura para posterior con polea unilateral agarre neutro', front(fstand({ arm: { to: [36, 30], b: -1 }, armR: [6, 4] }), { arm: { to: [10.5, 24], b: -1 } }, [{ k: 'cable', from: [56, 27], at: 'handL', end: 'none' }], [FLOOR, post(56.5, 6)])],
      ['Pájaros con mancuernas', front(fstand({ len: 6, headDy: 4, arm: [6, 4] }), { arm: [82, 86] }, dbs)],
      ['Face pull en polea con cuerda', cablePull(stand({ hip: [26, G - 22], torso: 184, leg: foot(29), leg2: foot(22) }), [41, 21], [29.5, 18.5], [56, 12], 'rope', [post(58, 6), { k: 'line', p: [[56, 9], [58, 9]] }])],
      ['Apertura posterior con mancuernas en banco inclinado', front(fstand({ len: 10, headDy: 1.5, arm: [6, 4], leg: [10, 0] }), { arm: [82, 86] }, dbs, [FLOOR, { k: 'pad', p: [[32, 30.5], [32, 44]] }, { k: 'line', p: [[32, 44], [32, FLOOR_Y]] }])],
      ['Remo alto en polea para posterior', cablePull(stand({ hip: [26, G - 22], torso: 180, leg: foot(30), leg2: foot(21) }), [42, 26], [30, 26.5], [54, 27], 'bar', [stack(55, 20)])],
    ],
  ],
  [
    'Trapecio',
    [
      ['Encogimientos con barra', front(fstand({ arm: [3, 1] }), { lift: 2.8 }, [barbell(9)])],
      ['Encogimientos con mancuernas', front(fstand({ arm: [8, 4] }), { lift: 2.8 }, [{ k: 'db', at: 'handL', len: 5.4 }, { k: 'db', at: 'handR', len: 5.4 }])],
      ['Encogimientos en máquina', front(fstand({ arm: [9, 4] }), { lift: 2.8 }, [{ k: 'lever', from: [10, 58], at: 'handL', plate: true }, { k: 'lever', from: [54, 58], at: 'handR', plate: true }])],
      ['Encogimientos en polea', front(fstand({ arm: [3, 1] }), { lift: 2.8 }, [{ k: 'bar', ext: 2.5, plates: false }, { k: 'cable', from: [32, 61], at: 'mid', end: 'none' }])],
      ['Encogimientos en Smith', front(fstand({ arm: [3, 1] }), { lift: 2.8 }, [{ k: 'rails', ext: 9 }, barbell(9)])],
    ],
  ],
  [
    'Bíceps',
    [
      ['Curl con barra recta', curl([plate('hand', 4)])],
      ['Curl con barra Z', curl([{ k: 'ez', at: 'hand' }])],
      ['Curl predicador en máquina', preacher([{ k: 'roller', at: 'hand', r: 2.3 }], true)],
      ['Curl predicador con barra Z', preacher([{ k: 'ez', at: 'hand' }], false)],
      ['Curl inclinado con mancuernas', side({ hip: [30, 47.6], torso: 215, arm: [0, 4], leg: foot(42) }, { arm: [0, 150] }, [db('hand', true)], [FLOOR, ...bench([30, 47.6], 215)])],
      ['Curl bayesiano en polea', side(stand({ torso: 176, arm: [-28, -18], leg: foot(33), leg2: foot(23) }), { arm: [-12, 128] }, [{ k: 'cable', from: [7, 59], at: 'hand', end: 'none' }], [FLOOR, post(4, 30)])],
      ['Curl martillo con mancuernas', curl([db('hand', true)])],
      ['Curl en polea baja con barra', curl([{ k: 'cable', from: [52, 59], at: 'hand', end: 'bar' }], [FLOOR, post(55, 28)])],
      ['Curl concentrado', side(sit({ hip: [22, G - 11], torso: 140, arm: [8, 30], arm2: { on: 'knee', d: [-2, -1], b: -1 } }), { arm: [8, 170] }, [db('hand', true)], [FLOOR, ...stool([22, G - 11])])],
      ['Curl spider', side(proneIncline([0, 4]), { arm: [0, 150] }, [plate('hand', 3.6)], [FLOOR, ...proneBench])],
      ['Curl alterno con mancuernas de pie', curl([db(), { k: 'db', at: 'hand2' }], [FLOOR], { arm2: [-3, 4] })],
    ],
  ],
  [
    'Tríceps',
    [
      ['Extensión de tríceps en polea con cuerda', pushdown('rope', false)],
      ['Extensión de tríceps en polea con barra recta', pushdown('bar', false)],
      ['Extensión sobre cabeza en polea con cuerda', side(stand({ hip: [26, G - 22], torso: 155, arm: [150, -105], leg: foot(32), leg2: foot(22) }), { arm: [150, -210] }, [{ k: 'cable', from: [8, 15], at: 'hand', end: 'rope' }], [FLOOR, post(5, 10)])],
      ['Press francés con barra Z', skullCrusher([{ k: 'ez', at: 'hand' }])],
      ['Press francés con mancuernas', skullCrusher([db('hand', true)])],
      ['Fondos en máquina', side(sit({ hip: [24, G - 11], torso: 180, arm: { to: [28.5, 41], b: -1 } }), { arm: { to: [27.5, 50.5], b: -1 } }, [{ k: 'lever', from: [8, 46], at: 'hand', plate: true }], [FLOOR, ...bench([24, G - 11], 180)])],
      ['Press cerrado con barra', front(lying({ arm: [70, 250] }), { arm: [172, 188] }, [barbell(16)], lyingBench)],
      ['Extensión de tríceps unilateral en polea', pushdown('none', true)],
      ['Patada de tríceps en polea', side({ hip: [22, 39], torso: 105, arm: [-85, 0], arm2: { on: 'knee2', d: [0, -2], b: -1 }, leg: foot(25), leg2: foot(29) }, { arm: [-85, -88] }, [{ k: 'cable', from: [54, 59], at: 'hand', end: 'none' }], [FLOOR, post(57, 30)])],
      ['Fondos en paralelas (énfasis tríceps)', dips(4)],
      ['Extensión sobre cabeza con mancuerna', side(sit({ hip: [24, G - 11], torso: 180, arm: [176, -35] }), { arm: [176, -180] }, [db('hand', true)], [FLOOR, ...stool([24, G - 11])])],
    ],
  ],
  [
    'Antebrazo',
    [
      ['Curl de muñeca con barra', wristCurl(50, 150, 3.2)],
      ['Extensión de muñeca con barra', wristCurl(15, 105, 2.6)],
      ['Curl inverso con barra Z', side(stand({ arm: [4, 8], wrist: 40 }), { arm: [6, 138], wrist: 170 }, [{ k: 'ez', at: 'hand' }])],
      ['Paseo del granjero', side({ hip: [30, 38.8], torso: 180, arm: [2, 2], arm2: [-2, 0], leg: foot(37), leg2: foot(21, 1, 60) }, { leg: foot(21, 1, 60), leg2: foot(37) }, [plate('hand', 3.4), plate('hand2', 3.4)])],
      ['Curl de muñeca tras la espalda', side(stand({ arm: [-10, -6], wrist: -5 }), { wrist: -100 }, [plate('tip', 3.4)])],
    ],
  ],
  [
    'Abdomen',
    [
      ['Flexión de tronco con soga en polea alta', side({ hip: [29, 48.2], torso: 160, arm: { on: 'head', d: [3, 2], b: -1 }, leg: { to: [19, 59.4], b: 1, ft: -90 } }, { hip: [27, 48.5], torso: 105 }, [{ k: 'cable', from: [50, 5], at: 'hand', end: 'rope' }], [FLOOR, post(54, 3), { k: 'line', p: [[50, 3], [54, 3]] }])],
      ['Crunch en máquina', side(sit({ hip: [24, G - 11], torso: 186, arm: { on: 'shoulder', d: [4, -2], b: -1 } }), { torso: 148 }, [{ k: 'roller', at: 'chest', d: [3.6, -2], r: 2.5 }, { k: 'lever', from: [40, 50], at: 'chest', d: [3.6, -2] }], [FLOOR, ...bench([24, G - 11], 186), stack(52)])],
      ['Elevación de piernas colgado', side({ hip: [30, 36.6], torso: 180, arm: [180, 180], leg: [2, 2, 92] }, { leg: [88, 86, 176] }, [], [{ k: 'ring', at: [30, 4.6], r: 1.5 }, { k: 'line', p: [[30, 0], [30, 3]] }])],
      ['Elevación de rodillas en banco', side({ hip: [26, G - 11], torso: 205, arm: { to: [17, 50.5], b: -1 }, leg: [78, 70, 60] }, { leg: [152, 30, 70] }, [], [FLOOR, ...flatBench(9, 31, 52.1)])],
      ['Plancha', side({ hip: [32.3, 52.2], torso: -98.4, arm: [0, -90], leg: { to: [54, 55.4], b: 1, ft: 10 } }, { hip: [32.4, 51.4], torso: -95.2 })],
      [
        'Rueda abdominal',
        {
          view: 'side',
          a: { hip: [20, 48.2], torso: 120, arm: { to: [36, 56], b: -1 }, leg: { to: [11, 59.4], b: 1, ft: -90 } },
          m: { hip: [25.9, 48.7], torso: 111, arm: { to: [46.7, 56], b: -1 }, leg: { to: [11, 59.4], b: 1, ft: -90 } },
          b: { hip: [30.5, 52.5], torso: 102, arm: { to: [57.5, 56], b: -1 }, leg: { to: [11, 59.4], b: 1, ft: -90 } },
          gear: [plate('hand', 3.4)],
          props: [FLOOR],
        },
      ],
      ['Crunch en fitball', side({ hip: [33, 44.5], torso: 245, arm: { on: 'head', d: [1, -1], b: 1 }, leg: foot(45) }, { torso: 212 }, [], [FLOOR, { k: 'ring', at: [27, 52.4], r: 8.6 }])],
      ['Press Pallof en polea', side(stand({ hip: [30, G - 22], arm: { to: [33.5, 30], b: -1 }, leg: foot(34), leg2: foot(25) }), { arm: { to: [46.5, 27], b: -1 } }, [{ k: 'cable', from: [7, 28], at: 'hand', end: 'none' }], [FLOOR, post(4, 10)])],
      ['Encogimiento de piernas en polea baja', side({ hip: [28, 56.4], torso: -90, arm: [92, 92], leg: [84, 86, 170] }, { leg: [165, 60, 120] }, [{ k: 'cable', from: [58, 55], at: 'ankle', end: 'none' }], [FLOOR, post(60, 40)])],
    ],
  ],
  [
    'Cuádriceps',
    [
      [
        'Sentadilla Hack',
        side(
          { hip: [31, 41], torso: 205, arm: { on: 'shoulder', d: [3.5, 1], b: 1 }, leg: { to: [45, 56], b: 1, ft: 118 } },
          { hip: [34.4, 48.25] },
          [{ k: 'plat', at: 'chest', d: [-3, 1.4], ang: 205, len: 14 }, { k: 'roller', at: 'shoulder', d: [1.6, -2.8], r: 2.4 }],
          [FLOOR, { k: 'line', p: [[15.5, 18.5], [36.5, FLOOR_Y]] }, { k: 'pad', p: [[42.5, 59.6], [52, 54]] }],
        ),
      ],
      ['Sentadilla con barra alta', squat({}, {}, [plate('back')])],
      [
        'Sentadilla en máquina péndulo',
        side(
          { hip: [30, 39], torso: 190, arm: { on: 'shoulder', d: [3.5, 1], b: 1 }, leg: { to: [40, 57], b: 1, ft: 108 } },
          { hip: [27, 50], torso: 172 },
          [{ k: 'lever', from: [9, 7], at: 'shoulder', d: [0, -2.6], plate: true }, { k: 'roller', at: 'shoulder', d: [0.6, -2.8], r: 2.4 }],
          [FLOOR, post(9, 5), { k: 'pad', p: [[38, 60.4], [50, 56.6]] }],
        ),
      ],
      ['Prensa 45°', legPress('mid')],
      [
        'Prensa horizontal',
        side(
          { hip: [20, G - 11], torso: 195, arm: gripSeat, leg: { to: [34, 45], b: 1, ft: 180 } },
          { leg: { to: [41, 46], b: 1, ft: 180 } },
          [{ k: 'plat', at: 'ankle', d: [2.4, -2.2], ang: 0, len: 12 }],
          [FLOOR, ...bench([20, G - 11], 195), { k: 'line', p: [[26, 55], [52, 55]] }, stack(54)],
        ),
      ],
      ['Extensión de cuádriceps bilateral', side(sit({ hip: [22, G - 11], torso: 186, arm: gripSeat, leg: [90, 2, 92] }), { leg: [90, 86, 176] }, [{ k: 'roller', at: 'instep', r: 2.3 }], [FLOOR, ...bench([22, G - 11], 186), stack(3, 28)])],
      ['Extensión de cuádriceps unilateral', side(sit({ hip: [22, G - 11], torso: 186, arm: gripSeat, leg: [90, 2, 92], leg2: [90, 2, 92] }), { leg: [90, 86, 176] }, [{ k: 'roller', at: 'instep', r: 2.3 }], [FLOOR, ...bench([22, G - 11], 186), stack(3, 28)])],
      ['Sentadilla en Smith (pies adelantados)', squat({ hip: [28, 38.4], torso: 180, leg: foot(37) }, { hip: [28, 49.5], torso: 180 }, [{ k: 'smith', at: 'back', r: 4.2 }])],
      ['Sentadilla búlgara (énfasis cuádriceps)', lunge(36, 178, { to: [13, 47.4], b: 1, ft: -60 }, { to: [13, 47.4], b: 1, ft: -60 }, [FLOOR, ...flatBench(5, 19, 50.6)], [39.5, 47.5])],
      ['Zancadas caminando', lunge(41, 178, foot(13, 1, 30), foot(13, 1, 30))],
      ['Sentadilla frontal', squat({ arm: { on: 'front', d: [0.5, 1], b: 1 } }, { hip: [24.5, 48.5], torso: 164 }, [plate('front')])],
      ['Sentadilla sissy', side({ hip: [30, G - 22], torso: 180, arm: { to: [37.5, 30], b: -1 }, leg: foot(30) }, { hip: [29, 45.5], torso: 205, leg: { to: [31, 57.6], b: 1, ft: 45 } }, [], [FLOOR, post(38.5, 20)])],
      ['Step up en cajón', stepUp(52)],
      ['Sentadilla goblet', squat({ torso: 172, arm: { on: 'chest', d: [4.5, -4], b: -1 } }, { torso: 158 }, [{ k: 'db', at: 'hand', ang: 0, len: 7.5 }])],
      ['Prensa unilateral', legPress('mid', true)],
    ],
  ],
  [
    'Isquiosurales',
    [
      ['Buenos días con barra', side({ hip: [28, G - 22], torso: 178, arm: { on: 'back', b: 1 }, leg: foot(28), leg2: foot(25) }, { hip: [23, 38.6], torso: 100 }, [plate('back')])],
      ['Peso muerto convencional', side({ hip: [23, 47], torso: 128, arm: { to: [34, 54.6], b: -1 }, leg: foot(30) }, { hip: [29, G - 22], torso: 180, arm: { to: [30.5, 39.8], b: -1 } }, [plate('hand', 5)])],
      ['Curl de isquiosurales tumbado en máquina', side({ hip: [30, 43], torso: 96, arm: { to: [46, 52], b: -1 }, leg: [-88, -92, 0] }, { leg: [-88, -195, -90] }, [{ k: 'roller', at: 'heel', r: 2.3 }], [FLOOR, ...flatBench(15, 52, 46.5), stack(55, 28)])],
      ['Curl de isquiosurales sentado en máquina', side(sit({ hip: [22, G - 11], torso: 190, arm: gripSeat, leg: [88, 84, 170] }), { leg: [88, -28, 62] }, [{ k: 'roller', at: 'heel', r: 2.3 }], [FLOOR, ...bench([22, G - 11], 190), { k: 'pad', p: [[26, 44.8], [32.5, 44.8]] }, stack(54)])],
      ['Curl de isquiosurales de pie unilateral', side(stand({ hip: [30, G - 22], torso: 168, arm: { to: [38, 30], b: -1 }, leg: [2, 0, 90], leg2: foot(30.5) }), { leg: [2, -115, -25] }, [{ k: 'roller', at: 'heel', r: 2.3 }], [FLOOR, { k: 'pad', p: [[33.6, 38], [33.6, 50]] }, post(38.5, 26), stack(46, 28)])],
      ['Peso muerto rumano con barra', hinge({ hip: [24, 38.4], torso: 100, hand: [37, 52.5] }, 29, [plate()])],
      ['Peso muerto rumano con mancuernas', hinge({ hip: [24, 38.4], torso: 100, hand: [37, 52.5] }, 29, [db()])],
      ['Buenos días en Smith', side({ hip: [30.5, G - 22], torso: 178, arm: { on: 'back', b: 1 }, leg: foot(28) }, { hip: [17.2, 41.5], torso: 108 }, [{ k: 'smith', at: 'back', r: 4.2 }])],
      [
        'Curl nórdico',
        {
          view: 'side',
          a: { hip: [24, 48], torso: 180, arm: [40, 100], leg: { to: [13, 59.2], b: 1, ft: -90 } },
          m: { hip: [29.5, 49.5], torso: 152, arm: [50, 105], leg: { to: [13, 59.2], b: 1, ft: -90 } },
          b: { hip: [33.5, 53.5], torso: 122, arm: [60, 110], leg: { to: [13, 59.2], b: 1, ft: -90 } },
          gear: [],
          props: [FLOOR, { k: 'pad', p: [[10, 55.6], [16, 55.6]] }, { k: 'line', p: [[8, 55.6], [8, FLOOR_Y]] }],
        },
      ],
      ['Curl de isquios con fitball', side({ hip: [29, 53.2], torso: -74.8, arm: [90, 90], leg: { to: [49.5, 49.5], b: 1, ft: 180 } }, { hip: [27.3, 49.3], torso: -58, leg: { to: [39, 49.5], b: 1, ft: 180 } }, [{ k: 'ball', at: 'ankle', d: [1.5, 5.5], r: 5.2 }])],
      ['Peso muerto piernas rígidas', hinge({ hip: [25, 37.9], torso: 92, hand: [38.5, 54] }, 28, [plate()])],
      ['Curl de isquios en polea baja tumbado', side({ hip: [32, 56.2], torso: 94, arm: [60, 90], leg: [-89, -91, 0] }, { leg: [-89, -190, -95] }, [{ k: 'cable', from: [5, 57], at: 'ankle', end: 'none' }], [FLOOR, post(3, 40)])],
    ],
  ],
  [
    'Glúteo',
    [
      ['Hiperextensión inversa', side({ hip: [30, 38], torso: 92, arm: { to: [42, 45], b: -1 }, leg: [8, 4, 80] }, { leg: [-80, -84, 0] }, [], [FLOOR, ...flatBench(29, 55, 41.5)])],
      ['Hip thrust con barra', bridge([17.5, 45.5], [-121.2, -105.6, -90], 43, [plate('lap')], flatBench(5, 20, 48.9))],
      ['Hip thrust en máquina', bridge([17.5, 45.5], [-121.2, -105.6, -90], 43, [{ k: 'roller', at: 'lap', r: 2.6 }, { k: 'lever', from: [57, 58], at: 'lap', plate: true }], flatBench(5, 20, 48.9))],
      ['Sentadilla búlgara (énfasis glúteo)', lunge(40, 152, { to: [13, 47.4], b: 1, ft: -60 }, { to: [13, 47.4], b: 1, ft: -60 }, [FLOOR, ...flatBench(5, 19, 50.6)], [40.5, 48])],
      [
        'Peso muerto sumo',
        front(
          { hip: [32, 47], len: 12, arm: { to: [28, 51.6], b: -1 }, leg: { to: [19, G], b: -1 } },
          { hip: [32, 40.2], len: LEN.torso, arm: { to: [28, 42.4], b: -1 } },
          [barbell(12)],
        ),
      ],
      ['Patada de glúteo en polea', side({ hip: [30, 38], torso: 150, arm: { to: [45.5, 30], b: -1 }, leg: [8, 2, 90], leg2: foot(31) }, { leg: [-48, -62, 20] }, [{ k: 'cable', from: [44, 59.5], at: 'ankle', end: 'none' }], [FLOOR, post(46.5, 8)])],
      ['Patada de glúteo en máquina', side({ hip: [30, 39], torso: 115, arm: { to: [47, 41], b: -1 }, leg: [35, -40, 40], leg2: foot(31) }, { leg: [-62, -70, 20] }, [{ k: 'roller', at: 'heel', r: 2.5 }, { k: 'lever', from: [30, 22], at: 'ankle' }], [FLOOR, { k: 'pad', p: [[38, 38.5], [48, 34.5]] }, post(46, 36), post(30, 20)])],
      ['Abducción de cadera en máquina (tronco inclinado)', hipMachine(true, true)],
      ['Puente de glúteo con barra', bridge([14, 57], [-90, -76, -62], 38, [plate('lap', 3.8)], [])],
      [
        'Hiperextensión 45° enfoque glúteo',
        side(
          { hip: [29.6, 42.4], torso: 60, arm: { on: 'chest', d: [1, 0], b: 1 }, leg: [-45, -45, 45] },
          { torso: 135 },
          [],
          [FLOOR, { k: 'pad', p: [[29.5, 47.6], [35, 42.2]] }, { k: 'line', p: [[32.5, 46], [37, FLOOR_Y]] }, { k: 'line', p: [[11, 60.4], [37, 60.4]] }, { k: 'ring', at: [12.5, 55.4], r: 2 }],
        ),
      ],
      ['Zancadas inversas', side({ hip: [30, G - 22], torso: 178, arm: [2, 2], leg: foot(32), leg2: foot(28) }, { hip: [27, 48], leg2: foot(12, 1, 30) }, [db()])],
      ['Prensa con pies altos y abiertos', legPress('high')],
      ['Step up alto', stepUp(48.5)],
      ['Abducción de cadera en máquina', hipMachine(true, false)],
      ['Abducción de cadera en polea', front(fstand({ arm: [6, 3], armR: { to: [51, 28], b: -1 }, leg: [3, 0], legR: [4, 0] }), { leg: [38, 36] }, [{ k: 'cable', from: [52, 59.5], at: 'ankleL', end: 'none' }], [FLOOR, post(52.5, 8)])],
      ['Abducción lateral con banda', front(fstand({ arm: { to: [27, 37], b: -1 }, leg: [4, 0], legR: [4, 0] }), { leg: [30, 28] }, [{ k: 'band', from: 'ankleR', at: 'ankleL' }])],
      ['Abducción de cadera tumbado', side({ hip: [34, 55.5], torso: -94, arm: { on: 'head', d: [0, 1], b: 1 }, leg: [90, 90, 170], leg2: [90, 92, 170] }, { leg: [124, 126, 205] })],
    ],
  ],
  [
    'Aductores',
    [
      ['Adducción de cadera en máquina', hipMachine(false, false)],
      ['Adducción de cadera en máquina con pausa de 2 s', hipMachine(false, false, 0.4)],
      ['Adducción de cadera en polea', front(fstand({ arm: { to: [13.5, 26], b: -1 }, armR: [6, 3], leg: [32, 30], legR: [4, 0] }), { leg: [-10, -8] }, [{ k: 'cable', from: [13, 59.5], at: 'ankleL', end: 'none' }], [FLOOR, post(12.5, 8)])],
      [
        'Sentadilla sumo con mancuerna',
        front(
          { hip: [32, 39.7], arm: { to: [30.5, 41.6], b: -1 }, leg: { to: [20, G], b: -1 } },
          { hip: [32, 48.5], arm: { to: [30.5, 50.4], b: -1 } },
          [{ k: 'db', at: 'mid', d: [0, 3.6], ang: 0, len: 7.5 }],
        ),
      ],
      [
        'Copenhagen plank',
        side(
          { hip: [30.6, 48], torso: -110, arm: { to: [16.5, G], b: -1 }, arm2: { on: 'hip', d: [0, -2.5], b: 1 }, leg: { to: [52.5, 44.5], b: 1, ft: 90 }, leg2: [60, 75, 120] },
          { hip: [31.5, 43.6], torso: -92.4 },
          [],
          [FLOOR, ...flatBench(46, 61, 47.6)],
        ),
      ],
    ],
  ],
  [
    'Gastrocnemios',
    [
      ['Flexión plantar de pie en máquina (rodilla extendida)', calfRaise([33.5, 57.5], { arm: { on: 'shoulder', d: [3.4, -1], b: -1 } }, [{ k: 'roller', at: 'shoulder', d: [0.4, -3], r: 2.5 }, { k: 'lever', from: [8, 18], at: 'shoulder', d: [0.4, -3] }], [block, post(8, 10), stack(5, 34)])],
      [
        'Flexión plantar en prensa',
        side(
          { hip: [24, 51], torso: 235, arm: gripSeat, leg: { to: [38.6, 37.4], b: 1, ft: -112 } },
          { leg: { to: [38.6, 37.4], b: 1, ft: -162 } },
          [{ k: 'plat', at: 'toe', d: [1.2, -1.2], ang: 45, len: 13 }, { k: 'plate', at: 'toe', d: [8, -7], r: 3.4 }],
          [FLOOR, ...bench([24, 51], 235), { k: 'line', p: [[30, 59], [58, 31]] }],
        ),
      ],
      ['Flexión plantar en Smith', calfRaise([33.5, 57.5], { arm: { on: 'back', b: 1 } }, [{ k: 'smith', at: 'back', r: 4.2 }], [block])],
      ['Flexión plantar unilateral con mancuerna', calfRaise([33.5, 57.5], { arm: [2, 2], arm2: { to: [40, 28], b: -1 }, leg2: [10, -75, -30] }, [db()], [block, post(41, 16)])],
      [
        'Flexión plantar en máquina Hack',
        side(
          { hip: [31.5, 42.2], torso: 205, arm: { on: 'shoulder', d: [3.5, 1], b: 1 }, leg: { to: [44.3, 58.7], b: 1, ft: 135 } },
          { hip: [30.3, 39.7], leg: { to: [43, 55.9], b: 1, ft: 95 } },
          [{ k: 'plat', at: 'chest', d: [-3, 1.4], ang: 205, len: 14 }, { k: 'roller', at: 'shoulder', d: [1.6, -2.8], r: 2.4 }],
          [FLOOR, { k: 'line', p: [[15.5, 18.5], [36.5, FLOOR_Y]] }, { k: 'pad', p: [[45, 59.6], [54, 54.4]] }],
        ),
      ],
      ['Flexión plantar burro', calfRaise([30, 57.5], { torso: 95, arm: { to: [41, 49.6], b: -1 } }, [], [{ k: 'pad', p: [[27, 60], [36.5, 60]] }, ...flatBench(36, 50, 51.6)])],
    ],
  ],
  [
    'Sóleo',
    [
      ['Flexión plantar sentado en máquina', seatedCalf([{ k: 'roller', at: 'knee', d: [0.5, -3.2], r: 2.6 }, { k: 'lever', from: [52, 50], at: 'knee', d: [0.5, -3.2], plate: true }], { on: 'knee', d: [-3, -4.5], b: -1 }, [post(52, 44)])],
      ['Flexión plantar sentado en Smith', seatedCalf([{ k: 'smith', at: 'knee', d: [0.5, -5], r: 3.8 }], { on: 'knee', d: [-1, -5], b: -1 }, [])],
      ['Flexión plantar sentado con mancuernas', seatedCalf([{ k: 'db', at: 'knee', d: [0, -3.8], len: 8 }], { on: 'knee', d: [-1, -4], b: -1 }, [])],
    ],
  ],
];

/** Clave de un dibujo: el nombre del ejercicio sin acentos ni símbolos. */
export function figureKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const FIGURE_GROUPS: { group: string; items: { key: string; name: string }[] }[] = LIBRARY.map(([group, items]) => ({ group, items: items.map(([name]) => ({ key: figureKey(name), name })) }));

export const FIGURES: Record<string, FigureEntry> = Object.fromEntries(LIBRARY.flatMap(([group, items]) => items.map(([name, def]) => [figureKey(name), { key: figureKey(name), group, name, def }])));
