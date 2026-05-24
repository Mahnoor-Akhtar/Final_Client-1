import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import session from "express-session";
import passport from "passport";
import { createServer } from "http";
import { Server } from "socket.io";

import "./middleware/passport.js";
import { sequelize } from "./db.js";

// Load routes
import authRoutes from "./routes/auth.js";
import dataRoutes from "./routes/data.js";

// Load models for seeding
import {
  User,
  UserRole,
  Department,
  Student,
  Teacher,
  Course,
  Attendance,
  Timetable,
  Fee,
  FypGroup,
  FypSubmission,
  Complaint,
  Notification,
  Degree,
} from "./models/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket client connected:", socket.id);

  socket.on("join", (room) => {
    if (room) {
      socket.join(room.toLowerCase());
      console.log(`Socket client ${socket.id} joined room: ${room.toLowerCase()}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket client disconnected:", socket.id);
  });
});

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(cors({ origin: "*" })); // Allow all origins for dev/testing
app.use(express.json());
app.use(morgan("dev"));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Static route for uploaded files
app.use("/uploads", express.static(uploadDir));


// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Upload Endpoint
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: { message: "No file uploaded" } });
  }
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  return res.status(200).json({
    data: {
      file_path: fileUrl,
      file_name: req.file.originalname,
    },
    error: null,
  });
});

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/data", dataRoutes);

app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/api/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:5173/login",
    session: false,
  }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.redirect(`http://localhost:5173/app?token=${token}`);
  }
);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
});

