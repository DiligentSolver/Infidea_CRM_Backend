const { createClient } = require("redis");

const client = createClient({
  url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 2000), // Exponential backoff
  },
});

client.on("error", (err) => console.error("❌ Redis Client Error:", err));
client.on("connect", () => console.log("✅ Connected to Redis"));
client.on("reconnecting", () => console.log("🔄 Reconnecting to Redis..."));
client.on("end", () => console.log("❌ Redis connection closed."));

let isConnected = false; // Track connection state

async function connectRedis() {
  if (!isConnected) {
    try {
      await client.connect();
      isConnected = true;
    } catch (err) {
      console.error("🚨 Redis connection failed:", err);
    }
  }
}

module.exports = { client, connectRedis };
