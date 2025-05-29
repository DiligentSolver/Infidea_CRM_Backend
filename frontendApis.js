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
  "56 Dukaan",
  "60 Feet Road",
  "Aerodrome Road",
  "Airport Road",
  "Anand Bazaar",
  "Annapurna",
  "Aurobindo",
  "Azad Nagar",
  "Bada Ganpati",
  "Banganga",
  "Bapat Nagar",
  "Bengali Square",
  "Bhagirathpura",
  "Bhawarkua",
  "Bicholi Hapsi",
  "Bicholi Mardana",
  "Bombay Hospital",
  "Bypass",
  "Chandan Nagar",
  "Chawni",
  "Chhatribagh",
  "Chhota Bangarda",
  "Chhoti Gwaltoli",
  "Choithram Square",
  "Collectorate",
  "Crystal IT Park",
  "DB CIty",
  "Dewas Naka",
  "Dhanvantari Nagar",
  "Dwarikapuri",
  "Futi Kothi",
  "Gandhi Nagar",
  "Gangwal",
  "Geeta Bhavan",
  "Gomatgiri",
  "Gori Nagar",
  "GPO Square",
  "Gulmohar Colony",
  "Gumasta Nagar",
  "Indrapuri",
  "Industry House",
  "Jail Road",
  "Janjeerwala",
  "Jawahar Marg",
  "Jinsi",
  "Juni Indore",
  "Kalani Nagar",
  "Kanadia Road",
  "Khajrana",
  "Khandwa Naka",
  "Khatiwala Tank",
  "Lantern Square",
  "Lasudia Mori",
  "LIG Colony",
  "Madhumilan",
  "Mahalaxmi Nagar",
  "Malharganj",
  "Malwa Mill",
  "Manglia",
  "Manik Bagh",
  "Marimata Square",
  "MG Road",
  "Mhow",
  "Mhow Naka",
  "MIG Colony",
  "MR 10",
  "MR 9",
  "Musakhedi",
  "Nagar Nigam",
  "Nanda Nagar",
  "Navlakha",
  "Nipania",
  "Niranjanpur",
  "Palasia",
  "Palda",
  "Palsikar",
  "Pardeshipura",
  "Patnipura",
  "Patrakar Square",
  "Pipliyahana",
  "Radisson",
  "Raj Mohalla",
  "Rajendra Nagar",
  "Rajiv Gandhi Circle",
  "Rajwada",
  "Rambag",
  "Ranipura",
  "Ranjeet Hanuman",
  "Rau",
  "Regal Square",
  "Robot Square",
  "Saket Nagar",
  "Sanchar Nagar",
  "Sanwer Road",
  "Sapna Sangeeta",
  "Satya Sai Square",
  "Scheme 103",
  "Scheme 114",
  "Scheme 136",
  "Scheme 140",
  "Scheme 152",
  "Scheme 155",
  "Scheme 28",
  "Scheme 33",
  "Scheme 42",
  "Scheme 51",
  "Scheme 54",
  "Scheme 58",
  "Scheme 61",
  "Scheme 67",
  "Scheme 68",
  "Scheme 78",
  "Scheme 89",
  "Scheme 94",
  "Silicon City",
  "Singapore Township",
  "Siyaganj",
  "Snehlataganj",
  "South Tukoganj",
  "Star Square",
  "Sudama Nagar",
  "Sukhliya",
  "Super Corridor",
  "Talawali Chanda",
  "Teen Imli",
  "Tejaji Nagar",
  "Tilak Nagar",
  "Tulsi Nagar",
  "Ujjain Road",
  "Usha Nagar",
  "Velocity",
  "Vijay Nagar",
  "World Cup Square",
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

