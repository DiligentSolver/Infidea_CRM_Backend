# Date and Time Handling in Infidea CRM Backend

This document outlines the standardized approach to handling dates and times throughout the application to ensure consistent behavior regardless of server location.

## Core Principle

All date and time operations in the application should use Indian Standard Time (IST) regardless of the server's physical location or timezone setting. This ensures that:

1. All timestamps are consistently recorded in the same timezone
2. Reports and exports show the correct time for Indian operations
3. Scheduled tasks run at the appropriate time relative to the business day in India

## Using the dateUtils Module

The `dateUtils` module provides utility functions for handling dates in a standardized way. Always use these functions instead of directly creating Date objects with `new Date()`.

### Basic Usage

```javascript
const dateUtils = require("../utils/dateUtils");

// Instead of:
const now = new Date();

// Use:
const now = dateUtils.getCurrentDate();
```

### Key Functions

| Function                            | Purpose                                | Example                                         |
| ----------------------------------- | -------------------------------------- | ----------------------------------------------- |
| `getCurrentDate()`                  | Get the current date-time in IST       | `const now = dateUtils.getCurrentDate();`       |
| `formatDate(date, format)`          | Format a date with moment.js format    | `dateUtils.formatDate(date, 'YYYY-MM-DD');`     |
| `startOfDay(date)`                  | Get the start of day (00:00:00) in IST | `const start = dateUtils.startOfDay();`         |
| `endOfDay(date)`                    | Get the end of day (23:59:59) in IST   | `const end = dateUtils.endOfDay();`             |
| `addTime(date, amount, unit)`       | Add time to a date                     | `dateUtils.addTime(date, 30, 'days');`          |
| `isSameDay(date1, date2)`           | Check if two dates are the same day    | `if (dateUtils.isSameDay(date1, date2))`        |
| `toLocaleTimeString(date, options)` | Format as locale time string           | `dateUtils.toLocaleTimeString(date);`           |
| `toLocaleDateString(date)`          | Format as locale date string           | `dateUtils.toLocaleDateString(date);`           |
| `convertToIST(date)`                | Convert from any timezone to IST       | `const istDate = dateUtils.convertToIST(date);` |
| `compareDates(date1, date2)`        | Compare two dates                      | `if (dateUtils.compareDates(date1, date2) > 0)` |

### Date Comparison

When comparing dates, always use the `compareDates` function to ensure proper timezone handling:

```javascript
// Instead of:
if (date1 > date2) {
  // ...
}

// Use:
if (dateUtils.compareDates(date1, date2) > 0) {
  // ...
}
```

### Date Formatting

For consistent date formatting, use the `formatDate` function:

```javascript
// Instead of:
const formattedDate = date.toISOString().split("T")[0];

// Use:
const formattedDate = dateUtils.formatDate(date, "YYYY-MM-DD");
```

## Scheduled Tasks

All scheduled tasks should specify times in IST. The system will automatically convert this to the server's local timezone.

Example:

```javascript
// Schedule a task at 8:00 PM IST
const serverTime = moment()
  .tz("Asia/Kolkata")
  .set({ hour: 20, minute: 0, second: 0 })
  .local();
const cronHour = serverTime.hour();
const cronMinute = serverTime.minute();

cron.schedule(`${cronMinute} ${cronHour} * * *`, async () => {
  // Task implementation
});
```

## Important Considerations

1. **Never** use `new Date()` directly in application code
2. **Always** use dateUtils for date-time operations
3. When working with external libraries or APIs, convert dates to/from IST as needed
4. When displaying dates to users, always format them according to the user's locale preferences
5. For date inputs, always validate and convert to IST before saving to the database

Following these guidelines will ensure consistent behavior across the application regardless of where the server is hosted.
