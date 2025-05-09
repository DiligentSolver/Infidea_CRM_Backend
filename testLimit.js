const axios = require("axios");

async function testRateLimit() {
  for (let i = 1; i <= 55; i++) {
    try {
      const res = await axios.get("http://localhost:4000/api/health-check");
      console.log(`Request ${i}:`, res.status);
    } catch (err) {
      console.error(`Request ${i}:`, err.response.status, err.response.data);
    }
  }
}

testRateLimit();
