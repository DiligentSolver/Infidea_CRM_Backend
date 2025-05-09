const dailyReportTemplate = (data) => `
    <h1>Daily Report - Job Marketplace</h1>
    <p>Here’s a summary of platform activity for today:</p>
    <ul>
        <li><strong>New Jobs Posted:</strong> ${data.newJobs}</li>
        <li><strong>New Users Registered:</strong> ${data.newUsers}</li>
        <li><strong>Average Feedback Rating:</strong> ${data.averageRating}</li>
    </ul>
    <p>Thank you for using Job Marketplace!</p>
`;

const weeklyReportTemplate = (data) => `
    <h1>Weekly Report - Job Marketplace</h1>
    <p>Here’s a summary of platform activity for the past week:</p>
    <ul>
        <li><strong>Total Jobs Posted:</strong> ${data.totalJobs}</li>
        <li><strong>Total Users Registered:</strong> ${data.totalUsers}</li>
        <li><strong>Average Feedback Rating:</strong> ${data.averageRating}</li>
        <li><strong>Top Performing Job:</strong> ${data.topJob.title} (Rating: ${data.topJob.rating})</li>
    </ul>
    <p>Thank you for using Job Marketplace!</p>
`;

const monthlyReportTemplate = (data) => `
    <h1>Monthly Report - Job Marketplace</h1>
    <p>Here’s a summary of platform activity for the past month:</p>
    <ul>
        <li><strong>Total Jobs Posted:</strong> ${data.totalJobs}</li>
        <li><strong>Total Users Registered:</strong> ${data.totalUsers}</li>
        <li><strong>Average Feedback Rating:</strong> ${data.averageRating}</li>
        <li><strong>Top Performing Job:</strong> ${data.topJob.title} (Rating: ${data.topJob.rating})</li>
        <li><strong>Most Active User:</strong> ${data.mostActiveUser.name} (Email: ${data.mostActiveUser.email})</li>
    </ul>
    <p>Thank you for using Job Marketplace!</p>
`;

module.exports = {
  dailyReportTemplate,
  weeklyReportTemplate,
  monthlyReportTemplate,
};
