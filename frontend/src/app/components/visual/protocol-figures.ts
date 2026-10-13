import { BIKE_FIGURE, ELLIPTICAL_FIGURE, LISS_FIGURES, LOWER_WARMUP_FIGURES, ROPE_FIGURE, ROWER_FIGURE, SQUAT_FIGURE, TREADMILL_FIGURES } from './cardio-figures';
import { FigureDef, FigureStage } from './figure-rig';

export type ProtocolFigure = FigureDef | FigureStage[];

/**
 * Protocolos que traen su dibujo por nombre. Van primero los que usan varias máquinas (el dibujo
 * las recorre) y después cada máquina: bicicleta fija, caminadora, elíptica, remo, cuerda y sentadilla.
 */
const NAME_FIGURES: [RegExp, ProtocolFigure][] = [
  [/liss/i, LISS_FIGURES],
  [/compuesto/i, LOWER_WARMUP_FIGURES],
  [/bici|cicl|spinning|aislamiento/i, BIKE_FIGURE],
  [/caminadora|caminata|caminar|marcha/i, TREADMILL_FIGURES],
  [/el[ií]ptic/i, ELLIPTICAL_FIGURE],
  [/remo|erg[oó]metro|tracci[oó]n|empuje/i, ROWER_FIGURE],
  [/cuerda|express|expr[eé]s/i, ROPE_FIGURE],
  [/sentadilla/i, SQUAT_FIGURE],
];

/** Dibujo animado que corresponde a un protocolo de cardio o calentamiento por su nombre. */
export function protocolFigureByName(name: string | null | undefined): ProtocolFigure | undefined {
  return NAME_FIGURES.find(([pattern]) => pattern.test(name ?? ''))?.[1];
}