const qualifications = [
  // BTech / BE
  "BTech - Computer Science and Engineering",
  "BTech - Information Technology",
  "BTech - Mechanical Engineering",
  "BTech - Electrical Engineering",
  "BTech - Electronics and Communication Engineering",
  "BTech - Civil Engineering",
  "BTech - Artificial Intelligence and Machine Learning",
  "BTech - Data Science",
  "BTech - Mechatronics",
  "BTech - Robotics",
  "BTech - Chemical Engineering",
  "BTech - Aeronautical Engineering",
  "BTech - Petroleum Engineering",
  "BE - Mechanical Engineering",
  "BE - Electrical Engineering",
  "BE - Civil Engineering",
  "BE - Computer Science",

  // BSc
  "BSc - Physics",
  "BSc - Chemistry",
  "BSc - Mathematics",
  "BSc - Computer Science",
  "BSc - Information Technology",
  "BSc - Biotechnology",
  "BSc - Microbiology",
  "BSc - Agriculture",
  "BSc - Zoology",
  "BSc - Botany",
  "BSc - Environmental Science",
  "BSc - Statistics",

  // BA
  "BA - English",
  "BA - History",
  "BA - Political Science",
  "BA - Economics",
  "BA - Psychology",
  "BA - Sociology",
  "BA - Geography",
  "BA - Philosophy",
  "BA - Journalism and Mass Communication",
  "BA - Public Administration",
  "BA - Hindi",

  // BCom
  "BCom - General",
  "BCom - Accounting and Finance",
  "BCom - Banking and Insurance",
  "BCom - Taxation",
  "BCom - Computer Applications",
  "BCom - Economics",

  // BBA
  "BBA - General",
  "BBA - Finance",
  "BBA - Marketing",
  "BBA - Human Resource Management",
  "BBA - Business Analytics",
  "BBA - International Business",
  "BBA - Operations Management",

  // Law
  "LLB - Criminal Law",
  "LLB - Civil Law",
  "LLB - Constitutional Law",
  "LLB - Corporate Law",
  "LLB - Taxation Law",
  "BBA-LLB - Business Law",
  "BCom-LLB - Financial Law",

  // MBBS
  "MBBS - General Medicine",

  // BDS
  "BDS - Dental Surgery",

  // BPharm / DPharm
  "BPharm - Pharmaceutics",
  "BPharm - Pharmacology",
  "BPharm - Pharmaceutical Chemistry",
  "BPharm - Clinical Pharmacy",
  "DPharm - General",

  // BCA
  "BCA - General",
  "BCA - Cybersecurity",
  "BCA - Cloud Computing",
  "BCA - Data Analytics",

  // BArch
  "BArch - Architecture Design",
  "BArch - Urban Planning",
  "BArch - Landscape Architecture",

  // Others
  "BHM - Hotel Management",
  "BFA - Painting",
  "BFA - Sculpture",
  "BFA - Applied Arts",
  "BSW - Social Work",
  "BASLP - Audiology and Speech Language Pathology",
  "BPT - Physiotherapy",
  "BDes - Fashion Design",
  "BDes - Interior Design",
  "BDes - Industrial Design",
  "BDes - Communication Design",

  // Postgraduate Degrees

  // MBA
  "MBA - Marketing",
  "MBA - Finance",
  "MBA - Human Resource Management",
  "MBA - Operations Management",
  "MBA - International Business",
  "MBA - Business Analytics",
  "MBA - Rural Management",
  "MBA - Healthcare Management",

  // MTech / ME
  "MTech - Computer Science",
  "MTech - Civil Engineering",
  "MTech - Electrical Engineering",
  "MTech - VLSI Design",
  "MTech - Embedded Systems",
  "MTech - Structural Engineering",
  "ME - Mechanical Engineering",
  "ME - Electronics Engineering",

  // MSc
  "MSc - Physics",
  "MSc - Chemistry",
  "MSc - Mathematics",
  "MSc - Biotechnology",
  "MSc - Microbiology",
  "MSc - Zoology",
  "MSc - Botany",
  "MSc - Environmental Science",
  "MSc - Data Science",
  "MSc - Statistics",

  // MA
  "MA - English",
  "MA - History",
  "MA - Political Science",
  "MA - Economics",
  "MA - Sociology",
  "MA - Psychology",
  "MA - Journalism",
  "MA - Public Administration",

  // MCom
  "MCom - General",
  "MCom - Accounting",
  "MCom - Finance",
  "MCom - Taxation",

  // MCA
  "MCA - Software Engineering",
  "MCA - Cybersecurity",
  "MCA - Cloud Computing",
  "MCA - Data Science",

  // MPharm
  "MPharm - Pharmaceutics",
  "MPharm - Pharmacognosy",
  "MPharm - Pharmaceutical Analysis",

  // MDS
  "MDS - Oral Surgery",
  "MDS - Orthodontics",
  "MDS - Periodontics",
  "MDS - Prosthodontics",

  // MD / MS
  "MD - General Medicine",
  "MD - Pediatrics",
  "MD - Psychiatry",
  "MS - General Surgery",
  "MS - Orthopedics",
  "MS - ENT",

  // MEd
  "MEd - Education",
  "MHM - Hotel Management",
  "MFA - Painting",
  "MSW - Social Work",
  "MASLP - Speech Pathology",
  "MPT - Orthopedics",
  "MPT - Neurology",
  "MDes - Fashion Design",
  "MDes - Product Design",
  "MStat - Applied Statistics",

  // Dual Degree
  "MTech-PhD - Interdisciplinary Research",

  // Doctorate
  "PhD - Computer Science",
  "PhD - Engineering",
  "PhD - Social Sciences",
  "PhD - Law",
  "PhD - Physics",
  "PhD - Management",
  "PhD - Biotechnology",

  // MPhil
  "MPhil - Psychology",
  "MPhil - Economics",

  // Other / Custom
  "Other - Not Listed",
];

