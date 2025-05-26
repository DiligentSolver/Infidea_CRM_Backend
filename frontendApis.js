const express = require("express");
const fs = require("fs");
const path = require("path");
const { Country } = require("country-state-city");

const router = express.Router();

// Get all countries
router.get("/countries", (req, res) => {
  res.json(Country.getAllCountries());
});

const corporateMetroCities = [
  "Ahmedabad", // Business, Startups, Textile, FMCG
  "Bangalore", // IT Hub, Startups, MNCs
  "Bhopal", // Startups, Government, IT
  "Bhubaneswar", // IT, Finance, Startups
  "Chandigarh", // IT, Finance, Administration
  "Chennai", // IT, Automobile, Finance
  "Coimbatore", // IT, Textile, Startups
  "Delhi", // Government, MNCs, Consulting
  "Goa", // Hospitality, IT, Startups
  "Gurgaon", // IT, Finance, Startups, Corporate Offices
  "Hyderabad", // IT, Startups, Biotechnology, Pharma
  "Indore", // Startups, IT, Manufacturing
  "Jaipur", // IT, Tourism, Business
  "Kanpur", // Leather, Textile, Business
  "Kolkata", // Finance, FMCG, IT, Manufacturing
  "Lucknow", // IT, Government, Business
  "Ludhiana", // Manufacturing, Business
  "Mumbai", // Financial Capital, Banking, Bollywood
  "Mysore", // IT, Education, Business
  "Nagpur", // Logistics, IT, Business
  "Nashik", // IT, Agriculture, Wine Industry
  "Noida", // IT, BPO, MNCs, Media
  "Patna", // Business, Government, IT
  "Pune", // IT, Manufacturing, Startups, Education
  "Raipur", // Manufacturing, Startups
  "Ranchi", // IT, Government, Mining Industry
  "Surat", // Diamond Industry, Textile, IT
  "Thiruvananthapuram", // IT, Government, Education
  "Vadodara", // Manufacturing, IT, Banking
  "Visakhapatnam", // IT, Pharma, Port City
  "Other", // Other
];

router.get("/corporate:metro:cities", (req, res) => {
  res.status(200).json(corporateMetroCities);
});

// Load states and cities data from JSON file
const dataPath = path.join(__dirname, "statesCities.json");
let statesCities = JSON.parse(fs.readFileSync(dataPath, "utf8"));

// Fetch all states from the database
router.get("/states", async (req, res) => {
  try {
    res.json(
      statesCities.states.map((state) => ({
        code: state.code,
        name: state.name,
      }))
    );
  } catch (error) {
    console.error("Error fetching states:", error);
    res.status(500).json({ error: "Error fetching states" });
  }
});

// API to get cities based on state code
router.get("/cities/:stateCode", async (req, res) => {
  try {
    const stateCode = req.params.stateCode.toUpperCase();
    res.json(statesCities.cities[stateCode]);
  } catch (error) {
    console.error("Error fetching cities:", error);
    res.status(500).json({ error: "Error fetching cities" });
  }
});

// List of major localities in Indore
const indoreLocalities = [
  "Aerodrome Road",
  "Annapurna Road",
  "Banganga",
  "Bengali Square",
  "Bhanwarkuan",
  "Bhawarkuan",
  "Bicholi Mardana",
  "Chhatribagh",
  "Chhota Bangarda",
  "Dewas Naka",
  "Dwarikapuri",
  "Indrapuri Colony",
  "Juni Indore",
  "Kalani Nagar",
  "Kanadia Road",
  "Khajrana",
  "Khatiwala Tank",
  "LIG Colony",
  "MG Road",
  "Malharganj",
  "Manik Bagh",
  "Musakhedi",
  "Nanda Nagar",
  "Navlakha",
  "Nipania",
  "Palasia",
  "Pardesipura",
  "Raj Mohalla",
  "Rajendra Nagar",
  "Saket Nagar",
  "Sapna Sangeeta",
  "Scheme 140",
  "Scheme 54",
  "Silicon City",
  "South Tukoganj",
  "Sudama Nagar",
  "Sukhliya",
  "Tilak Nagar",
  "Tulsi Nagar",
  "Usha Nagar",
  "Vijay Nagar",
  "Other",
];

// API to get all localities of Indore
router.get("/localities/indore", async (req, res) => {
  res.json(indoreLocalities);
});

