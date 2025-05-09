const tf = require("@tensorflow/tfjs");

// Create and train a job demand prediction model
const createJobDemandModel = async (jobData) => {
  if (!Array.isArray(jobData) || jobData.length === 0) {
    throw new Error("Invalid job data provided for model training.");
  }

  // Prepare data
  const timestamps = jobData.map((job) => new Date(job.createdAt).getTime());
  const jobCounts = jobData.map((job, index) => index + 1);

  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);

  const normalizedTimestamps = timestamps.map(
    (t) => (t - minTimestamp) / (maxTimestamp - minTimestamp)
  );

  const xs = tf.tensor2d(normalizedTimestamps, [
    normalizedTimestamps.length,
    1,
  ]);
  const ys = tf.tensor2d(jobCounts, [jobCounts.length, 1]);

  // Define the model
  const model = tf.sequential();
  model.add(
    tf.layers.dense({ units: 10, activation: "relu", inputShape: [1] })
  );
  model.add(tf.layers.dense({ units: 1, activation: "linear" }));

  // Compile the model
  model.compile({ optimizer: "adam", loss: "meanSquaredError" });

  console.log("Training model...");

  // Train the model
  await model.fit(xs, ys, { epochs: 50 });

  console.log("Model trained successfully!");

  return { model, minTimestamp, maxTimestamp }; // Return timestamps too
};

// Predict future job demand
const predictJobDemand = async (
  model,
  futureDate,
  minTimestamp,
  maxTimestamp
) => {
  // Validate model
  if (!model || typeof model.predict !== "function") {
    console.error("Invalid model detected:", model);
    throw new Error("Invalid model provided for prediction.");
  }

  console.log("Making prediction for:", futureDate);

  const normalizedTimestamp =
    (new Date(futureDate).getTime() - minTimestamp) /
    (maxTimestamp - minTimestamp);

  const inputTensor = tf.tensor2d([normalizedTimestamp], [1, 1]);
  const prediction = model.predict(inputTensor);

  return (await prediction.data())[0]; // Ensure data is awaited correctly
};

module.exports = { createJobDemandModel, predictJobDemand };
