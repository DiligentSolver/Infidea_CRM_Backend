const ExcelJS = require("exceljs");

/**
 * Generate an Excel report for employee activities
 * @param {Object} employeeDetails - Employee details
 * @param {String} logoutTime - Logout time
 * @param {Object} activitySummary - Activity summary and details
 * @returns {Buffer} - Excel file as buffer
 */
const generateActivityExcelReport = async (
  employeeDetails,
  logoutTime,
  activitySummary
) => {
  const { name, employeeCode } = employeeDetails;
  const { totalWorkingTime, activities } = activitySummary;

  // Create a new workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Activity Report");

  // Add title
  worksheet.mergeCells("A1:E1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = `Activity Report - ${name?.en || name || "Employee"} (${
    employeeCode || "N/A"
  })`;
  titleCell.font = {
    size: 14,
    bold: true,
  };
  titleCell.alignment = { horizontal: "center" };

  // Add employee details
  worksheet.mergeCells("A3:B3");
  worksheet.getCell("A3").value = "Employee Details";
  worksheet.getCell("A3").font = { bold: true };

  worksheet.getCell("A4").value = "Name:";
  worksheet.getCell("B4").value = name?.en || name || "N/A";

  worksheet.getCell("A5").value = "Employee ID:";
  worksheet.getCell("B5").value = employeeCode || "N/A";

  worksheet.getCell("A6").value = "Logout Time:";
  worksheet.getCell("B6").value = logoutTime || "N/A";

  worksheet.getCell("A7").value = "Total Working Time:";
  worksheet.getCell("B7").value = totalWorkingTime || "0 hours";

  // Add activity table header
  worksheet.getCell("A9").value = "Activity Type";
  worksheet.getCell("B9").value = "Start Time";
  worksheet.getCell("C9").value = "End Time";
  worksheet.getCell("D9").value = "Duration";

  // Style the header row
  ["A9", "B9", "C9", "D9"].forEach((cell) => {
    worksheet.getCell(cell).font = { bold: true };
    worksheet.getCell(cell).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
    worksheet.getCell(cell).border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Add activity data
  let rowIndex = 10;
  if (activities && activities.length > 0) {
    activities.forEach((activity) => {
      worksheet.getCell(`A${rowIndex}`).value = activity.type;
      worksheet.getCell(`B${rowIndex}`).value = new Date(activity.startTime);
      worksheet.getCell(`C${rowIndex}`).value = activity.endTime
        ? new Date(activity.endTime)
        : "N/A";
      worksheet.getCell(`D${rowIndex}`).value = activity.duration || "N/A";

      // Apply cell borders
      ["A", "B", "C", "D"].forEach((col) => {
        worksheet.getCell(`${col}${rowIndex}`).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      rowIndex++;
    });
  } else {
    worksheet.mergeCells(`A${rowIndex}:D${rowIndex}`);
    worksheet.getCell(`A${rowIndex}`).value = "No activities recorded";
    worksheet.getCell(`A${rowIndex}`).alignment = { horizontal: "center" };
  }

  // Set column widths
  worksheet.getColumn("A").width = 20;
  worksheet.getColumn("B").width = 22;
  worksheet.getColumn("C").width = 22;
  worksheet.getColumn("D").width = 15;

  // Format date columns
  worksheet.getColumn("B").numFmt = "yyyy-mm-dd hh:mm:ss";
  worksheet.getColumn("C").numFmt = "yyyy-mm-dd hh:mm:ss";

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = {
  generateActivityExcelReport,
};
