/**
 * A utility script to help identify and update direct date usage across the codebase.
 * This script helps developers locate files that need to be updated to use the dateUtils module.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Directories to scan
const dirsToSearch = ["controllers", "models", "utils", "routes", "middleware"];

// Patterns to search for
const patterns = [
  "new Date\\(\\)",
  "= new Date\\(",
  "setHours\\(0, 0, 0, 0\\)",
  "setDate\\(",
  "toISOString\\(\\)",
];

// Main function to find all files with date usage
const findFilesWithDateUsage = () => {
  console.log("Scanning files for direct date usage...\n");

  // Header for the output
  console.log("Files that need to be updated to use dateUtils:\n");

  dirsToSearch.forEach((dir) => {
    console.log(`\n==== Checking ${dir} directory ====\n`);

    patterns.forEach((pattern) => {
      try {
        const result = execSync(
          `grep -r "${pattern}" --include="*.js" ${dir}/`,
          { encoding: "utf8" }
        );
        if (result) {
          console.log(`\nPattern: ${pattern}\n${result}`);
        }
      } catch (error) {
        // No matches found (grep returns exit code 1 if no matches)
        if (error.status !== 1) {
          console.error(`Error searching in ${dir}: ${error.message}`);
        }
      }
    });
  });

  console.log("\n\nRecommended dateUtils replacements:");
  console.log("---------------------------------");
  console.log("new Date()                      →  dateUtils.getCurrentDate()");
  console.log("date.setHours(0, 0, 0, 0)       →  dateUtils.startOfDay(date)");
  console.log("date.setHours(23, 59, 59, 999)  →  dateUtils.endOfDay(date)");
  console.log(
    "new Date(date)                  →  dateUtils.convertToIST(date)"
  );
  console.log(
    'date.setDate(date.getDate() + n) → dateUtils.addTime(date, n, "days")'
  );
  console.log(
    'date.toISOString().split("T")[0] → dateUtils.formatDate(date, "YYYY-MM-DD")'
  );
  console.log(
    "date > otherDate                →  dateUtils.compareDates(date, otherDate) > 0"
  );

  console.log("\nImport statement to add:");
  console.log(
    'const dateUtils = require("../utils/dateUtils");  // Adjust path as needed'
  );
};

// Run the function
findFilesWithDateUsage();
