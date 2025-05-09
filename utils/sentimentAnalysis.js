const natural = require("natural");
const { SentimentAnalyzer } = natural;
const analyzer = new SentimentAnalyzer(
  "English",
  natural.PorterStemmer,
  "afinn"
);

// Analyze feedback sentiment
const analyzeSentiment = (feedback) => {
  return analyzer.getSentiment(feedback.split(" "));
};

// Predict sentiment trends
const predictSentimentTrend = (feedbackData) => {
  const sentiments = feedbackData.map((fb) => analyzeSentiment(fb.comment));
  const averageSentiment =
    sentiments.reduce((sum, val) => sum + val, 0) / sentiments.length;
  return averageSentiment;
};

module.exports = { analyzeSentiment, predictSentimentTrend };
