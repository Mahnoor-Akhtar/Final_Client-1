# College Management System - Complete UML Diagrams & Architecture

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Database Schema (MongoDB)](#database-schema)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [User Roles & Relationships](#user-roles--relationships)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [API Routes](#api-routes)

---

## System Architecture

### Overall System Design

```mermaid
graph TB
    Client["🖥️ Frontend Client<br/>React + Vite + TypeScript"]
    
    Server["🔧 Backend Server<br/>Express.js + Node.js"]
    
    Auth["🔐 Authentication<br/>Passport.js<br/>Google OAuth<br/>JWT"]
    
    DB["💾 MongoDB<br/>College CMS DB"]
    
    Upload["📁 File Storage<br/>Multer<br/>Uploads Folder"]
    
    RealTime["📡 Real-time<br/>Socket.io<br/>Notifications"]
    
    Client -->|HTTP/REST| Server
    Client -->|WebSocket| RealTime
    Server -->|Auth & Session| Auth
    Server -->|Read/Write| DB
    Server -->|File Upload| Upload
    RealTime -->|Events| Client
    
    style Client fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style Server fill:#F5A623,stroke:#D68910,color:#fff
    style Auth fill:#7ED321,stroke:#5BA318,color:#fff
    style DB fill:#BD10E0,stroke:#8B0AA8,color:#fff
    style Upload fill:#FF6B6B,stroke:#C92A2A,color:#fff
    style RealTime fill:#00B4DB,stroke:#0080A0,color:#fff
```

---

## Database Schema

### MongoDB Collections & Relationships

```mermaid
erDiagram
    USER ||--o{ STUDENT : "creates"
    USER ||--o{ TEACHER : "creates"
    STUDENT ||--o{ ATTENDANCE : "marks"
    STUDENT ||--o{ FEE : "pays"
    STUDENT ||--o{ COMPLAINT : "submits"
    STUDENT ||--o{ NOTIFICATION : "receives"
    STUDENT ||--o{ FYPRGROUP : "joins"
    DEPARTMENT ||--o{ STUDENT : "enroll"
    DEPARTMENT ||--o{ TEACHER : "assigns"
    DEPARTMENT ||--o{ COURSE : "offers"
    COURSE ||--o{ TEACHER : "teaches"
    COURSE ||--o{ ATTENDANCE : "tracks"
    COURSE ||--o{ TIMETABLE : "scheduled"
    TIMETABLE ||--o{ STUDENT : "attends"
    TEACHER ||--o{ TIMETABLE : "conducts"
    FYPRGROUP ||--o{ FYPSUBMISSION : "submits"
    STUDENT ||--o{ DEGREE : "pursues"

    USER {
        string _id PK
        string email UK
        string password
        string googleId UK
        string name
        object raw_user_meta_data
        timestamp createdAt
        timestamp updatedAt
    }

    STUDENT {
        string _id PK
        string user_id FK
        string roll_number UK
        string full_name
        string email
        string phone
        string department_id FK
        string degree
        int semester
        string address
        string image_url
        array courses
        timestamp createdAt
        timestamp updatedAt
    }

    TEACHER {
        string _id PK
        string user_id FK
        string employee_id UK
        string full_name
        string email
        string phone
        string department_id FK
        string qualification
        float salary
        timestamp createdAt
        timestamp updatedAt
    }

    DEPARTMENT {
        string _id PK
        string name
        string code UK
        timestamp createdAt
        timestamp updatedAt
    }

    COURSE {
        string _id PK
        string code UK
        string title
        int credit_hours
        int semester
        string degree
        string department_id FK
        string teacher_id FK
        timestamp createdAt
        timestamp updatedAt
    }

    ATTENDANCE {
        string _id PK
        string date
        string student_id FK
        string course_id FK
        string status
        timestamp createdAt
        timestamp updatedAt
    }

    TIMETABLE {
        string _id PK
        string day
        string slot
        string room
        string course_id FK
        string teacher_id FK
        string department_id FK
        timestamp createdAt
        timestamp updatedAt
    }

    FEE {
        string _id PK
        string student_id FK
        float amount
        string status
        string due_date
        string paid_date
        string description
        timestamp createdAt
        timestamp updatedAt
    }

    COMPLAINT {
        string _id PK
        string student_id FK
        string title
        string category
        string description
        string status
        string reply
        timestamp createdAt
        timestamp updatedAt
    }

    NOTIFICATION {
        string _id PK
        string user_id FK
        string title
        string message
        string type
        boolean read
        timestamp createdAt
        timestamp updatedAt
    }

    DEGREE {
        string _id PK
        string code UK
        string name
        string level
        int duration_years
        timestamp createdAt
        timestamp updatedAt
    }

    FYPRGROUP {
        string _id PK
        string group_name
        array student_ids
        string supervisor_id FK
        string title
        string description
        timestamp createdAt
        timestamp updatedAt
    }

    FYPSUBMISSION {
        string _id PK
        string fyp_group_id FK
        string submission_title
        string submission_url
        string feedback
        string status
        timestamp createdAt
        timestamp updatedAt
    }
```

---

## Backend Architecture

### Backend Component Structure

```mermaid
graph TB
    subgraph "API Layer"
        AuthRoute["📍 /auth<br/>- register<br/>- login<br/>- google auth<br/>- logout"]
        DataRoute["📍 /data<br/>- CRUD operations<br/>- All resources"]
    end

    subgraph "Middleware Layer"
        PassportAuth["🔑 Passport<br/>Google OAuth Strategy"]
        JWTAuth["🔑 JWT<br/>Token verification"]
        CORSMiddle["🔒 CORS<br/>Cross-origin requests"]
        MorganLog["📊 Morgan<br/>Request logging"]
    end

    subgraph "Service Layer"
        UserService["👤 User Service<br/>- Create user<br/>- Find user<br/>- Update profile"]
        StudentService["🎓 Student Service<br/>- Manage students<br/>- Assign courses<br/>- Track progress"]
        TeacherService["👨‍🏫 Teacher Service<br/>- Manage teachers<br/>- Assign courses<br/>- Mark attendance"]
        CourseService["📚 Course Service<br/>- Create courses<br/>- Manage curriculum"]
    end

    subgraph "Data Layer"
        MongoDB["🗄️ MongoDB<br/>Collections"]
        Multer["📁 Multer<br/>File uploads"]
    end

    subgraph "Real-time"
        SocketIO["📡 Socket.IO<br/>- Notifications<br/>- Real-time updates<br/>- Chat"]
    end

    AuthRoute --> PassportAuth
    AuthRoute --> JWTAuth
    DataRoute --> CORSMiddle
    DataRoute --> MorganLog
    
    PassportAuth --> UserService
    JWTAuth --> StudentService
    JWTAuth --> TeacherService
    JWTAuth --> CourseService
    
    UserService --> MongoDB
    StudentService --> MongoDB
    TeacherService --> MongoDB
    CourseService --> MongoDB
    
    DataRoute --> Multer
    Multer --> MongoDB
    
    DataRoute --> SocketIO
    SocketIO --> MongoDB

    style AuthRoute fill:#FF6B6B,stroke:#C92A2A,color:#fff
    style DataRoute fill:#FF6B6B,stroke:#C92A2A,color:#fff
    style PassportAuth fill:#7ED321,stroke:#5BA318,color:#fff
    style JWTAuth fill:#7ED321,stroke:#5BA318,color:#fff
    style MongoDB fill:#BD10E0,stroke:#8B0AA8,color:#fff
```

### Backend Request-Response Flow

```mermaid
sequenceDiagram
    participant Client
    participant Express
    participant Middleware as Auth Middleware
    participant Route
    participant Service
    participant MongoDB

    Client->>Express: HTTP Request + JWT Token
    Express->>Middleware: Check CORS & JWT
    
    alt Token Valid
        Middleware->>Route: Pass to Route Handler
        Route->>Service: Call Service Method
        Service->>MongoDB: Query/Write Data
        MongoDB->>Service: Return Data
        Service->>Route: Return Processed Data
        Route->>Express: JSON Response
        Express->>Client: 200 OK + Data
    else Token Invalid
        Middleware->>Express: Unauthorized Error
        Express->>Client: 401 Unauthorized
    end
```

---

## Frontend Architecture

### Frontend Component Hierarchy

```mermaid
graph TB
    App["🎯 App Component<br/>Root Component"]
    
    Layout["📐 Layout<br/>AppSidebar<br/>Main Structure"]
    
    subgraph "Admin Routes"
        Dashboard["📊 Dashboard<br/>Overview stats<br/>Recent activity"]
        Students["🎓 Students Manager<br/>Add/Edit/Delete<br/>Register students"]
        Teachers["👨‍🏫 Teachers Manager<br/>Manage faculty<br/>Assign courses"]
        Courses["📚 Courses Manager<br/>Create courses<br/>Manage curriculum"]
        Degrees["🎖️ Degrees Manager<br/>Degree programs<br/>Semesters"]
    end
    
    subgraph "Academic Routes"
        Attendance["✅ Attendance<br/>Mark attendance<br/>Track records"]
        Timetable["📅 Timetable<br/>View schedule<br/>Class timing"]
        Fees["💰 Fees Manager<br/>Manage payments<br/>Dues tracking"]
        FYP["🔬 FYP Manager<br/>Project groups<br/>Submissions"]
    end
    
    subgraph "Support Routes"
        Complaints["📝 Complaints<br/>Submit issues<br/>Resolve tickets"]
        Settings["⚙️ Settings<br/>User preferences<br/>Profile settings"]
    end
    
    subgraph "UI Components"
        Button["Button"]
        Input["Input"]
        Select["Select"]
        Dialog["Dialog"]
        Card["Card"]
        Table["Table"]
        Badge["Badge"]
    end
    
    App --> Layout
    Layout --> Dashboard
    Layout --> Students
    Layout --> Teachers
    Layout --> Courses
    Layout --> Degrees
    Layout --> Attendance
    Layout --> Timetable
    Layout --> Fees
    Layout --> FYP
    Layout --> Complaints
    Layout --> Settings
    
    Dashboard -.->|uses| Button
    Students -.->|uses| Input
    Teachers -.->|uses| Dialog
    Courses -.->|uses| Table
    Fees -.->|uses| Card
    Complaints -.->|uses| Badge

    style App fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style Layout fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style Dashboard fill:#F5A623,stroke:#D68910,color:#fff
    style Students fill:#F5A623,stroke:#D68910,color:#fff
```

### Frontend Data Flow (React Query)

```mermaid
graph LR
    Component["React Component"]
    
    Query["useQuery Hook<br/>- Fetching<br/>- Caching<br/>- Stale data"]
    
    Mutation["useMutation Hook<br/>- POST/PUT/DELETE<br/>- Optimistic updates<br/>- Error handling"]
    
    QueryClient["Query Client<br/>- Cache manager<br/>- Invalidation<br/>- Synchronization"]
    
    API["API Client<br/>Mern Integration"]
    
    Backend["Backend Server<br/>Express"]
    
    Component -->|useQuery| Query
    Component -->|useMutation| Mutation
    Query -->|manages| QueryClient
    Mutation -->|manages| QueryClient
    Query -->|fetch| API
    Mutation -->|send| API
    API -->|HTTP| Backend
    Backend -->|response| API
    API -->|data| Query
    
    style Component fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style Query fill:#7ED321,stroke:#5BA318,color:#fff
    style Mutation fill:#FF6B6B,stroke:#C92A2A,color:#fff
    style QueryClient fill:#F5A623,stroke:#D68910,color:#fff
```

---

## User Roles & Relationships

### Role-Based Access Control (RBAC)

```mermaid
graph TB
    Admin["👤 Admin<br/>Full Access"]
    Teacher["👨‍🏫 Teacher<br/>Limited Access"]
    Student["🎓 Student<br/>Minimal Access"]
    
    AdminAccess["✅ Can:<br/>- Manage users<br/>- Create courses<br/>- Manage departments<br/>- View all data<br/>- Handle complaints"]
    
    TeacherAccess["✅ Can:<br/>- View students<br/>- Mark attendance<br/>- View timetable<br/>- See their courses<br/>- Resolve complaints"]
    
    StudentAccess["✅ Can:<br/>- View own profile<br/>- Check attendance<br/>- View timetable<br/>- Pay fees<br/>- Submit complaints"]
    
    Admin --> AdminAccess
    Teacher --> TeacherAccess
    Student --> StudentAccess
    
    style Admin fill:#BD10E0,stroke:#8B0AA8,color:#fff
    style Teacher fill:#FF6B6B,stroke:#C92A2A,color:#fff
    style Student fill:#7ED321,stroke:#5BA318,color:#fff
```

---

## Data Flow Diagrams

### Student Registration Flow

```mermaid
sequenceDiagram
    participant S as Student
    participant A as Admin
    participant UI as Frontend
    participant BE as Backend
    participant DB as MongoDB

    A->>UI: Click "Add Student"
    UI->>UI: Open Registration Dialog
    A->>UI: Enter Student Details
    A->>UI: Click "Confirm"
    UI->>BE: POST /data/students
    BE->>DB: Insert Student Record
    DB->>BE: Confirmation
    BE->>UI: 201 Created
    UI->>UI: Close Dialog
    UI->>UI: Refresh Students List
    UI->>S: Toast: Student Added
```

### Course Assignment Flow

```mermaid
sequenceDiagram
    participant S as Student
    participant T as Teacher
    participant A as Admin
    participant UI as Frontend
    participant BE as Backend
    participant DB as MongoDB

    A->>UI: Select Student
    A->>UI: Assign Courses
    A->>UI: Click Save
    UI->>BE: PUT /data/students/:id
    BE->>DB: Update courses array
    DB->>BE: Confirmation
    BE->>UI: 200 OK
    UI->>UI: Invalidate Cache
    T->>UI: View Assigned Students
    UI->>BE: GET /data/students?courses=xyz
    DB->>BE: Return Students
    BE->>UI: Student List
```

### Attendance Marking Flow

```mermaid
sequenceDiagram
    participant T as Teacher
    participant UI as Frontend
    participant BE as Backend
    participant DB as MongoDB
    participant S as Student

    T->>UI: Navigate to Attendance
    UI->>BE: GET /data/courses/:courseId/students
    DB->>BE: Return Enrolled Students
    BE->>UI: Student List
    T->>UI: Mark Attendance
    T->>UI: Submit
    UI->>BE: POST /data/attendance
    BE->>DB: Insert Attendance Record
    DB->>BE: Confirmation
    BE->>UI: Success
    UI->>S: Notify Student
```

### Fee Payment Flow

```mermaid
sequenceDiagram
    participant S as Student
    participant UI as Frontend
    participant BE as Backend
    participant DB as MongoDB

    S->>UI: View Fees
    UI->>BE: GET /data/fees?student_id=xyz
    DB->>BE: Return Fee Records
    BE->>UI: Fee List
    S->>UI: Click Pay Now
    UI->>UI: Open Payment Dialog
    S->>UI: Enter Payment Details
    S->>UI: Confirm Payment
    UI->>BE: PUT /data/fees/:feeId
    BE->>DB: Update Fee Status
    DB->>BE: Confirmation
    BE->>UI: 200 OK
    UI->>S: Toast: Payment Successful
```

---

## API Routes

### Authentication Routes

```mermaid
graph LR
    subgraph "POST Routes"
        Register["POST /auth/register<br/>{ email, password, options }"]
        Login["POST /auth/login<br/>{ email, password }"]
        Logout["POST /auth/logout"]
    end
    
    subgraph "GET Routes"
        GoogleAuth["GET /auth/google"]
        GoogleCallback["GET /auth/google/callback"]
        Session["GET /auth/session"]
    end
    
    style Register fill:#7ED321,stroke:#5BA318,color:#fff
    style Login fill:#7ED321,stroke:#5BA318,color:#fff
    style GoogleAuth fill:#4A90E2,stroke:#2E5C8A,color:#fff
```

### Data Routes

```mermaid
graph LR
    subgraph "Students API"
        GetStudents["GET /data/students"]
        GetStudent["GET /data/students/:id"]
        CreateStudent["POST /data/students"]
        UpdateStudent["PUT /data/students/:id"]
        DeleteStudent["DELETE /data/students/:id"]
    end
    
    subgraph "Teachers API"
        GetTeachers["GET /data/teachers"]
        GetTeacher["GET /data/teachers/:id"]
        CreateTeacher["POST /data/teachers"]
        UpdateTeacher["PUT /data/teachers/:id"]
        DeleteTeacher["DELETE /data/teachers/:id"]
    end
    
    subgraph "Courses API"
        GetCourses["GET /data/courses"]
        GetCourse["GET /data/courses/:id"]
        CreateCourse["POST /data/courses"]
        UpdateCourse["PUT /data/courses/:id"]
        DeleteCourse["DELETE /data/courses/:id"]
    end
    
    subgraph "Attendance API"
        GetAttendance["GET /data/attendance"]
        CreateAttendance["POST /data/attendance"]
        UpdateAttendance["PUT /data/attendance/:id"]
    end
    
    subgraph "Other APIs"
        Timetable["GET/POST /data/timetable"]
        Fees["GET/PUT /data/fees"]
        FYP["GET/POST /data/fyp"]
        Complaints["GET/POST /data/complaints"]
    end

    style GetStudents fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style CreateStudent fill:#7ED321,stroke:#5BA318,color:#fff
    style UpdateStudent fill:#F5A623,stroke:#D68910,color:#fff
    style DeleteStudent fill:#FF6B6B,stroke:#C92A2A,color:#fff
```

---

## Class Diagrams

### Backend Models

```mermaid
classDiagram
    class User {
        -string _id
        -string email
        -string password
        -string googleId
        -string name
        +register()
        +login()
        +updateProfile()
    }
    
    class Student {
        -string _id
        -string user_id
        -string roll_number
        -string full_name
        -string email
        -string department_id
        -array courses
        +enrollCourse()
        +viewAttendance()
        +viewFees()
        +submitComplaint()
    }
    
    class Teacher {
        -string _id
        -string user_id
        -string employee_id
        -string full_name
        -string department_id
        -string qualification
        +markAttendance()
        +createTimetable()
        +viewStudents()
        +resolveComplaints()
    }
    
    class Course {
        -string _id
        -string code
        -string title
        -int credit_hours
        -int semester
        -string teacher_id
        -string department_id
        +addStudent()
        +removeStudent()
        +assignTeacher()
    }
    
    class Department {
        -string _id
        -string name
        -string code
        +getStudents()
        +getTeachers()
        +getCourses()
    }
    
    class Attendance {
        -string _id
        -string student_id
        -string course_id
        -string date
        -string status
        +markPresent()
        +markAbsent()
        +getAttendanceReport()
    }
    
    class Fee {
        -string _id
        -string student_id
        -float amount
        -string status
        -string due_date
        +recordPayment()
        +generateInvoice()
        +sendReminder()
    }
    
    class Complaint {
        -string _id
        -string student_id
        -string title
        -string category
        -string status
        -string reply
        +submit()
        +resolve()
        +trackStatus()
    }
    
    User <|-- Student
    User <|-- Teacher
    Student "*" -- "1" Department
    Teacher "*" -- "1" Department
    Course "*" -- "1" Department
    Course "*" -- "1" Teacher
    Student "1" -- "*" Attendance
    Course "1" -- "*" Attendance
    Student "1" -- "*" Fee
    Student "1" -- "*" Complaint
    
    style User fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style Student fill:#7ED321,stroke:#5BA318,color:#fff
    style Teacher fill:#F5A623,stroke:#D68910,color:#fff
    style Course fill:#FF6B6B,stroke:#C92A2A,color:#fff
```

---

## Deployment Architecture

```mermaid
graph TB
    Git["📦 GitHub<br/>Version Control"]
    
    subgraph "Frontend Deployment"
        FrontendBuild["🏗️ Vite Build<br/>React Bundle"]
        FrontendHosting["🌐 Hosting<br/>Vercel/Netlify"]
    end
    
    subgraph "Backend Deployment"
        BackendCode["🔧 Express Server<br/>Node.js App"]
        BackendHost["🖥️ Hosting<br/>Heroku/AWS"]
    end
    
    subgraph "Database"
        MongoAtlas["💾 MongoDB Atlas<br/>Cloud Database"]
    end
    
    subgraph "Storage"
        CloudStorage["☁️ Cloud Storage<br/>S3/Firebase"]
    end
    
    Git -->|Clone & Build| FrontendBuild
    FrontendBuild -->|Deploy| FrontendHosting
    
    Git -->|Clone & Run| BackendCode
    BackendCode -->|Deploy| BackendHost
    
    BackendHost -->|Connect| MongoAtlas
    BackendHost -->|Upload| CloudStorage
    FrontendHosting -->|API Calls| BackendHost
    
    style Git fill:#333,stroke:#000,color:#fff
    style FrontendBuild fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style BackendCode fill:#F5A623,stroke:#D68910,color:#fff
    style MongoAtlas fill:#BD10E0,stroke:#8B0AA8,color:#fff
```

---

## Security Architecture

```mermaid
graph TB
    Request["🌐 Incoming Request"]
    
    CORS["🔒 CORS Check<br/>Allowed Origins"]
    JWT["🔑 JWT Validation<br/>Token Verify"]
    Passport["🛡️ Passport Auth<br/>Google OAuth"]
    RateLimit["⏱️ Rate Limiting<br/>DDoS Protection"]
    Validation["✓ Input Validation<br/>Zod Schema"]
    Authorization["👤 Role Check<br/>RBAC"]
    
    Request -->|Check| CORS
    CORS -->|Valid| JWT
    JWT -->|Valid| Passport
    Passport -->|Valid| RateLimit
    RateLimit -->|Check| Validation
    Validation -->|Valid| Authorization
    Authorization -->|Authorized| Process["✅ Process Request"]
    
    style Request fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style CORS fill:#7ED321,stroke:#5BA318,color:#fff
    style JWT fill:#7ED321,stroke:#5BA318,color:#fff
    style Authorization fill:#FF6B6B,stroke:#C92A2A,color:#fff
    style Process fill:#7ED321,stroke:#5BA318,color:#fff
```

---

## Technology Stack

### Frontend Stack
- **Framework**: React 18+
- **Build Tool**: Vite
- **Language**: TypeScript
- **State Management**: TanStack React Query
- **Routing**: TanStack Router
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Toast**: Sonner

### Backend Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: Passport.js (Google OAuth), JWT
- **File Upload**: Multer
- **Real-time**: Socket.io
- **Validation**: Zod
- **Logging**: Morgan
- **CORS**: Express CORS

### DevOps & Deployment
- **Version Control**: Git/GitHub
- **Package Manager**: npm
- **Database Hosting**: MongoDB Atlas
- **Server Hosting**: AWS/Heroku
- **Frontend Hosting**: Vercel/Netlify
- **File Storage**: AWS S3/Firebase Storage

---

## Database Indexes

### Recommended MongoDB Indexes

```javascript
// User Collection
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ googleId: 1 }, { sparse: true });

// Student Collection
db.students.createIndex({ roll_number: 1 }, { unique: true });
db.students.createIndex({ email: 1 });
db.students.createIndex({ department_id: 1 });
db.students.createIndex({ courses: 1 });

// Teacher Collection
db.teachers.createIndex({ employee_id: 1 }, { unique: true });
db.teachers.createIndex({ department_id: 1 });
db.teachers.createIndex({ email: 1 });

// Course Collection
db.courses.createIndex({ code: 1 });
db.courses.createIndex({ teacher_id: 1 });
db.courses.createIndex({ department_id: 1 });

// Attendance Collection
db.attendance.createIndex({ student_id: 1 });
db.attendance.createIndex({ course_id: 1 });
db.attendance.createIndex({ date: 1 });

// Timetable Collection
db.timetables.createIndex({ day: 1, slot: 1 });
db.timetables.createIndex({ room: 1 });
db.timetables.createIndex({ teacher_id: 1 });

// Fee Collection
db.fees.createIndex({ student_id: 1 });
db.fees.createIndex({ status: 1 });

// Complaint Collection
db.complaints.createIndex({ student_id: 1 });
db.complaints.createIndex({ status: 1 });
```

---

## API Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Value",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {}
  }
}
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Google
    participant MongoDB

    User->>Frontend: Click "Login with Google"
    Frontend->>Google: Redirect to Google OAuth
    Google->>User: Consent Page
    User->>Google: Grant Permission
    Google->>Frontend: Authorization Code
    Frontend->>Backend: POST /auth/google/callback
    Backend->>Google: Verify Authorization Code
    Google->>Backend: User Info
    Backend->>MongoDB: Check/Create User
    MongoDB->>Backend: User Record
    Backend->>Frontend: JWT Token
    Frontend->>Frontend: Store Token (localStorage)
    Frontend->>User: Redirect to App
```

---

## Monitoring & Logging

### Logging Strategy
- **Request Logs**: Morgan middleware for all HTTP requests
- **Error Logs**: Centralized error handling
- **Database Logs**: MongoDB logging
- **Application Logs**: Winston or similar

### Metrics to Monitor
- API response time
- Database query performance
- User authentication events
- File upload statistics
- Real-time connection status
- System resource usage

---

This documentation provides a complete overview of your College Management System architecture, including all components, relationships, and data flows.
