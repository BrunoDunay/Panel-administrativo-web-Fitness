/**
 * Alimentos de la tabla del Sistema Mexicano de Alimentos Equivalentes que faltaban en el catálogo
 * (cada uno a 1 porción de su grupo). Solo se agregan a catálogos ya cargados: en una base nueva
 * llegan con el resto desde seeders/data/foods.json.
 */
const NAMES = ["Berenjena","Betabel","Edamame","Espárragos","Lechuga romana","Mezcla de vegetales","Calabaza picada","Durazno amarillo","Guayaba","Sandía","Mango picado","Fresa congelada","Galleta María","Cereal All Bran","Espagueti cocido","Pan de caja blanco","Elote amarillo","Carne molida de res","Queso fresco","Filete de cerdo","Queso Monterrey","Yogur griego natural","Leche entera","Yogur natural","Crema","Crema light","Nuez de la India sin sal"];

export async function up({ context: sequelize }) {
  await sequelize.query(`
    INSERT INTO foods (name, food_group, portion_qty, portion_unit, gross_weight_g, net_weight_g, kcal, protein_g, fat_g, carbs_g, fiber_g, food_type, style, as_protein, as_carb, as_fat, as_vegetable, as_fruit)
    SELECT * FROM (VALUES
      ('Berenjena', 'Verduras', 1, 'taza', 100, 100, 25, 2, 0, 4, 0, 'Vegetal', 'Salado', false, false, false, true, false),
      ('Betabel', 'Verduras', 0.25, 'taza', 40, 40, 25, 2, 0, 4, 0, 'Vegetal', 'Salado', false, false, false, true, false),
      ('Edamame', 'Verduras', 0.143, 'taza', 30, 30, 25, 2, 0, 4, 0, 'Vegetal', 'Salado', false, false, false, true, false),
      ('Espárragos', 'Verduras', 6, 'pieza', 90, 90, 25, 2, 0, 4, 0, 'Vegetal', 'Salado', false, false, false, true, false),
      ('Lechuga romana', 'Verduras', 2, 'taza', 140, 140, 25, 2, 0, 4, 0, 'Vegetal', 'Salado', false, false, false, true, false),
      ('Mezcla de vegetales', 'Verduras', 0.5, 'taza', 46, 46, 25, 2, 0, 4, 0, 'Vegetal', 'Salado', false, false, false, true, false),
      ('Calabaza picada', 'Verduras', 0.5, 'taza', 110, 110, 25, 2, 0, 4, 0, 'Vegetal', 'Salado', false, false, false, true, false),
      ('Durazno amarillo', 'Frutas', 2, 'pieza', 175, 175, 60, 0, 0, 15, 0, 'Vegetal', 'Dulce', false, true, false, false, true),
      ('Guayaba', 'Frutas', 3, 'pieza', 135, 135, 60, 0, 0, 15, 0, 'Vegetal', 'Dulce', false, true, false, false, true),
      ('Sandía', 'Frutas', 1, 'rebanada', 200, 200, 60, 0, 0, 15, 0, 'Vegetal', 'Dulce', false, true, false, false, true),
      ('Mango picado', 'Frutas', 1, 'taza', 165, 165, 60, 0, 0, 15, 0, 'Vegetal', 'Dulce', false, true, false, false, true),
      ('Fresa congelada', 'Frutas', 0.25, 'taza', 66, 66, 60, 0, 0, 15, 0, 'Vegetal', 'Dulce', false, true, false, false, true),
      ('Galleta María', 'Cereales y tubérculos sin grasa', 5, 'pieza', 20, 20, 70, 2, 0, 15, 0, 'Vegetal', 'Ambos', false, true, false, false, false),
      ('Cereal All Bran', 'Cereales y tubérculos sin grasa', 0.333, 'taza', 30, 30, 70, 2, 0, 15, 0, 'Vegetal', 'Ambos', false, true, false, false, false),
      ('Espagueti cocido', 'Cereales y tubérculos sin grasa', 0.333, 'taza', 47, 47, 70, 2, 0, 15, 0, 'Vegetal', 'Ambos', false, true, false, false, false),
      ('Pan de caja blanco', 'Cereales y tubérculos sin grasa', 1, 'rebanada', 30, 30, 70, 2, 0, 15, 0, 'Vegetal', 'Ambos', false, true, false, false, false),
      ('Elote amarillo', 'Cereales y tubérculos sin grasa', 1.5, 'pieza', 65, 65, 70, 2, 0, 15, 0, 'Vegetal', 'Ambos', false, true, false, false, false),
      ('Carne molida de res', 'AOA bajo en grasa', 30, 'g', 30, 30, 55, 7, 3, 0, 0, 'Carne/pollo', 'Salado', true, false, false, false, false),
      ('Queso fresco', 'AOA bajo en grasa', 40, 'g', 40, 40, 55, 7, 3, 0, 0, 'Huevo/lácteo', 'Salado', true, false, false, false, false),
      ('Filete de cerdo', 'AOA bajo en grasa', 40, 'g', 40, 40, 55, 7, 3, 0, 0, 'Carne/pollo', 'Salado', true, false, false, false, false),
      ('Queso Monterrey', 'AOA moderado en grasa', 25, 'g', 25, 25, 75, 7, 5, 0, 0, 'Huevo/lácteo', 'Salado', true, false, false, false, false),
      ('Yogur griego natural', 'Leche descremada', 0.333, 'taza', 80, 80, 95, 9, 2, 12, 0, 'Huevo/lácteo', 'Ambos', true, false, false, false, false),
      ('Leche entera', 'Leche entera', 1, 'taza', 240, 240, 150, 9, 8, 12, 0, 'Huevo/lácteo', 'Ambos', true, false, false, false, false),
      ('Yogur natural', 'Leche entera', 1, 'taza', 225, 225, 150, 9, 8, 12, 0, 'Huevo/lácteo', 'Ambos', true, false, false, false, false),
      ('Crema', 'Aceites y grasas sin proteína', 1, 'cucharada', 15, 15, 45, 0, 5, 0, 0, 'Huevo/lácteo', 'Ambos', false, false, true, false, false),
      ('Crema light', 'Aceites y grasas sin proteína', 2, 'cucharada', 30, 30, 45, 0, 5, 0, 0, 'Huevo/lácteo', 'Ambos', false, false, true, false, false),
      ('Nuez de la India sin sal', 'Aceites y grasas con proteína', 8, 'pieza', 13, 13, 70, 3, 5, 3, 0, 'Vegetal', 'Ambos', false, false, true, false, false)
    ) AS nuevos (name, food_group, portion_qty, portion_unit, gross_weight_g, net_weight_g, kcal, protein_g, fat_g, carbs_g, fiber_g, food_type, style, as_protein, as_carb, as_fat, as_vegetable, as_fruit)
    WHERE EXISTS (SELECT 1 FROM foods)
    ON CONFLICT (name) DO NOTHING;
  `);
}

export async function down({ context: sequelize }) {
  await sequelize.query('DELETE FROM foods WHERE name IN (:names)', { replacements: { names: NAMES } });
}
