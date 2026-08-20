export const DEFAULT_JWT_SECRET = 'labor-platform-secret-key-2026';
export const WEAK_PASSWORDS = new Set(['123456', 'admin123', 'password', '111111']);

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function parsePagination(pageValue: unknown, limitValue: unknown, maxLimit = 50) {
  const page = Number.parseInt(String(pageValue ?? '0'), 10);
  const limit = Number.parseInt(String(limitValue ?? '20'), 10);
  return {
    page: Number.isFinite(page) && page >= 0 ? page : 0,
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), maxLimit) : 20,
  };
}

export function clampScore(value: unknown, fallback = 0) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(5, Math.max(0, Math.round(numeric)));
}

export function requireCompleteSelfScores(attitude: unknown, skill: unknown, result: unknown) {
  const scores = [attitude, skill, result].map((value) => clampScore(value, 0));
  if (scores.some((score) => score < 1)) {
    throw new Error('请完成 1-5 分的自我评价');
  }
  return {
    evalAttitude: scores[0],
    evalSkill: scores[1],
    evalResult: scores[2],
  };
}

export function isWeakPassword(password: string) {
  return WEAK_PASSWORDS.has(password.trim().toLowerCase());
}

export function assertPasswordStrength(password: string) {
  if (password.length < 6) {
    throw new Error('密码长度至少6位');
  }
  if (isWeakPassword(password)) {
    throw new Error('密码过于简单，请更换');
  }
}

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = memoryBuckets.get(key);
  if (!current || current.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (current.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: current.resetAt - now };
  }
  current.count += 1;
  return { allowed: true, remaining: limit - current.count };
}

export function clientKey(req: { ip?: string; headers: { [key: string]: unknown } }, suffix: string) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.ip || 'unknown';
  return `${ip}:${suffix}`;
}
