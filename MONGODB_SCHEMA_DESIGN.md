# MongoDB Schema & Database Design Documentation

## Database Overview

**Database Name**: `college-cms`  
**Collections**: 13  
**Indexes**: 20+  
**Type**: Document-based (NoSQL)  
**Replication**: Recommended for production

---

## Collections Schema

### 1. Users Collection

**Purpose**: Store authentication & user profile data

```javascript
db.createCollection("users")

db.users.insertOne({
  _id: "uuid-1",
  email: "user@example.com",
  password: "$2a$10$hashedPassword",
  googleId: "google-oauth-id",
  name: "User Name",
  raw_user_meta_data: {
    avatar_url: "https://...",
    custom_field: "value"
  },
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-01T00:00:00Z")
})

// Indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ googleId: 1 }, { sparse: true });
```

**Fields**:
| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| _id | String (UUID) | Yes | Yes | Primary key |
| email | String | Yes | Yes | User email |
| password | String | No | No | Hashed password (bcrypt) |
| googleId | String | No | Yes | Google OAuth ID |
| name | String | No | No | User full name |
| raw_user_meta_data | Object | No | No | Additional metadata |
| createdAt | Date | Auto | No | Creation timestamp |
| updatedAt | Date | Auto | No | Last update timestamp |

---

### 2. Departments Collection

**Purpose**: Store department information

```javascript
db.departments.insertOne({
  _id: "uuid-dept-1",
  name: "Computer Science",
  code: "CS",
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-01T00:00:00Z")
})

// Indexes
db.departments.createIndex({ code: 1 }, { unique: true });
db.departments.createIndex({ name: 1 });
```

**Relationships**: 
- Has many Students
- Has many Teachers
- Has many Courses

---

### 3. Students Collection

**Purpose**: Store student information & enrollment

```javascript
db.students.insertOne({
  _id: "uuid-student-1",
  user_id: "uuid-1",
  roll_number: "CS-2021-001",
  full_name: "Ahmed Ali",
  email: "ahmed@example.com",
  phone: "+92-300-1234567",
  department_id: "uuid-dept-1",
  degree: "BSCS",
  semester: 1,
  address: "123 Street, City, Country",
  image_url: "https://example.com/image.jpg",
  courses: ["uuid-course-1", "uuid-course-2"],
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-01T00:00:00Z")
})

// Indexes
db.students.createIndex({ roll_number: 1 }, { unique: true });
db.students.createIndex({ email: 1 });
db.students.createIndex({ department_id: 1 });
db.students.createIndex({ courses: 1 });
db.students.createIndex({ user_id: 1 });
```

**Fields**:
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| _id | String (UUID) | Yes | Primary key |
| user_id | String (UUID) | No | Links to Users |
| roll_number | String | Yes | Unique student ID |
| full_name | String | Yes | Student name |
| email | String | Yes | Student email |
| phone | String | No | Contact number |
| department_id | String (UUID) | No | Foreign key to Department |
| degree | String | No | Degree program (BSCS, BSIT, etc.) |
| semester | Number | No | Current semester (1-12) |
| address | String | No | Residential address |
| image_url | String | No | Profile picture URL |
| courses | Array[String] | No | Array of course IDs |

---

### 4. Teachers Collection

**Purpose**: Store teacher/faculty information

```javascript
db.teachers.insertOne({
  _id: "uuid-teacher-1",
  user_id: "uuid-2",
  employee_id: "EMP-2021-001",
  full_name: "Dr. Muhammad Hassan",
  email: "hassan@college.edu",
  phone: "+92-300-9876543",
  department_id: "uuid-dept-1",
  qualification: "PhD Computer Science",
  salary: 50000,
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-01T00:00:00Z")
})

// Indexes
db.teachers.createIndex({ employee_id: 1 }, { unique: true });
db.teachers.createIndex({ department_id: 1 });
db.teachers.createIndex({ email: 1 });
db.teachers.createIndex({ user_id: 1 });
```

