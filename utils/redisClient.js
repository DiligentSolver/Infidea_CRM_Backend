const { createClient } = require("redis");

let client = null;
let isConnected = false; // Track connection state

function getRedisClient() {
  if (!client) {
    // Check if environment variables are available
    if (
      !process.env.REDIS_HOST ||
      !process.env.REDIS_PORT ||
      !process.env.REDIS_PASSWORD
    ) {
      throw new Error(
        "Redis environment variables not found. Please check REDIS_HOST, REDIS_PORT, and REDIS_PASSWORD"
      );
    }

    client = createClient({
      url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 2000), // Exponential backoff
      },
    });

    client.on("error", (err) => console.error("❌ Redis Client Error:", err));
    client.on("connect", () => console.log("✅ Connected to Redis"));
    client.on("reconnecting", () => console.log("🔄 Reconnecting to Redis..."));
    client.on("end", () => console.log("❌ Redis connection closed."));
  }
  return client;
}

async function connectRedis() {
  if (!isConnected) {
    try {
      const redisClient = getRedisClient();
      await redisClient.connect();
      isConnected = true;
    } catch (err) {
      console.error("🚨 Redis connection failed:", err);
    }
  }
}

module.exports = { getRedisClient, connectRedis };
