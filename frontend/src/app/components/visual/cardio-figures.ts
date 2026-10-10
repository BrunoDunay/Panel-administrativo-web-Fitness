// Dibujos animados de cardio y calentamiento, con el mismo esqueleto que los de ejercicios
// (ver figure-rig.ts). A diferencia de una repetición, caminar y pedalear son un ciclo:
// las posturas se recorren en orden y después de la última se regresa a la primera.
//
// Este archivo solo importa figure-rig y exercise-figures.

import { FIGURES } from './exercise-figures';
import { FLOOR as FLOOR_Y, FigureDef, GROUND as G, Limb, P, SidePose, dir } from './figure-rig';

// ---------------------------------------------------------------- Caminata

/** Pierna en cada momento del paso: [muslo, espinilla, pie]. */
const STEP = {
  /** Apoya el talón al frente. */
  contact: [26, 10, 98],
  /** Sostiene el peso, vertical bajo la cadera. */
  stance: [2, 0, 90],
  /** Empuja con la punta, atrás. */
  push: [-24, -40, 52],
  /** Pasa al frente con la rodilla doblada. */
  swing: [18, -52, 44],
} satisfies Record<string, Limb>;

/** El brazo va al revés que la pierna de su lado. */
const ARM = { front: [32, 64], mid: [3, 24], back: [-26, -8] } satisfies Record<string, Limb>;

const WALK_HIP: P = [31, G - 20.7];
/** A medio paso la pierna de apoyo está estirada: la cadera sube un poco. */
const WALK_HIP_HIGH: P = [31, G - 22];
const stride: SidePose = { hip: WALK_HIP, torso: 175, arm: ARM.back, arm2: ARM.front, leg: STEP.contact, leg2: STEP.push };

/** Caminata: dos pasos por ciclo, con el rebote de la cadera y el braceo contrario. */
export const WALK_FIGURE: FigureDef = {
  view: 'side',
  a: stride,
  b: stride,
  cycle: [
    { ...stride, hip: WALK_HIP_HIGH, arm: ARM.mid, arm2: ARM.mid, leg: STEP.stance, leg2: STEP.swing },
    { ...stride, arm: ARM.front, arm2: ARM.back, leg: STEP.push, leg2: STEP.contact },
    { ...stride, hip: WALK_HIP_HIGH, arm: ARM.mid, arm2: ARM.mid, leg: STEP.swing, leg2: STEP.stance },
  ],
  gear: [],
  props: [{ k: 'floor' }],
};

// ---------------------------------------------------------------- Bicicleta

const WHEEL_R = 7.5;
const AXLE_Y = FLOOR_Y - WHEEL_R - 0.4;
const REAR: P = [16.5, AXLE_Y];
const FRONT: P = [47.5, AXLE_Y];
/** Eje de los pedales y largo de la biela. */
const BB: P = [31, 50];
const CRANK = 4.5;
const SEAT: P = [25, 37.6];
const HEAD: P = [43, 38.5];
const GRIP: P = [44.5, 34.2];

/** Pedal a `angle` grados (0 = abajo, 90 = al frente, 180 = arriba). */
const pedal = (angle: number): P => {
  const [x, y] = dir(angle);
  return [BB[0] + x * CRANK, BB[1] + y * CRANK];
};

/** Ciclista con el pedal cercano en `angle`; el otro pie va en el pedal opuesto. */
const rider = (angle: number): SidePose => ({
  hip: [24.5, 34.5],
  torso: 138,
  head: 158,
  arm: { to: GRIP, b: -1 },
  leg: { to: pedal(angle), b: 1, ft: 90 },
  leg2: { to: pedal(angle + 180), b: 1, ft: 90 },
});

/** La bici avanza a la derecha: el pedal va de abajo hacia atrás, arriba y al frente. Ocho posturas = una vuelta. */
const TURN = Array.from({ length: 8 }, (_, i) => rider(-45 * i));

/** Bicicleta: una vuelta de pedal por ciclo; las ruedas giran con ella. */
export const BIKE_FIGURE: FigureDef = {
  view: 'side',
  a: TURN[0]!,
  b: TURN[0]!,
  cycle: TURN.slice(1),
  gear: [
    { k: 'wheel', c: REAR, r: WHEEL_R },
    { k: 'wheel', c: FRONT, r: WHEEL_R },
    // Cuadro: tirantes traseros, tubo del asiento, tubo superior, tubo inferior, horquilla y manubrio.
    { k: 'tube', p: [[REAR, BB, SEAT, REAR], [SEAT, HEAD, BB], [GRIP, HEAD, FRONT], [[SEAT[0] - 2.5, SEAT[1] - 0.6], [SEAT[0] + 3, SEAT[1] - 0.6]]] },
    { k: 'lever', from: BB, at: 'ankle' },
    { k: 'lever', from: BB, at: 'ankle2' },
  ],
  props: [{ k: 'floor' }],
};

// ---------------------------------------------------------------- Sentadilla

/** Sentadilla con barra: la misma del catálogo de ejercicios. */
export const SQUAT_FIGURE: FigureDef = FIGURES['sentadilla-con-barra-alta']!.def;
