import { createClient } from '@vercel/kv';

let kvClient = null;

function ensureClient() {
  if (!kvClient) {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!url || !token) {
      throw new Error('KV database environment variables (KV_REST_API_URL / UPSTASH_REDIS_REST_URL) are missing. Please verify that the Redis/KV database is connected to this project on the Vercel Dashboard.');
    }
    
    kvClient = createClient({ url, token });
  }
}

export const kv = {
  get: async (key) => {
    ensureClient();
    return await kvClient.get(key);
  },
  set: async (key, value, options) => {
    ensureClient();
    return await kvClient.set(key, value, options);
  }
};
