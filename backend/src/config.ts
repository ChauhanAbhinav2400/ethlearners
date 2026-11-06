import { z } from 'zod';
export const envSchema = z.object({
  WORLD_ID_CREDENTIAL_MODE:z.enum(['proof-of-human','orb-legacy']).default('proof-of-human'),
  NODE_ENV:z.enum(['development','production','test']).default('development'),PORT:z.coerce.number().default(3001),FRONTEND_ORIGIN:z.string().url().default('http://localhost:5173'),
  MONGODB_URI:z.string().default(''),SESSION_SECRET:z.string().default(''),IDENTITY_SECRET:z.string().default(''),REWARD_ID_SECRET:z.string().default(''),
  WORLD_ID_APP_ID:z.string().default(''),WORLD_ID_RP_ID:z.string().default(''),WORLD_ID_ACTION:z.string().default(''),WORLD_ID_SIGNING_KEY:z.string().default(''),WORLD_ID_ENVIRONMENT:z.enum(['production','staging']).default('production'),
  SEPOLIA_RPC_URL:z.string().default(''),REWARD_TOKEN_ADDRESS:z.string().default(''),REWARD_DISTRIBUTOR_ADDRESS:z.string().default(''),REWARD_SIGNER_PROVIDER:z.enum(['local-testnet']).default('local-testnet'),REWARD_SIGNER_PRIVATE_KEY:z.string().default(''),REWARD_WORKER_ENABLED:z.enum(['true','false']).default('false'),COOKIE_SAME_SITE:z.enum(['lax','none']).default('lax'),TRUST_PROXY:z.enum(['true','false']).default('false'),
});
export type Config=z.infer<typeof envSchema>;
export const config=envSchema.parse(process.env);
export function configured(c:Config){return c.MONGODB_URI && c.SESSION_SECRET.length>=32 && c.IDENTITY_SECRET.length>=32 && c.REWARD_ID_SECRET.length>=32;}
