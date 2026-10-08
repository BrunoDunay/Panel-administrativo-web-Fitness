import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Admin } from '../models/index.js';
import { AppError } from '../utils/app-error.js';

export const BCRYPT_ROUNDS = 12;
const INVALID_CREDENTIALS = 'Email o contraseña incorrectos.';
// Hash real usado cuando el email no existe, para igualar el tiempo de respuesta.
const DUMMY_HASH = bcrypt.hashSync('cuenta-inexistente', BCRYPT_ROUNDS);

function signToken(admin) {
  return jwt.sign({ sub: admin.id, email: admin.email }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

const publicAdmin = (admin) => ({ id: admin.id, email: admin.email, name: admin.name });

export async function login(req, res) {
  const { email, password } = req.valid.body;
  const admin = await Admin.scope('withPassword').findOne({ where: { email: email.toLowerCase() } });

  // Comparar siempre para no revelar por tiempo de respuesta si el email existe.
  const valid = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !valid) throw new AppError(401, INVALID_CREDENTIALS, 'INVALID_CREDENTIALS');

  await admin.update({ lastLoginAt: new Date() });

  const token = signToken(admin);
  const { exp } = jwt.decode(token);
  res.json({ token, expiresAt: new Date(exp * 1000).toISOString(), admin: publicAdmin(admin) });
}

export async function me(req, res) {
  const admin = await Admin.findByPk(req.admin.id);
  if (!admin) throw new AppError(401, 'La cuenta ya no existe.', 'UNAUTHENTICATED');
  res.json(publicAdmin(admin));
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.valid.body;
  const admin = await Admin.scope('withPassword').findByPk(req.admin.id);
  if (!admin || !(await bcrypt.compare(currentPassword, admin.passwordHash))) {
    throw new AppError(400, 'La contraseña actual no es correcta.', 'INVALID_PASSWORD', {
      currentPassword: 'La contraseña actual no es correcta.',
    });
  }
  await admin.update({ passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) });
  res.json({ message: 'Contraseña actualizada.' });
}