---

### 5. Courses Collection

**Purpose**: Store course information

```javascript
db.courses.insertOne({
  _id: "uuid-course-1",
  code: "CS-101",
  title: "Introduction to Computer Science",
  credit_hours: 4,
  semester: 1,
  degree: "BSCS",
  department_id: "uuid-dept-1",
  teacher_id: "uuid-teacher-1",
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-01T00:00:00Z")
})

// Indexes
db.courses.createIndex({ code: 1 }, { unique: true });
db.courses.createIndex({ teacher_id: 1 });
db.courses.createIndex({ department_id: 1 });
db.courses.createIndex({ semester: 1, degree: 1 });
```

**Constraints**:
- `credit_hours`: 1-4
- `semester`: 1-12
- `degree`: BSCS, BSIT, BBA, etc.

---

### 6. Attendance Collection

**Purpose**: Track student attendance

```javascript
db.attendance.insertOne({
  _id: "uuid-attendance-1",
  date: "2024-01-15",
  student_id: "uuid-student-1",
  course_id: "uuid-course-1",
  status: "present",
  createdAt: ISODate("2024-01-15T09:00:00Z"),
  updatedAt: ISODate("2024-01-15T09:00:00Z")
})

// Indexes
db.attendance.createIndex({ student_id: 1, course_id: 1, date: 1 }, { unique: true });
db.attendance.createIndex({ course_id: 1, date: 1 });
db.attendance.createIndex({ student_id: 1, date: 1 });
```

**Status Values**: `present`, `absent`, `late`

**Query Examples**:
```javascript
// Get attendance for a student
db.attendance.find({ student_id: "uuid-student-1" });

// Get attendance for a course on a specific date
db.attendance.find({ course_id: "uuid-course-1", date: "2024-01-15" });

// Get attendance summary
db.attendance.aggregate([
  { $match: { student_id: "uuid-student-1" } },
  { $group: { _id: "$status", count: { $sum: 1 } } }
]);
```

---

### 7. Timetable Collection

**Purpose**: Store class schedule/timetable

```javascript
db.timetables.insertOne({
  _id: "uuid-timetable-1",
  day: "Monday",
  slot: "09:00 AM - 10:30 AM",
  room: "Room 101",
  course_id: "uuid-course-1",
  teacher_id: "uuid-teacher-1",
  department_id: "uuid-dept-1",
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-01T00:00:00Z")
})

// Indexes
db.timetables.createIndex({ day: 1, slot: 1, room: 1 }, { unique: true });
db.timetables.createIndex({ teacher_id: 1, day: 1 });
db.timetables.createIndex({ course_id: 1 });
db.timetables.createIndex({ room: 1 });
```

**Days**: Monday, Tuesday, Wednesday, Thursday, Friday  
**Slots**: 09:00 AM - 10:30 AM, 11:00 AM - 12:30 PM, etc.

---

### 8. Fees Collection

**Purpose**: Track student fee payments

```javascript
db.fees.insertOne({
  _id: "uuid-fee-1",
  student_id: "uuid-student-1",
  amount: 50000,
  status: "pending",
  due_date: "2024-03-31",
  paid_date: null,
  description: "Spring Semester 2024",
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-01T00:00:00Z")
})

// Indexes
db.fees.createIndex({ student_id: 1 });
db.fees.createIndex({ status: 1 });
db.fees.createIndex({ due_date: 1 });
db.fees.createIndex({ student_id: 1, due_date: 1 });
```

**Status Values**: `pending`, `paid`, `overdue`, `partial`

---

### 9. Complaints Collection

**Purpose**: Store student complaints

