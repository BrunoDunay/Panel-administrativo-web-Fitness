import { todayInAppTz } from '../utils/dates-mx.js';
import { loadCatalog } from '../services/catalog.service.js';
import { buildNutritionView, mealOptionStates, saveNutritionPlan } from '../services/nutrition.service.js';
import * as tracking from '../services/tracking.service.js';
import * as training from '../services/training.service.js';

// ---- Entrenamiento ----

export async function saveTrainingPlan(req, res) {
  await training.savePlan(req.client.id, req.valid.body);
  res.status(204).end();
}

export async function addWeek(req, res) {
  const week = await training.addWeek(req.client.id);
  res.status(201).json({ id: week.id, number: week.number });
}

export async function saveWeek(req, res) {
  await training.saveWeekPrescription(req.client.id, req.params.weekId, req.valid.body.exercises);
  res.status(204).end();
}

export async function deleteWeek(req, res) {
  await training.deleteWeek(req.client.id, req.params.weekId);
  res.status(204).end();
}

export async function logExercise(req, res) {
  res.json(await training.logExercise(req.client.id, req.params.exerciseId, req.valid.body));
}

export async function logWeek(req, res) {
  await training.logWeek(req.client.id, req.params.weekId, req.valid.body);
  res.status(204).end();
}

// ---- Nutrición ----

export async function saveNutrition(req, res) {
  await saveNutritionPlan(req.client.id, req.valid.body);
  res.status(204).end();
}

/** Calcula el plan con un borrador sin guardarlo: es lo que el coach ve mientras edita. */
export async function previewNutrition(req, res) {
  res.json(buildNutritionView(req.valid.body, req.client, await loadCatalog(), todayInAppTz()));
}

/** Marca qué alimentos caben en un renglón de una comida y cuáles la harían pasarse de su meta. */
export async function nutritionOptions(req, res) {
  res.json(mealOptionStates(req.valid.body, req.client, await loadCatalog(), todayInAppTz()));
}

// ---- Seguimiento ----

export async function saveCheckin(req, res) {
  await tracking.saveCheckin(req.client.id, req.valid.params.weekNumber, req.valid.body);
  res.status(204).end();
}

export async function saveWeight(req, res) {
  await tracking.saveWeight(req.client.id, req.valid.params.date, req.valid.body);
  res.status(204).end();
}

export async function saveMeasurement(req, res) {
  await tracking.saveMeasurement(req.client.id, req.valid.params.date, req.valid.body);
  res.status(204).end();
}

export async function deleteMeasurement(req, res) {
  await tracking.deleteMeasurement(req.client.id, req.valid.params.date);
  res.status(204).end();
}
