import "dotenv/config";
import { sequelize } from "./db.js";
import { Department, Course } from "./models/index.js";

const departments = [
  { id: "dept-cs",   name: "Computer Science",             code: "CS"   },
  { id: "dept-it",   name: "Information Technology",       code: "IT"   },
  { id: "dept-bba",  name: "Business Administration",      code: "BBA"  },
  { id: "dept-ee",   name: "Electrical Engineering",       code: "EE"   },
  { id: "dept-me",   name: "Mechanical Engineering",       code: "ME"   },
  { id: "dept-ce",   name: "Civil Engineering",            code: "CE"   },
  { id: "dept-math", name: "Mathematics",                  code: "MATH" },
  { id: "dept-phy",  name: "Physics",                      code: "PHY"  },
  { id: "dept-chem", name: "Chemistry",                    code: "CHEM" },
  { id: "dept-bio",  name: "Biology",                      code: "BIO"  },
  { id: "dept-psy",  name: "Psychology",                   code: "PSY"  },
  { id: "dept-eco",  name: "Economics",                    code: "ECO"  },
  { id: "dept-eng",  name: "English Literature",           code: "ENG"  },
  { id: "dept-fin",  name: "Finance",                      code: "FIN"  },
  { id: "dept-ai",   name: "Artificial Intelligence",      code: "AI"   },
];

const courses = [
  { id: "course-1",  code: "CS-101",   title: "Introduction to Programming",      credit_hours: 4, semester: 1, degree: "BSCS",  department_id: "dept-cs"   },
  { id: "course-2",  code: "CS-201",   title: "Data Structures & Algorithms",     credit_hours: 3, semester: 3, degree: "BSCS",  department_id: "dept-cs"   },
  { id: "course-3",  code: "CS-301",   title: "Operating Systems",                credit_hours: 3, semester: 5, degree: "BSCS",  department_id: "dept-cs"   },
  { id: "course-4",  code: "IT-302",   title: "Web Application Development",      credit_hours: 3, semester: 5, degree: "BSIT",  department_id: "dept-it"   },
  { id: "course-5",  code: "IT-201",   title: "Database Management Systems",      credit_hours: 3, semester: 3, degree: "BSIT",  department_id: "dept-it"   },
  { id: "course-6",  code: "BBA-102",  title: "Principles of Management",         credit_hours: 3, semester: 2, degree: "BBA",   department_id: "dept-bba"  },
  { id: "course-7",  code: "BBA-201",  title: "Marketing Management",             credit_hours: 3, semester: 4, degree: "BBA",   department_id: "dept-bba"  },
  { id: "course-8",  code: "EE-101",   title: "Basic Electrical Engineering",     credit_hours: 4, semester: 1, degree: "BSEE",  department_id: "dept-ee"   },
  { id: "course-9",  code: "EE-302",   title: "Power Systems",                    credit_hours: 3, semester: 5, degree: "BSEE",  department_id: "dept-ee"   },
  { id: "course-10", code: "ME-201",   title: "Thermodynamics",                   credit_hours: 3, semester: 3, degree: "BSME",  department_id: "dept-me"   },
  { id: "course-11", code: "MATH-101", title: "Calculus I",                       credit_hours: 3, semester: 1, degree: "BSCS",  department_id: "dept-math" },
  { id: "course-12", code: "AI-401",   title: "Machine Learning",                 credit_hours: 3, semester: 7, degree: "BSAI",  department_id: "dept-ai"   },
  { id: "course-13", code: "AI-301",   title: "Neural Networks & Deep Learning",  credit_hours: 3, semester: 6, degree: "BSAI",  department_id: "dept-ai"   },
  { id: "course-14", code: "FIN-201",  title: "Financial Accounting",             credit_hours: 3, semester: 3, degree: "BBA",   department_id: "dept-fin"  },
  { id: "course-15", code: "ECO-101",  title: "Microeconomics",                   credit_hours: 3, semester: 2, degree: "BBA",   department_id: "dept-eco"  },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to Supabase Postgres.");

    // --- Departments ---
    let deptInserted = 0, deptSkipped = 0;
    for (const d of departments) {
      const existing = await Department.findOne({ id: d.id });
      if (existing) { deptSkipped++; continue; }
      await Department.create(d);
      deptInserted++;
    }
    console.log(`📦 Departments: ${deptInserted} inserted, ${deptSkipped} already existed.`);

    // --- Courses ---
    let courseInserted = 0, courseSkipped = 0;
    for (const c of courses) {
      const existing = await Course.findOne({ id: c.id });
      if (existing) { courseSkipped++; continue; }
      await Course.create(c);
      courseInserted++;
    }
    console.log(`📚 Courses: ${courseInserted} inserted, ${courseSkipped} already existed.`);

    console.log("\n🎉 Seed completed successfully!");
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

seed();