```javascript
db.complaints.insertOne({
  _id: "uuid-complaint-1",
  student_id: "uuid-student-1",
  title: "Missing Certificate",
  category: "Academic",
  description: "My degree certificate is still missing",
  status: "pending",
  reply: null,
  createdAt: ISODate("2024-01-10T14:30:00Z"),
  updatedAt: ISODate("2024-01-10T14:30:00Z")
})

// Indexes
db.complaints.createIndex({ student_id: 1 });
db.complaints.createIndex({ status: 1 });
db.complaints.createIndex({ category: 1 });
db.complaints.createIndex({ createdAt: -1 });
```

**Categories**: Facilities, Academic, Administration, Transportation, Other  
**Status**: pending, resolved

---

### 10. Notifications Collection

**Purpose**: Store system notifications

```javascript
db.notifications.insertOne({
  _id: "uuid-notification-1",
  user_id: "uuid-1",
  title: "Fee Due",
  message: "Your semester fee is due on 2024-03-31",
  type: "fee_reminder",
  read: false,
  createdAt: ISODate("2024-01-15T10:00:00Z"),
  updatedAt: ISODate("2024-01-15T10:00:00Z")
})

// Indexes
db.notifications.createIndex({ user_id: 1, read: 1 });
db.notifications.createIndex({ user_id: 1, createdAt: -1 });
```

**Types**: attendance_alert, fee_reminder, grade_posted, complaint_resolved, etc.

---

### 11. FYP Groups Collection

**Purpose**: Store Final Year Project groups

```javascript
db.fyp_groups.insertOne({
  _id: "uuid-fyp-1",
  group_name: "Group A",
  student_ids: ["uuid-student-1", "uuid-student-2", "uuid-student-3"],
  supervisor_id: "uuid-teacher-1",
  title: "AI-based Attendance System",
  description: "A project to automate attendance using facial recognition",
  status: "in_progress",
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-01T00:00:00Z")
})

// Indexes
db.fyp_groups.createIndex({ student_ids: 1 });
db.fyp_groups.createIndex({ supervisor_id: 1 });
```

---

### 12. FYP Submissions Collection

**Purpose**: Store FYP project submissions

```javascript
db.fyp_submissions.insertOne({
  _id: "uuid-submission-1",
  fyp_group_id: "uuid-fyp-1",
  submission_title: "Phase 1 - Requirements Analysis",
  submission_url: "https://example.com/submissions/phase1.pdf",
  feedback: "Good work! Please improve the UI.",
  status: "submitted",
  createdAt: ISODate("2024-02-15T10:00:00Z"),
  updatedAt: ISODate("2024-02-15T10:00:00Z")
})

// Indexes
db.fyp_submissions.createIndex({ fyp_group_id: 1 });
db.fyp_submissions.createIndex({ createdAt: -1 });
```

---

### 13. Degrees Collection

**Purpose**: Store degree program information

```javascript
db.degrees.insertOne({
  _id: "uuid-degree-1",
  code: "BSCS",
  name: "Bachelor of Science in Computer Science",
  level: "Undergraduate",
  duration_years: 4,
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-01T00:00:00Z")
})

// Indexes
db.degrees.createIndex({ code: 1 }, { unique: true });
```

---

## Index Strategy

### Query Performance Optimization

```javascript
// Single field indexes
db.students.createIndex({ roll_number: 1 });
db.courses.createIndex({ code: 1 });
db.teachers.createIndex({ employee_id: 1 });

// Compound indexes
db.attendance.createIndex({ student_id: 1, course_id: 1 });
db.timetables.createIndex({ day: 1, slot: 1 });
db.fees.createIndex({ student_id: 1, status: 1 });

// Sorted indexes
db.complaints.createIndex({ createdAt: -1 });
db.notifications.createIndex({ user_id: 1, createdAt: -1 });

// Text search indexes (optional)
db.courses.createIndex({ title: "text", description: "text" });
db.complaints.createIndex({ title: "text", description: "text" });
```

### Index Monitoring

```javascript
// View all indexes
db.collection.getIndexes();

// Drop index
db.collection.dropIndex("index_name");

// Rebuild indexes
db.collection.reIndex();
```

---

