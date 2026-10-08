// Contenido inicial de la landing. Todo es editable desde el panel; lo marcado como
// provisional aparece en el dashboard como "Pendiente de confirmar".

export const settings = {
  brand: {
    name: 'Fitness by Evidence',
    coachName: 'Germain Camarillo',
    tagline: 'Entrenamiento y nutrición basados en evidencia',
  },
  hero: {
    eyebrow: 'Coach de entrenamiento y nutrición',
    title: 'Tu plan, calculado para ti.',
    subtitle:
      'Entrenamiento y alimentación diseñados a partir de tus condiciones, tu contexto y tu objetivo. Sin plantillas genéricas: cada serie y cada gramo tienen una razón.',
    ctaLabel: 'Quiero mi plan',
    isProvisional: true,
  },
  services: {
    title: 'Qué incluye trabajar conmigo',
    items: [
      {
        title: 'Plan de entrenamiento',
        description:
          'Programación por bloques con tu split semanal, prioridades musculares, series, repeticiones y RIR. Cardio y calentamiento dosificados por día.',
      },
      {
        title: 'Plan de alimentación',
        description:
          'Calorías y macros calculados para tu objetivo, repartidos por comida, con gramos exactos, equivalencias para cambiar alimentos y lista del súper.',
      },
      {
        title: 'Seguimiento continuo',
        description:
          'Tu propio panel en línea para registrar cargas, peso y sensaciones. Reviso tu progreso cada semana y ajustamos el plan con datos, no con suposiciones.',
      },
    ],
    isProvisional: true,
  },
  method: {
    title: 'Método basado en evidencia',
    intro: 'Cada decisión del plan sale de la literatura científica y de tus propios datos.',
    steps: [
      { title: 'Evaluación', description: 'Historia clínica, experiencia, logística y objetivo. Partimos de dónde estás realmente.' },
      { title: 'Diseño', description: 'Entrenamiento y nutrición calculados para ti, con el fundamento de cada pauta.' },
      { title: 'Registro', description: 'Anotas tus series, tu peso y cómo te sientes desde tu panel, en cualquier momento.' },
      { title: 'Ajuste', description: 'Comparamos lo esperado contra lo real y modificamos lo que haga falta.' },
    ],
    isProvisional: true,
  },
  about: {
    title: 'Sobre Germain',
    body: 'Germain Camarillo es entrenador y diseña planes de entrenamiento y alimentación según las condiciones, características y objetivos de cada persona.',
    credentials: [],
    isProvisional: true,
  },
  contact: {
    whatsapp: '',
    whatsappMessage: 'Hola Germain, me interesa conocer más sobre tus planes de entrenamiento y nutrición.',
    email: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    city: '',
    isProvisional: true,
  },
};
