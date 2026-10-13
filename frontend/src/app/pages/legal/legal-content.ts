/**
 * Textos legales del sitio. Son un borrador redactado a partir de cómo funciona la plataforma;
 * conviene revisarlos con un abogado. Faltan dos datos que solo el coach puede dar: su domicilio
 * (la ley lo pide en el aviso de privacidad) y su política de cancelaciones y reembolsos.
 */
export interface LegalSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LegalDoc {
  slug: 'privacidad' | 'terminos' | 'cookies';
  title: string;
  summary: string;
  updated: string;
  sections: LegalSection[];
}

const UPDATED = '13 de octubre de 2026';
const CONTACT = 'germa.100neri@gmail.com';

export const LEGAL_DOCS: Record<LegalDoc['slug'], LegalDoc> = {
  privacidad: {
    slug: 'privacidad',
    title: 'Aviso de privacidad',
    summary: 'Qué datos personales te pedimos, para qué los usamos y cómo puedes decidir sobre ellos.',
    updated: UPDATED,
    sections: [
      {
        title: 'Quién es responsable de tus datos',
        paragraphs: [
          'Germain Camarillo, que presta sus servicios bajo la marca Fitness by Evidence, es responsable del tratamiento de tus datos personales, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.',
          `Para cualquier asunto relacionado con tus datos puedes escribir a ${CONTACT}.`,
        ],
      },
      {
        title: 'Qué datos recabamos',
        items: [
          'Datos de identificación y contacto: nombre, fecha de nacimiento, sexo, ciudad, ocupación, teléfono y correo electrónico.',
          'Datos de tu plan y tu avance: objetivos, experiencia de entrenamiento, disponibilidad, cargas y repeticiones que registras, peso, medidas corporales y respuestas a los cuestionarios semanales.',
          'Datos sobre el servicio contratado: tipo de plan, tarifa acordada, pagos registrados y fechas de vencimiento. No guardamos datos de tarjetas ni cuentas bancarias.',
        ],
      },
      {
        title: 'Datos personales sensibles',
        paragraphs: [
          'Para diseñar tu plan necesitamos datos de salud: historia clínica, lesiones, padecimientos, medicamentos, hábitos de sueño y alimentación, y tu composición corporal. La ley los considera datos sensibles.',
          'Los usamos únicamente para diseñar y ajustar tu plan de entrenamiento y alimentación. Al entregarlos a tu coach y aceptar este aviso, das tu consentimiento expreso para ese tratamiento. No se usan para ningún otro fin ni se comparten con terceros.',
        ],
      },
      {
        title: 'Para qué usamos tus datos',
        items: [
          'Diseñar, entregar y ajustar tu plan de entrenamiento y de alimentación.',
          'Dar seguimiento a tu avance y agendar sesiones contigo.',
          'Llevar el control de los pagos del servicio.',
          'Contactarte por los medios que nos diste para asuntos relacionados con tu plan.',
        ],
        paragraphs: ['No usamos tus datos para publicidad ni los vendemos. Si en algún momento quisiéramos mostrar tu caso como ejemplo (por ejemplo, tu progreso), te pediríamos antes tu autorización por escrito.'],
      },
      {
        title: 'Con quién se comparten',
        paragraphs: [
          'Tus datos no se transfieren a terceros. La plataforma funciona con proveedores de alojamiento web y de base de datos que los almacenan por cuenta nuestra, obligados a mantenerlos confidenciales y sin permiso para usarlos con fines propios.',
          'Solo se entregarían a una autoridad competente cuando la ley lo exija.',
        ],
      },
      {
        title: 'Tu enlace personal',
        paragraphs: ['Accedes a tu plan con un enlace privado que no pide contraseña: quien lo tenga puede ver tu información. No lo compartas. Si crees que alguien más lo tiene, pide a tu coach que genere uno nuevo; el anterior deja de funcionar en ese momento.'],
      },
      {
        title: 'Tus derechos (ARCO)',
        paragraphs: [
          `Puedes acceder a tus datos, rectificarlos, cancelarlos u oponerte a su uso, así como revocar tu consentimiento, escribiendo a ${CONTACT}. Indica tu nombre completo, qué derecho quieres ejercer y sobre qué datos, y acompaña una identificación.`,
          'Te responderemos en un plazo máximo de 20 días hábiles. Si la solicitud procede, se hará efectiva dentro de los 15 días hábiles siguientes.',
          'Cancelar los datos que son indispensables para prestar el servicio implica darlo por terminado.',
        ],
      },
      {
        title: 'Cuánto tiempo los conservamos',
        paragraphs: ['Mientras seas cliente y, después, el tiempo necesario para cumplir obligaciones legales. Pasado ese plazo se eliminan. Puedes pedir que se eliminen antes.'],
      },
      {
        title: 'Cookies y tecnologías similares',
        paragraphs: ['Este sitio no usa cookies de publicidad ni de análisis. El detalle está en la Política de cookies.'],
      },
      {
        title: 'Cambios a este aviso',
        paragraphs: ['Si este aviso cambia, la versión vigente estará siempre en esta página, con su fecha de actualización. Los cambios importantes te los comunicará tu coach.'],
      },
    ],
  },
  terminos: {
    slug: 'terminos',
    title: 'Términos y condiciones',
    summary: 'Las reglas del servicio de coaching y del uso de la plataforma.',
    updated: UPDATED,
    sections: [
      {
        title: 'El servicio',
        paragraphs: [
          'Fitness by Evidence es un servicio de asesoría en entrenamiento y alimentación que presta Germain Camarillo. Incluye el diseño de un plan a tu medida, su seguimiento y el acceso a una plataforma en línea para consultarlo y registrar tu avance.',
          'Al contratar el servicio o usar la plataforma aceptas estos términos.',
        ],
      },
      {
        title: 'No sustituye la atención médica',
        paragraphs: [
          'El plan es una asesoría deportiva y nutricional; no es un diagnóstico ni un tratamiento médico. Si tienes una enfermedad, una lesión, estás embarazada o tomas medicamentos, consulta a tu médico antes de empezar y cada vez que cambie tu estado de salud.',
          'Suspende la actividad y busca atención médica ante dolor en el pecho, mareo, falta de aire inusual o cualquier molestia que te preocupe.',
        ],
      },
      {
        title: 'Lo que te toca a ti',
        items: [
          'Dar información veraz y completa sobre tu salud, tu experiencia y tus condiciones, y avisar cuando cambien.',
          'Seguir las indicaciones de técnica y de carga, y entrenar dentro de tus posibilidades.',
          'Registrar tu avance con datos reales: es con lo que se ajusta el plan.',
          'Cuidar tu enlace personal y no compartirlo.',
        ],
      },
      {
        title: 'Resultados',
        paragraphs: ['El plan se diseña con base en la evidencia disponible y en tus datos, pero los resultados dependen de factores que nadie controla por completo (constancia, descanso, genética, salud). No se garantiza un resultado ni un plazo determinados.'],
      },
      {
        title: 'Pagos y acceso',
        paragraphs: [
          'La tarifa, el periodo que cubre (quincenal, mensual, trimestral, semestral, anual o el que se acuerde) y la forma de pago se convienen directamente con tu coach.',
          'Cuando un pago vence, el acceso a tu plan en la plataforma se pone en pausa hasta que se regularice; tu información y tu avance se conservan. Tu coach puede permitir el acceso mientras tanto.',
        ],
      },
      {
        title: 'Sesiones por videollamada',
        paragraphs: ['Las sesiones se agendan de común acuerdo. Si no puedes asistir, avisa con anticipación para reprogramarla.'],
      },
      {
        title: 'Uso de la plataforma y propiedad intelectual',
        paragraphs: [
          'Los planes, textos, tablas, animaciones y demás materiales son para tu uso personal. No pueden revenderse, publicarse ni entregarse a terceros sin autorización.',
          'La marca, el logotipo y el diseño del sitio pertenecen a Fitness by Evidence.',
        ],
      },
      {
        title: 'Disponibilidad',
        paragraphs: ['Procuramos que la plataforma esté disponible todo el tiempo, pero puede haber interrupciones por mantenimiento o por fallas ajenas a nosotros. No constituyen un incumplimiento del servicio de asesoría.'],
      },
      {
        title: 'Tus datos',
        paragraphs: ['El tratamiento de tus datos personales se rige por el Aviso de privacidad.'],
      },
      {
        title: 'Cambios y ley aplicable',
        paragraphs: [
          'Estos términos pueden actualizarse; la versión vigente es la publicada en esta página.',
          'Se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier diferencia se intentará resolver primero de común acuerdo.',
        ],
      },
      {
        title: 'Contacto',
        paragraphs: [`Dudas sobre estos términos: ${CONTACT}.`],
      },
    ],
  },
  cookies: {
    slug: 'cookies',
    title: 'Política de cookies',
    summary: 'Este sitio no usa cookies de rastreo: por eso no te pedimos aceptar ninguna.',
    updated: UPDATED,
    sections: [
      {
        title: 'En corto',
        paragraphs: ['Fitness by Evidence no instala cookies de publicidad, de análisis ni de redes sociales, y no carga rastreadores de terceros. Como no hay nada que consentir, no verás un aviso de cookies al entrar.'],
      },
      {
        title: 'Lo que sí se guarda en tu dispositivo',
        paragraphs: ['Para funcionar, el sitio usa el almacenamiento local de tu navegador (no es una cookie y no se envía a nadie):'],
        items: [
          'Sesión del coach: al iniciar sesión en el panel se guarda su sesión para no pedirla en cada página. Se borra al cerrar sesión.',
          'Preferencias de tu plan de alimentación: los intercambios de alimentos que eliges al consultar tu menú, para que los encuentres igual la próxima vez.',
        ],
      },
      {
        title: 'Servicios de terceros',
        paragraphs: [
          'Las tipografías, los videos y las imágenes se sirven desde este mismo sitio, sin pasar por terceros.',
          'Si pulsas el botón de WhatsApp o un enlace a una red social o a una videollamada, sales hacia ese servicio, que tiene sus propias políticas de privacidad y de cookies.',
        ],
      },
      {
        title: 'Cómo borrar lo guardado',
        paragraphs: ['Desde la configuración de tu navegador puedes borrar los "datos del sitio". Si lo haces, el coach tendrá que volver a iniciar sesión y se perderán las preferencias guardadas del menú.'],
      },
      {
        title: 'Si esto cambia',
        paragraphs: ['Si en el futuro se añadieran cookies que no sean estrictamente necesarias (por ejemplo, de medición de visitas), esta página se actualizará y se te pedirá tu consentimiento antes de activarlas.'],
      },
    ],
  },
};
