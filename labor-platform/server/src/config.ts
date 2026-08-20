import { DEFAULT_JWT_SECRET } from './utils.js';

const jwtSecret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

export const JWT_SECRET: string = jwtSecret;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const AI_AGENT_BASE_URL = process.env.AI_AGENT_BASE_URL || '';
export const AI_AGENT_API_KEY = process.env.AI_AGENT_API_KEY || '';
export const AI_AGENT_MODEL = process.env.AI_AGENT_MODEL || '';
export const AI_AGENT_PROVIDER = process.env.AI_AGENT_PROVIDER || 'custom';
export const AI_AGENT_THINKING_LEVEL = process.env.AI_AGENT_THINKING_LEVEL || 'off';

export const isDefaultJwtSecret = () => !process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET;
