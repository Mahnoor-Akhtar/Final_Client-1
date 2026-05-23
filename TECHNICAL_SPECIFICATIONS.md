# College Management System - Technical Specifications & Implementation Guide

## Project Structure Overview

```
college-cms/
├── backend/
│   ├── models/
│   │   └── index.js              # All MongoDB schemas
│   ├── routes/
│   │   ├── auth.js               # Authentication endpoints
│   │   └── data.js               # CRUD operations
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication
│   │   └── passport.js           # Google OAuth strategy
│   ├── uploads/                  # User file uploads
│   └── server.js                 # Express app setup
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppSidebar.tsx
│   │   │   ├── StudentsManager.tsx
│   │   │   ├── TeachersManager.tsx
│   │   │   ├── CoursesManager.tsx
│   │   │   └── ui/               # shadcn/ui components
│   │   ├── routes/
│   │   │   ├── __root.tsx
│   │   │   ├── app.tsx
│   │   │   ├── login.tsx
│   │   │   ├── app.students.tsx
│   │   │   ├── app.teachers.tsx
│   │   │   ├── app.courses.tsx
│   │   │   ├── app.attendance.tsx
│   │   │   ├── app.timetable.tsx
│   │   │   ├── app.fees.tsx
│   │   │   ├── app.fyp.tsx
│   │   │   ├── app.complaints.tsx
│   │   │   ├── app.degrees.tsx
│   │   │   └── app.settings.tsx
│   │   ├── hooks/
│   │   │   ├── use-auth.ts
│   │   │   ├── use-mobile.tsx
│   │   │   └── use-theme.ts
│   │   ├── integrations/
│   │   │   └── mern/client.ts   # API client
│   │   ├── lib/
│   │   │   └── utils.ts
│   │   ├── main.tsx
│   │   ├── router.tsx
│   │   └── styles.css
│   └── vite.config.ts
│
└── SYSTEM_DESIGN_UML.md
```

---

## Frontend Components Detailed Structure

### 1. StudentsManager Component

**Purpose**: Manage student records (CRUD operations)

**Key Features**:
- Display students in table format
- Search by name, roll number, email
- Filter by department
- Add new student via dialog
- Edit existing student
- Delete student with confirmation
- Real-time validation

**Props & State**:
```typescript
interface Student {
  id: string;
  roll_number: string;
  full_name: string;
  email: string;
  phone?: string;
  department_id?: string;
  degree?: string;
  semester?: number;
  address?: string;
  courses?: string[];
}

const [open, setOpen] = useState(false);
const [editing, setEditing] = useState<Student | null>(null);
const [form, setForm] = useState(initialFormState);
const [search, setSearch] = useState("");
const [deptFilter, setDeptFilter] = useState("all");
```

**API Integration**:
- GET: Fetch all students
- POST: Create new student
- PUT: Update student
- DELETE: Delete student

---

### 2. TeachersManager Component

**Purpose**: Manage teacher records

**Key Features**:
- CRUD operations for teachers
- Assign courses to teachers
- Display qualifications
- Filter by department
- Search functionality

---

### 3. CoursesManager Component

**Purpose**: Manage course catalog

**Key Features**:
- Create courses
- Assign teachers
- Set credit hours & semester
- Link to departments
- Manage prerequisites

---

### 4. AttendanceManager Component

**Purpose**: Mark & track attendance

**Key Features**:
- Select course & date
- Mark students present/absent/late
- Generate attendance reports
- Export records

---

### 5. TimetableManager Component

**Purpose**: Schedule classes

**Key Features**:
- Weekly grid view
- List view
- Assign room & time
- Conflict detection
- View by role (Admin/Teacher/Student)

**Data Structure**:
```typescript
interface Timetable {
  id: string;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  slot: string; // "09:00 AM - 10:30 AM"
  room: string;
  course_id: string;
  teacher_id: string;
  department_id: string;
}
```

---

### 6. FeesManager Component