// Seed Data Definition
const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log("Database already has data. Skipping seed phase.");
      return;
    }

    console.log("Seeding database with default CMS data...");

    // 1. Departments
    const depts = [
      { _id: "dept-cs", name: "Computer Science", code: "CS" },
      { _id: "dept-it", name: "Information Technology", code: "IT" },
      { _id: "dept-bba", name: "Business Administration", code: "BBA" },
      { _id: "dept-ee", name: "Electrical Engineering", code: "EE" },
    ];
    await Department.insertMany(depts);

    // 2. Degrees
    const degrees = [
      { _id: "deg-1", name: "Bachelor of Science in Computer Science", code: "BSCS", duration_years: 4 },
      { _id: "deg-2", name: "Bachelor of Science in Information Technology", code: "BSIT", duration_years: 4 },
      { _id: "deg-3", name: "Bachelor of Business Administration", code: "BBA", duration_years: 4 },
      { _id: "deg-4", name: "Bachelor of Science in Electrical Engineering", code: "BSEE", duration_years: 4 },
    ];
    await Degree.insertMany(degrees);

    // 3. Hash passwords and insert Users
    const defaultPassword = "password123";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    const seedUsers = [
      { _id: "admin-user-id", email: "admin@college.edu", password: hashedPassword, raw_user_meta_data: { full_name: "System Admin" } },
      { _id: "student-1", email: "ahmad@college.edu", password: hashedPassword, raw_user_meta_data: { full_name: "Ahmad Raza" } },
      { _id: "student-2", email: "zainab@college.edu", password: hashedPassword, raw_user_meta_data: { full_name: "Zainab Fatima" } },
      { _id: "student-3", email: "ali@college.edu", password: hashedPassword, raw_user_meta_data: { full_name: "Ali Hassan" } },
      { _id: "teacher-1", email: "arshad@college.edu", password: hashedPassword, raw_user_meta_data: { full_name: "Dr. Arshad Ali" } },
      { _id: "teacher-2", email: "sarah@college.edu", password: hashedPassword, raw_user_meta_data: { full_name: "Dr. Sarah Khan" } },
      { _id: "teacher-3", email: "john@college.edu", password: hashedPassword, raw_user_meta_data: { full_name: "Prof. John Doe" } },
    ];
    await User.insertMany(seedUsers);

    // 4. User Roles
    const roles = [
      { _id: "role-1", user_id: "admin-user-id", role: "admin" },
      { _id: "role-2", user_id: "student-1", role: "student" },
      { _id: "role-3", user_id: "student-2", role: "student" },
      { _id: "role-4", user_id: "student-3", role: "student" },
      { _id: "role-5", user_id: "teacher-1", role: "teacher" },
      { _id: "role-6", user_id: "teacher-2", role: "teacher" },
      { _id: "role-7", user_id: "teacher-3", role: "teacher" },
    ];
    await UserRole.insertMany(roles);

    // 5. Teachers
    const teachers = [
      {
        _id: "teacher-1",
        user_id: "teacher-1",
        employee_id: "T-101",
        full_name: "Dr. Arshad Ali",
        email: "arshad@college.edu",
        phone: "+92 300 1234567",
        department_id: "dept-cs",
        qualification: "PhD CS",
        salary: 150000,
      },
      {
        _id: "teacher-2",
        user_id: "teacher-2",
        employee_id: "T-102",
        full_name: "Dr. Sarah Khan",
        email: "sarah@college.edu",
        phone: "+92 321 7654321",
        department_id: "dept-it",
        qualification: "PhD IT",
        salary: 140000,
      },
      {
        _id: "teacher-3",
        user_id: "teacher-3",
        employee_id: "T-103",
        full_name: "Prof. John Doe",
        email: "john@college.edu",
        phone: "+92 333 9876543",
        department_id: "dept-bba",
        qualification: "MBA",
        salary: 120000,
      },
    ];
    await Teacher.insertMany(teachers);

    // 6. Students
    const students = [
      {
        _id: "student-1",
        user_id: "student-1",
        roll_number: "BCS-01",
        full_name: "Ahmad Raza",
        email: "ahmad@college.edu",
        phone: "+92 312 3456789",
        department_id: "dept-cs",
        degree: "BSCS",
        semester: 4,
        address: "Sector G-11, Islamabad",
      },
      {
        _id: "student-2",
        user_id: "student-2",
        roll_number: "BIT-02",
        full_name: "Zainab Fatima",
        email: "zainab@college.edu",
        phone: "+92 345 6789012",
        department_id: "dept-it",
        degree: "BSIT",
        semester: 6,
        address: "Gulberg III, Lahore",
      },
      {
        _id: "student-3",
        user_id: "student-3",
        roll_number: "BBA-03",
        full_name: "Ali Hassan",
        email: "ali@college.edu",
        phone: "+92 301 2345678",
        department_id: "dept-bba",
        degree: "BBA",
        semester: 2,
        address: "Clifton, Karachi",
      },
    ];
    await Student.insertMany(students);

    // 7. Courses
    const courses = [
      {
        _id: "course-1",
        code: "CS-101",
        title: "Introduction to Programming",
        credit_hours: 4,
        semester: 1,
        degree: "BSCS",
        department_id: "dept-cs",
        teacher_id: "teacher-1",
      },
      {
        _id: "course-2",
        code: "CS-201",
        title: "Data Structures & Algorithms",
        credit_hours: 3,
        semester: 3,
        degree: "BSCS",
        department_id: "dept-cs",
        teacher_id: "teacher-1",
      },
      {
        _id: "course-3",
        code: "IT-302",
        title: "Web Application Development",
        credit_hours: 3,
        semester: 5,
        degree: "BSIT",
        department_id: "dept-it",
        teacher_id: "teacher-2",
      },
      {
        _id: "course-4",
        code: "BBA-102",
        title: "Principles of Management",
        credit_hours: 3,
        semester: 2,
        degree: "BBA",
        department_id: "dept-bba",
        teacher_id: "teacher-3",
      },
    ];
    await Course.insertMany(courses);

    // 8. Attendance
    const attendance = [
      { _id: "att-1", date: new Date().toISOString().split("T")[0], student_id: "student-1", course_id: "course-1", status: "present" },
      { _id: "att-2", date: new Date().toISOString().split("T")[0], student_id: "student-2", course_id: "course-1", status: "present" },
      { _id: "att-3", date: new Date().toISOString().split("T")[0], student_id: "student-3", course_id: "course-1", status: "absent" },
      { _id: "att-4", date: new Date().toISOString().split("T")[0], student_id: "student-1", course_id: "course-2", status: "present" },
      { _id: "att-5", date: new Date().toISOString().split("T")[0], student_id: "student-2", course_id: "course-2", status: "late" },
      { _id: "att-6", date: new Date().toISOString().split("T")[0], student_id: "student-3", course_id: "course-2", status: "present" },
    ];
    await Attendance.insertMany(attendance);

    // 9. Timetables
    const timetables = [
      { _id: "tt-1", day: "Monday", slot: "09:00 AM - 10:30 AM", room: "Room 101", course_id: "course-1", teacher_id: "teacher-1", department_id: "dept-cs" },
      { _id: "tt-2", day: "Monday", slot: "11:00 AM - 12:30 PM", room: "Room 102", course_id: "course-2", teacher_id: "teacher-1", department_id: "dept-cs" },
      { _id: "tt-3", day: "Tuesday", slot: "09:00 AM - 10:30 AM", room: "Lab 2", course_id: "course-3", teacher_id: "teacher-2", department_id: "dept-it" },
      { _id: "tt-4", day: "Wednesday", slot: "11:00 AM - 12:30 PM", room: "Room 201", course_id: "course-4", teacher_id: "teacher-3", department_id: "dept-bba" },
      { _id: "tt-5", day: "Thursday", slot: "09:00 AM - 10:30 AM", room: "Room 101", course_id: "course-1", teacher_id: "teacher-1", department_id: "dept-cs" },
      { _id: "tt-6", day: "Friday", slot: "10:30 AM - 12:00 PM", room: "Room 102", course_id: "course-2", teacher_id: "teacher-1", department_id: "dept-cs" },
    ];
    await Timetable.insertMany(timetables);

    // 10. Fees
    const fees = [
      { _id: "fee-1", student_id: "student-1", title: "Semester Tuition Fee - Spring 2026", amount: 85000, due_date: "2026-06-15", status: "pending" },
      { _id: "fee-2", student_id: "student-1", title: "Exam Registration Fee", amount: 5000, due_date: "2026-05-10", status: "paid", paid_at: "2026-05-08T10:15:30Z", method: "JazzCash" },
      { _id: "fee-3", student_id: "student-2", title: "Semester Tuition Fee - Spring 2026", amount: 85000, due_date: "2026-06-15", status: "paid", paid_at: "2026-05-12T14:22:10Z", method: "Easypaisa" },
      { _id: "fee-4", student_id: "student-3", title: "Semester Tuition Fee - Spring 2026", amount: 85000, due_date: "2026-06-15", status: "pending" },
      { _id: "fee-5", student_id: "student-1", title: "Library Membership Fee", amount: 2000, due_date: "2026-05-01", status: "paid", paid_at: "2026-04-28T09:00:00Z", method: "Bank Transfer" },
    ];
    await Fee.insertMany(fees);

    // 11. FYP Groups
    const fypGroups = [
      {
        _id: "fyp-1",
        group_name: "Group CMS",
        title: "College Management System Portal",
        abstract: "A modern React-based portal to consolidate student, teacher, courses, and operations management client-side.",
        members: ["student-1", "student-2"],
        supervisor_id: "teacher-1",
        status: "approved",
      },
    ];
    await FypGroup.insertMany(fypGroups);

    // 12. FYP Submissions
    const submissions = [
      { _id: "sub-1", group_id: "fyp-1", title: "Project Proposal Draft", file_name: "Proposal_Draft.pdf", submitted_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), comments: "Proposal accepted, good scope defined.", grade: "A" },
      { _id: "sub-2", group_id: "fyp-1", title: "Software Requirement Specification", file_name: "SRS_Document_V1.pdf", submitted_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), comments: "SRS is detailed, make sure to add payment flow chart.", grade: "A-" },
    ];
    await FypSubmission.insertMany(submissions);

    // 13. Complaints
    const complaints = [
      { _id: "comp-1", student_id: "student-1", title: "Slow Lab PCs", category: "Facilities", description: "The computers in CS Lab 2 are very slow and running outdated software, hindering lab sessions.", status: "resolved", reply: "We have updated RAM on all CS Lab 2 PCs and installed updated tools." },
      { _id: "comp-2", student_id: "student-1", title: "Fee Instalment Inquiry", category: "Administration", description: "Requesting details on whether semester tuition fees can be paid in two equal instalments.", status: "pending" },
    ];
    await Complaint.insertMany(complaints);

    // 14. Notifications
    const notifications = [
      { _id: "not-1", user_id: "student-1", title: "Fee Invoice Generated", message: "Your tuition fee invoice for Semester Spring 2026 has been generated. Due date is 2026-06-15.", read: false },
      { _id: "not-2", user_id: "student-1", title: "Attendance Warning", message: "Your attendance in 'Data Structures' has dropped to 72%. Minimum required attendance is 75%.", read: false },
      { _id: "not-3", user_id: "student-1", title: "FYP Update", message: "Your supervisor Dr. Arshad Ali graded SRS Document V1 with an A-.", read: true },
    ];
    await Notification.insertMany(notifications);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Database Seeding Failed:", error);
  }
};

// Database connection (Supabase Postgres via Sequelize)
sequelize
  .authenticate()
  .then(() => {
    console.log("Connected to Supabase Postgres successfully.");
    // Auto-create / update tables to match the model definitions.
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log("Database schema synchronized.");
    return seedDatabase();
  })
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Postgres connection failed:", err);
  });
