// Redondeos con el mismo criterio que Excel (mitades lejos del cero), para que
// los resultados coincidan con las plantillas originales del coach.

export function round(value, decimals = 0) {
  const factor = 10 ** decimals;
  const scaled = Math.abs(value) * factor;
  return (Math.sign(value) * Math.round(scaled + 1e-9)) / factor;
}

export function roundToMultiple(value, multiple) {
  if (!multiple) return value;
  return round(value / multiple) * multiple;
}

/** Gramos de un alimento: menos de 20 g al gramo; de ahí en adelante, al múltiplo elegido (1, 5 o 10). */
export function roundGrams(grams, multiple = 5) {
  if (!(grams > 0)) return 0;
  if (grams < 20) return Math.max(1, round(grams));
  return roundToMultiple(grams, multiple);
}
