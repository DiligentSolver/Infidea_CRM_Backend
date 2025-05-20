# Date-Time Migration Guide

This document provides a step-by-step guide for developers to migrate date and time operations throughout the codebase to the standardized `dateUtils` module, ensuring consistent timezone handling.

## Why Standardize Date-Time Operations?

- **Consistency**: All date and time operations will use Indian Standard Time (IST) regardless of the server's location
- **Reliability**: Scheduled tasks will run at the correct time relative to the Indian business day
- **Accuracy**: Reports and data exports will show the correct times
- **Maintainability**: A single point of change for all timezone-related functionality

## Migration Steps

### Step 1: Run the DateUtils Scanner Script

Run the script to identify files with direct date usage that need to be updated:

```bash
node scripts/updateDateUtils.js
```

This will output a list of files containing direct date operations (like `new Date()`) that need to be migrated.

### Step 2: Prioritize Core Files

Focus on updating these critical files first:

1. Scheduler and cron job files
2. Report generation utilities
3. Dashboard controllers
4. Authentication controllers
5. Core models with date-related logic

### Step 3: Follow Migration Patterns

Replace direct date operations with their dateUtils equivalents:

| Original Code                      | Replacement                                  |
| ---------------------------------- | -------------------------------------------- |
| `new Date()`                       | `dateUtils.getCurrentDate()`                 |
| `date.setHours(0, 0, 0, 0)`        | `dateUtils.startOfDay(date)`                 |
| `date.setHours(23, 59, 59, 999)`   | `dateUtils.endOfDay(date)`                   |
| `new Date(date)`                   | `dateUtils.convertToIST(date)`               |
| `date.setDate(date.getDate() + n)` | `dateUtils.addTime(date, n, "days")`         |
| `date.toISOString().split("T")[0]` | `dateUtils.formatDate(date, "YYYY-MM-DD")`   |
| `date1 > date2`                    | `dateUtils.compareDates(date1, date2) > 0`   |
| `date1 < date2`                    | `dateUtils.compareDates(date1, date2) < 0`   |
| `date1 === date2`                  | `dateUtils.compareDates(date1, date2) === 0` |

### Step 4: Update Imports

Add this import to each file you update:

```javascript
const dateUtils = require("../utils/dateUtils"); // Adjust path as needed
```

### Step 5: Special Cases

#### Scheduled Tasks

When setting up cron jobs, convert times to IST:

```javascript
// Schedule task at 8:00 AM IST
const scheduleTime = moment()
  .tz(dateUtils.IST_TIMEZONE)
  .set({ hour: 8, minute: 0, second: 0 })
  .local();
const cronHour = scheduleTime.hour();
const cronMinute = scheduleTime.minute();

cron.schedule(`${cronMinute} ${cronHour} * * *`, async () => {
  // Task implementation
});
```

#### Database Queries

For date range queries, ensure both dates are in IST:

```javascript
const startDate = dateUtils.startOfDay(someDate);
const endDate = dateUtils.endOfDay(someDate);

Collection.find({
  createdAt: { $gte: startDate, $lte: endDate },
});
```

### Step 6: Testing

After updating each file, test thoroughly to ensure:

1. Date operations work correctly
2. Time-based features (schedules, reports) function as expected
3. Database queries return expected results

## Already Migrated Files

The following key files have already been updated:

- `utils/dateUtils.js` - Core date utility module
- `crm.js` - Main server file with global timezone setting
- `utils/scheduledTasks.js` - Scheduled background tasks
- `utils/reportScheduler.js` - Report scheduling utilities
- `controllers/employeeAuthController.js` - Authentication with time-based checks
- `controllers/employeeDashboardController.js` - Dashboard time-based statistics
- `models/notificationModel.js` - Notification model with expiration dates
- `utils/excelOutputs.js` - Excel generation with date formatting

## Additional Resources

- See `docs/date-time-usage.md` for the complete guide on using dateUtils
- Check `utils/dateUtils.js` for the full API documentation
- Refer to the `README.md` section on "Timezone Standardization"
