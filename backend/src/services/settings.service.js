import { SiteSetting } from '../models/index.js';

export async function getSections(keys) {
  const rows = await SiteSetting.findAll({ where: keys ? { key: keys } : undefined });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function saveSection(key, value) {
  await SiteSetting.upsert({ key, value });
  return value;
}
