const ExcelJS = require("exceljs");
const User = require("../models/userModel");
const Job = require("../models/jobModel");
const dateUtils = require("./dateUtils");

const downloadUsersExcel = async (req, res) => {
  try {
    // Get query params for specific columns (if provided)
    let { columns, jobseekerIds } = req.query;

    let users;

    if (jobseekerIds) {
      // Fetch all users
      users = await User.find({
        _id: { $in: jobseekerIds },
      }).sort({ createdAt: -1 });
    } else {
      users = await User.find().sort({ createdAt: -1 });
    }

    if (users.length === 0) {
      return res.status(404).json({ error: "No users found" });
    }

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Users Data");

    // Define default columns (Full Data Export)
    const allColumns = [
      { header: "Candidate ID", key: "userId", width: 10 },
      { header: "Created On", key: "createdAt", width: 25 },
      { header: "Full Name", key: "fullName", width: 20 },
      { header: "Father Name", key: "fatherName", width: 20 },
      { header: "Mobile Number", key: "mobile", width: 20 },
      { header: "Whatsapp Number", key: "whatsappNo", width: 20 },
      { header: "Alternate Mobile", key: "alternateMobile", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "DOB", key: "dob", width: 20 },
      { header: "Age", key: "age", width: 15 },
      { header: "Gender", key: "gender", width: 15 },
      { header: "Marital Status", key: "maritalStatus", width: 15 },
      { header: "Experience", key: "experiencelevel", width: 15 },
      {
        header: "Highest Qualification",
        key: "highestQualification",
        width: 20,
      },
      { header: "Pursuing", key: "pursuing", width: 20 },
      { header: "Graduate Degree", key: "graduateDegree", width: 20 },
      {
        header: "Graduate Passing Year",
        key: "graduatePassingYear",
        width: 20,
      },
      { header: "PG Degree", key: "postGraduateDegree", width: 20 },
      {
        header: "PG Passing Year",
        key: "postGraduatePassingYear",
        width: 20,
      },
      { header: "State", key: "state", width: 20 },
      { header: "City", key: "currentCity", width: 20 },
      { header: "Locality", key: "currentLocality", width: 20 },
      { header: "Current Address", key: "currentAddress", width: 30 },
      { header: "Preferred Cities", key: "preferredCities", width: 30 },
      { header: "Total Experience (Years)", key: "totalExperience", width: 20 },
      { header: "Experience (Months)", key: "experienceInMonths", width: 20 },
      { header: "Current Company", key: "currentCompany", width: 20 },
      { header: "Current Profile", key: "currentProfile", width: 20 },
      { header: "Current Salary", key: "currentSalary", width: 20 },
      { header: "Expected Salary", key: "expectedSalary", width: 20 },
      { header: "Notice Period", key: "noticePeriod", width: 20 },
      { header: "Job Preference", key: "jobPreference", width: 20 },
      { header: "Job Type", key: "jobType", width: 20 },
      { header: "Work Mode", key: "workMode", width: 20 },
      { header: "Work Shift", key: "workShift", width: 20 },
      { header: "Willing To Relocate", key: "willingToRelocate", width: 20 },
      { header: "Skills", key: "skills", width: 30 },
      { header: "Languages Known", key: "languagesKnown", width: 30 },
      { header: "Hobbies", key: "hobbies", width: 30 },
      { header: "LinkedIn ID", key: "linkedInId", width: 30 },
      { header: "About", key: "about", width: 40 },
      { header: "Portfolio URL", key: "portfolio", width: 30 },
      { header: "Resume URL", key: "resume", width: 30 },
      { header: "Profile Image", key: "profileImage", width: 30 },
      { header: "Is Verified", key: "isVerified", width: 15 },
      { header: "Is Email Verified", key: "isEmailVerified", width: 15 },
      { header: "Is New User", key: "isNewUser", width: 15 },
    ];

    // Determine which columns to include
    let selectedColumns = allColumns;
    let selectedColumnKeys = selectedColumns.map((col) => col.key);

    if (columns) {
      const requestedColumns = columns.split(",").map((col) => col.trim());
      selectedColumns = allColumns.filter((col) =>
        requestedColumns.includes(col.key)
      );
      selectedColumnKeys = selectedColumns.map((col) => col.key);
    }

    // Set the worksheet columns
    worksheet.columns = selectedColumns;

    // Apply **center alignment** to all columns
    worksheet.columns.forEach((column) => {
      column.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Add user data to the worksheet
    users.forEach((user) => {
      // Ensure user.education exists and has at least one entry
      const education =
        Array.isArray(user.education) && user.education.length > 0
          ? user.education[0]
          : {};

      // Ensure user.experience exists and has at least one entry
      const experienceDetails =
        Array.isArray(user.experienceDetails) &&
        user.experienceDetails.length > 0
          ? user.experienceDetails
          : [];

      // Get the latest company details
      const getLatestCompanyDetails = (experiences) => {
        if (!experiences || experiences.length === 0) return {};

        return experiences.reduce((latest, current) => {
          const currentDate =
            current.endDate === "present"
              ? dateUtils.getCurrentDate()
              : dateUtils.convertToIST(new Date(current.endDate));

          const latestDate =
            latest.endDate === "present"
              ? dateUtils.getCurrentDate()
              : dateUtils.convertToIST(new Date(latest.endDate));

          return dateUtils.compareDates(currentDate, latestDate) > 0
            ? current
            : latest;
        }, experiences[0]);
      };

      const latestCompany = getLatestCompanyDetails(experienceDetails);

      // Create a complete data object with all possible fields
      const completeData = {
        userId: user.uniqueId,
        createdAt: user.createdAt ? user.createdAt : "",
        fullName:
          user.firstName && user.firstName !== "undefined"
            ? `${user.firstName} ${user.lastName}`
            : "",
        fatherName: user.fatherName || "",
        mobile: user.mobile ? user.mobile.replace(/^(\+91)/, "") : "",
        whatsappNo: user.whatsappNo
          ? user.whatsappNo.replace(/^(\+91)/, "")
          : "",
        alternateMobile: user.alternateMobile || "",
        email: user.email || "",
        dob: user.dob
          ? dateUtils.formatDate(new Date(user.dob), "DD-MMM-YYYY")
          : "",
        age: user.age || "",
        gender: user.gender || "",
        maritalStatus: user.maritalStatus || "",
        experiencelevel: user.experience || "",
        highestQualification: education.educationLevel || "",
        pursuing: education.isCurrentlyStudying || "",
        graduateDegree: education.graduateDegree || "",
        graduatePassingYear: education.passingYear || "",
        postGraduateDegree: education.postgraduateDegree || "",
        postGraduatePassingYear: education.postgraduatePassingYear || "",
        state: user.state || "",
        currentCity: user.currentCity || "",
        currentLocality: user.currentLocality || "",
        currentAddress: user.currentAddress || "",
        preferredCities: user.preferredCities
          ? user.preferredCities.join(", ")
          : "",
        totalExperience:
          user.experienceInYears +
          (user.experienceInMonths ? user.experienceInMonths : ""),
        currentCompany: latestCompany.companyName || "",
        currentProfile: latestCompany.role || "",
        currentSalary: latestCompany.salary || "",
        expectedSalary: user.expectedSalary || "",
        noticePeriod: user.noticePeriod || "",
        jobPreference: user.preferredRoles
          ? user.preferredRoles.join(", ")
          : "",
        jobType: user.jobType || "",
        workMode: user.workMode ? user.workMode.join(", ") : "",
        workShift: user.workShift ? user.workShift.join(", ") : "",
        willingToRelocate: user.willingToRelocate || "",
        skills: user.skills ? user.skills.join(", ") : "",
        languagesKnown: user.languagesKnown
          ? user.languagesKnown.join(", ")
          : "",
        hobbies: user.hobbies ? user.hobbies.join(", ") : "",
        linkedInId: user.linkedInId || "",
        about: user.about || "",
        portfolio: user.portfolio || "",
        resume: user.resume || "",
        profileImage: user.profileImage || "",
        isVerified: user.isVerified ? "Yes" : "No",
        isEmailVerified: user.isEmailVerified ? "Yes" : "No",
        isNewUser: user.isNewUser ? "Yes" : "No",
      };

      // Filter the data to only include selected columns
      const filteredData = {};
      selectedColumnKeys.forEach((key) => {
        filteredData[key] = completeData[key];
      });

      // Add the filtered data to the worksheet
      worksheet.addRow(filteredData);
    });

    // Set response headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Jobseekers_Data_${dateUtils.formatDate(
        dateUtils.getCurrentDate(),
        "YYYY-MM-DD"
      )}.xlsx`
    );

    // Stream the Excel file as a response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).json({ error: "Error generating Excel file" });
  }
};

const downloadApplicantsExcel = async (req, res) => {
  try {
    // Get query params for specific columns (if provided) and jobId
    let { columns, jobId } = req.query;

    // Validate jobId
    if (!jobId || jobId === "undefined") {
      return res.status(400).json({ error: "Valid Job ID is required" });
    }

    const job = await Job.findById(jobId).sort({ createdAt: -1 });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Check if the user is an employer and if they own this job
    if (
      req.user &&
      req.user.userRole === "employer" &&
      job.employerId.toString() !== req.user.id
    ) {
      return res
        .status(403)
        .json({ error: "You are not authorized to access this job's data" });
    }

    // Fetch the applicants separately using the IDs stored in the job
    const applicants = await User.find({
      _id: { $in: job.applicants.map((applicant) => applicant.userId) },
    }).sort({ createdAt: -1 });

    if (!applicants || applicants.length === 0) {
      return res
        .status(404)
        .json({ error: "No applicants found for this job" });
    }

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Job Applicants Data");

    // Define job-related columns
    const jobColumns = [
      { header: "Job ID", key: "jobId", width: 15 },
      { header: "Posted On", key: "jobPostedOn", width: 25 },
      { header: "Applied On", key: "jobAppliedOn", width: 25 },
      { header: "Job Title", key: "jobTitle", width: 25 },
      { header: "Company Name", key: "companyName", width: 25 },
      { header: "Location", key: "jobLocation", width: 20 },
      { header: "Locality", key: "jobLocality", width: 20 },
      { header: "Salary", key: "jobSalary", width: 15 },
      { header: "Experience Level", key: "jobExperience", width: 20 },
      { header: "Experience Required", key: "jobExperienceRange", width: 20 },
      { header: "Qualification", key: "jobQualification", width: 25 },
      { header: "Specific Degree", key: "jobSpecificDegree", width: 20 },
      { header: "Joining", key: "jobJoining", width: 20 },
      { header: "Interview", key: "jobInterview", width: 20 },
    ];

    // Define applicant-related columns
    const applicantColumns = [
      { header: "Candidate ID", key: "userId", width: 10 },
      { header: "Full Name", key: "fullName", width: 20 },
      { header: "Father Name", key: "fatherName", width: 20 },
      { header: "Mobile Number", key: "mobile", width: 20 },
      { header: "Whatsapp Number", key: "whatsappNo", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "DOB", key: "dob", width: 20 },
      { header: "Age", key: "age", width: 15 },
      { header: "Gender", key: "gender", width: 15 },
      { header: "Experience", key: "experiencelevel", width: 15 },
      {
        header: "Highest Qualification",
        key: "highestQualification",
        width: 20,
      },
      { header: "Pursuing", key: "pursuing", width: 20 },
      { header: "Graduate Degree", key: "graduateDegree", width: 20 },
      {
        header: "Graduate Passing Year",
        key: "graduatePassingYear",
        width: 20,
      },
      { header: "PG Degree", key: "postGraduateDegree", width: 20 },
      {
        header: "PG Passing Year",
        key: "postGraduatePassingYear",
        width: 20,
      },
      { header: "State", key: "state", width: 20 },
      { header: "City", key: "currentCity", width: 20 },
      { header: "Locality", key: "currentLocality", width: 20 },
      { header: "Preferred Cities", key: "preferredCities", width: 30 },
      { header: "Total Experience", key: "totalExperience", width: 20 },
      { header: "Current Company", key: "currentCompany", width: 20 },
      { header: "Current Profile", key: "currentProfile", width: 20 },
      { header: "Current Salary", key: "currentSalary", width: 20 },
      { header: "Expected Salary", key: "expectedSalary", width: 20 },
      { header: "Notice Period", key: "noticePeriod", width: 20 },
      { header: "Job Preference", key: "jobPreference", width: 20 },
      { header: "Languages Known", key: "languagesKnown", width: 30 },
    ];

    // Combine job and applicant columns
    const allColumns = [...jobColumns, ...applicantColumns];

    // Determine which columns to include
    let selectedColumns = allColumns;
    let selectedColumnKeys = selectedColumns.map((col) => col.key);

    if (columns) {
      const requestedColumns = columns.split(",").map((col) => col.trim());
      selectedColumns = allColumns.filter((col) =>
        requestedColumns.includes(col.key)
      );
      selectedColumnKeys = selectedColumns.map((col) => col.key);
    }

    // Set the worksheet columns
    worksheet.columns = selectedColumns;

    // Apply center alignment to all columns
    worksheet.columns.forEach((column) => {
      column.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Format date with month name
    const formatDateWithMonthName = (dateStr) => {
      if (!dateStr) return "";
      try {
        const date = dateUtils.convertToIST(new Date(dateStr));
        if (isNaN(date.getTime())) return "";

        const months = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];

        const day = date.getDate().toString().padStart(2, "0");
        const month = months[date.getMonth()];
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
      } catch (error) {
        return "";
      }
    };

    // Get the latest company details
    const getLatestCompanyDetails = (experiences) => {
      if (!experiences || experiences.length === 0) return {};

      return experiences.reduce((latest, current) => {
        const currentDate =
          current.endDate === "present"
            ? dateUtils.getCurrentDate()
            : dateUtils.convertToIST(new Date(current.endDate));

        const latestDate =
          latest.endDate === "present"
            ? dateUtils.getCurrentDate()
            : dateUtils.convertToIST(new Date(latest.endDate));

        return dateUtils.compareDates(currentDate, latestDate) > 0
          ? current
          : latest;
      }, experiences[0]);
    };

    // Prepare job data
    const jobData = {
      jobId: job.jobUniqueId || "",
      jobTitle: job.title || "",
      companyName: job.companyName || "",
      jobLocation: job.location || "",
      jobSalary: job.salary || "",
      jobExperience: job.experience || "",
      jobLocality: job.locality || "",
      jobExperienceRange: job.experienceRange || "",
      jobQualification: job.qualification || "",
      jobJoining: job.joining || "",
      jobInterview: job.interview || "",
      jobSpecificDegree: job.specificDegree || "",
      jobPostedOn: job.createdAt ? formatDateWithMonthName(job.createdAt) : "",
    };

    // Add applicant data to the worksheet
    applicants.forEach((user) => {
      // Find the applicant's data in job.applicants
      const applicationInfo = job.applicants.find(
        (applicant) => applicant.userId.toString() === user._id.toString()
      );

      // Get applied date for this specific applicant
      const jobAppliedOn = applicationInfo
        ? formatDateWithMonthName(applicationInfo.appliedAt)
        : "";

      // Ensure user.education exists and has at least one entry
      const education =
        Array.isArray(user.education) && user.education.length > 0
          ? user.education[0]
          : {};

      // Ensure user.experience exists and has at least one entry
      const experienceDetails =
        Array.isArray(user.experienceDetails) &&
        user.experienceDetails.length > 0
          ? user.experienceDetails
          : [];

      const latestCompany = getLatestCompanyDetails(experienceDetails);

      // Create a complete data object with all possible fields
      const applicantData = {
        jobAppliedOn: jobAppliedOn,
        userId: user.uniqueId,
        fullName:
          user.firstName && user.firstName !== "undefined"
            ? `${user.firstName} ${user.lastName}`
            : "",
        fatherName: user.fatherName || "",
        mobile: user.mobile ? user.mobile.replace(/^(\+91)/, "") : "",
        whatsappNo: user.whatsappNo
          ? user.whatsappNo.replace(/^(\+91)/, "")
          : "",
        email: user.email || "",
        dob: user.dob
          ? dateUtils.formatDate(new Date(user.dob), "DD-MMM-YYYY")
          : "",
        age: user.age || "",
        gender: user.gender || "",
        experiencelevel: user.experience || "",
        highestQualification: education.educationLevel || "",
        pursuing: education.isCurrentlyStudying || "",
        graduateDegree: education.graduateDegree || "",
        graduatePassingYear: education.passingYear || "",
        postGraduateDegree: education.postgraduateDegree || "",
        postGraduatePassingYear: education.postgraduatePassingYear || "",
        state: user.state || "",
        currentCity: user.currentCity || "",
        currentLocality: user.currentLocality || "",
        preferredCities: user.preferredCities
          ? user.preferredCities.join(", ")
          : "",
        totalExperience:
          user.experienceInYears +
          (user.experienceInMonths ? user.experienceInMonths : ""),
        currentCompany: latestCompany.companyName || "",
        currentProfile: latestCompany.role || "",
        currentSalary: latestCompany.salary || "",
        expectedSalary: user.expectedSalary || "",
        noticePeriod: user.noticePeriod || "",
        jobPreference: user.preferredRoles
          ? user.preferredRoles.join(", ")
          : "",
        languagesKnown: user.languagesKnown
          ? user.languagesKnown.join(", ")
          : "",
        maritalStatus: user.maritalStatus || "",
      };

      // Combine job data and applicant data
      const completeData = {
        ...jobData,
        ...applicantData,
      };

      // Filter the data to only include selected columns
      const filteredData = {};
      selectedColumnKeys.forEach((key) => {
        filteredData[key] = completeData[key];
      });

      // Add the filtered data to the worksheet
      worksheet.addRow(filteredData);
    });

    // Set response headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Job_Applicants_${job.title}.xlsx`
    );

    // Send the Excel file as a response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).json({ error: "Error generating Excel file" });
  }
};

