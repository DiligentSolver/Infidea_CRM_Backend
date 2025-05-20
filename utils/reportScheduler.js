const cron = require("node-cron");
const { sendEmail } = require("../config/email");
const {
  dailyReportTemplate,
  weeklyReportTemplate,
  monthlyReportTemplate,
} = require("./emailTemplates");
const Feedback = require("../models/Feedback");
const Job = require("../models/Job");
const User = require("../models/User");
const dateUtils = require("./dateUtils");
const moment = require("moment-timezone");

// Fetch data for daily report
const fetchDailyReportData = async () => {
  const today = dateUtils.getCurrentDate();
  const startOfDay = dateUtils.startOfDay(today);
  const endOfDay = dateUtils.endOfDay(today);

  const newJobs = await Job.countDocuments({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });
  const newUsers = await User.countDocuments({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });
  const averageRating = await Feedback.aggregate([
    { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay } } },
    { $group: { _id: null, averageRating: { $avg: "$rating" } } },
  ]);

  return {
    newJobs,
    newUsers,
    averageRating:
      averageRating[0]?.averageRating.toFixed(2) || "No feedback today",
  };
};

// Fetch data for weekly report
const fetchWeeklyReportData = async () => {
  const today = dateUtils.getCurrentDate();
  const startOfWeek = dateUtils.addTime(today, -7, "days");
  const endOfWeek = dateUtils.getCurrentDate();

  const totalJobs = await Job.countDocuments({
    createdAt: { $gte: startOfWeek, $lte: endOfWeek },
  });
  const totalUsers = await User.countDocuments({
    createdAt: { $gte: startOfWeek, $lte: endOfWeek },
  });
  const averageRating = await Feedback.aggregate([
    { $match: { createdAt: { $gte: startOfWeek, $lte: endOfWeek } } },
    { $group: { _id: null, averageRating: { $avg: "$rating" } } },
  ]);
  const topJob = await Feedback.aggregate([
    { $match: { createdAt: { $gte: startOfWeek, $lte: endOfWeek } } },
    { $group: { _id: "$jobId", averageRating: { $avg: "$rating" } } },
    { $sort: { averageRating: -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: "jobs",
        localField: "_id",
        foreignField: "_id",
        as: "job",
      },
    },
    { $unwind: "$job" },
  ]);

  return {
    totalJobs,
    totalUsers,
    averageRating:
      averageRating[0]?.averageRating.toFixed(2) || "No feedback this week",
    topJob: topJob[0]?.job || { title: "No jobs this week", rating: 0 },
  };
};

// Fetch data for monthly report
const fetchMonthlyReportData = async () => {
  const today = dateUtils.getCurrentDate();
  // Create start and end of month in IST
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  // Convert to IST
  const istStartOfMonth = dateUtils.convertToIST(startOfMonth);
  const istEndOfMonth = dateUtils.convertToIST(endOfMonth);

  const totalJobs = await Job.countDocuments({
    createdAt: { $gte: istStartOfMonth, $lte: istEndOfMonth },
  });
  const totalUsers = await User.countDocuments({
    createdAt: { $gte: istStartOfMonth, $lte: istEndOfMonth },
  });
  const averageRating = await Feedback.aggregate([
    { $match: { createdAt: { $gte: istStartOfMonth, $lte: istEndOfMonth } } },
    { $group: { _id: null, averageRating: { $avg: "$rating" } } },
  ]);
  const topJob = await Feedback.aggregate([
    { $match: { createdAt: { $gte: istStartOfMonth, $lte: istEndOfMonth } } },
    { $group: { _id: "$jobId", averageRating: { $avg: "$rating" } } },
    { $sort: { averageRating: -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: "jobs",
        localField: "_id",
        foreignField: "_id",
        as: "job",
      },
    },
    { $unwind: "$job" },
  ]);
  const mostActiveUser = await Feedback.aggregate([
    { $match: { createdAt: { $gte: istStartOfMonth, $lte: istEndOfMonth } } },
    { $group: { _id: "$userId", feedbackCount: { $sum: 1 } } },
    { $sort: { feedbackCount: -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
  ]);

  return {
    totalJobs,
    totalUsers,
    averageRating:
      averageRating[0]?.averageRating.toFixed(2) || "No feedback this month",
    topJob: topJob[0]?.job || { title: "No jobs this month", rating: 0 },
    mostActiveUser: mostActiveUser[0]?.user || {
      name: "No active users",
      email: "N/A",
    },
  };
};

// Schedule daily report (runs at 8 AM IST every day)
// Convert 8:00 AM IST to server's timezone for cron
const dailyReportTime = moment()
  .tz(dateUtils.IST_TIMEZONE)
  .set({ hour: 8, minute: 0, second: 0 })
  .local();
const dailyReportHour = dailyReportTime.hour();
const dailyReportMinute = dailyReportTime.minute();

cron.schedule(`${dailyReportMinute} ${dailyReportHour} * * *`, async () => {
  const data = await fetchDailyReportData();
  const html = dailyReportTemplate(data);
  await sendEmail(
    process.env.ADMIN_EMAIL,
    "Daily Report - Job Marketplace",
    html
  );
});

// Schedule weekly report (runs at 8 AM IST every Monday)
const weeklyReportTime = moment()
  .tz(dateUtils.IST_TIMEZONE)
  .set({ hour: 8, minute: 0, second: 0 })
  .local();
const weeklyReportHour = weeklyReportTime.hour();
const weeklyReportMinute = weeklyReportTime.minute();

cron.schedule(`${weeklyReportMinute} ${weeklyReportHour} * * 1`, async () => {
  const data = await fetchWeeklyReportData();
  const html = weeklyReportTemplate(data);
  await sendEmail(
    process.env.ADMIN_EMAIL,
    "Weekly Report - Job Marketplace",
    html
  );
});

// Schedule monthly report (runs at 8 AM IST on the 1st of every month)
const monthlyReportTime = moment()
  .tz(dateUtils.IST_TIMEZONE)
  .set({ hour: 8, minute: 0, second: 0 })
  .local();
const monthlyReportHour = monthlyReportTime.hour();
const monthlyReportMinute = monthlyReportTime.minute();

cron.schedule(`${monthlyReportMinute} ${monthlyReportHour} 1 * *`, async () => {
  const data = await fetchMonthlyReportData();
  const html = monthlyReportTemplate(data);
  await sendEmail(
    process.env.ADMIN_EMAIL,
    "Monthly Report - Job Marketplace",
    html
  );
});
