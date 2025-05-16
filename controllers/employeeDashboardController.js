const { handleAsync } = require("../utils/attemptAndOtp");
const Lineup = require("../models/lineupModel");
const Joining = require("../models/joiningModel");
const Walkin = require("../models/walkinModel");
const Candidate = require("../models/candidateModel");
const Employee = require("../models/employeeModel");
const Leave = require("../models/leaveModel");
const Attendance = require("../models/attendanceModel");
const mongoose = require("mongoose");
const { generateAndSendDailyReport } = require("../utils/dailyReportGenerator");

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

    const totalIncentives = await Joining.aggregate([
      {
        $match: {
          createdBy: new mongoose.Types.ObjectId(employeeId),
          "incentives.eligible": true,
          "incentives.calculated": true,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$incentives.amount" },
        },
      },
    ]).then((result) => (result.length > 0 ? result[0].total : 0));

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
    let todayTimeSpent = await calculateTodayTime(employeeId, today, tomorrow);
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

    // Previous periods for trend calculations
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBeforeYesterday = new Date(yesterday);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);

    const previousWeekStart = new Date(startOfWeek);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekEnd = new Date(startOfWeek);
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);

    const previousMonthStart = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    );
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Calculate time spent for different time periods
    const todayTimeSpent = await calculateTodayTime(
      employeeId,
      today,
      tomorrow
    );

    // Helper function to calculate time spent for a specific time range
    const calculateTimeSpentForRange = async (startDate, endDate) => {
      try {
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

        if (!candidates || candidates.length === 0) {
          return "0h";
        }

        let totalMinutes = 0;

        candidates.forEach((candidate) => {
          if (
            candidate.callDurationHistory &&
            candidate.callDurationHistory.length > 0
          ) {
            candidate.callDurationHistory.forEach((record) => {
              if (
                record.employee &&
                record.employee.toString() === employeeId.toString() &&
                record.date &&
                record.date >= startDate &&
                record.date < endDate &&
                record.duration
              ) {
                const durationMinutes = parseInt(record.duration) || 0;
                totalMinutes += durationMinutes;
              }
            });
          }
        });

        return formatTimeString(totalMinutes);
      } catch (error) {
        console.error(`Error calculating time spent for range:`, error);
        return "0h";
      }
    };

    // Calculate time spent for week, month, and year
    const weekTimeSpent = await calculateTimeSpentForRange(
      startOfWeek,
      tomorrow
    );
    const monthTimeSpent = await calculateTimeSpentForRange(
      startOfMonth,
      tomorrow
    );
    const yearTimeSpent = await calculateTimeSpentForRange(
      startOfYear,
      tomorrow
    );
    const allTimeSpent = await calculateTotalTime(employeeId);

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

      // Yesterday's data for trend calculation
      yesterdayLineups: Lineup.find({
        createdBy: employeeId,
        createdAt: { $gte: yesterday, $lt: today },
      }).lean(),

      yesterdaySelections: Lineup.find({
        createdBy: employeeId,
        status: "Selected",
        createdAt: { $gte: yesterday, $lt: today },
      }).lean(),

      yesterdayJoinings: Joining.find({
        createdBy: employeeId,
        createdAt: { $gte: yesterday, $lt: today },
      }).lean(),

      yesterdayCalls: Candidate.find({
        $or: [
          {
            lastRegisteredBy: employeeId,
            updatedAt: { $gte: yesterday, $lt: today },
          },
          {
            registrationHistory: {
              $elemMatch: {
                registrationDate: { $gte: yesterday, $lt: today },
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

      // Previous week data for trend calculation
      previousWeekLineups: Lineup.find({
        createdBy: employeeId,
        createdAt: { $gte: previousWeekStart, $lt: startOfWeek },
      }).lean(),

      previousWeekSelections: Lineup.find({
        createdBy: employeeId,
        status: "Selected",
        createdAt: { $gte: previousWeekStart, $lt: startOfWeek },
      }).lean(),

      previousWeekJoinings: Joining.find({
        createdBy: employeeId,
        createdAt: { $gte: previousWeekStart, $lt: startOfWeek },
      }).lean(),

      previousWeekCalls: Candidate.find({
        $or: [
          {
            lastRegisteredBy: employeeId,
            updatedAt: { $gte: previousWeekStart, $lt: startOfWeek },
          },
          {
            registrationHistory: {
              $elemMatch: {
                registrationDate: { $gte: previousWeekStart, $lt: startOfWeek },
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

      // Previous month data for trend calculation
      previousMonthLineups: Lineup.find({
        createdBy: employeeId,
        createdAt: { $gte: previousMonthStart, $lt: previousMonthEnd },
      }).lean(),

      previousMonthSelections: Lineup.find({
        createdBy: employeeId,
        status: "Selected",
        createdAt: { $gte: previousMonthStart, $lt: previousMonthEnd },
      }).lean(),

      previousMonthJoinings: Joining.find({
        createdBy: employeeId,
        createdAt: { $gte: previousMonthStart, $lt: previousMonthEnd },
      }).lean(),

      previousMonthCalls: Candidate.find({
        $or: [
          {
            lastRegisteredBy: employeeId,
            updatedAt: { $gte: previousMonthStart, $lt: previousMonthEnd },
          },
          {
            registrationHistory: {
              $elemMatch: {
                registrationDate: {
                  $gte: previousMonthStart,
                  $lt: previousMonthEnd,
                },
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
      yesterdayLineups,
      yesterdaySelections,
      yesterdayJoinings,
      yesterdayCalls,
      weekLineups,
      weekSelections,
      weekJoinings,
      weekCalls,
      previousWeekLineups,
      previousWeekSelections,
      previousWeekJoinings,
      previousWeekCalls,
      monthLineups,
      monthSelections,
      monthJoinings,
      monthCalls,
      previousMonthLineups,
      previousMonthSelections,
      previousMonthJoinings,
      previousMonthCalls,
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
        timeSpent: "0h", // Initialize time spent for each hour
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

    // Add time spent data to hourly distribution
    for (const candidate of todayCalls) {
      if (
        candidate.callDurationHistory &&
        candidate.callDurationHistory.length > 0
      ) {
        candidate.callDurationHistory.forEach((record) => {
          if (
            record.employee &&
            record.employee.toString() === employeeId.toString() &&
            record.date &&
            record.date >= today &&
            record.date < tomorrow &&
            record.duration
          ) {
            const hour = new Date(record.date).getHours();
            const durationMinutes = parseInt(record.duration) || 0;

            // Update time spent for this hour
            const currentMinutes =
              hourlyDistribution[hour].timeSpent === "0h"
                ? 0
                : hourlyDistribution[hour].timeSpent.includes("h") &&
                  hourlyDistribution[hour].timeSpent.includes("m")
                ? parseInt(hourlyDistribution[hour].timeSpent.split("h")[0]) *
                    60 +
                  parseInt(
                    hourlyDistribution[hour].timeSpent
                      .split("h")[1]
                      .split("m")[0]
                  )
                : hourlyDistribution[hour].timeSpent.includes("h")
                ? parseInt(hourlyDistribution[hour].timeSpent.split("h")[0]) *
                  60
                : parseInt(hourlyDistribution[hour].timeSpent.split("m")[0]);

            hourlyDistribution[hour].timeSpent = formatTimeString(
              currentMinutes + durationMinutes
            );
          }
        });
      }
    }

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
        timeSpent: "0h", // Initialize time spent for each day
      });
    }

    // Populate daily distribution
    weekLineups.forEach((lineup) => {
      const createdAt = new Date(lineup.createdAt);
      dailyDistribution.forEach((day, index) => {
        const dayEnd = new Date(day.date);
        dayEnd.setHours(23, 59, 59, 999);
        if (createdAt >= day.date && createdAt <= dayEnd) {
          day.lineups += 1;
        }
      });
    });

    weekSelections.forEach((selection) => {
      const createdAt = new Date(selection.createdAt);
      dailyDistribution.forEach((day, index) => {
        const dayEnd = new Date(day.date);
        dayEnd.setHours(23, 59, 59, 999);
        if (createdAt >= day.date && createdAt <= dayEnd) {
          day.selections += 1;
        }
      });
    });

    weekJoinings.forEach((joining) => {
      const createdAt = new Date(joining.createdAt);
      dailyDistribution.forEach((day, index) => {
        const dayEnd = new Date(day.date);
        dayEnd.setHours(23, 59, 59, 999);
        if (createdAt >= day.date && createdAt <= dayEnd) {
          day.joinings += 1;
        }
      });
    });

    weekCalls.forEach((call) => {
      const updatedAt = new Date(call.updatedAt);
      dailyDistribution.forEach((day, index) => {
        const dayEnd = new Date(day.date);
        dayEnd.setHours(23, 59, 59, 999);
        if (updatedAt >= day.date && updatedAt <= dayEnd) {
          day.calls += 1;
        }
      });
    });

    // Calculate time spent for each day in the daily distribution
    for (let dayIndex = 0; dayIndex < dailyDistribution.length; dayIndex++) {
      const day = dailyDistribution[dayIndex];
      const dayStart = new Date(day.date);
      const dayEnd = new Date(day.date);
      dayEnd.setHours(23, 59, 59, 999);

      // Calculate time spent for this day
      const dayTimeSpent = await calculateTimeSpentForRange(dayStart, dayEnd);
      dailyDistribution[dayIndex].timeSpent = dayTimeSpent;
    }

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
        timeSpent: "0h", // Initialize time spent for each month
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

    // Calculate time spent for each month in the monthly distribution
    for (
      let monthIndex = 0;
      monthIndex < monthlyDistribution.length;
      monthIndex++
    ) {
      const monthData = monthlyDistribution[monthIndex];
      const monthStart = new Date(monthData.year, monthData.month, 1);
      const monthEnd = new Date(
        monthData.year,
        monthData.month + 1,
        0,
        23,
        59,
        59,
        999
      );

      // Calculate time spent for this month
      const monthTimeSpent = await calculateTimeSpentForRange(
        monthStart,
        monthEnd
      );
      monthlyDistribution[monthIndex].timeSpent = monthTimeSpent;
    }

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

    const employeeCalls = todayCalls.filter((call) => {
      // Only count calls that have duration history entries with duration > 0
      return (
        call.callDurationHistory &&
        call.callDurationHistory.some(
          (record) =>
            record.employee &&
            record.employee.toString() === employeeId.toString() &&
            record.duration &&
            parseInt(record.duration) > 0
        )
      );
    }).length;

    // Calculate trend data (percentage change compared to previous period)
    const calculateTrend = (current, previous) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0; // If previous was 0, show 100% increase if current > 0
      }
      return (((current - previous) / previous) * 100).toFixed(1);
    };

    // Calculate daily trends (today vs yesterday)
    const dailyTrends = {
      lineups: calculateTrend(employeeLineups, yesterdayLineups.length),
      selections: calculateTrend(
        employeeSelections,
        yesterdaySelections.length
      ),
      joinings: calculateTrend(employeeJoinings, yesterdayJoinings.length),
      calls: calculateTrend(employeeCalls, yesterdayCalls.length),
    };

    // Calculate weekly trends (current week vs previous week)
    const weeklyTrends = {
      lineups: calculateTrend(weekLineups.length, previousWeekLineups.length),
      selections: calculateTrend(
        weekSelections.length,
        previousWeekSelections.length
      ),
      joinings: calculateTrend(
        weekJoinings.length,
        previousWeekJoinings.length
      ),
      calls: calculateTrend(weekCalls.length, previousWeekCalls.length),
    };

    // Calculate monthly trends (current month vs previous month)
    const monthlyTrends = {
      lineups: calculateTrend(monthLineups.length, previousMonthLineups.length),
      selections: calculateTrend(
        monthSelections.length,
        previousMonthSelections.length
      ),
      joinings: calculateTrend(
        monthJoinings.length,
        previousMonthJoinings.length
      ),
      calls: calculateTrend(monthCalls.length, previousMonthCalls.length),
    };

    const teamSize = allEmployees.length + 1; // +1 for current employee

    // Calculate team averages
    const teamAverageLineups = todayLineups.length / teamSize;
    const teamAverageSelections = todaySelections.length / teamSize;
    const teamAverageJoinings = todayJoinings.length / teamSize;
    const teamAverageCalls = todayCalls.length / teamSize;

    // Calculate conversion rates
    const conversionRate =
      employeeCalls > 0
        ? ((employeeLineups / employeeCalls) * 100).toFixed(1)
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
            trends: dailyTrends,
          },
          // Totals for different periods
          totals: {
            week: {
              lineups: weekLineups.length,
              selections: weekSelections.length,
              joinings: weekJoinings.length,
              calls: weekCalls.length,
              trends: weeklyTrends,
            },
            month: {
              lineups: monthLineups.length,
              selections: monthSelections.length,
              joinings: monthJoinings.length,
              calls: monthCalls.length,
              trends: monthlyTrends,
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
 * Get incentives data for dashboard visualization
 * Provides incentive metrics by day, week, month, year and process
 */
const getIncentivesData = handleAsync(async (req, res) => {
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

    // Calculate quarter
    const currentQuarter = Math.floor(today.getMonth() / 3);
    const startOfQuarter = new Date(today.getFullYear(), currentQuarter * 3, 1);

    // Start of year
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Get all incentive-related data in a single query
    const allIncentives = await Joining.find({
      createdBy: employeeId,
      "incentives.eligible": true,
      "incentives.calculated": true,
    })
      .populate("company", "name")
      .lean();

    // Calculate total incentives and counts
    const totalIncentives = allIncentives.reduce(
      (sum, item) => sum + (item.incentives?.amount || 0),
      0
    );

    const weekIncentives = allIncentives
      .filter(
        (item) =>
          new Date(item.createdAt) >= startOfWeek &&
          new Date(item.createdAt) < tomorrow
      )
      .reduce((sum, item) => sum + (item.incentives?.amount || 0), 0);

    const monthIncentives = allIncentives
      .filter(
        (item) =>
          new Date(item.createdAt) >= startOfMonth &&
          new Date(item.createdAt) < tomorrow
      )
      .reduce((sum, item) => sum + (item.incentives?.amount || 0), 0);

    const quarterIncentives = allIncentives
      .filter(
        (item) =>
          new Date(item.createdAt) >= startOfQuarter &&
          new Date(item.createdAt) < tomorrow
      )
      .reduce((sum, item) => sum + (item.incentives?.amount || 0), 0);

    const yearIncentives = allIncentives
      .filter(
        (item) =>
          new Date(item.createdAt) >= startOfYear &&
          new Date(item.createdAt) < tomorrow
      )
      .reduce((sum, item) => sum + (item.incentives?.amount || 0), 0);

    // Create daily distribution for last 30 days
    const dailyIncentives = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dateString = date.toISOString().split("T")[0];

      const incentivesForDay = allIncentives
        .filter(
          (item) =>
            new Date(item.createdAt) >= dayStart &&
            new Date(item.createdAt) <= dayEnd
        )
        .reduce((sum, item) => sum + (item.incentives?.amount || 0), 0);

      dailyIncentives.push({
        date: dateString,
        amount: incentivesForDay,
        count: allIncentives.filter(
          (item) =>
            new Date(item.createdAt) >= dayStart &&
            new Date(item.createdAt) <= dayEnd
        ).length,
      });
    }

    // Create weekly distribution (last 12 weeks)
    const weeklyIncentives = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() - 7 * i);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Format week label as "MMM DD - MMM DD YYYY"
      const startMonth = weekStart.toLocaleString("default", {
        month: "short",
      });
      const endMonth = weekEnd.toLocaleString("default", { month: "short" });
      const startDay = weekStart.getDate();
      const endDay = weekEnd.getDate();
      const year = weekEnd.getFullYear();

      let weekLabel;
      if (startMonth === endMonth) {
        weekLabel = `${startMonth} ${startDay}-${endDay}, ${year}`;
      } else {
        weekLabel = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
      }

      const incentivesForWeek = allIncentives
        .filter(
          (item) =>
            new Date(item.createdAt) >= weekStart &&
            new Date(item.createdAt) <= weekEnd
        )
        .reduce((sum, item) => sum + (item.incentives?.amount || 0), 0);

      weeklyIncentives.push({
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        weekLabel,
        amount: incentivesForWeek,
        count: allIncentives.filter(
          (item) =>
            new Date(item.createdAt) >= weekStart &&
            new Date(item.createdAt) <= weekEnd
        ).length,
      });
    }

    // Create quarterly distribution (last 8 quarters)
    const quarterlyIncentives = [];
    for (let i = 7; i >= 0; i--) {
      const currentYear = today.getFullYear();
      const currentQtr = Math.floor(today.getMonth() / 3);

      // Calculate quarter number (0-3) and year
      let qtrNumber = currentQtr - (i % 4);
      let yearOffset = Math.floor(i / 4);
      let year = currentYear - yearOffset;

      while (qtrNumber < 0) {
        qtrNumber += 4;
        year--;
      }

      const qtrStart = new Date(year, qtrNumber * 3, 1);
      const qtrEnd = new Date(year, qtrNumber * 3 + 3, 0);
      qtrEnd.setHours(23, 59, 59, 999);

      const qtrLabel = `Q${qtrNumber + 1} ${year}`;

      const incentivesForQuarter = allIncentives
        .filter(
          (item) =>
            new Date(item.createdAt) >= qtrStart &&
            new Date(item.createdAt) <= qtrEnd
        )
        .reduce((sum, item) => sum + (item.incentives?.amount || 0), 0);

      quarterlyIncentives.push({
        quarterStart: qtrStart.toISOString(),
        quarterEnd: qtrEnd.toISOString(),
        quarterLabel: qtrLabel,
        amount: incentivesForQuarter,
        count: allIncentives.filter(
          (item) =>
            new Date(item.createdAt) >= qtrStart &&
            new Date(item.createdAt) <= qtrEnd
        ).length,
      });
    }

    // Create monthly distribution (last 12 months)
    const monthlyIncentives = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      const monthName = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();

      const incentivesForMonth = allIncentives
        .filter(
          (item) =>
            new Date(item.createdAt) >= date &&
            new Date(item.createdAt) <= monthEnd
        )
        .reduce((sum, item) => sum + (item.incentives?.amount || 0), 0);

      monthlyIncentives.push({
        month: date.getMonth(),
        year: year,
        monthLabel: `${monthName} ${year}`,
        amount: incentivesForMonth,
        count: allIncentives.filter(
          (item) =>
            new Date(item.createdAt) >= date &&
            new Date(item.createdAt) <= monthEnd
        ).length,
      });
    }

    // Create process-wise distribution
    const processCounts = {};
    const processAmounts = {};

    allIncentives.forEach((item) => {
      if (item.process) {
        if (!processCounts[item.process]) {
          processCounts[item.process] = 0;
          processAmounts[item.process] = 0;
        }
        processCounts[item.process]++;
        processAmounts[item.process] += item.incentives?.amount || 0;
      }
    });

    const processDistribution = Object.keys(processCounts)
      .map((process) => ({
        process,
        count: processCounts[process],
        amount: processAmounts[process],
      }))
      .sort((a, b) => b.amount - a.amount);

    // Create company-wise distribution
    const companyCounts = {};
    const companyAmounts = {};

    allIncentives.forEach((item) => {
      const companyName = item.company || "Unknown";
      if (!companyCounts[companyName]) {
        companyCounts[companyName] = 0;
        companyAmounts[companyName] = 0;
      }
      companyCounts[companyName]++;
      companyAmounts[companyName] += item.incentives?.amount || 0;
    });

    const companyDistribution = Object.keys(companyCounts)
      .map((company) => ({
        company,
        count: companyCounts[company],
        amount: companyAmounts[company],
      }))
      .sort((a, b) => b.amount - a.amount);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          total: totalIncentives,
          week: weekIncentives,
          month: monthIncentives,
          quarter: quarterIncentives,
          year: yearIncentives,
          count: allIncentives.length,
        },
        distributions: {
          daily: dailyIncentives,
          weekly: weeklyIncentives,
          monthly: monthlyIncentives,
          quarterly: quarterlyIncentives,
          byProcess: processDistribution,
          byCompany: companyDistribution,
        },
      },
    });
  } catch (error) {
    console.error("Error in getIncentivesData:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching incentives data",
      error: error.message,
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

    // Get all attendance records for the specified month
    const attendanceRecords = await Attendance.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // Create a map of attendance records by date for easier lookup
    const attendanceMap = {};
    attendanceRecords.forEach((record) => {
      const date = new Date(record.date);
      const day = date.getDate();
      attendanceMap[day] = record;
    });

    // Create a map of leave records by date for easier lookup
    const leaveMap = {};
    leaves.forEach((leave) => {
      const leaveStart = new Date(
        Math.max(new Date(leave.startDate), startDate)
      );
      const leaveEnd = new Date(Math.min(new Date(leave.endDate), endDate));

      for (
        let current = new Date(leaveStart);
        current <= leaveEnd;
        current.setDate(current.getDate() + 1)
      ) {
        const day = current.getDate();
        leaveMap[day] = leave;
      }
    });

    // Initialize calendar data for the month
    const totalDays = endDate.getDate();
    const calendarData = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= totalDays; day++) {
      const currentDate = new Date(targetYear, targetMonth, day);
      const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 6 is Saturday
      const leave = leaveMap[day];

      // Check if the day is a weekend (Sunday or 2nd/4th Saturday)
      let isWeekoff = false;
      if (dayOfWeek === 0) {
        // Sunday is always weekoff
        isWeekoff = true;
      } else if (dayOfWeek === 6) {
        // Check if it's 2nd or 4th Saturday (weekoff)
        const weekOfMonth = Math.ceil(day / 7);
        if (weekOfMonth === 2 || weekOfMonth === 4) {
          isWeekoff = true;
        }
      }

      // If it's a weekoff and there's no leave, mark it as weekoff
      if (isWeekoff && !leave) {
        calendarData[day] = {
          status: "Week Off",
          type: "WO",
          present: false,
          leave: null,
          attendance: null,
        };
        continue;
      }

      // Check if the date is in the future
      if (currentDate > today) {
        if (leave) {
          // Handle leave on future dates - same logic as for past dates with leaves
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
              durationLabel = "";
          }

          const fullLeaveType = durationLabel
            ? `${leaveType}-${durationLabel}`
            : leaveType;

          const status =
            leave.status === "Approved"
              ? `${fullLeaveType} (Approved)`
              : leave.status === "Rejected"
              ? `${fullLeaveType} (Rejected)`
              : `${fullLeaveType} (Pending)`;

          calendarData[day] = {
            status,
            type: fullLeaveType,
            present: false,
            leaveDetails: {
              id: leave._id,
              type: leave.leaveType,
              reason: leave.leaveReason,
              status: leave.status,
              description: leave.description || "",
              approved: leave.status === "Approved",
            },
            attendanceDetails: null,
          };
        } else {
          calendarData[day] = {
            status: "Upcoming",
            type: "U",
            present: false,
            leave: null,
            attendance: null,
          };
        }
        continue;
      }

      // For past dates, check attendance and leave records
      const attendance = attendanceMap[day];

      // Default status if no attendance or leave record
      let status = "No Record";
      let type = "NR";
      let present = false;

      // If attendance record exists
      if (attendance) {
        present = attendance.present;
        if (present) {
          status = "Present";
          type = "P";
        }
      }

      // Leave record overrides attendance
      if (leave) {
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

        // Create the full leave label
        const fullLeaveType = durationLabel
          ? `${leaveType}-${durationLabel}`
          : leaveType;

        // Set the leave status based on approval status
        status =
          leave.status === "Approved"
            ? `${fullLeaveType} (Approved)`
            : leave.status === "Rejected"
            ? `${fullLeaveType} (Rejected)`
            : `${fullLeaveType} (Pending)`;

        type = fullLeaveType;
        present = false; // If on leave, not present
      }

      calendarData[day] = {
        status,
        type,
        present,
        leaveDetails: leave
          ? {
              id: leave._id,
              type: leave.leaveType,
              reason: leave.leaveReason,
              status: leave.status,
              description: leave.description || "",
              approved: leave.status === "Approved",
            }
          : null,
        attendanceDetails: attendance
          ? {
              id: attendance._id,
              date: attendance.date,
              present: attendance.present,
            }
          : null,
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        month: targetMonth + 1, // Convert back to 1-based month for response
        year: targetYear,
        totalDays,
        calendar: calendarData,
        presentDays: attendanceRecords.filter((record) => record.present)
          .length,
        leaveDays: leaves.reduce((total, leave) => {
          // Count days within the month for each leave
          const leaveStart = new Date(
            Math.max(new Date(leave.startDate), startDate)
          );
          const leaveEnd = new Date(Math.min(new Date(leave.endDate), endDate));

          // Calculate number of days
          const diffTime = Math.abs(leaveEnd - leaveStart);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

          return total + diffDays;
        }, 0),
        attendanceRecords,
        leaves,
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

/**
 * Generate daily report for a specific date and send to admin emails
 * @route POST /api/employee/generate-daily-report
 * @access Admin, Superadmin
 */
const generateDailyReport = handleAsync(async (req, res) => {
  try {
    const { date } = req.body;

    // Validate date parameter
    let reportDate;
    if (!date) {
      // If no date provided, use yesterday
      reportDate = new Date();
      reportDate.setDate(reportDate.getDate() - 1);
    } else {
      // Parse provided date
      reportDate = new Date(date);
      if (isNaN(reportDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Please use YYYY-MM-DD format.",
        });
      }
    }

    // Generate and send the report
    await generateAndSendDailyReport(reportDate);

    return res.status(200).json({
      success: true,
      message: `Daily report for ${reportDate.toDateString()} generated and sent successfully.`,
    });
  } catch (error) {
    console.error("Error generating daily report:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating daily report",
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
  getIncentivesData,
  generateDailyReport,
};
