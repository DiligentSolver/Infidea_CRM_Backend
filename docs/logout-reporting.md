# Employee Logout Reporting System

## Overview

The Employee Logout Reporting system sends detailed activity reports to administrators when an employee logs out. These reports include a daily summary of the employee's activities and are sent both as an HTML email and an Excel attachment.

## Features

- **Real-time Reporting**: Sends reports immediately upon employee logout
- **Detailed Activity Tracking**: Lists all employee activities for the day
- **Working Time Calculation**: Computes total working time per day
- **Multi-format Delivery**:
  - HTML email with formatted activity tables
  - Excel spreadsheet attachment for data analysis

## Admin Email Configuration

The system sends reports to the same admin emails configured for login OTP verification:

```
# Admin emails for reports
SUPER_ADMIN_EMAIL=superadmin@example.com
ADMIN_EMAIL=admin@example.com
SUPERVISOR_EMAIL=supervisor@example.com
```

## Email Report Content

Each logout report email includes:

1. **Employee Information**:

   - Name
   - Employee ID
   - Email
   - Mobile number
   - Logout timestamp

2. **Daily Activity Summary**:

   - Total working time calculated from all activities
   - Breakdown of individual activities
   - Start and end times for each activity
   - Duration of each activity

3. **Excel Attachment**:
   - Formatted spreadsheet with the same information
   - Named using employee ID and date

## Technical Implementation

The system uses:

1. **NodeMailer**: For sending emails with attachments
2. **ExcelJS**: For generating Excel reports
3. **HTML Templates**: For formatting email content

## Backend Process Flow

1. Employee initiates logout
2. System closes all active activities
3. Background process generates activity report
4. System sends emails to configured admin addresses
5. Logout response returns to employee without waiting for report delivery

## Security Considerations

- Email delivery errors are logged but don't block the logout process
- Admin email addresses are validated before sending
- Process runs in the background to maintain logout performance
