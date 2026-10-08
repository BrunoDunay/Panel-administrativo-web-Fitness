/** Error controlado: su mensaje sí se muestra al cliente. */
export class AppError extends Error {
  constructor(status, message, code = 'APP_ERROR', fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const notFound = (what = 'El recurso') => new AppError(404, `${what} no existe o fue eliminado.`, 'NOT_FOUND');
