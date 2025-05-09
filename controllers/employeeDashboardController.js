const { handleAsync } = require("../utils/attemptAndOtp");
const Lineup = require("../models/lineupModel");
const Joining = require("../models/joiningModel");
const Walkin = require("../models/walkinModel");
const Candidate = require("../models/candidateModel");
const Employee = require("../models/employeeModel");
const Leave = require("../models/leaveModel");

/**
 * Format minutes into hours and minutes string
 * @param {Number} totalMinutes - Total minutes to format
 * @returns {String} - Formatted time string (e.g., "2h 30m" or "45m")
 */
const formatTimeString = (totalMinutes) => {
  if (totalMinutes === 0) return "0h";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}m`;
  }
};

/**
 * Calculate total time spent based on call durations from candidate records
 * @param {ObjectId} employeeId - Employee ID
 * @returns {String} - Formatted time in hours and minutes
 */
const calculateTotalTime = async (employeeId) => {
  try {
    // Get all candidate records where the employee is recorded as lastRegisteredBy
    const candidates = await Candidate.find({
      $or: [
        { lastRegisteredBy: employeeId },
        { createdBy: employeeId },
        {
          registrationHistory: { $elemMatch: { registeredBy: employeeId } },
        },
      ],
    }).populate({
      path: "callDurationHistory",
      select: "duration employee date",
    });

    // Return "0h" if no candidates found
    if (!candidates || candidates.length === 0) {
      return "0h";
    }

    let totalMinutes = 0;

    // Add up all call durations from history for this employee
    candidates.forEach((candidate) => {
      if (
        candidate.callDurationHistory &&
        candidate.callDurationHistory.length > 0
      ) {
        candidate.callDurationHistory.forEach((record) => {
          // Only count durations associated with this employee
          if (
            record.employee &&
            record.employee.toString() === employeeId.toString() &&
            record.duration
          ) {
            const durationMinutes = parseInt(record.duration) || 0;
            totalMinutes += durationMinutes;
          }
        });
      }
    });

    // Return "0h" if totalMinutes is 0
    if (totalMinutes === 0) {
      return "0h";
    }

    // Format time as hours and minutes
    return formatTimeString(totalMinutes);
  } catch (error) {
    console.error("Error calculating total time:", error);
    return "0h";
  }
};

/**
 * Calculate time spent for today based on call durations from candidate records
 * @param {ObjectId} employeeId - Employee ID
 * @param {Date} today - Start of today
 * @param {Date} tomorrow - Start of tomorrow
 * @returns {String} - Formatted time in hours and minutes
 */
const calculateTodayTime = async (employeeId, today, tomorrow) => {
  try {
    // Get candidates with call history
    const candidates = await Candidate.find({
      $or: [
        { lastRegisteredBy: employeeId },
        { createdBy: employeeId },
        {
          registrationHistory: { $elemMatch: { registeredBy: employeeId } },
        },
      ],
    }).populate({
      path: "callDurationHistory",
      select: "duration employee date",
    });

    // Return "0h" if no candidates found
    if (!candidates || candidates.length === 0) {
      return "0h";
    }

    let totalMinutes = 0;

    // Add up call durations for today only
    candidates.forEach((candidate) => {
      if (
        candidate.callDurationHistory &&
        candidate.callDurationHistory.length > 0
      ) {
        candidate.callDurationHistory.forEach((record) => {
          // Only count durations from today associated with this employee
          if (
            record.employee &&
            record.employee.toString() === employeeId.toString() &&
            record.date &&
            record.date >= today &&
            record.date < tomorrow &&
            record.duration
          ) {
            const durationMinutes = parseInt(record.duration) || 0;
            totalMinutes += durationMinutes;
          }
        });
      }
    });

    // Return "0h" if totalMinutes is 0
    if (totalMinutes === 0) {
      return "0h";
    }

    // Format time as hours and minutes
    return formatTimeString(totalMinutes);
  } catch (error) {
    console.error("Error calculating today's time:", error);
    return "0h";
  }
};

/**
 * Get dashboard overview statistics
 * Returns counts of total calls, lineups, joinings, selections and time spent
 */
const getDashboardOverview = handleAsync(async (req, res) => {
  const employeeId = req.employee._id;

  try {
    // Get total calls (using candidates as calls)
    const totalCalls = await Candidate.countDocuments({
      lastRegisteredBy: employeeId,
    });

    // Get total lineups
    const totalLineups = await Lineup.countDocuments({ createdBy: employeeId });

    // Get total joinings
    const totalJoinings = await Joining.countDocuments({
      createdBy: employeeId,
    });

    // Get total selections (joinings with status "Joined")
    const totalSelections = await Joining.countDocuments({
      createdBy: employeeId,
      status: "Joined",
    });

    // Calculate time spent based on call durations from candidate records
    let timeSpent = await calculateTotalTime(employeeId);
    if (!timeSpent || typeof timeSpent !== "string") timeSpent = "0h";

    return res.status(200).json({
      success: true,
      data: {
        totalCalls,
        totalLineups,
        totalJoinings,
        totalSelections,
        timeSpent,
      },
    });
  } catch (error) {
    console.error("Error in getDashboardOverview:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching dashboard overview",
    });
  }
});

/**
 * Get today's statistics for the dashboard
 * Returns counts of today's calls, lineups, joinings, selections and time spent
 */
const getTodayOverview = handleAsync(async (req, res) => {
  const employeeId = req.employee._id;

  try {
    // Calculate today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's calls (using candidates)
    const todayCalls = await Candidate.countDocuments({
      $or: [
        {
          lastRegisteredBy: employeeId,
          createdAt: { $gte: today, $lt: tomorrow },
          updatedAt: { $gte: today, $lt: tomorrow },
        },
        {
          registrationHistory: {
            $elemMatch: {
              registrationDate: { $gte: today, $lt: tomorrow },
              registeredBy: employeeId,
            },
          },
        },
      ],
      callDurationHistory: {
        $elemMatch: {
          duration: { $gt: 0 },
          employee: employeeId,
        },
      },
    });

    // Get today's lineups
    const todayLineups = await Lineup.countDocuments({
      createdBy: employeeId,
      createdAt: { $gte: today, $lt: tomorrow },
    });

    // Get today's joinings
    const todayJoinings = await Joining.countDocuments({
      createdBy: employeeId,
      createdAt: { $gte: today, $lt: tomorrow },
    });

    // Get today's selections (joinings with status "Joined")
    const todaySelections = await Lineup.countDocuments({
      createdBy: employeeId,
      status: "Selected",
      createdAt: { $gte: today, $lt: tomorrow },
    });

    // Calculate today's time spent based on call durations from candidate records
    let todayTimeSpent = await calculateTodayTime(employeeId, today, tomorrow);
    if (!todayTimeSpent || typeof todayTimeSpent !== "string")
      todayTimeSpent = "0h";

    return res.status(200).json({
      success: true,
      data: {
        todayCalls: todayCalls || 0,
        todayLineups: todayLineups || 0,
        todayJoinings: todayJoinings || 0,
        todaySelections: todaySelections || 0,
        todayTimeSpent: todayTimeSpent,
      },
    });
  } catch (error) {
    console.error("Error in getTodayOverview:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching today's overview",
    });
  }
});

/**
 * Get both dashboard and today's overview in a single API call
 */
const getCompleteAnalytics = handleAsync(async (req, res) => {
  const employeeId = req.employee._id;

  try {
    // Calculate today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Overall statistics
    const totalCalls = await Candidate.countDocuments({
      $or: [
        { lastRegisteredBy: employeeId },
        { createdBy: employeeId },
        {
          registrationHistory: { $elemMatch: { registeredBy: employeeId } },
        },
      ],
      callDurationHistory: {
        $elemMatch: {
          duration: { $gt: 0 },
          employee: employeeId,
        },
      },
    });
    const totalLineups = await Lineup.countDocuments({ createdBy: employeeId });
    const totalJoinings = await Joining.countDocuments({
      createdBy: employeeId,
    });
    const totalSelections = await Lineup.countDocuments({
      createdBy: employeeId,
      status: "Selected",
    });
    const totalWalkins = await Walkin.countDocuments({
      createdBy: employeeId,
    });

    const totalLeaves = await Leave.countDocuments({
      status: "Approved",
      employee: employeeId,
    });

    const totalIncentives = await Joining.countDocuments({
      createdBy: employeeId,
      "incentives.eligible": true,
      "incentives.calculated": true,
    });

    const offerDrops = await Lineup.countDocuments({
      createdBy: employeeId,
      status: "Offer Drop",
    });

    // Calculate total time spent using call durations
    let timeSpent = await calculateTotalTime(employeeId);
    if (!timeSpent || typeof timeSpent !== "string") timeSpent = "0m 0h";

    // Today's statistics
    const todayCalls = await Candidate.countDocuments({
      $or: [
        {
          lastRegisteredBy: employeeId,
          createdAt: { $gte: today, $lt: tomorrow },
          updatedAt: { $gte: today, $lt: tomorrow },
        },
        {
          registrationHistory: {
            $elemMatch: {
              registrationDate: { $gte: today, $lt: tomorrow },
              registeredBy: employeeId,
            },
          },
        },
      ],
      callDurationHistory: {
        $elemMatch: {
          duration: { $gt: 0 },
          employee: employeeId,
        },
      },
    });
    const todayLineups = await Lineup.countDocuments({
      createdBy: employeeId,
      createdAt: { $gte: today, $lt: tomorrow },
    });
    const todayJoinings = await Joining.countDocuments({
      createdBy: employeeId,
      createdAt: { $gte: today, $lt: tomorrow },
    });
    const todaySelections = await Lineup.countDocuments({
      createdBy: employeeId,
      status: "Selected",
      createdAt: { $gte: today, $lt: tomorrow },
    });
    const todayWalkins = await Walkin.countDocuments({
      createdBy: employeeId,
      createdAt: { $gte: today, $lt: tomorrow },
    });

    // Calculate today's time spent using call durations
    let todayTimeSpent = calculateTodayTime(employeeId, today, tomorrow);
    if (!todayTimeSpent || typeof todayTimeSpent !== "string")
      todayTimeSpent = "0h 0m";

    return res.status(200).json({
      success: true,
      dashboardOverview: {
        totalCalls: totalCalls || 0,
        totalLineups: totalLineups || 0,
        totalJoinings: totalJoinings || 0,
        totalSelections: totalSelections || 0,
        timeSpent: timeSpent,
        totalWalkins: totalWalkins || 0,
        totalLeaves: totalLeaves || 0,
        totalIncentives: totalIncentives || 0,
        offerDrops: offerDrops || 0,
      },
      todayOverview: {
        calls: todayCalls || 0,
        lineups: todayLineups || 0,
        joinings: todayJoinings || 0,
        selections: todaySelections || 0,
        timeSpent: todayTimeSpent,
        walkins: todayWalkins || 0,
      },
    });
  } catch (error) {
    console.error("Error in getCompleteAnalytics:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching analytics data",
    });
  }
});

/**
 * Get today's live feeds, graphs, and charts data for the dashboard
 * Includes recent lineups and selections, activity distribution by hour/day/month/year,
 * and distribution by process and company
 */
const getDashboardVisualData = handleAsync(async (req, res) => {
  const employeeId = req.employee._id;

  try {
    // Calculate time ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Start of week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    // Start of month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Start of year
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Calculate today's time spent
    let todayTimeSpent = await calculateTodayTime(employeeId, today, tomorrow);
    if (!todayTimeSpent || typeof todayTimeSpent !== "string") {
      todayTimeSpent = "0h 0m";
    }

    // Define queries for different time ranges
    const dataQueries = {
      // Today's data
      todayLineups: Lineup.find({
        createdBy: employeeId,
        createdAt: { $gte: today, $lt: tomorrow },
      })
        .populate({
          path: "createdBy",
          select: "name employeeCode",
        })
        .sort({ createdAt: -1 })
        .lean(),

      todaySelections: Lineup.find({
        createdBy: employeeId,
        status: "Selected",
        createdAt: { $gte: today, $lt: tomorrow },
      })
        .populate({
          path: "createdBy",
          select: "name employeeCode",
        })
        .sort({ createdAt: -1 })
        .lean(),

      todayJoinings: Joining.find({
        createdBy: employeeId,
        createdAt: { $gte: today, $lt: tomorrow },
      })
        .populate({
          path: "createdBy",
          select: "name employeeCode",
        })
        .populate("company", "name")
        .sort({ createdAt: -1 })
        .lean(),

      todayCalls: Candidate.find({
        $or: [
          {
            lastRegisteredBy: employeeId,
            updatedAt: { $gte: today, $lt: tomorrow },
            callDurationHistory: {
              $elemMatch: {
                date: { $gte: today, $lt: tomorrow },
                duration: { $gt: 0 },
                employee: employeeId,
              },
            },
          },
          {
            registrationHistory: {
              $elemMatch: {
                registrationDate: { $gte: today, $lt: tomorrow },
                registeredBy: employeeId,
              },
            },
          },
        ],
      }).lean(),

      // Week data
      weekLineups: Lineup.find({
        createdBy: employeeId,
        createdAt: { $gte: startOfWeek, $lt: tomorrow },
      }).lean(),

      weekSelections: Lineup.find({
        createdBy: employeeId,
        status: "Selected",
        createdAt: { $gte: startOfWeek, $lt: tomorrow },
      }).lean(),

      weekJoinings: Joining.find({
        createdBy: employeeId,
        createdAt: { $gte: startOfWeek, $lt: tomorrow },
      }).lean(),

      weekCalls: Candidate.find({
        $or: [
          {
            lastRegisteredBy: employeeId,
            updatedAt: { $gte: startOfWeek, $lt: tomorrow },
          },
          {
            registrationHistory: {
              $elemMatch: {
                registrationDate: { $gte: startOfWeek, $lt: tomorrow },
                registeredBy: employeeId,
              },
            },
          },
        ],
        callDurationHistory: {
          $elemMatch: {
            duration: { $gt: 0 },
            employee: employeeId,
          },
        },
      }).lean(),

      // Month data
      monthLineups: Lineup.find({
        createdBy: employeeId,
        createdAt: { $gte: startOfMonth, $lt: tomorrow },
      }).lean(),

      monthSelections: Lineup.find({
        createdBy: employeeId,
        status: "Selected",
        createdAt: { $gte: startOfMonth, $lt: tomorrow },
      }).lean(),

      monthJoinings: Joining.find({
        createdBy: employeeId,
        createdAt: { $gte: startOfMonth, $lt: tomorrow },
      }).lean(),

      monthCalls: Candidate.find({
        $or: [
          {
            lastRegisteredBy: employeeId,
            updatedAt: { $gte: startOfMonth, $lt: tomorrow },
          },
          {
            registrationHistory: {
              $elemMatch: {
                registrationDate: { $gte: startOfMonth, $lt: tomorrow },
                registeredBy: employeeId,
              },
            },
          },
        ],
        callDurationHistory: {
          $elemMatch: {
            duration: { $gt: 0 },
            employee: employeeId,
          },
        },
      }).lean(),

      // Year data
      yearLineups: Lineup.find({
        createdBy: employeeId,
        createdAt: { $gte: startOfYear, $lt: tomorrow },
      }).lean(),

      yearSelections: Lineup.find({
        createdBy: employeeId,
        status: "Selected",
        createdAt: { $gte: startOfYear, $lt: tomorrow },
      }).lean(),

      yearJoinings: Joining.find({
        createdBy: employeeId,
        createdAt: { $gte: startOfYear, $lt: tomorrow },
      }).lean(),

      yearCalls: Candidate.find({
        $or: [
          {
            lastRegisteredBy: employeeId,
            updatedAt: { $gte: startOfYear, $lt: tomorrow },
          },
          {
            registrationHistory: {
              $elemMatch: {
                registrationDate: { $gte: startOfYear, $lt: tomorrow },
                registeredBy: employeeId,
              },
            },
          },
        ],
        callDurationHistory: {
          $elemMatch: {
            duration: { $gt: 0 },
            employee: employeeId,
          },
        },
      }).lean(),

      // Get all employees for team averages
      allEmployees: Employee.find({
        status: "Active",
        _id: { $ne: employeeId },
      }).lean(),
    };

    // Execute all queries in parallel using Promise.all
    const keys = Object.keys(dataQueries);
    const promiseResults = await Promise.all(Object.values(dataQueries));

    // Convert to object with keys
    const results = {};
    keys.forEach((key, index) => {
      results[key] = promiseResults[index];
    });

    // Process results
    const {
      todayLineups,
      todaySelections,
      todayJoinings,
      todayCalls,
      weekLineups,
      weekSelections,
      weekJoinings,
      weekCalls,
      monthLineups,
      monthSelections,
      monthJoinings,
      monthCalls,
      yearLineups,
      yearSelections,
      yearJoinings,
      yearCalls,
      allEmployees,
    } = results;

    // Create hourly distribution for each hour of the day (0-23)
    const hourlyDistribution = Array(24)
      .fill(0)
      .map((_, index) => ({
        hour: index,
        lineups: 0,
        selections: 0,
        joinings: 0,
        calls: 0,
        label: `${index % 12 === 0 ? 12 : index % 12}${
          index < 12 ? "am" : "pm"
        }`, // Format as 12am, 1am, ..., 11pm
      }));

    // Populate hourly distribution
    todayLineups.forEach((lineup) => {
      const hour = new Date(lineup.createdAt).getHours();
      hourlyDistribution[hour].lineups += 1;
    });

    todaySelections.forEach((selection) => {
      const hour = new Date(selection.createdAt).getHours();
      hourlyDistribution[hour].selections += 1;
    });

    todayJoinings.forEach((joining) => {
      const hour = new Date(joining.createdAt).getHours();
      hourlyDistribution[hour].joinings += 1;
    });

    todayCalls.forEach((call) => {
      const hour = new Date(call.updatedAt).getHours();
      hourlyDistribution[hour].calls += 1;
    });

    // Create daily distribution for last 7 days
    const dailyDistribution = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
        date.getDay()
      ];
      const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;

      dailyDistribution.push({
        date: dayStart,
        dateLabel: `${dayOfWeek} ${formattedDate}`,
        lineups: 0,
        selections: 0,
        joinings: 0,
        calls: 0,
      });
    }

    // Populate daily distribution
    weekLineups.forEach((lineup) => {
      const createdAt = new Date(lineup.createdAt);
      dailyDistribution.forEach((day) => {
        const dayEnd = new Date(day.date);
        dayEnd.setHours(23, 59, 59, 999);
        if (createdAt >= day.date && createdAt <= dayEnd) {
          day.lineups += 1;
        }
      });
    });

    weekSelections.forEach((selection) => {
      const createdAt = new Date(selection.createdAt);
      dailyDistribution.forEach((day) => {
        const dayEnd = new Date(day.date);
        dayEnd.setHours(23, 59, 59, 999);
        if (createdAt >= day.date && createdAt <= dayEnd) {
          day.selections += 1;
        }
      });
    });

    weekJoinings.forEach((joining) => {
      const createdAt = new Date(joining.createdAt);
      dailyDistribution.forEach((day) => {
        const dayEnd = new Date(day.date);
        dayEnd.setHours(23, 59, 59, 999);
        if (createdAt >= day.date && createdAt <= dayEnd) {
          day.joinings += 1;
        }
      });
    });

    weekCalls.forEach((call) => {
      const updatedAt = new Date(call.updatedAt);
      dailyDistribution.forEach((day) => {
        const dayEnd = new Date(day.date);
        dayEnd.setHours(23, 59, 59, 999);
        if (updatedAt >= day.date && updatedAt <= dayEnd) {
          day.calls += 1;
        }
      });
    });

    // Create monthly distribution (last 12 months)
    const monthlyDistribution = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();

      monthlyDistribution.push({
        month: date.getMonth(),
        year: year,
        monthLabel: `${monthName} ${year}`,
        lineups: 0,
        selections: 0,
        joinings: 0,
        calls: 0,
      });
    }

    // Populate monthly distribution
    yearLineups.forEach((lineup) => {
      const createdAt = new Date(lineup.createdAt);
      monthlyDistribution.forEach((monthData) => {
        if (
          createdAt.getMonth() === monthData.month &&
          createdAt.getFullYear() === monthData.year
        ) {
          monthData.lineups += 1;
        }
      });
    });

    yearSelections.forEach((selection) => {
      const createdAt = new Date(selection.createdAt);
      monthlyDistribution.forEach((monthData) => {
        if (
          createdAt.getMonth() === monthData.month &&
          createdAt.getFullYear() === monthData.year
        ) {
          monthData.selections += 1;
        }
      });
    });

    yearJoinings.forEach((joining) => {
      const createdAt = new Date(joining.createdAt);
      monthlyDistribution.forEach((monthData) => {
        if (
          createdAt.getMonth() === monthData.month &&
          createdAt.getFullYear() === monthData.year
        ) {
          monthData.joinings += 1;
        }
      });
    });

    yearCalls.forEach((call) => {
      const updatedAt = new Date(call.updatedAt);
      monthlyDistribution.forEach((monthData) => {
        if (
          updatedAt.getMonth() === monthData.month &&
          updatedAt.getFullYear() === monthData.year
        ) {
          monthData.calls += 1;
        }
      });
    });

    // Get employee's performance metrics for today
    const employeeLineups = todayLineups.filter(
      (lineup) => lineup.createdBy?._id.toString() === employeeId.toString()
    ).length;

    const employeeSelections = todaySelections.filter(
      (selection) =>
        selection.createdBy?._id.toString() === employeeId.toString()
    ).length;

    const employeeJoinings = todayJoinings.filter(
      (joining) => joining.createdBy?._id.toString() === employeeId.toString()
    ).length;

    const employeeCalls = todayCalls.length;

    const teamSize = allEmployees.length + 1; // +1 for current employee

    // Calculate team averages
    const teamAverageLineups = todayLineups.length / teamSize;
    const teamAverageSelections = todaySelections.length / teamSize;
    const teamAverageJoinings = todayJoinings.length / teamSize;
    const teamAverageCalls = todayCalls.length / teamSize;

    // Calculate conversion rates
    const conversionRate =
      employeeLineups > 0
        ? ((employeeCalls / employeeLineups) * 100).toFixed(1)
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        // Time-based distributions for different views
        timeDistributions: {
          hourly: hourlyDistribution,
          daily: dailyDistribution,
          monthly: monthlyDistribution,
        },
        // Performance metrics
        performanceMetrics: {
          today: {
            lineups: employeeLineups,
            selections: employeeSelections,
            joinings: employeeJoinings,
            calls: employeeCalls,
            teamAverageLineups: teamAverageLineups.toFixed(1),
            teamAverageSelections: teamAverageSelections.toFixed(1),
            teamAverageJoinings: teamAverageJoinings.toFixed(1),
            teamAverageCalls: teamAverageCalls.toFixed(1),
            conversionRate,
            todayTimeSpent,
          },
          // Totals for different periods
          totals: {
            week: {
              lineups: weekLineups.length,
              selections: weekSelections.length,
              joinings: weekJoinings.length,
              calls: weekCalls.length,
            },
            month: {
              lineups: monthLineups.length,
              selections: monthSelections.length,
              joinings: monthJoinings.length,
              calls: monthCalls.length,
            },
            year: {
              lineups: yearLineups.length,
              selections: yearSelections.length,
              joinings: yearJoinings.length,
              calls: yearCalls.length,
            },
          },
        },
      },
    });
  } catch (error) {
    console.error("Error in getDashboardVisualData:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching dashboard visual data",
    });
  }
});

/**
 * Get recent feed items for live feeds, useful as a fallback when WebSockets aren't working
 * Can filter by timestamp to only get items newer than a specific time
 */
const getRecentFeeds = handleAsync(async (req, res) => {
  const { after, limit = 20 } = req.query;

  try {
    // Set up time filters
    const timeFilter = {};
    if (after) {
      const afterDate = new Date(after);
      timeFilter.createdAt = { $gt: afterDate };
    } else {
      // Default to today if no 'after' parameter
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      timeFilter.createdAt = { $gte: today };
    }

    // Get recent lineups with populated creator info
    const recentLineups = await Lineup.find(timeFilter)
      .populate({
        path: "createdBy",
        select: "name employeeCode",
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Get recent selections (lineups with status "Selected")
    const recentSelections = await Lineup.find({
      ...timeFilter,
      status: "Selected",
    })
      .populate({
        path: "createdBy",
        select: "name employeeCode",
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Get recent joinings with populated creator info
    const recentJoinings = await Joining.find(timeFilter)
      .populate({
        path: "createdBy",
        select: "name employeeCode",
      })
      .populate("company", "name")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Format feed data
    const feeds = [
      ...recentLineups.map((lineup) => ({
        employeeName: lineup.createdBy?.name?.en || "Unknown",
        action: "Lineup",
        candidateName: lineup.name,
        company: lineup.company,
        process: lineup.process,
        timestamp: new Date(lineup.createdAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: lineup.status,
        id: lineup._id,
        createdAt: lineup.createdAt,
      })),
      ...recentSelections.map((selection) => ({
        employeeName: selection.createdBy?.name?.en || "Unknown",
        action: "Selection",
        candidateName: selection.name,
        company: selection.company,
        process: selection.process,
        timestamp: new Date(selection.createdAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: selection.status,
        id: selection._id,
        createdAt: selection.createdAt,
      })),
      ...recentJoinings.map((joining) => ({
        employeeName: joining.createdBy?.name?.en || "Unknown",
        action: "Joining",
        candidateName: joining.candidateName,
        company: joining.company?.name || joining.company,
        process: joining.process,
        timestamp: new Date(joining.createdAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: joining.status,
        id: joining._id,
        createdAt: joining.createdAt,
      })),
    ]
      // Sort by timestamp in descending order (newest first)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      // Limit to the requested number of items
      .slice(0, parseInt(limit));

    return res.status(200).json({
      success: true,
      data: feeds,
    });
  } catch (error) {
    console.error("Error in getRecentFeeds:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching recent feeds",
    });
  }
});

/**
 * Get attendance calendar data for the employee dashboard
 * Shows leave status, weekoffs, and present days for the specified month
 */
const getAttendanceCalendar = handleAsync(async (req, res) => {
  try {
    const employeeId = req.employee._id;
    const { month, year } = req.query;

    // Use current month and year if not specified
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth(); // Convert to 0-based index
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Create date objects for start and end of month
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0); // Last day of month

    // Get all employee leaves for the specified month
    const leaves = await Leave.find({
      employee: employeeId,
      $or: [
        { startDate: { $lte: endDate, $gte: startDate } },
        { endDate: { $lte: endDate, $gte: startDate } },
        {
          $and: [
            { startDate: { $lte: startDate } },
            { endDate: { $gte: endDate } },
          ],
        },
      ],
    }).lean();

    // Initialize calendar data for the month
    const totalDays = endDate.getDate();
    const calendarData = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= totalDays; day++) {
      const currentDate = new Date(targetYear, targetMonth, day);
      const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 6 is Saturday

      // Check if it's a Sunday (always weekoff)
      if (dayOfWeek === 0) {
        calendarData[day] = { status: "Week Off", type: "WO" };
        continue;
      }

      // Check if it's a Saturday
      if (dayOfWeek === 6) {
        // Get the week number of the month (1-indexed)
        const weekOfMonth = Math.ceil(day / 7);

        // Check if it's 2nd or 4th Saturday (weekoff)
        if (weekOfMonth === 2 || weekOfMonth === 4) {
          calendarData[day] = { status: "Week Off", type: "WO" };
          continue;
        }
      }

      // Check if the date is in the future
      if (currentDate > today) {
        calendarData[day] = { status: "Upcoming", type: "U" };
        continue;
      }

      // Default to present if not a weekoff or future date
      calendarData[day] = { status: "Present", type: "P" };
    }

    // Apply leaves to calendar
    for (const leave of leaves) {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);

      // Abbreviate leave reasons
      let leaveType;
      switch (leave.leaveReason) {
        case "Sick Leave":
          leaveType = "SL";
          break;
        case "Privilege Leave":
          leaveType = "PL";
          break;
        case "Casual Leave":
          leaveType = "CL";
          break;
        case "Sandwich Leave":
          leaveType = "SDL";
          break;
        default:
          leaveType = "L";
      }

      // Get the leave duration type
      let durationLabel;
      switch (leave.leaveType) {
        case "Half Day":
          durationLabel = "HD";
          break;
        case "Early Logout":
          durationLabel = "EL";
          break;
        case "Full Day":
        default:
          durationLabel = ""; // No special label for full day
      }

      // Create the full leave label - combine reason abbreviation with duration type if needed
      const fullLeaveType = durationLabel
        ? `${leaveType}-${durationLabel}`
        : leaveType;

      // Set the leave status based on approval status
      const leaveStatus =
        leave.status === "Approved"
          ? `${fullLeaveType} (Approved)`
          : leave.status === "Rejected"
          ? `${fullLeaveType} (Rejected)`
          : `${fullLeaveType} (Pending)`;

      // Mark all days in the leave period
      for (
        let current = new Date(Math.max(leaveStart, startDate));
        current <= new Date(Math.min(leaveEnd, endDate));
        current.setDate(current.getDate() + 1)
      ) {
        const dayOfMonth = current.getDate();
        calendarData[dayOfMonth] = {
          status: leaveStatus,
          type: fullLeaveType,
          leaveId: leave._id,
          approved: leave.status === "Approved",
          leaveType: leave.leaveType,
          leaveReason: leave.leaveReason,
          description: leave.description || "",
        };
      }
    }

    // Check for sandwich leaves
    // A leave is considered a sandwich if it's on a working Saturday and the next
    // Monday with Sunday in between, and the leave is not approved yet
    const daysInMonth = Object.keys(calendarData).map(Number);

    for (let i = 0; i < daysInMonth.length - 2; i++) {
      const day = daysInMonth[i];
      const dayDate = new Date(targetYear, targetMonth, day);

      // Check if it's a working Saturday (1st, 3rd, 5th)
      if (dayDate.getDay() === 6) {
        const weekOfMonth = Math.ceil(day / 7);
        if (weekOfMonth !== 2 && weekOfMonth !== 4) {
          // It's a working Saturday, check if it's on leave
          const saturdayData = calendarData[day];

          if (
            saturdayData.type !== "P" &&
            saturdayData.type !== "WO" &&
            !saturdayData.approved
          ) {
            // Saturday is on leave (not approved), check Monday
            const monday = day + 2; // Sunday + Monday

            if (monday <= totalDays) {
              const mondayData = calendarData[monday];

              // If Monday is also on leave (not approved), make Sunday a sandwich leave
              if (
                mondayData.type !== "P" &&
                mondayData.type !== "WO" &&
                !mondayData.approved
              ) {
                const sunday = day + 1;
              }
            }
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        month: targetMonth + 1, // Convert back to 1-based month for response
        year: targetYear,
        totalDays,
        calendar: calendarData,
      },
    });
  } catch (error) {
    console.error("Error in getAttendanceCalendar:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching attendance calendar data",
      error: error.message,
    });
  }
});

module.exports = {
  getDashboardOverview,
  getTodayOverview,
  getCompleteAnalytics,
  getDashboardVisualData,
  getRecentFeeds,
  getAttendanceCalendar,
};