## Aggregation Pipeline Examples

### Get Student Attendance Summary

```javascript
db.attendance.aggregate([
  {
    $match: {
      student_id: "uuid-student-1",
      course_id: "uuid-course-1"
    }
  },
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 }
    }
  },
  {
    $project: {
      _id: 0,
      status: "$_id",
      count: 1
    }
  }
]);
```

### Get Course Enrollment

```javascript
db.students.aggregate([
  {
    $match: { courses: "uuid-course-1" }
  },
  {
    $group: {
      _id: "$department_id",
      total_students: { $sum: 1 }
    }
  }
]);
```

### Get Pending Complaints by Category

```javascript
db.complaints.aggregate([
  {
    $match: { status: "pending" }
  },
  {
    $group: {
      _id: "$category",
      count: { $sum: 1 }
    }
  },
  {
    $sort: { count: -1 }
  }
]);
```

---

## Data Relationships & Foreign Keys

### Relationship Map

```
User (1) ─→ (Many) Student
User (1) ─→ (Many) Teacher
Department (1) ─→ (Many) Student
Department (1) ─→ (Many) Teacher
Department (1) ─→ (Many) Course
Teacher (1) ─→ (Many) Course
Course (1) ─→ (Many) Attendance
Student (1) ─→ (Many) Attendance
Student (1) ─→ (Many) Fee
Student (1) ─→ (Many) Complaint
Student (1) ─→ (Many) Notification
Course (1) ─→ (Many) Timetable
Teacher (1) ─→ (Many) Timetable
FypGroup (1) ─→ (Many) FypSubmission
Student (Many) ─→ (1) FypGroup
```

---

## Backup & Recovery

### Regular Backups

```bash
# Backup entire database
mongodump --db college-cms --out ./backups/college-cms-backup

# Backup specific collection
mongodump --db college-cms --collection students --out ./backups/students-backup

# Restore from backup
mongorestore --db college-cms ./backups/college-cms-backup/college-cms
```

### Backup Strategy

- **Daily**: Automated daily backups
- **Weekly**: Full database backup
- **Monthly**: Archive to cloud storage
- **Retention**: Keep 6 months of backups

---

## Data Validation & Constraints

### Field Validation

```javascript
// Add schema validation to collection
db.createCollection("students", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["roll_number", "full_name", "email"],
      properties: {
        _id: { bsonType: "string" },
        roll_number: { 
          bsonType: "string",
          pattern: "^[A-Z]{2}-\\d{4}-\\d{3}$"
        },
        full_name: { bsonType: "string" },
        email: { 
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        semester: {
          bsonType: "int",
          minimum: 1,
          maximum: 12
        }
      }
    }
  }
});
```

---

## Query Examples

### Search Operations

```javascript
// Search students by name
db.students.find({ 
  full_name: { $regex: "Ahmed", $options: "i" } 
});

// Get students by department and semester
db.students.find({ 
  department_id: "uuid-dept-1",
  semester: 1
});

// Get courses offered by a teacher
db.courses.find({ 
  teacher_id: "uuid-teacher-1" 
});
```

### Update Operations

```javascript
// Update student enrollment
db.students.updateOne(
  { _id: "uuid-student-1" },
  { 
    $push: { courses: "uuid-course-new" }
  }
);

// Mark attendance
db.attendance.insertOne({
  _id: ObjectId(),
  date: new Date().toISOString().split('T')[0],
  student_id: "uuid-student-1",
  course_id: "uuid-course-1",
  status: "present"
});
```

---

## Performance Monitoring

### Check Slow Queries

```javascript
// Enable profiling
db.setProfilingLevel(1, { slowms: 100 });

// Check profiler data
db.system.profile.find().pretty();

// Analyze query
db.students.find({ department_id: "uuid-dept-1" }).explain("executionStats");
```

---

This comprehensive MongoDB documentation covers all collections, relationships, indexes, and best practices for the College Management System database.
