// 应用配置常量
// 在开发环境中提供默认值，防止启动失败；生产环境应从 .env 读取
export const JWT_SECRET: string = process.env.JWT_SECRET || 'labor-platform-secret-key-2026';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const AI_AGENT_BASE_URL = process.env.AI_AGENT_BASE_URL || '';
export const AI_AGENT_API_KEY = process.env.AI_AGENT_API_KEY || '';
