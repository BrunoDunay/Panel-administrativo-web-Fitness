// Esqueleto articulado para los dibujos de ejercicios. Una postura se describe con la posición
// de la cadera, el ángulo del torso y, para cada brazo y pierna, sus ángulos o el punto que debe
// alcanzar (la articulación intermedia se resuelve sola). Un ejercicio son dos posturas; el dibujo
// interpola entre ellas, así las manos se quedan en la barra y los pies en el piso.
//
// Este archivo no importa nada: también lo usa el script que genera la lámina de revisión.

export type P = [number, number];

/** Caja del dibujo: 64 × 64. El piso se dibuja en y = 61.8; un pie apoyado tiene el tobillo en GROUND. */
export const BOX = 64;
export const FLOOR = 61.8;
export const GROUND = 59.6;

const RAD = Math.PI / 180;
/** Dirección de un ángulo: 0 = abajo, 90 = derecha, 180 = arriba, −90 = izquierda. */
export const dir = (angle: number): P => [Math.sin(angle * RAD), Math.cos(angle * RAD)];
export const add = (p: P, d: P, k = 1): P => [p[0] + d[0] * k, p[1] + d[1] * k];
const mid = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const n = (value: number) => Math.round(value * 10) / 10;

/** Longitudes de los segmentos del cuerpo. */
export const LEN = { torso: 14.5, head: 5.6, headR: 3.8, upper: 8.5, fore: 8.5, thigh: 11, shin: 11, foot: 4.5, tip: 3.2 };

/**
 * Brazo o pierna. Dos formas:
 * - ángulos absolutos de cada segmento: [primero, segundo, pie?];
 * - alcance: `to` (punto fijo) o `on` + `d` (punto del propio cuerpo más un desplazamiento).
 *   `b` es hacia qué lado dobla la articulación (1 o −1) y `ft` el ángulo del pie.
 */
export type Limb = number[] | { to?: P; on?: string; d?: P; b?: number; ft?: number };

export interface SidePose {
  hip: P;
  torso: number;
  head?: number;
  arm: Limb;
  arm2?: Limb;
  leg: Limb;
  leg2?: Limb;
  /** Ángulo de la mano (para ejercicios de muñeca). */
  wrist?: number;
}

export interface FrontPose {
  hip: P;
  /** Largo del torso (más corto = inclinado hacia el frente). */
  len?: number;
  /** Cuánto suben los hombros (encogimientos). */
  lift?: number;
  headDy?: number;
  /** Largo del muslo (más corto = sentado, visto de frente). */
  thigh?: number;
  arm: Limb;
  armR?: Limb;
  leg: Limb;
  legR?: Limb;
}

export type Pose = SidePose | FrontPose;
export type Points = Record<string, P>;

/** Mezcla dos posturas: interpola todos los números y conserva lo demás de la primera. */
export function mix<T>(a: T, b: T, t: number): T {
  if (typeof a === 'number' && typeof b === 'number') return (a + (b - a) * t) as T;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((value, i) => mix(value, b[i] ?? value, t)) as T;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(a)) out[key] = mix((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key] ?? (a as Record<string, unknown>)[key], t);
    return out as T;
  }
  return a;
}

/** Dos segmentos que salen de `root` y llegan a `target`; devuelve la articulación y la punta. */
function reach(root: P, target: P, l1: number, l2: number, bend: number): { joint: P; end: P } {
  let dx = target[0] - root[0];
  let dy = target[1] - root[1];
  let d = Math.hypot(dx, dy) || 0.001;
  const max = l1 + l2 - 0.02;
  const min = Math.abs(l1 - l2) + 0.02;
  const clamped = Math.min(max, Math.max(min, d));
  dx = (dx / d) * clamped;
  dy = (dy / d) * clamped;
  d = clamped;
  const ux = dx / d;
  const uy = dy / d;
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const side = bend >= 0 ? 1 : -1;
  return {
    joint: [root[0] + ux * along + side * h * uy, root[1] + uy * along - side * h * ux],
    end: [root[0] + dx, root[1] + dy],
  };
}

