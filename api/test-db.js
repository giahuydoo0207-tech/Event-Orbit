import { kv } from './kv.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const envs = {
    REDIS_URL: process.env.REDIS_URL ? 'DEFINED' : 'UNDEFINED',
    KV_REST_API_URL: process.env.KV_REST_API_URL ? 'DEFINED' : 'UNDEFINED',
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? 'DEFINED' : 'UNDEFINED',
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? 'DEFINED' : 'UNDEFINED',
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? 'DEFINED' : 'UNDEFINED',
    NODE_ENV: process.env.NODE_ENV || 'not-set'
  };

  const diagnostics = {
    message: "Event Orbit Database Diagnostics",
    envVariables: envs,
    connectionStatus: "testing..."
  };

  try {
    // Try to set a test key and read it back
    await kv.set('test_conn_key', 'connection_ok_' + Date.now());
    const val = await kv.get('test_conn_key');
    diagnostics.connectionStatus = "SUCCESSFUL";
    diagnostics.testValueRead = val;
    return res.status(200).json(diagnostics);
  } catch (err) {
    diagnostics.connectionStatus = "FAILED";
    diagnostics.errorMessage = err.message;
    diagnostics.errorStack = err.stack;
    return res.status(500).json(diagnostics);
  }
}
