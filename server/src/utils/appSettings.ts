import { prisma } from './prisma';

/**
 * Typed readers for the `AppSetting` key/value table.
 *
 * Settings are stored as strings with a declared `type`, so every consumer
 * would otherwise repeat the same parse-and-fall-back dance. A missing row is
 * not an error — it just means the deployment never overrode the default.
 */
export async function getSettingValue(key: string): Promise<string | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function getBooleanSetting(key: string, fallback: boolean): Promise<boolean> {
  const value = await getSettingValue(key);
  if (value === null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return fallback;
}

/** Setting keys referenced from application code. */
export const SETTING_KEYS = {
  registrationRequiresApproval: 'registration.requires_approval',
} as const;

/**
 * Whether a freshly registered member must wait for an admin to approve them.
 * Defaults to `true` so a missing setting never silently auto-approves people.
 */
export function registrationRequiresApproval(): Promise<boolean> {
  return getBooleanSetting(SETTING_KEYS.registrationRequiresApproval, true);
}