function solve(root: P, spec: Limb, l1: number, l2: number, pts: Points, turn: (angle: number) => P): { joint: P; end: P } {
  if (Array.isArray(spec)) {
    const joint = add(root, turn(spec[0] ?? 0), l1);
    return { joint, end: add(joint, turn(spec[1] ?? 0), l2) };
  }
  const base = spec.on ? (pts[spec.on] ?? root) : null;
  const target: P = base ? [base[0] + (spec.d?.[0] ?? 0), base[1] + (spec.d?.[1] ?? 0)] : (spec.to ?? root);
  return reach(root, target, l1, l2, spec.b ?? 1);
}

const footAngle = (spec: Limb, fallback: number) => (Array.isArray(spec) ? (spec[2] ?? fallback) : (spec.ft ?? fallback));
const line = (...points: P[]) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${n(x)} ${n(y)}`).join('');

export interface Skeleton {
  /** Torso y extremidades del lado cercano. */
  body: string;
  /** Extremidades del lado lejano (se dibujan atenuadas). */
  far: string;
  head: P;
  pts: Points;
}

/** Vista de lado: la figura mira a la derecha. */
export function sideSkeleton(pose: SidePose): Skeleton {
  const tdir = dir(pose.torso);
  const shoulder = add(pose.hip, tdir, LEN.torso);
  /** Hacia la espalda, perpendicular al torso. */
  const back: P = [tdir[1], -tdir[0]];
  const head = add(shoulder, dir(pose.head ?? pose.torso), LEN.head);
  const pts: Points = {
    hip: pose.hip,
    shoulder,
    head,
    back: add(shoulder, back, 2.6),
    front: add(shoulder, back, -2.6),
    lap: add(pose.hip, back, -3.4),
    chest: add(pose.hip, tdir, LEN.torso * 0.62),
  };

  const leg = solve(pose.hip, pose.leg, LEN.thigh, LEN.shin, pts, dir);
  pts['knee'] = leg.joint;
  pts['ankle'] = leg.end;
  const foot = dir(footAngle(pose.leg, 90));
  pts['toe'] = add(leg.end, foot, LEN.foot);
  // Detrás del tobillo y sobre el empeine: donde apoyan los rodillos de las máquinas.
  pts['heel'] = add(leg.end, foot, -2.6);
  pts['instep'] = add(leg.end, foot, 2.6);
  let far = '';
  if (pose.leg2) {
    const leg2 = solve(pose.hip, pose.leg2, LEN.thigh, LEN.shin, pts, dir);
    pts['knee2'] = leg2.joint;
    pts['ankle2'] = leg2.end;
    pts['toe2'] = add(leg2.end, dir(footAngle(pose.leg2, 90)), LEN.foot);
    far += line(pose.hip, leg2.joint, leg2.end, pts['toe2']);
  }

  // Los brazos van después de las piernas: pueden apoyarse en la rodilla.
  const arm = solve(shoulder, pose.arm, LEN.upper, LEN.fore, pts, dir);
  pts['elbow'] = arm.joint;
  pts['hand'] = arm.end;
  let armPath = line(shoulder, arm.joint, arm.end);
  if (pose.wrist !== undefined) {
    pts['tip'] = add(arm.end, dir(pose.wrist), LEN.tip);
    armPath += `L${n(pts['tip'][0])} ${n(pts['tip'][1])}`;
  }
  if (pose.arm2) {
    const arm2 = solve(shoulder, pose.arm2, LEN.upper, LEN.fore, pts, dir);
    pts['elbow2'] = arm2.joint;
    pts['hand2'] = arm2.end;
    far += line(shoulder, arm2.joint, arm2.end);
  }

  return { body: line(shoulder, pose.hip) + line(pose.hip, leg.joint, leg.end, pts['toe']) + armPath, far, head, pts };
}

const SHOULDER_W = 5;
const HIP_W = 2.7;

/** Vista de frente: brazos y piernas son simétricos salvo que se indique el lado derecho. */
export function frontSkeleton(pose: FrontPose): Skeleton {
  const [cx, hy] = pose.hip;
  const lift = pose.lift ?? 0;
  const sy = hy - (pose.len ?? LEN.torso) - lift;
  const flip = (p: P): P => [2 * cx - p[0], p[1]];
  /** En el lado izquierdo, un ángulo positivo abre hacia afuera (a la izquierda). */
  const left = (angle: number): P => [-Math.sin(angle * RAD), Math.cos(angle * RAD)];
  const shL: P = [cx - SHOULDER_W, sy];
  const hipL: P = [cx - HIP_W, hy];
  const head: P = [cx, sy - LEN.head + (pose.headDy ?? 0) + lift];
  const pts: Points = { hip: [cx, hy], head, shL, shR: flip(shL), chest: [cx, sy + 4], neck: [cx, sy] };

  // Todo se resuelve como si fuera el lado izquierdo y el derecho se refleja.
  const side = (root: P, own: Limb, right: Limb | undefined, l1: number, l2: number) => {
    const l = solve(root, own, l1, l2, pts, left);
    if (!right) return { l, r: { joint: flip(l.joint), end: flip(l.end) } };
    const mirrored: Limb = Array.isArray(right) ? right : { ...right, to: right.to ? flip(right.to) : undefined };
    const r = solve(root, mirrored, l1, l2, pts, left);
    return { l, r: { joint: flip(r.joint), end: flip(r.end) } };
  };

  const legs = side(hipL, pose.leg, pose.legR, pose.thigh ?? LEN.thigh, LEN.shin);
  pts['kneeL'] = legs.l.joint;
  pts['ankleL'] = legs.l.end;
  pts['kneeR'] = legs.r.joint;
  pts['ankleR'] = legs.r.end;
  const footL = add(legs.l.end, [-3.2, 0.6]);
  const footR = add(legs.r.end, [3.2, 0.6]);

  const arms = side(shL, pose.arm, pose.armR, LEN.upper, LEN.fore);
  pts['elbowL'] = arms.l.joint;
  pts['handL'] = arms.l.end;
  pts['elbowR'] = arms.r.joint;
  pts['handR'] = arms.r.end;
  pts['foreL'] = mid(arms.l.joint, arms.l.end);
  pts['foreR'] = mid(arms.r.joint, arms.r.end);
  pts['mid'] = mid(arms.l.end, arms.r.end);

  const body =
    line(shL, pts['shR']) +
    line([cx, sy], [cx, hy]) +
    line(hipL, flip(hipL)) +
    line(hipL, legs.l.joint, legs.l.end, footL) +
    line(flip(hipL), legs.r.joint, legs.r.end, footR) +
    line(shL, arms.l.joint, arms.l.end) +
    line(pts['shR'], arms.r.joint, arms.r.end);

  return { body, far: '', head, pts };
}

// ---------------------------------------------------------------- Equipo

/**
 * Pieza de equipo. `at` es un punto del esqueleto (mano, hombro, tobillo…); se mueve con él.
 * - plate: disco de barra visto de lado · smith: disco que corre sobre un riel vertical
 * - db: mancuerna (`perp`: perpendicular al antebrazo) · ez: barra Z · cable/lever/band: línea desde un punto fijo
 * - roller: rodillo o almohadilla de máquina · plat: plataforma · ball: pelota
 * - bar/rails: barra vista de frente y rieles del Smith · weight: disco colgado (lastre)
 */
export type Gear =
  | { k: 'plate'; at: string; d?: P; r?: number }
  | { k: 'smith'; at: string; d?: P; r?: number }
  | { k: 'db'; at: string; d?: P; ang?: number; len?: number; perp?: boolean }
  | { k: 'ez'; at: string }
  | { k: 'cable'; from: P; at: string; end?: 'rope' | 'bar' | 'none' }
  | { k: 'lever'; from: P; at: string; d?: P; plate?: boolean }
  | { k: 'band'; from: P | string; at: string }
  | { k: 'roller'; at: string; d?: P; r?: number }
  | { k: 'plat'; at: string; d?: P; ang: number; len?: number }
  | { k: 'ball'; at: string; d?: P; r: number }
  | { k: 'bar'; ext?: number; plates?: boolean }
  | { k: 'rails'; ext?: number }
  | { k: 'weight'; at: string; d?: P };

/** Elemento fijo del dibujo: piso, banco, poste o pila de pesas. */
export type Prop =
  | { k: 'line'; p: P[] }
  | { k: 'pad'; p: P[] }
  | { k: 'stack'; at: P; w?: number; h?: number }
  | { k: 'ring'; at: P; r?: number }
  | { k: 'floor'; x?: [number, number]; y?: number };

const circle = ([x, y]: P, r: number) => `M${n(x - r)} ${n(y)}a${r} ${r} 0 1 0 ${n(r * 2)} 0a${r} ${r} 0 1 0 ${n(-r * 2)} 0`;
const at = (pts: Points, name: string, d?: P): P => {
  const p = pts[name] ?? pts['hip'] ?? [BOX / 2, BOX / 2];
  return d ? [p[0] + d[0], p[1] + d[1]] : p;
};

/** Trazos del equipo en un instante, agrupados por estilo. */
export interface GearPaths {
  thin: string;
  mid: string;
  thick: string;
  ring: string;
  solid: string;
  dash: string;
}

export function gearPaths(gear: Gear[], pts: Points, startPts: Points): GearPaths {
  const out: GearPaths = { thin: '', mid: '', thick: '', ring: '', solid: '', dash: '' };
  for (const item of gear) {
    switch (item.k) {
      case 'plate': {
        const c = at(pts, item.at, item.d);
        out.ring += circle(c, item.r ?? 4);
        out.solid += circle(c, 1);
        break;
      }
      case 'smith': {
        // El disco solo sube y baja: su x es la del riel.
        const c: P = [at(startPts, item.at, item.d)[0], at(pts, item.at, item.d)[1]];
        out.ring += circle(c, item.r ?? 4);
        out.solid += circle(c, 1);
        break;
      }
      case 'db': {
        const c = at(pts, item.at, item.d);
        const half = (item.len ?? 6.4) / 2;
        let u = dir(item.ang ?? 90);
        if (item.perp) {
          // Perpendicular al antebrazo: la mancuerna gira con la mano.
          const hand = at(pts, item.at);
          const elbow = pts[item.at.replace('hand', 'elbow')] ?? hand;
          const length = Math.hypot(hand[0] - elbow[0], hand[1] - elbow[1]) || 1;
          u = [-(hand[1] - elbow[1]) / length, (hand[0] - elbow[0]) / length];
        }
        out.thick += line(add(c, u, -half), add(c, u, half));
        break;
      }
      case 'ez': {
        const c = at(pts, item.at);
        out.ring += circle(c, 2.9);
        out.thin += line([c[0] - 3.6, c[1] + 1.2], [c[0] - 1.2, c[1] - 1.2], [c[0] + 1.2, c[1] + 1.2], [c[0] + 3.6, c[1] - 1.2]);
        break;
      }
      case 'cable': {
        const c = at(pts, item.at);
        out.thin += line(item.from, c);
        if (item.end === 'rope') out.solid += circle(c, 1.5);
        else if (item.end !== 'none') out.thick += line([c[0] - 2.6, c[1]], [c[0] + 2.6, c[1]]);
        break;
      }
      case 'lever': {
        const end = at(pts, item.at, item.d);
        out.mid += line(item.from, end);
        out.solid += circle(item.from, 1.3);
        // Máquina de discos: el disco va a media palanca.
        if (item.plate) out.ring += circle(mid(item.from, end), 3);
        break;
      }
      case 'band':
        out.dash += line(typeof item.from === 'string' ? at(pts, item.from) : item.from, at(pts, item.at));
        break;
      case 'roller':
        out.solid += circle(at(pts, item.at, item.d), item.r ?? 2.3);
        break;
      case 'plat': {
        const c = at(pts, item.at, item.d);
        const half = (item.len ?? 9) / 2;
        const u = dir(item.ang);
        out.thick += line(add(c, u, -half), add(c, u, half));
        break;
      }
      case 'ball':
        out.thin += circle(at(pts, item.at, item.d), item.r);
        break;
      case 'bar': {
        const l = pts['handL'] ?? [0, 0];
        const r = pts['handR'] ?? [0, 0];
        const ext = item.ext ?? 7;
        const a: P = [l[0] - ext, l[1]];
        const b: P = [r[0] + ext, r[1]];
        out.mid += line(a, b);
        if (item.plates !== false) out.thick += line([a[0] + 1, a[1] - 4.4], [a[0] + 1, a[1] + 4.4]) + line([b[0] - 1, b[1] - 4.4], [b[0] - 1, b[1] + 4.4]);
        break;
      }
      case 'weight': {
        const top = at(pts, item.at);
        const c = at(pts, item.at, item.d ?? [0, 6]);
        out.thin += line(top, c);
        out.ring += circle(c, 2.8);
        break;
      }
      case 'rails':
        break; // fijos: van en gearStatics
    }
  }
  return out;
}

/** Partes del equipo que no se mueven: rieles del Smith y poleas. */
export function gearStatics(gear: Gear[], startPts: Points): string {
  let out = '';
  for (const item of gear) {
    if (item.k === 'smith') {
      const x = at(startPts, item.at, item.d)[0];
      out += line([x, 3], [x, FLOOR]) + line([x - 3, 3], [x + 3, 3]);
    } else if (item.k === 'rails') {
      const ext = item.ext ?? 7;
      const l = (startPts['handL'] ?? [0, 0])[0] - ext + 1;
      const r = (startPts['handR'] ?? [0, 0])[0] + ext - 1;
      out += line([l, 3], [l, FLOOR]) + line([r, 3], [r, FLOOR]) + line([l - 2, 3], [r + 2, 3]);
    } else if (item.k === 'cable') {
      out += circle(item.from, 1.7);
    }
  }
  return out;
}

// ---------------------------------------------------------------- Dibujo completo

/** Un ejercicio: postura inicial (a), final (b) y, si el recorrido es curvo, una intermedia (m). */
export interface FigureDef {
  view: 'side' | 'front';
  a: Pose;
  b: Pose;
  m?: Pose;
  gear: Gear[];
  props: Prop[];
  /** Fracción de la repetición que se sostiene la postura final (ejercicios con pausa). */
  hold?: number;
}

export interface Frame {
  body: string;
  far: string;
  head: P;
  gear: GearPaths;
}

const skeletonOf = (def: FigureDef, pose: Pose) => (def.view === 'front' ? frontSkeleton(pose as FrontPose) : sideSkeleton(pose as SidePose));

/** El dibujo en un instante: t = 0 es la postura inicial y t = 1 la final. */
export function figureFrame(def: FigureDef, t: number): Frame {
  const pose = !def.m ? mix(def.a, def.b, t) : t < 0.5 ? mix(def.a, def.m, t * 2) : mix(def.m, def.b, t * 2 - 1);
  const skeleton = skeletonOf(def, pose);
  return { body: skeleton.body, far: skeleton.far, head: skeleton.head, gear: gearPaths(def.gear, skeleton.pts, skeletonOf(def, def.a).pts) };
}

/**
 * Encuadre del dibujo: el cuadro más chico que contiene a la figura y su equipo durante toda la
 * repetición. Así un ejercicio acostado no se ve diminuto junto a uno de pie.
 */
export function figureBounds(def: FigureDef): string {
  const xs: number[] = [];
  const ys: number[] = [];
  const take = (p: P, margin = 0) => {
    xs.push(p[0] - margin, p[0] + margin);
    ys.push(p[1] - margin, p[1] + margin);
  };

  for (const t of [0, 0.5, 1]) {
    const pose = !def.m ? mix(def.a, def.b, t) : t < 0.5 ? mix(def.a, def.m, t * 2) : mix(def.m, def.b, t * 2 - 1);
    const skeleton = skeletonOf(def, pose);
    for (const point of Object.values(skeleton.pts)) take(point, 2);
    take(skeleton.head, LEN.headR + 1);
    // Discos, mancuernas y plataformas sobresalen de la mano o del pie que los sostiene.
    for (const item of def.gear) if ('at' in item) take(at(skeleton.pts, item.at, 'd' in item ? item.d : undefined), 5.5);
  }
  for (const item of def.gear) {
    if (item.k === 'cable' || item.k === 'lever') take(item.from, 2.5);
    if (item.k === 'band' && typeof item.from !== 'string') take(item.from, 2);
    if (item.k === 'smith' || item.k === 'rails') ys.push(2, FLOOR);
    if (item.k === 'bar') xs.push(Math.min(...xs) - (item.ext ?? 7), Math.max(...xs) + (item.ext ?? 7));
  }
  let floor = false;
  for (const prop of def.props) {
    if (prop.k === 'floor') floor = true;
    else if (prop.k === 'line' || prop.k === 'pad') prop.p.forEach((point) => take(point, 2));
    else if (prop.k === 'ring') take(prop.at, (prop.r ?? 1.7) + 1);
    else {
      take(prop.at);
      take([prop.at[0] + (prop.w ?? 6), prop.at[1] + (prop.h ?? 28)]);
    }
  }
  // El piso cuenta por su altura, no por su ancho (se recorta en los bordes).
  if (floor) ys.push(FLOOR + 1.2);

  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const size = Math.min(BOX + 6, Math.max(maxX - minX, maxY - minY, 46) + 2);
  const x = (minX + maxX) / 2 - size / 2;
  // Con piso, el dibujo se apoya en la base del cuadro; sin piso (colgado de una barra), va centrado.
  const y = floor ? maxY - size : (minY + maxY) / 2 - size / 2;
  return [n(x), n(y), n(size), n(size)].join(' ');
}

/** Lo que no se mueve: piso, bancos, postes, rieles y poleas. */
export function figureStatics(def: FigureDef): PropPaths & { rails: string } {
  return { ...propPaths(def.props), rails: gearStatics(def.gear, skeletonOf(def, def.a).pts) };
}

export interface PropPaths {
  line: string;
  pad: string;
  stack: string;
}

export function propPaths(props: Prop[]): PropPaths {
  const out: PropPaths = { line: '', pad: '', stack: '' };
  for (const prop of props) {
    if (prop.k === 'line') out.line += line(...prop.p);
    else if (prop.k === 'pad') out.pad += line(...prop.p);
    else if (prop.k === 'ring') out.line += circle(prop.at, prop.r ?? 1.7);
    else if (prop.k === 'floor') out.line += line([prop.x?.[0] ?? 5, prop.y ?? FLOOR], [prop.x?.[1] ?? 59, prop.y ?? FLOOR]);
    else {
      const [x, y] = prop.at;
      const w = prop.w ?? 6;
      const h = prop.h ?? 28;
      // Pila de pesas: un bloque con sus placas marcadas.
      out.stack += `M${x} ${y}h${w}v${h}h${-w}z`;
      for (let row = y + 4; row < y + h - 1; row += 4) out.line += line([x, row], [x + w, row]);
    }
  }
  return out;
}
