const ExcelJS = require("exceljs");

/**
 * Generate an Excel report for employee activities
 * @param {Object} employeeDetails - Employee details
 * @param {String} logoutTime - Logout time
 * @param {Object} activitySummary - Activity summary and details
 * @param {Object} candidateWork - Candidate work summary and details
 * @returns {Buffer} - Excel file as buffer
 */
const generateActivityExcelReport = async (
  employeeDetails,
  logoutTime,
  activitySummary,
  candidateWork
) => {
  const { name, employeeCode } = employeeDetails;
  const { totalWorkingTime, activities } = activitySummary;

  // Create a new workbook and worksheet
  const workbook = new ExcelJS.Workbook();

  // Add Summary worksheet
  const summarySheet = workbook.addWorksheet("Summary");

  // Add title
  summarySheet.mergeCells("A1:E1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = `Activity Report - ${name?.en || name || "Employee"} (${
    employeeCode || "N/A"
  })`;
  titleCell.font = {
    size: 14,
    bold: true,
  };
  titleCell.alignment = { horizontal: "center" };

  // Add employee details
  summarySheet.mergeCells("A3:B3");
  summarySheet.getCell("A3").value = "Employee Details";
  summarySheet.getCell("A3").font = { bold: true };

  summarySheet.getCell("A4").value = "Name:";
  summarySheet.getCell("B4").value = name?.en || name || "N/A";

  summarySheet.getCell("A5").value = "Employee ID:";
  summarySheet.getCell("B5").value = employeeCode || "N/A";

  summarySheet.getCell("A6").value = "Logout Time:";
  summarySheet.getCell("B6").value = logoutTime || "N/A";

  summarySheet.getCell("A7").value = "Total Working Time:";
  summarySheet.getCell("B7").value = totalWorkingTime || "0 hours";

  // Add Work Summary
  summarySheet.mergeCells("A9:B9");
  summarySheet.getCell("A9").value = "Today's Work Summary";
  summarySheet.getCell("A9").font = { bold: true };

  summarySheet.getCell("A10").value = "Total Lineups:";
  summarySheet.getCell("B10").value = candidateWork?.totalLineups || 0;

  summarySheet.getCell("A11").value = "Total Candidates:";
  summarySheet.getCell("B11").value = candidateWork?.totalCandidates || 0;

  summarySheet.getCell("A12").value = "Total Joinings:";
  summarySheet.getCell("B12").value = candidateWork?.totalJoinings || 0;

  // Add Call Stats if available
  if (candidateWork?.callStats) {
    summarySheet.mergeCells("A14:B14");
    summarySheet.getCell("A14").value = "Call Statistics";
    summarySheet.getCell("A14").font = { bold: true };

    summarySheet.getCell("A15").value = "Total Calls:";
    summarySheet.getCell("B15").value = candidateWork.callStats.totalCalls;

    summarySheet.getCell("A16").value = "Total Call Duration:";
    summarySheet.getCell("B16").value = candidateWork.callStats.totalDuration;

    summarySheet.getCell("A17").value = "Average Call Duration:";
    summarySheet.getCell("B17").value = candidateWork.callStats.averageDuration;
  }

  // Set column widths for summary
  summarySheet.getColumn("A").width = 22;
  summarySheet.getColumn("B").width = 30;

  // Add Activities worksheet
  const activitySheet = workbook.addWorksheet("Activities");

  // Add activity table header
  activitySheet.getCell("A1").value = "Activity Type";
  activitySheet.getCell("B1").value = "Start Time";
  activitySheet.getCell("C1").value = "End Time";
  activitySheet.getCell("D1").value = "Duration";

  // Style the header row
  ["A1", "B1", "C1", "D1"].forEach((cell) => {
    activitySheet.getCell(cell).font = { bold: true };
    activitySheet.getCell(cell).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
    activitySheet.getCell(cell).border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Add activity data
  let rowIndex = 2;
  if (activities && activities.length > 0) {
    activities.forEach((activity) => {
      activitySheet.getCell(`A${rowIndex}`).value = activity.type;
      activitySheet.getCell(`B${rowIndex}`).value = new Date(
        activity.startTime
      );
      activitySheet.getCell(`C${rowIndex}`).value = activity.endTime
        ? new Date(activity.endTime)
        : "N/A";
      activitySheet.getCell(`D${rowIndex}`).value = activity.duration || "N/A";

      // Apply cell borders
      ["A", "B", "C", "D"].forEach((col) => {
        activitySheet.getCell(`${col}${rowIndex}`).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      rowIndex++;
    });
  } else {
    activitySheet.mergeCells(`A${rowIndex}:D${rowIndex}`);
    activitySheet.getCell(`A${rowIndex}`).value = "No activities recorded";
    activitySheet.getCell(`A${rowIndex}`).alignment = { horizontal: "center" };
  }

  // Set column widths
  activitySheet.getColumn("A").width = 20;
  activitySheet.getColumn("B").width = 22;
  activitySheet.getColumn("C").width = 22;
  activitySheet.getColumn("D").width = 15;

  // Format date columns
  activitySheet.getColumn("B").numFmt = "yyyy-mm-dd hh:mm:ss";
  activitySheet.getColumn("C").numFmt = "yyyy-mm-dd hh:mm:ss";

  // Add Lineups worksheet if there are any lineups
  if (candidateWork?.lineups && candidateWork.lineups.length > 0) {
    const lineupSheet = workbook.addWorksheet("Lineups");

    // Add header
    lineupSheet.getCell("A1").value = "Candidate Name";
    lineupSheet.getCell("B1").value = "Contact";
    lineupSheet.getCell("C1").value = "Company";
    lineupSheet.getCell("D1").value = "Process";
    lineupSheet.getCell("E1").value = "Lineup Date";
    lineupSheet.getCell("F1").value = "Interview Date";
    lineupSheet.getCell("G1").value = "Status";

    // Style the header row
    ["A1", "B1", "C1", "D1", "E1", "F1", "G1"].forEach((cell) => {
      lineupSheet.getCell(cell).font = { bold: true };
      lineupSheet.getCell(cell).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
      lineupSheet.getCell(cell).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Add lineup data
    rowIndex = 2;
    candidateWork.lineups.forEach((lineup) => {
      lineupSheet.getCell(`A${rowIndex}`).value = lineup.name;
      lineupSheet.getCell(`B${rowIndex}`).value = lineup.contact;
      lineupSheet.getCell(`C${rowIndex}`).value = lineup.company;
      lineupSheet.getCell(`D${rowIndex}`).value = lineup.process;
      lineupSheet.getCell(`E${rowIndex}`).value = lineup.lineupDate;
      lineupSheet.getCell(`F${rowIndex}`).value = lineup.interviewDate;
      lineupSheet.getCell(`G${rowIndex}`).value = lineup.status;

      // Apply cell borders
      ["A", "B", "C", "D", "E", "F", "G"].forEach((col) => {
        lineupSheet.getCell(`${col}${rowIndex}`).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      rowIndex++;
    });

    // Set column widths
    lineupSheet.getColumn("A").width = 25;
    lineupSheet.getColumn("B").width = 15;
    lineupSheet.getColumn("C").width = 25;
    lineupSheet.getColumn("D").width = 20;
    lineupSheet.getColumn("E").width = 15;
    lineupSheet.getColumn("F").width = 15;
    lineupSheet.getColumn("G").width = 15;
  }

  // Add Joinings worksheet if there are any joinings
  if (candidateWork?.joinings && candidateWork.joinings.length > 0) {
    const joiningSheet = workbook.addWorksheet("Joinings");

    // Add header
    joiningSheet.getCell("A1").value = "Candidate Name";
    joiningSheet.getCell("B1").value = "Contact";
    joiningSheet.getCell("C1").value = "Company";
    joiningSheet.getCell("D1").value = "Process";
    joiningSheet.getCell("E1").value = "Joining Date";
    joiningSheet.getCell("F1").value = "Salary";
    joiningSheet.getCell("G1").value = "Type";
    joiningSheet.getCell("H1").value = "Status";

    // Style the header row
    ["A1", "B1", "C1", "D1", "E1", "F1", "G1", "H1"].forEach((cell) => {
      joiningSheet.getCell(cell).font = { bold: true };
      joiningSheet.getCell(cell).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
      joiningSheet.getCell(cell).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Add joining data
    rowIndex = 2;
    candidateWork.joinings.forEach((joining) => {
      joiningSheet.getCell(`A${rowIndex}`).value = joining.name;
      joiningSheet.getCell(`B${rowIndex}`).value = joining.contact;
      joiningSheet.getCell(`C${rowIndex}`).value = joining.company;
      joiningSheet.getCell(`D${rowIndex}`).value = joining.process;
      joiningSheet.getCell(`E${rowIndex}`).value = joining.joiningDate;
      joiningSheet.getCell(`F${rowIndex}`).value = joining.salary || "N/A";
      joiningSheet.getCell(`G${rowIndex}`).value = joining.joiningType;
      joiningSheet.getCell(`H${rowIndex}`).value = joining.status;

      // Apply cell borders
      ["A", "B", "C", "D", "E", "F", "G", "H"].forEach((col) => {
        joiningSheet.getCell(`${col}${rowIndex}`).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      rowIndex++;
    });

    // Set column widths
    joiningSheet.getColumn("A").width = 25;
    joiningSheet.getColumn("B").width = 15;
    joiningSheet.getColumn("C").width = 25;
    joiningSheet.getColumn("D").width = 20;
    joiningSheet.getColumn("E").width = 15;
    joiningSheet.getColumn("F").width = 15;
    joiningSheet.getColumn("G").width = 15;
    joiningSheet.getColumn("H").width = 20;
  }

  // Add Candidates worksheet for each status
  if (candidateWork?.candidates && candidateWork.candidates.length > 0) {
    candidateWork.candidates.forEach((statusGroup, index) => {
      // Create a valid worksheet name (max 31 chars, no special chars)
      const sheetName = `Candidates - ${statusGroup.status}`
        .substring(0, 31)
        .replace(/[\\\/\[\]\*\?:]/g, "_");
      const candidateSheet = workbook.addWorksheet(sheetName);

      // Add header
      candidateSheet.getCell("A1").value = "Name";
      candidateSheet.getCell("B1").value = "Mobile";
      candidateSheet.getCell("C1").value = "Source";
      candidateSheet.getCell("D1").value = "Qualification";
      candidateSheet.getCell("E1").value = "Experience";

      // Style the header row
      ["A1", "B1", "C1", "D1", "E1"].forEach((cell) => {
        candidateSheet.getCell(cell).font = { bold: true };
        candidateSheet.getCell(cell).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };
        candidateSheet.getCell(cell).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Add candidate data
      rowIndex = 2;
      statusGroup.details.forEach((candidate) => {
        candidateSheet.getCell(`A${rowIndex}`).value = candidate.name;
        candidateSheet.getCell(`B${rowIndex}`).value = candidate.mobile;
        candidateSheet.getCell(`C${rowIndex}`).value = candidate.source;
        candidateSheet.getCell(`D${rowIndex}`).value = candidate.qualification;
        candidateSheet.getCell(`E${rowIndex}`).value = candidate.experience;

        // Apply cell borders
        ["A", "B", "C", "D", "E"].forEach((col) => {
          candidateSheet.getCell(`${col}${rowIndex}`).border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });

        rowIndex++;
      });

      // Set column widths
      candidateSheet.getColumn("A").width = 25;
      candidateSheet.getColumn("B").width = 15;
      candidateSheet.getColumn("C").width = 15;
      candidateSheet.getColumn("D").width = 20;
      candidateSheet.getColumn("E").width = 15;
    });
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = {
  generateActivityExcelReport,
};
