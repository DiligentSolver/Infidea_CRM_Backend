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

// Fetch data for daily report
const fetchDailyReportData = async () => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

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
  const today = new Date();
  const startOfWeek = new Date(today.setDate(today.getDate() - 7));
  const endOfWeek = new Date();

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
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const totalJobs = await Job.countDocuments({
    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
  });
  const totalUsers = await User.countDocuments({
    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
  });
  const averageRating = await Feedback.aggregate([
    { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
    { $group: { _id: null, averageRating: { $avg: "$rating" } } },
  ]);
  const topJob = await Feedback.aggregate([
    { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
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
    { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
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

// Schedule daily report (runs at 8 AM every day)
cron.schedule("0 8 * * *", async () => {
  const data = await fetchDailyReportData();
  const html = dailyReportTemplate(data);
  await sendEmail(
    process.env.ADMIN_EMAIL,
    "Daily Report - Job Marketplace",
    html
  );
});

// Schedule weekly report (runs at 8 AM every Monday)
cron.schedule("0 8 * * 1", async () => {
  const data = await fetchWeeklyReportData();
  const html = weeklyReportTemplate(data);
  await sendEmail(
    process.env.ADMIN_EMAIL,
    "Weekly Report - Job Marketplace",
    html
  );
});

// Schedule monthly report (runs at 8 AM on the 1st of every month)
cron.schedule("0 8 1 * *", async () => {
  const data = await fetchMonthlyReportData();
  const html = monthlyReportTemplate(data);
  await sendEmail(
    process.env.ADMIN_EMAIL,
    "Monthly Report - Job Marketplace",
    html
  );
});
