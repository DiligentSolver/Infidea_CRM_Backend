# Employee Logout Reporting System

## Overview

The Employee Logout Reporting system sends detailed activity reports to administrators when an employee logs out. These reports include a comprehensive summary of the employee's daily activities and candidate work, delivered both as an HTML email and an Excel attachment with multiple worksheets.

## Features

- **Real-time Reporting**: Sends reports immediately upon employee logout
- **Detailed Activity Tracking**: Lists all employee activities for the day
- **Working Time Calculation**: Computes total working time per day
- **Candidate Work Summary**:
  - Lineups created with candidate details
  - Joinings processed with company information
  - Candidate interactions categorized by status
- **Call Analytics**:
  - Total calls made
  - Total call duration
  - Average call duration
- **Multi-format Delivery**:
  - HTML email with formatted activity tables
  - Excel spreadsheet with multiple tabs for different data categories

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

2. **Work Summary**:

   - Total working time
   - Total lineups created
   - Total candidates handled
   - Total joinings processed
   - Call statistics summary

3. **Daily Activity Log**:

   - Activity type
   - Start and end times
   - Duration of each activity

4. **Candidate Work Details**:
   - **Lineups**: Name, contact, company, process, dates, and status
   - **Joinings**: Name, contact, company, process, joining date, salary, type, and status
   - **Candidates by Status**: Organized by status with detailed information for each candidate

## Excel Report Structure

The Excel report contains multiple worksheets:

1. **Summary**: Overall work metrics and employee details
2. **Activities**: Detailed log of all activities with timestamps
3. **Lineups**: All lineups created during the day
4. **Joinings**: All joinings processed during the day
5. **Candidates - [Status]**: Multiple sheets organized by candidate status

## Technical Implementation

The system uses:

1. **NodeMailer**: For sending emails with attachments
2. **ExcelJS**: For generating multi-sheet Excel reports
3. **HTML Templates**: For formatting rich email content
4. **MongoDB Queries**: For collecting all candidate-related work

## Backend Process Flow

1. Employee initiates logout
2. System closes all active activities
3. Background process gathers detailed work summary:
   - Activity logs
   - Candidate interactions
   - Lineups created
   - Joinings processed
   - Call duration metrics
4. System generates formatted reports (HTML and Excel)
5. Reports are sent to all configured admin emails
6. Logout response returns to employee without waiting for report delivery

## Security and Performance Considerations

- Email delivery errors are logged but don't block the logout process
- Admin email addresses are validated before sending
- Process runs in the background to maintain logout performance
- Database queries are optimized to gather information efficiently
