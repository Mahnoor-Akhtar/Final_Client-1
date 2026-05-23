import mongoose from "mongoose";
import { randomUUID } from "crypto";

const schemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret.__v;
      return ret;
    },
  },
};

// 1. User Schema
const UserSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String },
  googleId: { type: String, unique: true, sparse: true },
  name: { type: String },
  raw_user_meta_data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, schemaOptions);

// 2. Department Schema
const DepartmentSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  name: { type: String, required: true },
  code: { type: String, required: true },
}, schemaOptions);

// 3. Student Schema
const StudentSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  user_id: { type: String },
  roll_number: { type: String, required: true, unique: true },
  full_name: { type: String },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String },
  department_id: { type: String },
  degree: { type: String },
  semester: { type: Number, default: 1 },
  address: { type: String },
  image_url: { type: String },
  courses: { type: [String], default: [] },
}, schemaOptions);

// 4. Teacher Schema
const TeacherSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  user_id: { type: String },
  employee_id: { type: String, required: true, unique: true },
  full_name: { type: String },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String },
  department_id: { type: String },
  qualification: { type: String },
  salary: { type: Number, default: 0 },
}, schemaOptions);

// 5. Course Schema
const CourseSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  code: { type: String, required: true },
  title: { type: String, required: true },
  credit_hours: { type: Number, required: true },
  semester: { type: Number, required: true },
  degree: { type: String, required: true },
  department_id: { type: String },
  teacher_id: { type: String },
}, schemaOptions);

// 6. Attendance Schema
const AttendanceSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  student_id: { type: String, required: true },
  course_id: { type: String, required: true },
  status: { type: String, enum: ["present", "absent", "late"], default: "present" },
}, schemaOptions);

// 7. Timetable Schema
const TimetableSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  day: { type: String, required: true },
  slot: { type: String, required: true },
  room: { type: String, required: true },
  course_id: { type: String, required: true },
  teacher_id: { type: String, required: true },
  department_id: { type: String, required: true },
}, schemaOptions);

// 8. Fee Schema
const FeeSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  student_id: { type: String, required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  due_date: { type: String, required: true },
  status: { type: String, enum: ["pending", "paid"], default: "pending" },
  paid_at: { type: String },
  method: { type: String },
}, schemaOptions);

// 9. FYP Group Schema
const FypGroupSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  group_name: { type: String, required: true },
  title: { type: String, required: true },
  abstract: { type: String },
  members: { type: [String], default: [] }, // Array of student IDs
  supervisor_id: { type: String },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
}, schemaOptions);

// 10. FYP Submission Schema
const FypSubmissionSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  group_id: { type: String, required: true },
  title: { type: String, required: true },
  file_name: { type: String, required: true },
  file_path: { type: String },
  github_link: { type: String },
  submitted_at: { type: String, default: () => new Date().toISOString() },
  comments: { type: String },
  grade: { type: String },
}, schemaOptions);

// 11. Complaint Schema
const ComplaintSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  student_id: { type: String, required: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ["pending", "resolved"], default: "pending" },
  reply: { type: String },
}, schemaOptions);

// 12. Notification Schema
const NotificationSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  user_id: { type: String, required: true }, // Can match student_id or user_id or email
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
}, schemaOptions);

// 13. Degree Schema
const DegreeSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  name: { type: String, required: true },
  code: { type: String, required: true },
  duration_years: { type: Number, default: 4 },
}, schemaOptions);

// 14. User Role Schema
const UserRoleSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  user_id: { type: String, required: true },
  role: { type: String, enum: ["admin", "teacher", "student"], required: true },
}, schemaOptions);

// Exports
export const User = mongoose.model("User", UserSchema);
export const Department = mongoose.model("Department", DepartmentSchema);
export const Student = mongoose.model("Student", StudentSchema);
export const Teacher = mongoose.model("Teacher", TeacherSchema);
export const Course = mongoose.model("Course", CourseSchema);
export const Attendance = mongoose.model("Attendance", AttendanceSchema);
export const Timetable = mongoose.model("Timetable", TimetableSchema);
export const Fee = mongoose.model("Fee", FeeSchema);
export const FypGroup = mongoose.model("FypGroup", FypGroupSchema);
export const FypSubmission = mongoose.model("FypSubmission", FypSubmissionSchema);
export const Complaint = mongoose.model("Complaint", ComplaintSchema);
export const Notification = mongoose.model("Notification", NotificationSchema);
export const Degree = mongoose.model("Degree", DegreeSchema);
export const UserRole = mongoose.model("UserRole", UserRoleSchema);

export const modelsMap = {
  users: User,
  departments: Department,
  students: Student,
  teachers: Teacher,
  courses: Course,
  attendance: Attendance,
  timetables: Timetable,
  fees: Fee,
  fyp_groups: FypGroup,
  fyp_submissions: FypSubmission,
  complaints: Complaint,
  notifications: Notification,
  degrees: Degree,
  user_roles: UserRole,
};
