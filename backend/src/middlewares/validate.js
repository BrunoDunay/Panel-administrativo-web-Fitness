/**
 * Valida body/query/params con esquemas zod.
 * El resultado queda en `req.valid` (en Express 5 `req.query` es de solo lectura).
 */
export function validate({ body, query, params } = {}) {
  return (req, _res, next) => {
    req.valid = {
      body: body ? body.parse(req.body ?? {}) : req.body,
      query: query ? query.parse(req.query ?? {}) : req.query,
      params: params ? params.parse(req.params ?? {}) : req.params,
    };
    next();
  };
}
