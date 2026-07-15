import Redis from 'ioredis';

let redisClient = null;

function getRedisClient() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is missing. Please make sure your Redis database is connected to the project on the Vercel Dashboard.');
    }
    
    // Create connection
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 10000,
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
  }
  return redisClient;
}

export const kv = {
  get: async (key) => {
    const client = getRedisClient();
    const data = await client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return data;
    }
  },
  set: async (key, value) => {
    const client = getRedisClient();
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await client.set(key, stringValue);
    return 'OK';
  }
};