**Purpose**: Manage student fees

**Key Features**:
- Track fee status (Pending/Paid/Overdue)
- Record payments
- Generate invoices
- Send reminders
- Filter by status

---

### 7. ComplaintsManager Component

**Purpose**: Handle student complaints

**Key Features**:
- Student view: Submit complaints
- Admin view: Resolve complaints
- Category filtering
- Status tracking (Pending/Resolved)

---

### 8. FYPManager Component

**Purpose**: Manage Final Year Projects

**Key Features**:
- Create FYP groups
- Manage submissions
- Track progress
- Assign supervisors

---

## Backend API Endpoints

### Authentication Endpoints

```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
GET    /auth/google
GET    /auth/google/callback
GET    /auth/session
```

### Data Endpoints (CRUD)

```
# Students
GET    /data/students
GET    /data/students/:id
POST   /data/students
PUT    /data/students/:id
DELETE /data/students/:id

# Teachers
GET    /data/teachers
GET    /data/teachers/:id
POST   /data/teachers
PUT    /data/teachers/:id
DELETE /data/teachers/:id

# Courses
GET    /data/courses
GET    /data/courses/:id
POST   /data/courses
PUT    /data/courses/:id
DELETE /data/courses/:id

# Departments
GET    /data/departments
POST   /data/departments
PUT    /data/departments/:id

# Attendance
GET    /data/attendance?student_id=&course_id=&date=
POST   /data/attendance
PUT    /data/attendance/:id

# Timetable
GET    /data/timetable
GET    /data/timetable?day=Monday&room=Room101
POST   /data/timetable
PUT    /data/timetable/:id
DELETE /data/timetable/:id

# Fees
GET    /data/fees?student_id=
POST   /data/fees
PUT    /data/fees/:id

# Complaints
GET    /data/complaints
GET    /data/complaints/:id
POST   /data/complaints
PUT    /data/complaints/:id

# FYP
GET    /data/fyp-groups
POST   /data/fyp-groups
GET    /data/fyp-submissions
POST   /data/fyp-submissions

# Degrees
GET    /data/degrees
POST   /data/degrees

# Notifications
GET    /data/notifications
POST   /data/notifications
PUT    /data/notifications/:id/read
```

---

## Data Flow Examples

### Student Registration Flow

1. **Frontend**: User fills registration form
2. **Validation**: Zod schema validation
3. **API Call**: POST /data/students
4. **Backend**: Validate & insert into DB
5. **Response**: Return created student
6. **Frontend**: Invalidate React Query cache
7. **UI Update**: Show success toast & refresh list

---

### Attendance Marking Flow

1. **Frontend**: Teacher selects course & date
2. **API Call**: GET /data/courses/:id/students
3. **Display**: Show enrolled students
4. **Action**: Teacher marks attendance
5. **API Call**: POST /data/attendance (batch insert)
6. **Backend**: Insert attendance records
7. **Response**: Confirmation
8. **Frontend**: Show success & refresh

---

## Error Handling Strategy

### Backend Error Types

```javascript
// 400 Bad Request
- Invalid input data
- Missing required fields
- Validation errors

// 401 Unauthorized
- Missing JWT token
- Invalid token
- Token expired

// 403 Forbidden
- Insufficient permissions
- Role-based access denied

// 404 Not Found
- Resource not found
- Invalid ID

// 409 Conflict
- Duplicate entry
- Unique constraint violation

// 500 Server Error
- Database errors
- Server crashes
```

### Frontend Error Handling

```typescript
// Example error handling in useMutation
const mutation = useMutation({
  mutationFn: async (data) => {
    const response = await api.post('/endpoint', data);
    return response.data;
  },
  onError: (error: any) => {
    const message = error.response?.data?.error?.message || 'Operation failed';
    toast.error(message);
  },
  onSuccess: (data) => {
    toast.success('Operation successful');
    queryClient.invalidateQueries({ queryKey: ['resource'] });
  }
});
```

