## Attendance Tracking System

The system automatically tracks employee attendance based on login status and leave applications:

### How Attendance Works

1. **Default Attendance Marking**:

   - When an employee logs in, they are automatically marked present for the current day.
   - Past days (where the employee has logged in at least once) are also marked as present.

2. **Leave Management**:

   - If an employee has an approved leave for the current day, they won't be marked present even when they log in.
   - The system checks the leave status (Approved, Pending, Rejected) before marking attendance.
   - For rejected leaves, the system automatically marks the employee as present.

3. **Weekoffs**:

   - Sundays are always marked as weekoffs.
   - 2nd and 4th Saturdays are marked as weekoffs.
   - Other Saturdays are considered working days.

4. **Leave Types**:

   - Full Day Leave: Employee is not marked present for the entire day.
   - Half Day Leave: Employee is marked with a special "HD" status.
   - Early Logout: Employee is marked with a special "EL" status.

5. **Leave Categories**:
   - Sick Leave (SL)
   - Privilege Leave (PL)
   - Casual Leave (CL)
   - Sandwich Leave (SDL)

### Attendance Calendar

The attendance calendar displays:

- Present days (P)
- Weekoffs (WO)
- Approved leaves with type (SL, PL, CL, SDL)
- Pending leave applications
- Rejected leave applications

### Implementation

The attendance system leverages the existing Leave model rather than creating a separate attendance model. When an employee logs in, the system:

1. Checks if there's an approved leave for the current day
2. If no approved leave exists, marks the employee as present
3. Updates the attendance calendar with the appropriate status

## Timezone Standardization

To ensure consistent operation regardless of server location, all dates and times in the application use Indian Standard Time (IST). Key points:

1. **Global Timezone Standard**: The application uses IST (Asia/Kolkata) for all date and time operations.
2. **Date Utility**: A centralized `dateUtils` module must be used instead of direct `new Date()` calls.
3. **Scheduled Tasks**: All cron jobs and scheduled tasks convert IST time to server time automatically.
4. **Documentation**: Detailed guidelines are available in `/docs/date-time-usage.md`.

This standardization ensures that:

- All timestamps are consistent with Indian operations
- Reports show the correct times
- Scheduled tasks run at appropriate times relative to the Indian business day
- Application behavior is consistent across deployments in any region

## Candidate Locking System

The CRM implements a comprehensive candidate locking system that works as follows:

1. **Duplicate Prevention**:

   - The system prevents duplicate candidate entries based on mobile number
   - For joinings, only one active joining (status "Joining Details Received") is allowed for the same candidate, company, and process
   - New joinings can be created if previous joinings are not in "Joining Details Received" status

2. **Locking Rules**:

   - When a candidate is added with status "Lineup" or "Walkin at Infidea", they are locked for 30 days
   - When a joining record is created or updated to "Joining Details Received", the candidate is locked for 90 days
   - A candidate with an active joining cannot be edited by any employee until the lock expires

3. **Automated Lock Management**:

   - A scheduler runs every 5 minutes to check and update candidate locks
   - Candidates are automatically unlocked when their lock period expires
   - After the lock expires, candidates can be reused for new joinings

4. **Conditional Unlocking**:

   - If joining status changes from "Joining Details Received" to another status, the system checks for other active joinings
   - If no other active joinings exist, the candidate may be unlocked or reverted to a 30-day lock based on their status

5. **Reusing Candidates**:
   - After the 90-day lock expires, candidates can be reused for new joinings (same or different positions)
   - If a previous joining was unsuccessful (not "Joining Details Received"), new joinings can be created for the same position

For detailed information on the locking system, refer to the documentation in `/docs/candidate-locking-system.md`.

### Environment Variables for Locking

Add these variables to your `.env` file to customize the lock durations:

```
# Candidate Lock Configuration
LINEUP_LOCK_DAYS=30
JOINING_LOCK_DAYS=90
```
