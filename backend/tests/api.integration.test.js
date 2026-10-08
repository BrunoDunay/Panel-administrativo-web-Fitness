// Recorre el flujo completo contra una base real: alta de cliente, plan de entrenamiento,
// plan de nutrición y registro desde el portal. Requiere TEST_DATABASE_URL (base desechable).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)('API', () => {
  let app;
  let sequelize;
  let token;
  let catalog;
  let client;
  let code;
  const auth = (req) => req.set('Authorization', `Bearer ${token}`);
  const foodId = (name) => catalog.foods.find((f) => f.name === name).id;

  beforeAll(async () => {
    ({ sequelize } = await import('../src/config/database.js'));
    await sequelize.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await (await import('../src/config/migrate.js')).runPendingMigrations();
    await (await import('../src/config/initialize-data.js')).initializeData();
    app = (await import('../src/app.js')).createApp();

    const login = await request(app).post('/api/auth/login').send({ email: 'coach@example.com', password: 'test-password-123' });
    token = login.body.token;
  }, 60_000);

  afterAll(() => sequelize?.close());

  it('exige sesión en el panel', async () => {
    expect((await request(app).get('/api/clients')).status).toBe(401);
    expect((await request(app).get('/api/catalog')).status).toBe(401);
    expect((await request(app).get('/api/dashboard')).status).toBe(401);
  });

  it('carga los catálogos de las plantillas', async () => {
    catalog = (await auth(request(app).get('/api/catalog'))).body;
    expect(catalog.muscles).toHaveLength(17);
    expect(catalog.muscles.reduce((sum, m) => sum + m.exercises.length, 0)).toBe(149);
    expect(catalog.foods).toHaveLength(120);
    expect(catalog.supplements).toHaveLength(17);
    expect(catalog.cardioProtocols).toHaveLength(8);
    expect(catalog.warmupProtocols).toHaveLength(7);
    expect(typeof catalog.foods[0].netWeightG).toBe('number');
  });

  it('la landing lee su contenido sin sesión', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.body.brand.name).toBe('Fitness by Evidence');
  });

  it('da de alta a un cliente con su enlace privado', async () => {
    const res = await auth(request(app).post('/api/clients')).send({
      fullName: 'Cliente ejemplo',
      birthDate: '1996-01-15',
      sex: 'male',
      heightCm: 175,
      initialWeightKg: 80,
      profile: { logistics: { daysPerWeek: 4, planType: 'Mensual' } },
      coachNotes: 'Nota privada',
    });
    expect(res.status).toBe(201);
    client = res.body;
    code = client.portalUrl.split('/').pop();
    expect(code).toMatch(/^[2-9A-Z]{20}$/);
    expect(client.age).toBe(30);

    const invalid = await auth(request(app).post('/api/clients')).send({ fullName: '' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.fields.fullName).toBeTruthy();
  });

  it('arma el plan de entrenamiento y hereda la pauta en la semana siguiente', async () => {
    const base = `/api/clients/${client.id}`;
    const plan = await auth(request(app).put(`${base}/training`)).send({
      name: 'Programa de hipertrofia',
      blockPhase: 'Adaptación',
      blockStart: '2026-10-05',
      blockWeeks: 4,
      split: ['Pierna', 'Torso', '', 'Pierna', 'Torso', '', ''],
      priorities: { p1: ['Cuádriceps'], p2: ['Dorsal'], p3: [], maintenance: [] },
      steps: { trainingDay: 9000, restDay: 10000 },
      cardio: ['Solo pasos', '', "LISS 45'", '', '', "Caminata inclinada 20'", ''].map((protocol) => ({ protocol })),
    });
    expect(plan.status).toBe(204);

    const week1 = (await auth(request(app).post(`${base}/training/weeks`))).body;
    expect(week1.number).toBe(1);
    const saved = await auth(request(app).put(`${base}/training/weeks/${week1.id}`)).send({
      exercises: [
        { day: 1, muscle: 'Aductores', exercise: 'Adducción de cadera en máquina con pausa de 2 s', sets: 2, reps: '8 a 10', rir: 4, symbol: '🆕' },
        { day: 1, muscle: 'Cuádriceps', exercise: 'Sentadilla Hack', sets: 3, reps: '7 a 9', rir: 3 },
      ],
    });
    expect(saved.status).toBe(204);

    const week2 = (await auth(request(app).post(`${base}/training/weeks`))).body;
    expect(week2.number).toBe(2);

    const { training } = (await auth(request(app).get(base))).body;
    expect(training.blockEnd).toBe('2026-11-01');
    expect(training.trainingDays).toBe(4);
    expect(training.steps.weeklyAverage).toBe(9429);
    expect(training.cardioMinutesPerWeek).toBe(65);
    expect(training.cardioSessions).toBe(2);
    expect(training.split[2]).toBe('Descanso');
    const copied = training.weeks[1].days[0].exercises;
    expect(copied.map((e) => e.exercise)).toEqual(['Adducción de cadera en máquina con pausa de 2 s', 'Sentadilla Hack']);
    expect(copied[0].symbol).toBeNull();
    expect(training.volume.find((v) => v.muscle === 'Cuádriceps')).toMatchObject({ priority: 'P1', weeks: [{ planned: 3 }, { planned: 3 }] });

    expect((await auth(request(app).delete(`${base}/training/weeks/${week1.id}`))).status).toBe(409);
  });

  it('el cliente registra sus series desde el portal y no puede cambiar la pauta', async () => {
    const portal = `/api/portal/${code}`;
    const before = (await request(app).get(portal)).body;
    expect(before.client.fullName).toBe('Cliente ejemplo');
    expect(before.client.coachNotes).toBeUndefined();
    expect(before.client.portalUrl).toBeUndefined();

    const exercise = before.training.weeks[0].days[0].exercises[0];
    const log = await request(app)
      .patch(`${portal}/training/exercises/${exercise.id}/log`)
      .send({ logged: [{ load: 60, reps: 10 }, { load: 60, reps: 9 }], clientNotes: 'Bien' });
    expect(log.body).toMatchObject({ setsDone: 2, e1rm: 80, tonnage: 1140 });

    const weekId = before.training.weeks[0].id;
    expect((await request(app).patch(`${portal}/training/weeks/${weekId}/log`).send({ cardioLog: { 3: 45, 6: 7 }, dayDates: { 1: '2026-10-05' } })).status).toBe(204);
    expect((await request(app).put(`${portal}/training`).send({ name: 'Otro' })).status).toBe(403);
    expect((await request(app).put(`${portal}/training/weeks/${weekId}`).send({ exercises: [] })).status).toBe(403);
    expect((await request(app).delete(portal)).status).toBe(403);

    const after = (await request(app).get(portal)).body.training;
    expect(after.weeks[0].cardio).toEqual({ planned: 65, done: 52, compliance: 0.8 });
    expect(after.weeks[0].days[0]).toMatchObject({ date: '2026-10-05', setsDone: 2, setsPlanned: 5 });
    expect(after.progress[0].weeks[0]).toMatchObject({ e1rm: 80, tonnage: 1140 });
  });

  it('calcula el plan de nutrición igual que la plantilla', async () => {
    const base = `/api/clients/${client.id}`;
    const draft = {
      inputs: {
        weightKg: 80,
        formula: 'mifflin',
        activity: 'moderate',
        dietType: 'omnivore',
        goal: 'Definición',
        adjustmentKcal: -500,
        proteinPerKg: 2.2,
        fatPct: 0.25,
        cycling: false,
        extraTrainingKcal: 400,
        trainingDays: [true, true, false, true, true, false, false],
        mealCount: 5,
        preWorkoutMeal: null,
        postWorkoutMeal: null,
        roundTo: 5,
        mealsMeta: ['Desayuno', 'Colación AM', 'Comida', 'Colación PM', 'Cena', 'Colación noche'].map((name) => ({ name, time: '', manual: {} })),
      },
      meals: [
        {
          protein1: foodId('Clara de huevo'),
          protein2: foodId('Huevo entero fresco'),
          carb1: foodId('Avena en hojuelas'),
          fat: foodId('Aguacate hass'),
          fruit: foodId('Fresa entera'),
          swaps: { protein1: [foodId('Pechuga de pollo sin piel cocida')] },
        },
      ],
      intra: { foodId: foodId('Gatorade'), carbsG: 30 },
      supplements: [{ supplementId: catalog.supplements.find((s) => s.name === 'Cafeína').id, assignedDose: '200 mg' }],
    };

    const preview = await auth(request(app).post(`${base}/nutrition/preview`)).send(draft);
    expect(preview.status).toBe(200);
    expect(preview.body.computed.targetKcal).toBe(2211);

    expect((await auth(request(app).put(`${base}/nutrition`)).send(draft)).status).toBe(204);
    const { nutrition } = (await request(app).get(`/api/portal/${code}`)).body;
    const { computed } = nutrition;
    expect(computed.bmr).toBe(1748.75);
    expect(computed.maintenanceKcal).toBe(2711);
    expect(computed.macros).toMatchObject({ proteinG: 176, fatG: 61, carbsG: 240 });
    expect(computed.intra).toMatchObject({ name: 'Gatorade', amount: 500, unit: 'ml' });

    const desayuno = Object.fromEntries(computed.meals[0].items.map((i) => [i.name, [i.trainingGrams, i.restGrams]]));
    expect(desayuno).toEqual({
      'Clara de huevo': [130, 120],
      'Huevo entero fresco': [110, 105],
      'Avena en hojuelas': [35, 45],
      'Aguacate hass': [0, 0],
      'Fresa entera': [205, 205],
    });
    expect(computed.meals[0].items[0].restMeasure).toBe('3.75 pieza');
    expect(computed.meals[0].items[0].swaps[0]).toMatchObject({ name: 'Pechuga de pollo sin piel cocida', trainingGrams: 50 });
    expect(computed.grocery.find((g) => g.name === 'Clara de huevo')).toMatchObject({ grams: 880, measure: '26.5 pieza' });
    expect(computed.supplements[0]).toMatchObject({ name: 'Cafeína', recommendedDose: '240–480 mg', assignedDose: '200 mg' });
    expect(computed.hydration.trainingDayL).toBeCloseTo(3);
  });

  it('seguimiento: cuestionario, peso y mediciones', async () => {
    const portal = `/api/portal/${code}`;
    const checkin = await request(app)
      .put(`${portal}/checkins/1`)
      .send({ sessions: [{ day: 1, rpe: 8, durationMin: 70, enjoyment: 4 }, { day: 2, rpe: 7, durationMin: 80 }], ratings: { energy: 4, sleep: 3, injury: 5 }, answers: { comments: 'Todo bien' }, avgSteps: 9100 });
    expect(checkin.status).toBe(204);
    expect((await request(app).put(`${portal}/checkins/1`).send({ sessions: [{ day: 1, rpe: 11 }] })).status).toBe(400);

    for (const [date, weightKg] of [['2026-10-05', 80], ['2026-10-06', 80.4], ['2026-10-12', 79.6]]) {
      expect((await request(app).put(`${portal}/weights/${date}`).send({ weightKg })).status).toBe(204);
    }
    await request(app).put(`${portal}/measurements/2026-09-01`).send({ values: { weight: 82, waist: 86 } });
    await request(app).put(`${portal}/measurements/2026-10-01`).send({ values: { weight: 82.8, waist: 86.5 } });
    expect((await request(app).delete(`${portal}/measurements/2026-10-01`)).status).toBe(403);

    const { tracking } = (await request(app).get(portal)).body;
    expect(tracking.checkins[0]).toMatchObject({ avgRpe: 7.5, avgDurationMin: 75, wellbeingIndex: 4, injuryRating: 5 });
    expect(tracking.weight.weeks).toHaveLength(2);
    expect(tracking.weight.weeks[0]).toMatchObject({ average: 80.2, expected: 80.2, changeKg: null });
    expect(tracking.weight.weeks[1]).toMatchObject({ average: 79.6, changeKg: -0.6, expected: 79.75 });
    expect(tracking.measurements.deltas.weight.delta).toBeCloseTo(0.8);
  });

  it('el dashboard resume a los clientes', async () => {
    const { body } = await auth(request(app).get('/api/dashboard'));
    expect(body.counts).toMatchObject({ active: 1, withTraining: 1, withNutrition: 1, withoutTraining: 0 });
    expect(body.activity.length).toBeGreaterThan(0);
    const list = (await auth(request(app).get('/api/clients?search=ejem'))).body;
    expect(list[0]).toMatchObject({ fullName: 'Cliente ejemplo', hasTraining: true, goal: 'Definición' });
  });

  it('pagos: registrar un pago tardío recorre el vencimiento y el cliente recibe el aviso', async () => {
    const base = `/api/clients/${client.id}`;
    const portal = `/api/portal/${code}`;
    const { today } = (await auth(request(app).get(base))).body;
    const shift = (days) => new Date(Date.parse(`${today}T00:00:00Z`) + days * 864e5).toISOString().slice(0, 10);

    // Sin fecha de pago no hay aviso.
    expect((await request(app).get(portal)).body.payment).toMatchObject({ state: 'none', periodMonths: 1 });

    // El coach fija un vencimiento que ya pasó: vencido para el coach, para el cliente y en el resumen.
    const due = shift(-3);
    expect((await auth(request(app).put(`${base}/payments/due-date`)).send({ dueDate: due })).status).toBe(204);
    const overdue = (await request(app).get(portal)).body;
    expect(overdue.payment).toMatchObject({ state: 'overdue', dueDate: due, days: -3 });
    expect(overdue.payments).toBeUndefined();
    const dashboard = (await auth(request(app).get('/api/dashboard'))).body;
    expect(dashboard.payments[0]).toMatchObject({ clientId: client.id, overdue: true, days: -3, date: due });

    // El cliente no puede registrar pagos.
    expect((await request(app).post(`${portal}/payments`).send({ paidOn: today })).status).toBe(403);

    // Paga hoy (3 días tarde): el siguiente vencimiento sale del anterior, no del día del pago.
    const paid = await auth(request(app).post(`${base}/payments`)).send({ paidOn: today, amount: 1500, method: 'Transferencia' });
    expect(paid.status).toBe(201);
    expect(paid.body).toMatchObject({ dueDate: due, delayDays: 3, amount: 1500 });
    const next = paid.body.nextDueDate;
    expect(next > today).toBe(true);

    const after = (await auth(request(app).get(base))).body;
    expect(after.payment).toMatchObject({ state: 'ok', dueDate: next });
    expect(after.client.profile.logistics.paymentDate).toBe(next);
    expect(after.payments).toHaveLength(1);
    expect((await auth(request(app).get('/api/dashboard'))).body.payments).toHaveLength(0);

    // Un pago adelantado con la fecha siguiente elegida a mano.
    const early = await auth(request(app).post(`${base}/payments`)).send({ paidOn: today, nextDueDate: shift(90) });
    expect(early.body.delayDays).toBeLessThan(0);
    expect((await auth(request(app).get(base))).body.payment.dueDate).toBe(shift(90));

    // Borrar el último pago regresa el vencimiento al que ese pago cubría.
    expect((await auth(request(app).delete(`${base}/payments/${early.body.id}`))).status).toBe(204);
    const restored = (await auth(request(app).get(base))).body;
    expect(restored.payment.dueDate).toBe(next);
    expect(restored.payments).toHaveLength(1);
  });

  it('un cliente nuevo puede pautar su primera semana aunque el split esté vacío', async () => {
    const created = await auth(request(app).post('/api/clients')).send({ fullName: 'Cliente nuevo' });
    const base = `/api/clients/${created.body.id}`;

    // "Nueva semana" sin plan previo: crea el plan con todos los días en descanso.
    const week = await auth(request(app).post(`${base}/training/weeks`));
    expect(week.status).toBe(201);
    let training = (await auth(request(app).get(base))).body.training;
    expect(training.split.every((session) => session === 'Descanso')).toBe(true);
    expect(training.weeks[0].days).toHaveLength(7);

    // El editor guarda primero el nombre de la sesión y luego los ejercicios de ese día.
    const split = ['Torso', 'Descanso', 'Descanso', 'Descanso', 'Descanso', 'Descanso', 'Descanso'];
    expect((await auth(request(app).put(`${base}/training`)).send({ split })).status).toBe(204);
    const saved = await auth(request(app).put(`${base}/training/weeks/${week.body.id}`)).send({
      exercises: [{ day: 1, muscle: 'Pectoral', exercise: 'Press de banca plano con barra', sets: 3, reps: '8 a 10', rir: 2 }],
    });
    expect(saved.status).toBe(204);

    training = (await auth(request(app).get(base))).body.training;
    expect(training.split[0]).toBe('Torso');
    expect(training.name).toBeTruthy();
    expect(training.weeks[0].days[0].exercises[0]).toMatchObject({ exercise: 'Press de banca plano con barra', sets: 3 });

    // Se eliminan todas las semanas y se vuelve a empezar: la semana nueva sigue siendo editable.
    expect((await auth(request(app).delete(`${base}/training/weeks/${week.body.id}`))).status).toBe(204);
    const again = await auth(request(app).post(`${base}/training/weeks`));
    expect(again.body.number).toBe(1);
    expect((await auth(request(app).put(`${base}/training/weeks/${again.body.id}`)).send({ exercises: [{ day: 3, muscle: 'Dorsal', exercise: 'Dominadas', sets: 4 }] })).status).toBe(204);
    await auth(request(app).delete(base));
  });

  it('un enlace regenerado invalida el anterior', async () => {
    expect((await request(app).get('/api/portal/AAAAAAAAAAAAAAAAAAAA')).status).toBe(404);
    const res = await auth(request(app).post(`/api/clients/${client.id}/access-code`));
    expect(res.body.portalUrl).not.toContain(code);
    expect((await request(app).get(`/api/portal/${code}`)).status).toBe(404);
    expect((await request(app).get(`/api/portal/${res.body.portalUrl.split('/').pop()}`)).status).toBe(200);
  });
});