---

## Validation Schemas (Zod)

### Student Schema

```typescript
const studentSchema = z.object({
  roll_number: z.string().min(1).max(40),
  full_name: z.string().min(2).max(120),
  email: z.string().email().max(255),
  phone: z.string().max(40).optional().or(z.literal("")),
  department_id: z.string().uuid().nullable(),
  degree: z.string().max(40).optional(),
  semester: z.number().int().min(1).max(12).nullable(),
  address: z.string().max(500).optional(),
  courses: z.array(z.string()).optional(),
});
```

---

## Performance Optimization

### Frontend Optimization

1. **Code Splitting**: Route-based lazy loading
2. **Caching**: React Query for data caching
3. **Memoization**: useMemo & useCallback
4. **Image Optimization**: Lazy load images
5. **Bundle Size**: Tree shaking with Vite

### Backend Optimization

1. **Database Indexes**: Indexed queries on frequently searched fields
2. **Query Optimization**: Select only needed fields
3. **Caching**: Redis for session storage
4. **Pagination**: Limit query results
5. **Connection Pooling**: MongoDB connection pooling

---

## Security Considerations

### Frontend Security

1. **JWT Storage**: Secure token storage
2. **HTTPS**: Always use HTTPS
3. **Input Sanitization**: Validate all inputs
4. **XSS Prevention**: React auto-escaping
5. **CSRF Protection**: Token-based verification

### Backend Security

1. **Password Hashing**: bcryptjs with salt rounds
2. **JWT Secret**: Strong, environment-based
3. **Rate Limiting**: Prevent brute force attacks
4. **Input Validation**: Zod schema validation
5. **CORS**: Whitelist allowed origins
6. **SQL Injection**: Use prepared statements
7. **File Upload**: Validate file types & size

---

## Deployment Checklist

### Pre-Deployment

- [ ] Test all features
- [ ] Run unit tests
- [ ] Check console for errors
- [ ] Review security configurations
- [ ] Database backups
- [ ] SSL certificates
- [ ] Environment variables set
- [ ] API endpoints verified

### Deployment Steps

1. **Frontend**:
   - Run `npm run build`
   - Upload to CDN/hosting
   - Set environment variables
   - Test live URL

2. **Backend**:
   - Pull latest code
   - Install dependencies
   - Run migrations if needed
   - Set environment variables
   - Start server with process manager (PM2)

3. **Database**:
   - Create backup
   - Verify indexes
   - Monitor performance

---

## Maintenance & Monitoring

### Regular Tasks

- Monitor error logs
- Check database performance
- Review failed requests
- Update dependencies
- Security patches
- Database cleanup
- User feedback review

### Monitoring Tools

- **Application Monitoring**: New Relic, DataDog
- **Error Tracking**: Sentry
- **Performance**: Google Lighthouse
- **Uptime**: Pingdom, UptimeRobot
- **Analytics**: Google Analytics

---

## Common Issues & Solutions

### Issue: CORS Error

**Solution**:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

### Issue: Slow Queries

**Solution**: Add indexes
```javascript
db.students.createIndex({ email: 1 });
db.attendance.createIndex({ student_id: 1 });
```

### Issue: Memory Leak

**Solution**: Proper cleanup in useEffect
```typescript
useEffect(() => {
  // Setup
  return () => {
    // Cleanup
  };
}, []);
```

---

## Future Enhancements

1. **Mobile App**: React Native version
2. **Analytics Dashboard**: Advanced insights
3. **Email Notifications**: Automated emails
4. **SMS Alerts**: Attendance & fee reminders
5. **Video Lectures**: Integration with video platform
6. **Online Assessments**: Quiz management
7. **Parent Portal**: Parent access
8. **Mobile App**: iOS/Android native
9. **Advanced Reporting**: Custom reports
10. **AI Integration**: Predictive analytics

---

This technical specification document provides implementation details and guidelines for developing and maintaining the College Management System.
