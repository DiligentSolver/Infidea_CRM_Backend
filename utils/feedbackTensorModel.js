const tf = require("@tensorflow/tfjs");

// Create and train a feedback analysis model
const createFeedbackModel = async (feedbackData) => {
  // Convert feedback data to tensors
  const jobs = feedbackData.map((fb) => fb.jobId);
  const ratings = feedbackData.map((fb) => fb.rating);

  const jobTensor = tf.oneHot(tf.tensor1d(jobs, "int32"), jobs.length);
  const ratingTensor = tf.tensor1d(ratings, "float32");

  // Define the model
  const model = tf.sequential();
  model.add(
    tf.layers.dense({
      units: 10,
      activation: "relu",
      inputShape: [jobs.length],
    })
  );
  model.add(tf.layers.dense({ units: 1, activation: "linear" }));

  // Compile the model
  model.compile({ optimizer: "adam", loss: "meanSquaredError" });

  // Train the model
  await model.fit(jobTensor, ratingTensor, { epochs: 10 });

  return model;
};

// Predict user preferences
const predictPreferences = async (model, jobIds) => {
  const jobTensor = tf.oneHot(tf.tensor1d(jobIds, "int32"), jobIds.length);
  const predictions = model.predict(jobTensor);
  return predictions.arraySync();
};

module.exports = { createFeedbackModel, predictPreferences };