const diplomas = [
  "Civil Engineering",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Computer Engineering",
  "Electronics and Communication Engineering",
  "Information Technology",
  "Business Administration",
  "Human Resource Management",
  "Marketing Management",
  "Financial Management",
  "Retail Management",
  "Supply Chain Management",
  "Nursing",
  "Pharmacy",
  "Physiotherapy",
  "Medical Laboratory Technology",
  "Radiography",
  "Dental Hygiene",
  "Computer Applications",
  "Graphic Designing",
  "Web Designing",
  "Animation and Multimedia",
  "Software Engineering",
  "Data Science",
  "Fine Arts",
  "Fashion Designing",
  "Interior Designing",
  "Photography",
  "Visual Arts",
  "Hotel Management",
  "Tourism Management",
  "Event Management",
  "Travel and Tourism",
  "Elementary Education",
  "Special Education",
  "Early Childhood Education",
  "Teacher Training",
  "Paralegal Studies",
  "Criminal Law",
  "Corporate Law",
  "Intellectual Property Rights",
  "Biotechnology",
  "Environmental Science",
  "Microbiology",
  "Clinical Research",
  "Agricultural Science",
  "Social Work",
  "Child Care",
  "Public Health",
  "Counseling and Therapy",
];

// Get graduate diplomas
router.get("/diplomas", async (req, res) => {
  res.json(diplomas);
});

const schoolDegree = ["12th Pass", "10th Pass", "Diploma", "Polytechnic"];

// List of common degrees (only codes)
const graduateDegrees = [
  "BStat",
  "BBA-LLB",
  "BCom-LLB",
  "BTech",
  "BSc",
  "BA",
  "BCom",
  "BBA",
  "BE",
  "MBBS",
  "LLB",
  "BEd",
  "BPharm",
  "BCA",
  "BArch",
  "DPharm",
  "BDS",
  "BVSc",
  "BHM",
  "BFA",
  "BSW",
  "BASLP",
  "BPT",
  "BDes",
];

const mastersDegrees = [
  "MSc",
  "MA",
  "MCom",
  "MBA",
  "ME",
  "MTech",
  "MD",
  "PhD",
  "MPhil",
  "MCA",
  "MArch",
  "MDS",
  "MVSc",
  "MHM",
  "MFA",
  "MSW",
  "MASLP",
  "MPT",
  "MDes",
  "MStat",
  "MTech-PhD",
  "Other",
];

// Get graduate degree codes
router.get("/graduatedegrees", async (req, res) => {
  res.json(graduateDegrees);
});

// Get graduate degree codes
router.get("/masterdegrees", async (req, res) => {
  res.json(mastersDegrees);
});

router.get("/qualifications", async (req, res) => {
  res.json([...schoolDegree, ...graduateDegrees, ...mastersDegrees]);
});

// Mixed list of most spoken Indian and corporate languages
const mixedLanguages = [
  "Assamese",
  "Bengali",
  "Bhojpuri",
  "French",
  "German",
  "Gujarati",
  "Kannada",
  "Maithili",
  "Malayalam",
  "Marathi",
  "Odia",
  "Other",
  "Punjabi",
  "Sanskrit",
  "Spanish",
  "Tamil",
  "Telugu",
  "Urdu",
  "None of the above",
];

// Get all mixed languages
router.get("/speaking-languages", async (req, res) => {
  res.json(mixedLanguages);
});

// Job roles
const jobRoles = [
  "Accounts & Finance",
  "Admin & Back Office Operations",
  "BPO & Call Center",
  "Content Writing & Copywriting",
  "Counseling & Career Guidance",
  "Customer Support / Telecalling",
  "Data Entry & MIS",
  "Delivery & Courier Services",
  "E-commerce & Online Selling",
  "Electrical & Mechanical Work",
  "Engineering & Manufacturing",
  "Event Management",
  "Facility Management & Housekeeping",
  "Field Sales & Marketing",
  "Front Office & Reception",
  "Graphic Designing & UI/UX",
  "Healthcare & Medical Assistance",
  "Healthcare & Wellness",
  "Hotel & Restaurant Management",
  "Human Resource & Recruitment",
  "IT & Software Development",
  "Labour & Construction Work",
  "Legal & Compliance",
  "Logistics & Supply Chain",
  "Machine Operations & Technician",
  "Marketing & Branding",
  "Market Research & Analysis",
  "Operations & Project Management",
  "Photography & Videography",
  "Plumbing & Carpentry",
  "Public Relations",
  "Retail & Store Operations",
  "Sales & Business Development",
  "Security & Guard Services",
  "Social Media Management",
  "Digital Marketing",
  "Software & IT",
  "Teaching & Training",
  "Telecom & Networking",
  "Travel & Tourism Services",
  "Video Editing & Motion Graphics",
  "Warehouse & Inventory Management",
  "Other",
];