const downloadJobsExcel = async (req, res) => {
  try {
    // Get query params for specific columns (if provided)
    let { columns, jobIds } = req.query;

    let jobs;

    if (jobIds) {
      const jobIdsArray = jobIds.split(",");
      jobs = await Job.find({
        _id: { $in: jobIdsArray },
      }).sort({ createdAt: -1 });
    } else {
      // Fetch all jobs
      jobs = await Job.find().sort({ createdAt: -1 });
    }

    if (jobs.length === 0) {
      return res.status(404).json({ error: "No jobs found" });
    }

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Jobs Data");

    // Define default columns (Full Data Export)
    const allColumns = [
      { header: "Job ID", key: "jobId", width: 15 },
      { header: "Posted On", key: "createdAt", width: 25 },
      { header: "Job Title", key: "jobTitle", width: 25 },
      { header: "Company Name", key: "companyName", width: 25 },
      { header: "Job Description", key: "jobDescription", width: 40 },
      { header: "Location", key: "jobLocation", width: 20 },
      { header: "Salary", key: "jobSalary", width: 15 },
      { header: "Industry", key: "jobIndustry", width: 20 },
      { header: "Department", key: "jobDepartment", width: 20 },
      { header: "Work Mode", key: "jobWorkMode", width: 15 },
      { header: "Experience Level", key: "jobExperience", width: 20 },
      { header: "Experience", key: "jobExperienceRange", width: 20 },
      { header: "Qualification", key: "jobQualification", width: 25 },
      { header: "Specific Degree", key: "jobSpecificDegree", width: 20 },
      { header: "Joining", key: "jobJoining", width: 20 },
      { header: "Skills", key: "jobSkills", width: 30 },
      { header: "Interview", key: "jobInterview", width: 20 },
      { header: "Hired Applicants", key: "jobHiredApplicants", width: 20 },
      { header: "Applied Applicants", key: "jobAppliedApplicants", width: 20 },
      {
        header: "Shortlisted Applicants",
        key: "jobShortlistedApplicants",
        width: 20,
      },
      {
        header: "Rejected Applicants",
        key: "jobRejectedApplicants",
        width: 20,
      },
      { header: "Updated On", key: "updatedAt", width: 25 },
    ];

    // Determine which columns to include
    let selectedColumns = allColumns;
    let selectedColumnKeys = selectedColumns.map((col) => col.key);

    if (columns) {
      const requestedColumns = columns.split(",").map((col) => col.trim());
      selectedColumns = allColumns.filter((col) =>
        requestedColumns.includes(col.key)
      );
      selectedColumnKeys = selectedColumns.map((col) => col.key);
    }

    // Set the worksheet columns
    worksheet.columns = selectedColumns;

    // Apply center alignment to all columns
    worksheet.columns.forEach((column) => {
      column.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Format date with month name
    const formatDateWithMonthName = (dateStr) => {
      if (!dateStr) return "";
      try {
        const date = dateUtils.convertToIST(new Date(dateStr));
        if (isNaN(date.getTime())) return "";

        const months = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];

        const day = date.getDate().toString().padStart(2, "0");
        const month = months[date.getMonth()];
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
      } catch (error) {
        return "";
      }
    };

    // Add job data to the worksheet
    jobs.forEach((job) => {
      // Create a complete data object with all possible fields
      const jobData = {
        jobId: job.jobUniqueId || "",
        jobTitle: job.title || "",
        companyName: job.companyName || "",
        jobDescription: job.description || "",
        jobLocation: job.location || "",
        jobSalary: job.salary || "",
        jobIndustry: job.industry || "",
        jobDepartment: job.department || "",
        jobWorkMode: job.workmode || "",
        jobExperience: job.experience || "",
        jobQualification: job.qualification || "",
        jobSkills: job.skills ? job.skills.join(", ") : "",
        jobInterview: job.interview || "",
        jobHiredApplicants: job.hiredCandidates
          ? job.hiredCandidates.hiredNumber
          : 0,
        jobAppliedApplicants: job.applicants ? job.applicants.length : 0,
        jobShortlistedApplicants: job.shortlisted ? job.shortlisted.length : 0,
        jobRejectedApplicants: job.rejectedCandidates
          ? job.rejectedCandidates.length
          : 0,
        jobJoining: job.joining || "",
        jobSpecificDegree: job.specificDegree || "",
        jobExperienceRange: job.experienceRange || "",
        createdAt: job.createdAt ? formatDateWithMonthName(job.createdAt) : "",
        updatedAt: job.updatedAt ? formatDateWithMonthName(job.updatedAt) : "",
      };

      // Filter the data to only include selected columns
      const filteredData = {};
      selectedColumnKeys.forEach((key) => {
        filteredData[key] = jobData[key];
      });

      // Add the filtered data to the worksheet
      worksheet.addRow(filteredData);
    });

    // Set response headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Jobs_Data_${dateUtils.formatDate(
        dateUtils.getCurrentDate(),
        "YYYY-MM-DD"
      )}.xlsx`
    );

    // Send the Excel file as a response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).json({ error: "Error generating Excel file" });
  }
};

module.exports = {
  downloadUsersExcel,
  downloadApplicantsExcel,
  downloadJobsExcel,
};
