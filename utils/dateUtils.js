/**
 * Date utility functions for standardized handling of dates with Indian Standard Time (IST)
 */
const moment = require("moment-timezone");

// Set default timezone to Indian Standard Time (IST)
const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Get current date and time in IST
 * @returns {Date} Current date-time in IST
 */
const getCurrentDate = () => {
  // Add debug logging to help troubleshoot timezone issues
  console.log(`Current UTC time: ${new Date().toISOString()}`);
  console.log(
    `Current IST time (moment): ${moment()
      .tz(IST_TIMEZONE)
      .format("YYYY-MM-DD HH:mm:ss")}`
  );

  return moment().tz(IST_TIMEZONE).toDate();
};

/**
 * Format a date to ISO string in IST
 * @param {Date} date - Date object to format
 * @returns {String} ISO formatted date string
 */
const formatToISOString = (date) => {
  return moment(date).tz(IST_TIMEZONE).toISOString();
};

/**
 * Format a date to a specific format in IST
 * @param {Date} date - Date object to format
 * @param {String} format - Format string (moment.js format)
 * @returns {String} Formatted date string
 */
const formatDate = (date, format = "YYYY-MM-DD") => {
  return moment(date).tz(IST_TIMEZONE).format(format);
};

/**
 * Get the start of day for a given date in IST
 * @param {Date} date - Date object
 * @returns {Date} Start of day
 */
const startOfDay = (date = getCurrentDate()) => {
  return moment(date).tz(IST_TIMEZONE).startOf("day").toDate();
};

/**
 * Get the end of day for a given date in IST
 * @param {Date} date - Date object
 * @returns {Date} End of day
 */
const endOfDay = (date = getCurrentDate()) => {
  return moment(date).tz(IST_TIMEZONE).endOf("day").toDate();
};

/**
 * Add a specified time to a date in IST
 * @param {Date} date - Base date
 * @param {Number} amount - Amount to add
 * @param {String} unit - Unit (day, month, year, hour, minute, second)
 * @returns {Date} New date with added time
 */
const addTime = (date, amount, unit) => {
  return moment(date).tz(IST_TIMEZONE).add(amount, unit).toDate();
};

/**
 * Compare if two dates are the same day in IST
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {Boolean} True if same day
 */
const isSameDay = (date1, date2) => {
  return moment(date1)
    .tz(IST_TIMEZONE)
    .isSame(moment(date2).tz(IST_TIMEZONE), "day");
};

/**
 * Get local time string in IST
 * @param {Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {String} Formatted local time string
 */
const toLocaleTimeString = (date, options = {}) => {
  return moment(date)
    .tz(IST_TIMEZONE)
    .format(options.format || "h:mm:ss A");
};

/**
 * Get local date string in IST
 * @param {Date} date - Date to format
 * @returns {String} Formatted local date string
 */
const toLocaleDateString = (date) => {
  return moment(date).tz(IST_TIMEZONE).format("MM/DD/YYYY");
};

/**
 * Convert a date from server timezone to IST
 * @param {Date} date - Date in server timezone
 * @returns {Date} Date converted to IST
 */
const convertToIST = (date) => {
  return moment(date).tz(IST_TIMEZONE).toDate();
};

/**
 * Compare two dates
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date (defaults to current date)
 * @returns {Number} -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
const compareDates = (date1, date2 = getCurrentDate()) => {
  const moment1 = moment(date1).tz(IST_TIMEZONE);
  const moment2 = moment(date2).tz(IST_TIMEZONE);

  if (moment1.isBefore(moment2)) return -1;
  if (moment1.isAfter(moment2)) return 1;
  return 0;
};

module.exports = {
  IST_TIMEZONE,
  getCurrentDate,
  formatToISOString,
  formatDate,
  startOfDay,
  endOfDay,
  addTime,
  isSameDay,
  toLocaleTimeString,
  toLocaleDateString,
  convertToIST,
  compareDates,
};