// API to get all job roles
router.get("/preferredroles", async (req, res) => {
  res.json(jobRoles);
});

const industries = [
  "Accounting & Finance",
  "Administration & Office Support",
  "Advertising & Marketing",
  "Automobile & Transportation",
  "Aviation & Airlines",
  "BPO & Call Center",
  "Banking & Financial Services",
  "Content & Creative Writing",
  "Construction & Infrastructure",
  "Customer Service & Support",
  "Data Management & Analytics",
  "Delivery & Logistics",
  "E-commerce & Online Business",
  "Education & Career Guidance",
  "Engineering & Manufacturing",
  "Event Planning & Management",
  "Facility Management & Housekeeping",
  "Food & Beverage Services",
  "Government & Public Administration",
  "Graphic Design & Multimedia",
  "Healthcare & Medical Services",
  "Health & Wellness",
  "Hospitality & Hotel Industry",
  "Human Resources & Staffing",
  "IT & Software Development",
  "Legal & Regulatory Compliance",
  "Logistics & Supply Chain Management",
  "Machine Operations & Manufacturing",
  "Marketing, Branding & PR",
  "Market Research & Business Analytics",
  "Media & Entertainment",
  "Operations & Project Management",
  "Photography & Videography",
  "Plumbing, Electrical & Repair Services",
  "Public Relations & Communications",
  "Retail & E-commerce",
  "Sales & Business Development",
  "Security & Safety Services",
  "Social Media & Digital Strategy",
  "Software & Technology",
  "Teaching & Training",
  "Telecom & Networking",
  "Textile & Apparel",
  "Travel, Tourism & Hospitality",
  "Video Production & Motion Graphics",
  "Warehouse & Inventory Management",
  "Other Industries",
];

router.get("/industries", async (req, res) => {
  res.json(industries);
});

// Leave Management API endpoints
// Leave Types
const leaveTypes = ["Full Day", "Half Day", "Early Logout"];

// Get leave types
router.get("/leave-types", (req, res) => {
  res.status(200).json(leaveTypes);
});

// Leave Reasons
const leaveReasons = ["Sick Leave", "Privilege Leave", "Casual Leave"];

// Get leave reasons
router.get("/leave-reasons", (req, res) => {
  res.status(200).json(leaveReasons);
});

const jobProfiles = [
  "Academic Counselor",
  "Accountant",
  "Accounts Executive",
  "Accounts Manager",
  "Admin Executive",
  "Area Sales Manager",
  "Backend Developer",
  "BPO",
  "Business Development Executive",
  "Business Development Manager",
  "Call Center Agent",
  "Chartered Accountant",
  "Chat Support Executive",
  "Chef",
  "Civil Engineer",
  "Compliance Officer",
  "Content Writer",
  "Customer Support Executive",
  "Data Entry Operator",
  "Delivery Executive",
  "DevOps Engineer",
  "Digital Marketing Specialist",
  "Doctor",
  "Electrical Engineer",
  "Field Sales Executive",
  "Finance Manager",
  "Front Desk Executive",
  "Frontend Developer",
  "Full Stack Developer",
  "Graphic Designer",
  "Housekeeping Staff",
  "HR Executive",
  "HR Manager",
  "Hotel Manager",
  "IT Support Executive",
  "Inventory Manager",
  "Lab Technician",
  "Legal Advisor",
  "Logistics Coordinator",
  "Maintenance Technician",
  "Marketing Executive",
  "Mechanical Engineer",
  "Medical Representative",
  "Mobile App Developer",
  "Nurse",
  "Office Assistant",
  "Operations Executive",
  "Operations Manager",
  "Payroll Executive",
  "Pharmacist",
  "Photographer",
  "Production Engineer",
  "Receptionist",
  "Recruiter",
  "Relationship Manager",
  "Sales Executive",
  "Sales Manager",
  "Site Supervisor",
  "Software Developer",
  "Social Media Manager",
  "System Administrator",
  "Talent Acquisition Specialist",
  "Tally Operator",
  "Teacher",
  "Technical Support Executive",
  "Telecaller",
  "Training Coordinator",
  "Travel Executive",
  "Tutor",
  "UI/UX Designer",
  "Video Editor",
  "Warehouse Executive",
];

router.get("/jobprofiles", async (req, res) => {
  res.json(jobProfiles);
});

module.exports = router;
