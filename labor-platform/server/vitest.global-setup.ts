import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const databasePath = path.join(
  serverDir,
  'prisma',
  `test-${process.pid}-${Date.now()}.db`,
).replaceAll('\\', '/');
const databaseUrl = `file:${databasePath}`;

export default function setup() {
  if (existsSync(databasePath)) rmSync(databasePath);
  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET = 'test-review-badges-secret';
  process.env.NODE_ENV = 'test';

  const prismaCli = path.join(serverDir, 'node_modules', 'prisma', 'build', 'index.js');
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });

  return () => {
    for (const suffix of ['', '-journal']) {
      const target = `${databasePath}${suffix}`;
      if (existsSync(target)) rmSync(target);
    }
  };
}
