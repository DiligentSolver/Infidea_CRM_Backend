# Daily Employee Report System

## Overview

The daily employee report system automatically generates comprehensive Excel reports of employee activities at 8 PM Indian Standard Time (IST) every day. These reports are sent via email to administrators.

## Features

- **Automated Daily Reports**: A master report is automatically generated and sent to administrators at 8 PM IST every day
- **Comprehensive Employee Data**: Includes login/logout times, working hours, lineups, joinings, and call statistics
- **Separate Detail Sheets**: Special sheets for lineups and joinings when these activities occur
- **Manual Report Generation**: Admins can manually trigger report generation for any specific date through an API endpoint
- **Email Delivery**: Reports are sent to all configured administrator emails

## Report Contents

Each daily report Excel file contains:

1. **Employee Summary Sheet**:

   - Employee ID and Name
   - Login and Logout Times
   - Total Working Hours
   - Count of Lineups, Candidates, and Joinings
   - Call Statistics

2. **Lineups Sheet** (if any lineups for the day):

   - Employee who created the lineup
   - Candidate details
   - Company and process
   - Interview dates
   - Status

3. **Joinings Sheet** (if any joinings for the day):
   - Employee who created the joining
   - Candidate details
   - Company and process
   - Joining type and date
   - Status

## Technical Implementation

- Uses Node-cron to schedule report generation at 8 PM IST
- Utilizes ExcelJS for Excel file generation
- Sends emails using Nodemailer
- Calculates employee activity metrics using Activity model
- Timezone handling via moment-timezone

## Configuration

The system uses the following environment variables:

- `EMAIL_ID`: Email address used to send reports
- `EMAIL_PASSWORD`: Password for the email account
- `APP_NAME`: Name of the application (used in email sender)
- `SUPER_ADMIN_EMAIL`: Email of the super administrator
- `ADMIN_EMAIL`: Email of the administrator
- `SUPERVISOR_EMAIL`: Email of the supervisor

## Manual Report Generation

Administrators can manually generate reports for specific dates using the following API endpoint:

```
POST /crm/api/employee/generate-daily-report
```

Request body:

```json
{
  "date": "YYYY-MM-DD" // Optional, defaults to yesterday
}
```

Response:

```json
{
  "success": true,
  "message": "Daily report for Mon May 13 2024 generated and sent successfully."
}
```

## Technical Details

The system consists of several key components:

1. **Report Data Collection**: Gathers data from various collections (Employee, Activity, Lineup, Joining)
2. **Excel Generation**: Creates multi-sheet Excel report with formatting
3. **Email Delivery**: Sends email with attachment to administrators
4. **Scheduling**: Runs at 8 PM IST daily using cron job

## Troubleshooting

If reports are not being sent:

1. Check email configuration in environment variables
2. Verify that the server timezone is correctly configured
3. Check server logs for any errors in report generation
4. Ensure that MongoDB connection is working correctly
5. Verify that the uploads/reports directory is writable
