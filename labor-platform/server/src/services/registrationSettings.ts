import prisma from '../prisma.js';

export type RegistrationMode = 'OPEN' | 'ROSTER_ONLY' | 'CLOSED';

export interface RegistrationSettings {
  mode: RegistrationMode;
}

const SETTING_KEY = 'registration.mode';
const DEFAULT_MODE: RegistrationMode = 'OPEN';

export const parseRegistrationMode = (value?: string | null): RegistrationMode | null => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'OPEN' || normalized === 'ROSTER_ONLY' || normalized === 'CLOSED') {
    return normalized;
  }
  return null;
};

/** 读取注册模式配置；未配置或配置异常时回退默认 OPEN */
export const getRegistrationSettings = async (): Promise<RegistrationSettings> => {
  const row = await prisma.systemSetting.findUnique({
    where: { key: SETTING_KEY },
  });

  return {
    mode: parseRegistrationMode(row?.value) ?? DEFAULT_MODE,
  };
};

export const updateRegistrationSettings = async (input: { mode?: unknown }): Promise<RegistrationSettings> => {
  const mode = parseRegistrationMode(
    typeof input.mode === 'string' ? input.mode : typeof input.mode === 'number' ? String(input.mode) : undefined
  );

  if (!mode) {
    throw new Error('注册模式无效，仅支持 OPEN / ROSTER_ONLY / CLOSED');
  }

  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: mode },
    create: { key: SETTING_KEY, value: mode },
  });

  return { mode };
};
