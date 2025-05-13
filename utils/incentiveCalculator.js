/**
 * Calculates incentives based on joining types and counts
 * Rules:
 * - Incentives only apply when total joinings (International + Domestic) are 10 or more
 * - Domestic: 100 Rs per joining
 * - International:
 *   - 1-9: 200 Rs per joining
 *   - 10-14: 250 Rs per joining
 *   - 15-19: 300 Rs per joining
 *   - 20-24: 400 Rs per joining
 *   - 25+: 500 Rs per joining
 * - Status must be "Joining Details Received" to qualify
 */

/**
 * Calculate incentives based on joining counts
 * @param {Object} counts - Object containing domestic and international joining counts
 * @param {number} counts.domestic - Number of domestic joinings
 * @param {number} counts.international - Number of international joinings
 * @returns {Object} - Object containing calculated incentives
 */
const calculateIncentives = (counts) => {
  const { domestic, international } = counts;
  const totalJoinings = domestic + international;

  // No incentives if total joinings are less than 10
  if (totalJoinings < 10) {
    return {
      domestic: 0,
      international: 0,
      total: 0,
      eligible: false,
      domesticRate: 0,
      internationalRate: 0,
      message: "Incentives only apply when total joinings are 10 or more.",
    };
  }

  // Calculate domestic incentives - fixed 100 Rs per joining
  const domesticRate = 100;
  const domesticIncentive = domestic * domesticRate;

  // Calculate international incentives based on tiers
  let internationalRatePerJoining = 0;

  if (international >= 1 && international <= 9) {
    internationalRatePerJoining = 200;
  } else if (international >= 10 && international <= 14) {
    internationalRatePerJoining = 250;
  } else if (international >= 15 && international <= 19) {
    internationalRatePerJoining = 300;
  } else if (international >= 20 && international <= 24) {
    internationalRatePerJoining = 400;
  } else if (international >= 25) {
    internationalRatePerJoining = 500;
  }

  const internationalIncentive = international * internationalRatePerJoining;
  const totalIncentive = domesticIncentive + internationalIncentive;

  return {
    domestic: domesticIncentive,
    international: internationalIncentive,
    total: totalIncentive,
    eligible: true,
    domesticRate: domesticRate,
    internationalRate: internationalRatePerJoining,
    message: "Eligible for incentives.",
  };
};

/**
 * Check if a joining status is eligible for incentives
 * @param {string} status - The status of the joining
 * @returns {boolean} - Whether the status is eligible
 */
const isEligibleStatus = (status) => {
  return status === "Joining Details Received";
};

/**
 * Get current incentive rates for reference
 * @returns {Object} - Object containing incentive rates
 */
const getIncentiveRates = () => {
  return {
    domestic: {
      rate: 100,
      description: "Fixed rate of 100 Rs per domestic joining",
    },
    international: [
      {
        range: "1-9",
        rate: 200,
        description: "200 Rs per international joining (1-9 joinings)",
      },
      {
        range: "10-14",
        rate: 250,
        description: "250 Rs per international joining (10-14 joinings)",
      },
      {
        range: "15-19",
        rate: 300,
        description: "300 Rs per international joining (15-19 joinings)",
      },
      {
        range: "20-24",
        rate: 400,
        description: "400 Rs per international joining (20-24 joinings)",
      },
      {
        range: "25+",
        rate: 500,
        description: "500 Rs per international joining (25+ joinings)",
      },
    ],
    minimumRequirement: {
      total: 10,
      description:
        "Incentives only apply when total joinings (International + Domestic) are 10 or more",
    },
    eligibleStatus: "Joining Details Received",
  };
};

module.exports = {
  calculateIncentives,
  isEligibleStatus,
  getIncentiveRates,
};
