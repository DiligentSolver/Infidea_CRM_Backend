# Candidate Locking System Documentation

## Overview

The candidate locking system prevents duplicate entries and restricts editing of candidate records based on their status in the recruitment process. It ensures that candidates are appropriately locked when they reach certain stages and unlocked when lock periods expire.

## Lock Types and Durations

There are two primary lock durations in the system:

1. **Lineup/Walkin Lock (30 days)**

   - Applied when a candidate's status is set to "Lineup" or "Walkin at Infidea"
   - Default duration: 30 days (configurable via LINEUP_LOCK_DAYS environment variable)
   - Purpose: Prevents other employees from modifying candidates who are in active recruitment process

2. **Joining Lock (90 days)**
   - Applied when a candidate has a joining record with status "Joining Details Received"
   - Default duration: 90 days (configurable via JOINING_LOCK_DAYS environment variable)
   - Purpose: Locks candidate records during the critical joining period to prevent modifications and to ensure proper incentive tracking

## Dependency Hierarchy

The system follows a hierarchical approach to locking:

1. **Joinings are at the top of the hierarchy**

   - Active joinings (status "Joining Details Received") lock the associated candidate, lineup, and walkin records
   - Lineup and walkin records that are part of an active joining cannot be edited or deleted
   - The candidate is locked for 90 days when they have an active joining

2. **Lineup and Walkin records are dependent on Joinings**
   - Lineup and walkin records themselves no longer directly lock candidates
   - Their editability is determined by whether they're part of an active joining
   - If a candidate has an active joining, their associated lineup and walkin records become read-only

## Locking Mechanisms

### When Are Candidates Locked?

Candidates are automatically locked under the following conditions:

1. **Creating a new candidate with Lineup/Walkin status**

   - When a new candidate is created with call status "Lineup" or "Walkin at Infidea"
   - The candidate is locked for 30 days to the creating employee

2. **Updating a candidate to Lineup/Walkin status**

   - When an existing candidate's status is changed to "Lineup" or "Walkin at Infidea"
   - The candidate is locked for 30 days to the updating employee

3. **Creating a joining record**

   - When a joining is created for a candidate
   - The candidate is locked for 90 days to the employee who created the original lineup

4. **Updating joining status to "Joining Details Received"**
   - When a joining's status is updated to "Joining Details Received"
   - The candidate is locked for 90 days

### Preventing Duplicate Entries

The system enforces unique mobile numbers for candidates:

- When creating a new candidate, the system checks if the mobile number already exists
- If a match is found, the creation is rejected with an appropriate error message

For joining records, the system has the following rules:

- **Active joinings (with "Joining Details Received" status)**: Only one active joining is allowed for the same candidate, company, and process
- **Inactive joinings**: If a previous joining has a status other than "Joining Details Received" (e.g., "Pending" or "Joining Details Not Received"), you can create a new joining for the same candidate, company, and process
- The system will notify you if a previous joining exists but allows you to proceed if it's not active

### Lineup and Walkin Editability

Lineup and walkin records follow these rules:

- A lineup or walkin record can be created only if the candidate isn't part of an active joining
- Existing lineup and walkin records can be edited only if they're not associated with an active joining
- When fetching lineup or walkin details, the system adds an `editable` property indicating whether the record can be modified
- If a record cannot be edited due to an active joining, the API returns a clear error message

### Candidate Editability

Candidate records follow these rules:

- Candidates can be freely edited unless they're part of an active joining
- When fetching candidate details (single or list), the system adds an `editable` property indicating whether the record can be modified
- The `editable` property is set to `false` if the candidate has an active joining
- Candidates with active joinings cannot be deleted
- If a candidate cannot be edited or deleted due to an active joining, the API returns a clear error message

## Unlocking Mechanisms

Candidates are automatically unlocked under the following conditions:

1. **Lock Expiry**

   - When the lock duration (30 or 90 days) expires, the candidate is automatically unlocked
   - This is checked by a scheduler that runs every 5 minutes
   - After the lock expires, new joinings can be created for the same candidate, even with the same company and process

2. **Status Change**
   - When a joining record changes from "Joining Details Received" to another status
   - However, if the candidate is still in "Lineup" or "Walkin" status, they remain locked for 30 days
   - If there are multiple joining records with "Joining Details Received" status, the candidate remains locked

## Reusing Candidates After Lock Period

The system is designed to allow reusing candidates after their lock period expires:

1. **After 90 Days**: When the 90-day joining lock expires, the candidate is automatically unlocked by the scheduler
2. **For Different Positions**: You can create new joinings for different companies or processes even if another joining exists
3. **For Unsuccessful Joinings**: If a previous joining did not result in "Joining Details Received" status, you can create a new joining even for the same company and position
4. **Years Later**: The system allows re-joining of candidates years later after their lock expires, or for different positions at any time

## Scheduled Tasks

The system includes a comprehensive scheduler that runs at different intervals:

1. **5-Minute Scheduler**

   - Runs every 5 minutes to check all candidates' lock status
   - Performs the following tasks:
     - Updates locks for candidates with active joining records (90-day lock)
     - Updates locks for candidates with Walkin or Lineup status (30-day lock)
     - Removes expired locks

2. **Daily Scheduler**
   - Runs at midnight every day
   - Performs a thorough check of all candidate locks and unlocks expired ones

## Implementation Details

The locking system is implemented in the following files:

- `utils/candidateLockManager.js` - Core utilities for managing locks
- `utils/scheduler.js` - Scheduler implementation for periodic checks
- `controllers/candidateController.js` - Candidate creation and updates with lock checks
- `controllers/joiningController.js` - Joining creation and updates with lock enforcement
- `controllers/lineupController.js` - Lineup creation with joining dependency check
- `controllers/walkinController.js` - Walkin creation with joining dependency check

## Configuration

Lock durations can be configured via environment variables:

```
LINEUP_LOCK_DAYS=30  # Default is 30 days for lineup/walkin
JOINING_LOCK_DAYS=90 # Default is 90 days for joining
```

## API Responses

When a user attempts to modify a locked candidate, they will receive an appropriate error message:

1. For general locks:

   ```json
   {
     "status": "fail",
     "message": "Candidate is locked by another employee",
     "lockExpiryDate": "2023-12-31T00:00:00.000Z"
   }
   ```

2. For joining locks:

   ```json
   {
     "status": "fail",
     "message": "This candidate is locked due to an active joining record",
     "lockType": "joining",
     "lockExpiryDays": 90,
     "lockExpiryDate": "2023-12-31T00:00:00.000Z"
   }
   ```

3. For duplicate active joinings:

   ```json
   {
     "status": "fail",
     "message": "An active joining record already exists for this candidate with the same company and process",
     "joiningId": "60a2e4567b2dfd001f3a6c47"
   }
   ```

4. For lineup/walkin edit restrictions:
   ```json
   {
     "success": false,
     "message": "This lineup cannot be edited as it's part of an active joining",
     "hasActiveJoining": true
   }
   ```

## Troubleshooting

If candidate locks aren't behaving as expected:

1. Check if the 5-minute scheduler is running properly in the logs
2. Verify the environment variables are set correctly for lock durations
3. Manually check candidate records to ensure the `isLocked` and `registrationLockExpiry` fields are properly set
