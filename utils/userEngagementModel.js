const tf = require("@tensorflow/tfjs");

// Create and train a user engagement model
const createUserEngagementModel = async (userData) => {
  // Prepare data
  const timestamps = userData.map((user) =>
    new Date(user.lastActive).getTime()
  );
  const engagementScores = userData.map((user) => user.engagementScore || 0);

  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);
  const normalizedTimestamps = timestamps.map(
    (t) => (t - minTimestamp) / (maxTimestamp - minTimestamp)
  );

  const xs = tf.tensor2d(normalizedTimestamps, [
    normalizedTimestamps.length,
    1,
  ]);
  const ys = tf.tensor2d(engagementScores, [engagementScores.length, 1]);

  // Define the model
  const model = tf.sequential();
  model.add(
    tf.layers.dense({ units: 10, activation: "relu", inputShape: [1] })
  );
  model.add(tf.layers.dense({ units: 1, activation: "linear" }));

  // Compile the model
  model.compile({ optimizer: "adam", loss: "meanSquaredError" });

  // Train the model
  await model.fit(xs, ys, { epochs: 50 });

  return model;
};

// Predict future user engagement
const predictUserEngagement = async (model, futureDate) => {
  const normalizedTimestamp =
    (new Date(futureDate).getTime() - minTimestamp) /
    (maxTimestamp - minTimestamp);
  const prediction = model.predict(tf.tensor2d([normalizedTimestamp], [1, 1]));
  return prediction.dataSync()[0];
};

module.exports = { createUserEngagementModel, predictUserEngagement };
