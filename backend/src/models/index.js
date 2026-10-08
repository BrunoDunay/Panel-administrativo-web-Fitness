import { Admin } from './admin.model.js';
import { SiteSetting } from './site-setting.model.js';
import { Muscle } from './muscle.model.js';
import { Exercise } from './exercise.model.js';
import { CardioProtocol } from './cardio-protocol.model.js';
import { WarmupProtocol } from './warmup-protocol.model.js';
import { Food } from './food.model.js';
import { Supplement } from './supplement.model.js';
import { Client } from './client.model.js';
import { TrainingPlan } from './training-plan.model.js';
import { TrainingWeek } from './training-week.model.js';
import { WeekExercise } from './week-exercise.model.js';
import { Checkin } from './checkin.model.js';
import { Measurement } from './measurement.model.js';
import { WeightLog } from './weight-log.model.js';
import { NutritionPlan } from './nutrition-plan.model.js';

// Catálogo de ejercicios
Muscle.hasMany(Exercise, { as: 'exercises', foreignKey: 'muscleId', onDelete: 'CASCADE' });
Exercise.belongsTo(Muscle, { as: 'muscle', foreignKey: 'muscleId' });

// Entrenamiento
Client.hasMany(TrainingPlan, { as: 'trainingPlans', foreignKey: 'clientId', onDelete: 'CASCADE' });
TrainingPlan.belongsTo(Client, { as: 'client', foreignKey: 'clientId' });
TrainingPlan.hasMany(TrainingWeek, { as: 'weeks', foreignKey: 'planId', onDelete: 'CASCADE' });
TrainingWeek.belongsTo(TrainingPlan, { as: 'plan', foreignKey: 'planId' });
TrainingWeek.hasMany(WeekExercise, { as: 'exercises', foreignKey: 'weekId', onDelete: 'CASCADE' });
WeekExercise.belongsTo(TrainingWeek, { as: 'week', foreignKey: 'weekId' });

// Seguimiento
Client.hasMany(Checkin, { as: 'checkins', foreignKey: 'clientId', onDelete: 'CASCADE' });
Client.hasMany(Measurement, { as: 'measurements', foreignKey: 'clientId', onDelete: 'CASCADE' });
Client.hasMany(WeightLog, { as: 'weightLogs', foreignKey: 'clientId', onDelete: 'CASCADE' });

// Nutrición
Client.hasMany(NutritionPlan, { as: 'nutritionPlans', foreignKey: 'clientId', onDelete: 'CASCADE' });
NutritionPlan.belongsTo(Client, { as: 'client', foreignKey: 'clientId' });

export {
  Admin,
  SiteSetting,
  Muscle,
  Exercise,
  CardioProtocol,
  WarmupProtocol,
  Food,
  Supplement,
  Client,
  TrainingPlan,
  TrainingWeek,
  WeekExercise,
  Checkin,
  Measurement,
  WeightLog,
  NutritionPlan,
};