router.get("/qualifications", async (req, res) => {
  res.json(qualifications);
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
  "Anything will work",
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
  "D Animator",
  "Accounts - Accountant",
  "Accounts - Admin Executive",
  "Accounts - Audit Manager",
  "Accounts - CA / CS Dropout",
  "Accounts - Chartered Accountant",
  "Accounts - Company Secretary",
  "Accounts - Cost Accountant",
  "Accounts - Finance Executive",
  "Accounts - Finance Manager",
  "Accounts - Others",
  "Accounts - Payroll Executive",
  "Accounts - Tax Consultant",
  "Actor",
  "Architect",
  "Art Director",
  "Automobile Engineer",
  "Aviation",
  "Back Office Executive",
  "Billing Executive",
  "BPO - Airvincible",
  "BPO - Altruist - Airtel Black",
  "BPO - Altruist - Airtel Broadband",
  "BPO - Altruist - IPru",
  "BPO - Amazon Vcs",
  "BPO - Annova",
  "BPO - HGS",
  "BPO - ICICI Lombard - CRT",
  "BPO - ICICI Lombard - E-Channel",
  "BPO - Others",
  "BPO - Qconnect - Myntra",
  "BPO - Qconnect - Noon",
  "BPO - Qconnect - Porter",
  "BPO - Qconnect - Swiggy",
  "BPO - Startek",
  "BPO - Taskus - Delivroo",
  "BPO - Taskus - Doordash",
  "BPO - Taskus - Frontier",
  "BPO - Taskus - Others",
  "BPO - Taskus - Vivint",
  "BPO - Tech Mahindra",
  "BPO - Techno Task",
  "BPO - Tp - Asus",
  "BPO - Tp - Byram",
  "BPO - Tp - Dexcom",
  "BPO - Tp - Flipkart CS",
  "BPO - Tp - Flipkart L2",
  "BPO - Tp - Flipkart Seller Support",
  "BPO - Tp - Instacart",
  "BPO - Tp - Mastercard",
  "BPO - TP - Others",
  "BPO - Tp - Presto",
  "BPO - Tp - Singpost",
  "BPO - Tp - Temu",
  "BPO - Tp - Walmart",
  "BPO - Tp - Western Union",
  "BPO - Tp - Xaomi",
  "BPO - Tp - Yahoo",
  "BPO - Virtual Support Business",
  "BPO - WNS",
  "Branch Manager",
  "Brand Manager",
  "Building Inspector",
  "Cafe Manager",
  "Car Driver",
  "Cashier",
  "Chef",
  "Chemical Engineer",
  "Choreographer",
  "Cinematographer",
  "Civil Engineer",
  "Clerk",
  "Collection Executive",
  "Compliance Officer",
  "Composer",
  "Concierge",
  "Construction - Civil Engineer",
  "Construction -Site Supervisor",
  "Construction Manager",
  "Content Creator",
  "Content Writer",
  "Copywriter",
  "Creative Director",
  "Credit Officer",
  "Dancer",
  "Data Analyst",
  "Data Entry Executive",
  "Data Scientist",
  "Delivery Executive",
  "Digital Marketing Executive",
  "Director",
  "Doctor",
  "Driver",
  "ECommerce Executive",
  "Editor",
  "Electrical Engineer",
  "Electrician",
  "Electronics Engineer",
  "Estimator",
  "Event Coordinator",
  "Fashion Designer",
  "Foreman",
  "Fresher",
  "Front Desk Manager",
  "Front Office Executive",
  "Graphic Designer",
  "Guest Relation Executive",
  "Guest Relations Manager",
  "Hardware Networking Executive",
  "Hotel Manager",
  "Housekeeping Supervisor",
  "HR - HR Business Partner",
  "HR - HR Consultancy",
  "HR - HR Executive",
  "HR - HR Generalist",
  "HR - HR Intern",
  "HR - HR Manager",
  "HR - HR Recruiter",
  "HR - Others",
  "HR - Talent Acquisition Specialist",
  "HR - US IT Recruiter",
  "Illustrator",
  "Import & Export Executive",
  "Industrial Designer",
  "Insurance Agent / Advisor",
  "Insurance Executive",
  "Interior Designer",
  "Inventory Manager",
  "IT - AI ML Developer",
  "IT - Android Developer",
  "IT - iOs Developer",
  "IT - IT Manager",
  "IT - Java Developer",
  "IT - Node Developer",
  "IT - Others",
  "IT - PHP Developer",
  "IT - Python Developer",
  "IT - React Develoepr",
  "IT - Software Developer",
  "IT - Software Engineer",
  "IT - UI/UX Developer",
  "IT - Web Designer",
  "IT - Web Developer",
  "IT Helpdesk Support",
  "Journalist",
  "KYC Executive",
  "Lab Technician",
  "Legal Advisor",
  "Loan Executive",
  "Machine Operator",
  "Market Research Analyst",
  "Marketing Manager",
  "Mechanical Engineer",
  "Media Planner",
  "MIS Executive",
  "Model",
  "Motion Graphics Designer",
  "Multimedia Artist",
  "Musician",
  "Nurse",
  "Nutritionist",
  "Office Boy",
  "Painter",
  "Personal / Executive Assistant",
  "Personal Banker",
  "Petroleum Engineer",
  "Pharmacist",
  "Phone Banking Officer",
  "Photographer",
  "Physiotherapist",
  "Plumber",
  "PPC Executive",
  "Procurement Manager",
  "Producer",
  "Production Supervisor",
  "Project Manager",
  "Public Relations Manager",
  "Quality Control Inspector",
  "Quantity Surveyor",
  "Real Estate Agent",
  "Real Estate- Others",
  "Real Estate- Property Brokter",
  "Receptionist",
  "Relationship Executive",
  "Relationship Manager",
  "Reporter",
  "Reservation Agent",
  "Restaurant Manager",
  "Risk Analyst",
  "Risk Manager",
  "Safety Officer",
  "Sales - Advisory / Broking Firm",
  "Sales - Area Sales Manager",
  "Sales - B2B Sales Executive",
  "Sales - Business Development Executive",
  "Sales - Business Development Manager",
  "Sales - Counsellor",
  "Sales - Edtech - Byjus",
  "Sales - Edtech - ClassMonitor",
  "Sales - Edtech - Jaro Education",
  "Sales - Edtech - Udemy",
  "Sales - Edtech - Unacademy",
  "Sales - Edtech - Upgrad",
  "Sales - Edtech - Vedantu",
  "Sales - Field Sales",
  "Sales - Jewellery Sales Executive",
  "Sales - Others",
  "Sales - Sales Executive",
  "Sales - Sales Manager",
  "Sales - Showroom / Store",
  "Sales - Telesales",
  "Sales - Travel / Ticketing",
  "SAP Executive",
  "Security Guard",
  "Set Designer",
  "Site Engineer",
  "Social Media Executive",
  "Social Media Manager",
  "Sound Engineer",
  "Stage Manager",
  "Store Manager",
  "Structural Engineer",
  "Supply Chain Executive",
  "Surveyor",
  "Teacher",
  "Technician",
  "Telecaller",
  "Tour Guide",
  "Trainer",
  "Travel Agent",
  "UI Designer",
  "UX Designer",
  "Video Editor",
  "Visual Designer",
  "Waiter/Waitress",
  "Warehouse / Logistics Executie",
  "Web Designer",
];

router.get("/jobprofiles", async (req, res) => {
  res.json(jobProfiles);
});

module.exports = router;
