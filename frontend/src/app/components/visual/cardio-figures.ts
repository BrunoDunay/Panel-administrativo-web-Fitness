// Dibujos animados de cardio y calentamiento, con el mismo esqueleto que los de ejercicios
// (ver figure-rig.ts). Todo ocurre en máquinas de gimnasio: caminadora inclinada, bicicleta fija,
// elíptica y remo ergómetro; además, cuerda y sentadilla sin peso.
//
// A diferencia de una repetición, caminar y pedalear son un ciclo: las posturas se recorren en
// orden y después de la última se regresa a la primera.
//
// Este archivo solo importa figure-rig.

import { FigureDef, FigureStage, FrontPose, GROUND as G, Limb, P, SidePose, add, dir, reach } from './figure-rig';

/** Altura de la base de las máquinas: sus patas tocan el piso. */
const BASE = 59.8;
/** Patas: un tramo corto y grueso sobre el piso. */
const feet = (...xs: number[]): P[][] => xs.map((x) => [[x - 2, BASE + 0.4], [x + 2, BASE + 0.4]]);
/** Ángulo (0 = abajo, 90 = derecha) de la dirección que va de `a` a `b`. */
const angleOf = (a: P, b: P) => (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI;

// ---------------------------------------------------------------- Caminadora

/** Inclinación de la banda: 12 % (sube 12 por cada 100 que avanza). */
const GRADE = 0.12;
const DECK_REAR: P = [8, 59.4];
const DECK_FRONT: P = [48, DECK_REAR[1] - GRADE * 40];
const DECK_ANGLE = angleOf(DECK_REAR, DECK_FRONT);
/** Altura del tobillo de un pie apoyado en la banda, a la altura de x. */
const beltY = (x: number) => DECK_REAR[1] - GRADE * (x - DECK_REAR[0]) - 3.5;

const WALK_X = 25;
/** Pie a `s` de la cadera (adelante o atrás), levantado `lift` sobre la banda. */
const step = (s: number, lift: number, ft: number): Limb => ({ to: [WALK_X + s, beltY(WALK_X + s) - lift], b: 1, ft });

/** Pierna en cada momento del paso. La banda se lleva el pie apoyado hacia atrás. */
const STEP = {
  /** Apoya el talón al frente, cuesta arriba. */
  contact: step(8, 0, DECK_ANGLE + 7),
  /** Sostiene el peso bajo la cadera. */
  stance: step(0, 0, DECK_ANGLE),
  /** Empuja con la punta, atrás. */
  push: step(-8, 2.4, 58),
  /** Pasa al frente con la rodilla arriba. */
  swing: step(1.5, 4.6, 62),
};

/** El brazo va al revés que la pierna de su lado. */
const ARM = { front: [32, 64], mid: [3, 24], back: [-26, -8] } satisfies Record<string, Limb>;

const WALK_HIP: P = [WALK_X, beltY(WALK_X) - 20.6];
/** A medio paso la pierna de apoyo está estirada: la cadera sube un poco. */
const WALK_HIP_HIGH: P = [WALK_X, beltY(WALK_X) - 21.7];
const stride: SidePose = { hip: WALK_HIP, torso: 172, arm: ARM.back, arm2: ARM.front, leg: STEP.contact, leg2: STEP.push };

/** Caminadora inclinada al 12 %: dos pasos por ciclo, sin agarrarse, con el torso un poco hacia el frente. */
export const TREADMILL_FIGURE: FigureDef = {
  view: 'side',
  a: stride,
  b: stride,
  cycle: [
    { ...stride, hip: WALK_HIP_HIGH, arm: ARM.mid, arm2: ARM.mid, leg: STEP.stance, leg2: STEP.swing },
    { ...stride, arm: ARM.front, arm2: ARM.back, leg: STEP.push, leg2: STEP.contact },
    { ...stride, hip: WALK_HIP_HIGH, arm: ARM.mid, arm2: ARM.mid, leg: STEP.swing, leg2: STEP.stance },
  ],
  gear: [
    // Banda, y al frente la cubierta del motor.
    { k: 'tube', w: 'thick', p: [[DECK_REAR, DECK_FRONT], [[44.5, 52.2], [49, 51.6]], ...feet(51.5)] },
    // Soporte que levanta el frente, poste, pasamanos y tablero.
    { k: 'tube', p: [[[47.5, 55.5], [51.5, BASE]], [[47.5, 52], [51, 29.5]], [[49.9, 37], [42.5, 37.8]]] },
    { k: 'tube', w: 'thick', p: [[[47.6, 30.9], [53.2, 28.6]]] },
  ],
  props: [{ k: 'floor' }],
};

// ---------------------------------------------------------------- Bicicleta fija

/** Volante de inercia (atrás), eje de los pedales y largo de la biela. */
const FLYWHEEL: P = [17.5, 50];
const BB: P = [31, 50];
const CRANK = 4.5;
const SEAT: P = [25.2, 37.9];
const GRIP: P = [44.2, 33.6];

/** Pedal a `angle` grados (0 = abajo, 90 = al frente, 180 = arriba). */
const pedal = (angle: number): P => add(BB, dir(angle), CRANK);

/** Ciclista con el pedal cercano en `angle`; el otro pie va en el pedal opuesto. */
const rider = (angle: number): SidePose => ({
  hip: [24.5, 34.5],
  torso: 145,
  head: 162,
  arm: { to: GRIP, b: -1 },
  leg: { to: pedal(angle), b: 1, ft: 90 },
  leg2: { to: pedal(angle + 180), b: 1, ft: 90 },
});

/** El pedal va de abajo hacia atrás, arriba y al frente. Ocho posturas = una vuelta. */
const TURN = Array.from({ length: 8 }, (_, i) => rider(-45 * i));

/** Bicicleta fija: una vuelta de pedal por ciclo; el volante gira con ella. No tiene ruedas: se apoya en su base. */
export const BIKE_FIGURE: FigureDef = {
  view: 'side',
  a: TURN[0]!,
  b: TURN[0]!,
  cycle: TURN.slice(1),
  gear: [
    { k: 'wheel', c: FLYWHEEL, r: 7 },
    {
      k: 'tube',
      p: [
        // Base, soporte trasero, armazón y tubo del asiento.
        [[11, BASE], [49, BASE]],
        [FLYWHEEL, [13.5, BASE]],
        [FLYWHEEL, BB, [42, 51.5]],
        [BB, SEAT],
        // Poste del manubrio.
        [[41, BASE], [43.4, 37], [46.4, 30]],
      ],
    },
    // Patas, asiento y tablero.
    { k: 'tube', w: 'thick', p: [...feet(11.5, 48.5), [[22.4, 37.9], [28, 37.9]], [[45, 30.6], [48.4, 29]]] },
    { k: 'lever', from: BB, at: 'ankle' },
    { k: 'lever', from: BB, at: 'ankle2' },
  ],
  props: [{ k: 'floor' }],
};

// ---------------------------------------------------------------- Elíptica

/** Volante trasero con su biela, y el eje donde se balancean los brazos de la máquina. */
const E_WHEEL: P = [15, 50];
const E_CRANK = 4.5;
const E_PIVOT: P = [45.6, 33];
/** Largo de la barra del pedal, del brazo bajo el eje y del mango sobre él. */
const E_BAR = 30.2;
const E_ARM = 21;
const E_HANDLE = 14;

/** Un lado de la elíptica con la biela en `angle`: la barra del pedal va de la biela al brazo que se balancea. */
function strideSide(angle: number) {
  const crank = add(E_WHEEL, dir(angle), E_CRANK);
  const link = reach(crank, E_PIVOT, E_BAR, E_ARM, -1).joint;
  const bar = angleOf(crank, link);
  // El pie va a media barra; el mango sale hacia arriba, opuesto al brazo y un poco hacia quien lo usa.
  const ankle = add(add(crank, dir(bar), E_BAR * 0.52), dir(bar + 90), 2.7);
  const handle = add(E_PIVOT, dir(angleOf(E_PIVOT, link) + 190), E_HANDLE);
  return { crank, link, bar, ankle, handle };
}

/** De pie en la elíptica: cada pie sigue a su pedal y cada mano a su mango, que va al revés que el pie. */
const strider = (angle: number): SidePose => {
  const near = strideSide(angle);
  const far = strideSide(angle + 180);
  return {
    hip: [30.5, 30.2],
    torso: 172,
    arm: { to: near.handle, b: -1 },
    arm2: { to: far.handle, b: -1 },
    leg: { to: near.ankle, b: 1, ft: near.bar },
    leg2: { to: far.ankle, b: 1, ft: far.bar },
    marks: { crank: near.crank, link: near.link, crank2: far.crank, link2: far.link },
  };
};

const GLIDE = Array.from({ length: 8 }, (_, i) => strider(-45 * i));

/** Elíptica: una vuelta de la biela por ciclo; pedales y mangos se mueven enlazados. */
export const ELLIPTICAL_FIGURE: FigureDef = {
  view: 'side',
  a: GLIDE[0]!,
  b: GLIDE[0]!,
  cycle: GLIDE.slice(1),
  gear: [
    { k: 'wheel', c: E_WHEEL, r: 6.5 },
    // Base, soporte del volante y poste.
    { k: 'tube', p: [[[9.5, BASE], [50, BASE]], [E_WHEEL, [E_WHEEL[0], BASE]], [[48, BASE], E_PIVOT, [44.6, 26]]] },
    // Patas y tablero.
    { k: 'tube', w: 'thick', p: [...feet(10, 49.5), [[42.6, 26.6], [46.4, 25]]] },
    // Lado lejano, más delgado.
    { k: 'rod', from: 'crank2', at: 'link2', w: 'thin' },
    { k: 'rod', from: E_PIVOT, at: 'link2', w: 'thin' },
    { k: 'rod', from: E_PIVOT, at: 'hand2', w: 'thin' },
    { k: 'lever', from: E_WHEEL, at: 'crank' },
    { k: 'rod', from: 'crank', at: 'link' },
    { k: 'rod', from: E_PIVOT, at: 'link' },
    { k: 'lever', from: E_PIVOT, at: 'hand' },
  ],
  props: [{ k: 'floor' }],
};

// ---------------------------------------------------------------- Remo ergómetro

const RAIL = 54.6;
const FAN: P = [56.5, 44];
/** Tobillo sobre el apoyapiés: no se mueve. */
const STRAP: P = [40, 49.5];

/** Ataque: rodillas flexionadas, torso hacia el frente y brazos estirados. */
const rowCatch: SidePose = { hip: [30.5, 47.5], torso: 158, arm: { to: [50.5, 39.5], b: -1 }, leg: { to: STRAP, b: 1, ft: 135 } };

/** Remo ergómetro: primero empujan las piernas, luego el torso se va atrás y al final jalan los brazos. */
export const ROWER_FIGURE: FigureDef = {
  view: 'side',
  a: rowCatch,
  m: { ...rowCatch, hip: [19.5, 47.5], torso: 176, arm: { to: [36.5, 38], b: -1 } },
  b: { ...rowCatch, hip: [18.5, 47.5], torso: 198, arm: { to: [25, 40.5], b: -1 } },
  hold: 0.08,
  gear: [
    { k: 'wheel', c: FAN, r: 5.6 },
    // Riel, brazo del ventilador, patas y brazo del monitor.
    { k: 'tube', p: [[[10.5, RAIL], [44.5, RAIL], FAN], [[12.5, RAIL], [12.5, BASE]], [[FAN[0], FAN[1] + 5.6], [FAN[0], BASE]], [[54.5, 38.6], [51, 31.5]]] },
    // Patas, apoyapiés y monitor.
    { k: 'tube', w: 'thick', p: [...feet(12.5, FAN[0]), [[41, 52.6], [45.6, 48]], [[49.6, 30.4], [51.8, 33.2]]] },
    // Asiento: corre sobre el riel con la cadera.
    { k: 'plat', at: 'hip', d: [0, 3.7], ang: 90, len: 6.5 },
    { k: 'cable', from: [53.4, 41.2], at: 'hand', end: 'rope' },
  ],
  props: [{ k: 'floor' }],
};

// ---------------------------------------------------------------- Cuerda

/** Altura del salto. */
const HOP = 5;
/** Saltando la cuerda, de frente. `up`: 0 = pies en el piso con las rodillas flexionadas, 1 = punto más alto. */
const hop = (up: number): FrontPose => ({ hip: [32, G - 20.6 - up * (HOP + 1.4)], thigh: 9.6 + up * 1.4, arm: [14, 62], leg: [4, 0] });
/** Un salto: despega, llega arriba y cae. */
const JUMP = [0, 0.75, 1, 0.75].map(hop);

/** Cuerda: dos saltos por ciclo; la cuerda pasa bajo los pies cuando están en el aire. */
export const ROPE_FIGURE: FigureDef = {
  view: 'front',
  a: JUMP[0]!,
  b: JUMP[0]!,
  cycle: [...JUMP.slice(1), ...JUMP],
  gear: [{ k: 'rope', top: 4.5, bottom: 60.6, turns: 2 }],
  props: [{ k: 'floor' }],
};

// ---------------------------------------------------------------- Sentadilla

const stand: SidePose = { hip: [29, G - 22], torso: 177, arm: [3, 8], leg: { to: [30, G], b: 1, ft: 90 } };

/** Sentadilla sin peso: la cadera baja y se va atrás mientras los brazos suben al frente. */
export const SQUAT_FIGURE: FigureDef = {
  view: 'side',
  a: stand,
  b: { ...stand, hip: [23.5, 48.5], torso: 152, arm: [84, 88] },
  gear: [],
  props: [{ k: 'floor' }],
};

// ---------------------------------------------------------------- Series

/** Caminadora sola. */
export const TREADMILL_FIGURES: FigureStage[] = [{ def: TREADMILL_FIGURE, reps: 4 }];

/** LISS: se puede hacer en caminadora inclinada, bicicleta o elíptica; el dibujo las recorre. */
export const LISS_FIGURES: FigureStage[] = [...TREADMILL_FIGURES, { def: BIKE_FIGURE, reps: 3 }, { def: ELLIPTICAL_FIGURE, reps: 3 }];

/** Calentamiento de tren inferior pesado: sentadilla sin peso y luego caminadora o bicicleta. */
export const LOWER_WARMUP_FIGURES: FigureStage[] = [
  { def: SQUAT_FIGURE, reps: 3 },
  { def: TREADMILL_FIGURE, reps: 3 },
  { def: BIKE_FIGURE, reps: 3 },
];
