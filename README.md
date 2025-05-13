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

## Candidate Locking System

The CRM implements a candidate locking system that works as follows:

1. When a candidate is added with a call status of "Lineup" or "Walkin at Infidea", the candidate is locked for the employee who registered them for 30 days.
2. Similarly, when a lineup or walkin is created manually, the candidate is locked for the employee for 30 days.
3. When a joining is added, the candidate is locked for the employee who created the lineup for 90 days.
4. The system checks the locking status before allowing any operations (lineup, walkin, joining).
5. No entry can be made if a candidate is locked by another employee.

Important: When a candidate is marked by an employee, they are NOT locked, regardless of their status.

### Environment Variables for Locking

Add these variables to your `.env` file to customize the lock durations:

```
# Candidate Lock Configuration
LINEUP_LOCK_DAYS=30
JOINING_LOCK_DAYS=90
```
