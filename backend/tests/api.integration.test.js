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
    expect(catalog.foods).toHaveLength(147);
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

  it('nutrición por porciones: dietocálculo, reparto por comida y equivalentes', async () => {
    const base = `/api/clients/${client.id}`;
    // Porciones del ejemplo de la hoja "_DIETOCALCULO" del coach.
    const portions = { verduras: 6, frutas: 3, cereales_sg: 12, leguminosas: 1, aoa_b: 8.5, aoa_m: 3, leche_d: 1, grasa_sp: 1 };
    const draft = {
      startDate: '2026-09-01',
      inputs: {
        weightKg: 80, formula: 'mifflin', activity: 'moderate', dietType: 'omnivore', goal: 'Definición', adjustmentKcal: -500, proteinPerKg: 2, fatPct: 0.25,
        portions,
        mealCount: 3,
        mealsMeta: ['Desayuno', 'Comida', 'Cena'].map((name) => ({ name, time: '' })),
      },
      meals: [
        { items: [{ group: 'cereales_sg', portions: 3, foodId: foodId('Arroz cocido') }, { group: 'verduras', portions: 2, foodId: foodId('Jitomate') }, { group: 'aoa_m', portions: 3, foodId: foodId('Huevo entero fresco') }], notes: 'Huevo a la mexicana.' },
        { items: [{ group: 'cereales_sg', portions: 4, foodId: foodId('Tortilla de maíz') }, { group: 'frutas', portions: 1, foodId: null }], extras: [{ foodId: foodId('Plátano'), portions: 2, note: 'Solo los días de entreno' }] },
        { items: [] },
      ],
    };

    const preview = await auth(request(app).post(`${base}/nutrition/preview`)).send(draft);
    expect(preview.status).toBe(200);
    const c = preview.body.computed;

    // Dietocálculo: igual que la hoja del coach.
    expect(c.diet.totals).toEqual({ kcal: 2122.5, proteinG: 133.5, fatG: 48.5, carbsG: 281 });
    expect(c.diet.adequacy.kcal).toMatchObject({ ideal: c.targetKcal, total: 2122.5 });
    expect(['ok', 'low', 'high']).toContain(c.diet.adequacy.kcal.state);

    // Reparto: 12 porciones de cereal, 3 + 4 repartidas, quedan 5.
    const cereal = c.diet.groups.find((group) => group.key === 'cereales_sg');
    expect(cereal).toMatchObject({ daily: 12, assigned: 7, remaining: 5 });
    expect(c.diet.groups.find((group) => group.key === 'verduras')).toMatchObject({ assigned: 2, remaining: 4 });
    expect(c.diet.exceeded).toEqual([]);

    // La cantidad sale de las porciones: 3 de arroz = 141 g (3/4 de taza); 4 tortillas = 120 g.
    expect(c.meals[0].items[0]).toMatchObject({ name: 'Arroz cocido', portions: 3, grams: 141, measure: '3/4 taza' });
    expect(c.meals[1].items[0]).toMatchObject({ name: 'Tortilla de maíz', grams: 120, measure: '4 pieza' });
    expect(c.meals[0].notes).toBe('Huevo a la mexicana.');
    expect(c.meals[0].kcal).toBe(3 * 70 + 2 * 25 + 3 * 75);

    // El alimento adicional no cuenta para el dietocálculo y conserva su nota.
    expect(c.meals[1].extras[0]).toMatchObject({ name: 'Plátano', portions: 2, grams: 108, note: 'Solo los días de entreno' });
    expect(c.diet.groups.find((group) => group.key === 'frutas').assigned).toBe(1);

    // Equivalentes del grupo para que el cliente cambie un alimento por otro sin alterar las porciones.
    expect(c.equivalents.cereales_sg.some((food) => food.name === 'Tortilla de maíz' && food.grams === 30)).toBe(true);
    expect(c.grocery.find((item) => item.name === 'Arroz cocido').grams).toBe(141 * 7);

    // Repartir de más se señala.
    const over = structuredClone(draft);
    over.meals[2].items.push({ group: 'verduras', portions: 5, foodId: null });
    expect((await auth(request(app).post(`${base}/nutrition/preview`)).send(over)).body.computed.diet.exceeded).toEqual(['Verduras']);

    expect((await auth(request(app).put(`${base}/nutrition`)).send(draft)).status).toBe(204);
    const saved = (await auth(request(app).get(base))).body.nutrition;
    expect(saved.id).toBeTruthy();
    expect(saved.computed.meals[1].extras).toHaveLength(1);

    // El cliente recibe su menú con equivalentes; si el coach los apaga, no llegan.
    expect(Object.keys((await request(app).get(`/api/portal/${code}`)).body.nutrition.computed.equivalents).length).toBeGreaterThan(5);
    await auth(request(app).put(`${base}/nutrition`)).send({ ...draft, allowClientSwaps: false });
    expect((await request(app).get(`/api/portal/${code}`)).body.nutrition.computed.equivalents).toEqual({});
    await auth(request(app).put(`${base}/nutrition`)).send(draft);
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

    // Con el pago vencido el enlace abre, pero solo muestra el aviso y no deja registrar nada.
    expect(overdue.locked).toBe(true);
    expect(overdue.training).toBeNull();
    expect(overdue.client).toEqual({ fullName: 'Cliente ejemplo' });
    expect((await request(app).put(`${portal}/weights/${today}`).send({ weightKg: 80 })).status).toBe(402);
    const listed = (await auth(request(app).get('/api/clients'))).body.find((c) => c.id === client.id);
    expect(listed).toMatchObject({ paymentLocked: true, overdueAccess: false, currentWeek: 2, lastCheckinWeek: 1 });

    // El coach le permite el acceso por un acuerdo: vuelve a ver su plan, con el aviso de vencido.
    expect((await auth(request(app).put(`${base}/payments/access`)).send({ allow: true })).status).toBe(204);
    const allowed = (await request(app).get(portal)).body;
    expect(allowed.locked).toBeUndefined();
    expect(allowed.training).not.toBeNull();
    expect(allowed.payment).toMatchObject({ state: 'overdue', overdueAccess: true, locked: false });
    expect((await request(app).put(`${portal}/weights/${today}`).send({ weightKg: 80 })).status).toBe(204);
    await request(app).put(`${portal}/weights/${today}`).send({ weightKg: null });

    // El cliente no puede registrar pagos ni darse acceso.
    expect((await request(app).put(`${portal}/payments/access`).send({ allow: true })).status).toBe(403);
    expect((await request(app).post(`${portal}/payments`).send({ paidOn: today })).status).toBe(403);

    // Paga hoy (3 días tarde): el siguiente vencimiento sale del anterior, no del día del pago.
    const paid = await auth(request(app).post(`${base}/payments`)).send({ paidOn: today, amount: 1500, method: 'Transferencia' });
    expect(paid.status).toBe(201);
    expect(paid.body).toMatchObject({ dueDate: due, delayDays: 3, amount: 1500 });
    const next = paid.body.nextDueDate;
    expect(next > today).toBe(true);

    const after = (await auth(request(app).get(base))).body;
    // Al pagar se acaba el permiso especial: si vuelve a vencer, se bloquea otra vez.
    expect(after.payment).toMatchObject({ state: 'ok', dueDate: next, overdueAccess: false, locked: false });
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

  it('tarifa acordada: abono parcial, saldo y liquidación', async () => {
    const created = await auth(request(app).post('/api/clients')).send({ fullName: 'Cliente con tarifa', profile: { logistics: { planType: 'Mensual', fee: 6000 } } });
    const base = `/api/clients/${created.body.id}`;
    const portal = `/api/portal/${created.body.portalUrl.split('/').pop()}`;
    const { today } = (await auth(request(app).get(base))).body;
    const shift = (days) => new Date(Date.parse(`${today}T00:00:00Z`) + days * 864e5).toISOString().slice(0, 10);

    // Acordaron 6,000: lo pendiente arranca siendo la tarifa completa.
    await auth(request(app).put(`${base}/payments/due-date`)).send({ dueDate: shift(20) });
    expect((await auth(request(app).get(base))).body.payment).toMatchObject({ fee: 6000, pendingAmount: 6000, dueDate: shift(20) });

    // Da 2,000 hoy: es un abono, quedan 4,000 para la misma fecha.
    const first = await auth(request(app).post(`${base}/payments`)).send({ paidOn: today, amount: 2000 });
    expect(first.body).toMatchObject({ partial: true, pendingAfter: 4000, nextDueDate: shift(20) });
    // El cliente ve cuánto y cuándo le toca pagar.
    expect((await request(app).get(portal)).body.payment).toMatchObject({ pendingAmount: 4000, dueDate: shift(20), fee: 6000 });
    expect((await auth(request(app).get('/api/clients'))).body.find((c) => c.id === created.body.id).paymentDate).toBe(shift(20));

    // Paga los 4,000 restantes: queda cubierto y el siguiente periodo vuelve a ser de 6,000.
    const second = await auth(request(app).post(`${base}/payments`)).send({ paidOn: today, amount: 4000 });
    expect(second.body).toMatchObject({ partial: false, pendingAfter: 6000 });
    expect(second.body.nextDueDate > shift(40)).toBe(true);
    expect((await auth(request(app).get(base))).body.payment).toMatchObject({ pendingAmount: 6000, dueDate: second.body.nextDueDate });

    // Borrar el último pago regresa el saldo y la fecha a como estaban.
    await auth(request(app).delete(`${base}/payments/${second.body.id}`));
    expect((await auth(request(app).get(base))).body.payment).toMatchObject({ pendingAmount: 4000, dueDate: shift(20) });

    // El coach puede corregir a mano el monto por cobrar, y subir la tarifa no toca un saldo con abonos.
    await auth(request(app).put(`${base}/payments/due-date`)).send({ dueDate: shift(25), pendingAmount: 3500 });
    expect((await auth(request(app).get(base))).body.payment).toMatchObject({ pendingAmount: 3500, dueDate: shift(25) });
    const current = (await auth(request(app).get(base))).body.client;
    await auth(request(app).put(base)).send({ fullName: current.fullName, profile: { logistics: { ...current.profile.logistics, fee: 7000 } } });
    expect((await auth(request(app).get(base))).body.payment).toMatchObject({ fee: 7000, pendingAmount: 3500 });
    await auth(request(app).delete(base));
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
