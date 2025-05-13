const employeeLogoutReportTemplate = (
  employeeDetails,
  logoutTime,
  activitySummary,
  candidateWork
) => {
  const { name, email, employeeCode, mobile } = employeeDetails;
  const { totalWorkingTime, activities } = activitySummary;

  // Format activities into HTML rows
  const activityRows = activities
    .map(
      (activity) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${activity.type}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${new Date(
        activity.startTime
      ).toLocaleString()}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${
        activity.endTime ? new Date(activity.endTime).toLocaleString() : "N/A"
      }</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${
        activity.duration || "N/A"
      }</td>
    </tr>
  `
    )
    .join("");

  // Format lineups into HTML rows if any
  const lineupRows =
    candidateWork?.lineups?.length > 0
      ? candidateWork.lineups
          .map(
            (lineup) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${lineup.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${lineup.contact}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${lineup.company}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${lineup.process}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${lineup.lineupDate}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${lineup.interviewDate}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${lineup.status}</td>
      </tr>
    `
          )
          .join("")
      : '<tr><td colspan="7" style="padding: 8px; border: 1px solid #ddd; text-align: center;">No lineups created today</td></tr>';

  // Format joinings into HTML rows if any
  const joiningRows =
    candidateWork?.joinings?.length > 0
      ? candidateWork.joinings
          .map(
            (joining) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${joining.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${
          joining.contact
        }</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${
          joining.company
        }</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${
          joining.process
        }</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${
          joining.joiningDate
        }</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${
          joining.salary || "N/A"
        }</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${
          joining.joiningType
        }</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${joining.status}</td>
      </tr>
    `
          )
          .join("")
      : '<tr><td colspan="8" style="padding: 8px; border: 1px solid #ddd; text-align: center;">No joinings created today</td></tr>';

  // Format candidate status sections
  const candidateStatusSections = candidateWork?.candidates
    ? candidateWork.candidates
        .map((statusGroup) => {
          const candidateRows = statusGroup.details
            .map(
              (candidate) => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${candidate.name}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${candidate.mobile}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${candidate.source}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${candidate.qualification}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${candidate.experience}</td>
          </tr>
        `
            )
            .join("");

          return `
          <div class="candidate-status-section" style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 10px; padding: 8px; background-color: #f8f9fa; border-radius: 4px;">
              Status: ${statusGroup.status} (${statusGroup.count} candidates)
            </h4>
            <table class="candidates-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr>
                  <th style="background-color: #f2f2f2; padding: 10px; border: 1px solid #ddd; text-align: left;">Name</th>
                  <th style="background-color: #f2f2f2; padding: 10px; border: 1px solid #ddd; text-align: left;">Mobile</th>
                  <th style="background-color: #f2f2f2; padding: 10px; border: 1px solid #ddd; text-align: left;">Source</th>
                  <th style="background-color: #f2f2f2; padding: 10px; border: 1px solid #ddd; text-align: left;">Qualification</th>
                  <th style="background-color: #f2f2f2; padding: 10px; border: 1px solid #ddd; text-align: left;">Experience</th>
                </tr>
              </thead>
              <tbody>
                ${candidateRows}
              </tbody>
            </table>
          </div>
        `;
        })
        .join("")
    : '<p style="text-align: center;">No candidates handled today</p>';

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 950px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    .header {
      background-color: #e74c3c;
      color: white;
      padding: 15px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      padding: 20px;
    }
    .employee-details {
      background-color: #f2f2f2;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .detail-row {
      display: flex;
      margin-bottom: 8px;
    }
    .detail-label {
      width: 150px;
      font-weight: bold;
    }
    .summary-box {
      background-color: #f8f9fa;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
      margin: 20px 0;
    }
    .activity-table, .lineup-table, .joining-table, .candidates-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .activity-table th, .lineup-table th, .joining-table th, .candidates-table th {
      background-color: #f2f2f2;
      padding: 10px;
      border: 1px solid #ddd;
      text-align: left;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #777;
      margin-top: 20px;
    }
    .section-heading {
      background-color: #3498db;
      color: white;
      padding: 10px;
      border-radius: 5px;
      margin-top: 30px;
      margin-bottom: 15px;
    }
    .call-stats {
      display: flex;
      justify-content: space-between;
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .stat-item {
      text-align: center;
      flex: 1;
    }
    .stat-value {
      font-size: 18px;
      font-weight: bold;
      color: #3498db;
    }
    .stat-label {
      font-size: 12px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Employee Logout Report</h2>
    </div>
    <div class="content">
      <p>An employee has logged out of the system. Here is their daily activity report:</p>
      
      <div class="employee-details">
        <h3>Employee Details:</h3>
        <div class="detail-row">
          <div class="detail-label">Name:</div>
          <div>${name?.en || name || "N/A"}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Employee ID:</div>
          <div>${employeeCode || "N/A"}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Email:</div>
          <div>${email || "N/A"}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Mobile:</div>
          <div>${mobile || "N/A"}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Logout Time:</div>
          <div>${logoutTime || "N/A"}</div>
        </div>
      </div>
      
      <div class="summary-box">
        <h3>Today's Work Summary:</h3>
        <div class="detail-row">
          <div class="detail-label">Total Working Time:</div>
          <div>${totalWorkingTime || "0 hours"}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Total Lineups:</div>
          <div>${candidateWork?.totalLineups || 0}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Total Candidates:</div>
          <div>${candidateWork?.totalCandidates || 0}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Total Joinings:</div>
          <div>${candidateWork?.totalJoinings || 0}</div>
        </div>
      </div>
      
      ${
        candidateWork?.callStats
          ? `
      <div class="call-stats">
        <div class="stat-item">
          <div class="stat-value">${candidateWork.callStats.totalCalls}</div>
          <div class="stat-label">Total Calls</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${candidateWork.callStats.totalDuration}</div>
          <div class="stat-label">Total Call Duration</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${candidateWork.callStats.averageDuration}</div>
          <div class="stat-label">Average Call Duration</div>
        </div>
      </div>
      `
          : ""
      }
      
      <h3 class="section-heading">Activity Details</h3>
      <table class="activity-table">
        <thead>
          <tr>
            <th>Activity Type</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${
            activityRows.length > 0
              ? activityRows
              : '<tr><td colspan="4" style="padding: 8px; border: 1px solid #ddd; text-align: center;">No activities recorded</td></tr>'
          }
        </tbody>
      </table>
      
      <h3 class="section-heading">Lineup Details</h3>
      <table class="lineup-table">
        <thead>
          <tr>
            <th>Candidate Name</th>
            <th>Contact</th>
            <th>Company</th>
            <th>Process</th>
            <th>Lineup Date</th>
            <th>Interview Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${lineupRows}
        </tbody>
      </table>
      
      <h3 class="section-heading">Joining Details</h3>
      <table class="joining-table">
        <thead>
          <tr>
            <th>Candidate Name</th>
            <th>Contact</th>
            <th>Company</th>
            <th>Process</th>
            <th>Joining Date</th>
            <th>Salary</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${joiningRows}
        </tbody>
      </table>
      
      <h3 class="section-heading">Candidate Details by Status</h3>
      ${candidateStatusSections}
      
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>The report is also attached as an Excel file for your records.</p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = employeeLogoutReportTemplate;
