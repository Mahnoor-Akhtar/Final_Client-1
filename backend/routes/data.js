import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { modelsMap } from "../models/index.js";

const router = express.Router();

// Middleware to check if model exists for the table name
const validateTable = (req, res, next) => {
  const { table } = req.params;
  const Model = modelsMap[table];
  if (!Model) {
    return res.status(404).json({ error: { message: `Table/Collection '${table}' not found` } });
  }
  req.Model = Model;
  next();
};

const createAndEmitNotification = async (req, table, action, payload, doc) => {
  const io = req.app.get("io");
  if (!io) return;

  const Notification = modelsMap.notifications;
  const Student = modelsMap.students;
  const Teacher = modelsMap.teachers;
  const Course = modelsMap.courses;
  const FypGroup = modelsMap.fyp_groups;
  const FypSubmission = modelsMap.fyp_submissions;
  const Complaint = modelsMap.complaints;
  const Fee = modelsMap.fees;

  try {
    const send = async (userIdOrEmail, title, message) => {
      if (!userIdOrEmail) return;
      const notif = await Notification.create({
        user_id: userIdOrEmail,
        title,
        message,
        read: false,
      });
      io.to(userIdOrEmail.toLowerCase()).emit("notification", notif);
      io.to(userIdOrEmail).emit("notification", notif);
    };

    const sendToAdmin = async (title, message) => {
      await send("admin", title, message);
      await send("admin@college.edu", title, message);
    };

    if (action === "create") {
      if (table === "attendance") {
        const { student_id, course_id, status, date } = doc;
        if (status === "absent" || status === "late") {
          const student = await Student.findById(student_id);
          const course = await Course.findById(course_id);
          const courseName = course ? course.title : "Course";
          const email = student ? student.email : student_id;
          
          await send(
            email,
            "Attendance Alert",
            `You were marked ${status} in ${courseName} on ${date}.`
          );
        }
      }

      else if (table === "fyp_submissions") {
        const { group_id, title } = doc;
        const group = await FypGroup.findById(group_id);
        if (group) {
          const groupName = group.group_name;
          const supervisorId = group.supervisor_id;
          const supervisor = await Teacher.findById(supervisorId);
          const supervisorEmail = supervisor ? supervisor.email : supervisorId;
          
          await send(
            supervisorEmail,
            "New FYP Deliverable Submitted",
            `Group "${groupName}" has submitted: "${title}".`
          );
        }
      }

      else if (table === "fyp_groups") {
        const { group_name, title, supervisor_id, members } = doc;
        // 1. Notify supervisor teacher
        const supervisor = await Teacher.findById(supervisor_id);
        if (supervisor) {
          await send(
            supervisor.email,
            "New FYP Supervision Request",
            `Group "${group_name}" has requested you as supervisor for their project "${title}".`
          );
        }
        // 2. Notify student members
        if (members && members.length > 0) {
          for (const mId of members) {
            const student = await Student.findById(mId);
            if (student) {
              await send(
                student.email,
                "FYP Request Registered",
                `Your FYP group request for "${title}" has been successfully submitted and is awaiting supervisor approval.`
              );
            }
          }
        }
      }

      else if (table === "fees") {
        const { student_id, title, amount, due_date } = doc;
        const student = await Student.findById(student_id);
        if (student) {
          await send(
            student.email,
            "New Fee Invoice Issued",
            `An invoice of Rs. ${amount} for "${title}" has been issued. Please clear it by ${due_date}.`
          );
        }
      }

      else if (table === "complaints") {
        const { student_id, title } = doc;
        const student = await Student.findById(student_id);
        const studentName = student ? student.full_name : "A student";
        
        await sendToAdmin(
          "New Complaint Filed",
          `${studentName} filed a complaint: "${title}".`
        );
      }
    }

    else if (action === "update") {
      if (table === "fyp_groups") {
        const { status, group_name, members } = doc;
        if (members && members.length > 0) {
          for (const mId of members) {
            const student = await Student.findById(mId);
            const studentEmail = student ? student.email : mId;
            await send(
              studentEmail,
              "FYP Group Status Updated",
              `Your group "${group_name}" application has been ${status}.`
            );
          }
        }
      }

      else if (table === "fyp_submissions") {
        const { group_id, title, grade, comments } = doc;
        const group = await FypGroup.findById(group_id);
        if (group && group.members) {
          for (const mId of group.members) {
            const student = await Student.findById(mId);
            const studentEmail = student ? student.email : mId;
            await send(
              studentEmail,
              "FYP Deliverable Graded",
              `Your deliverable "${title}" has been graded: "${grade}". Remarks: ${comments || "None"}`
            );
          }
        }
      }

      else if (table === "complaints") {
        const { student_id, title, reply, status } = doc;
        const student = await Student.findById(student_id);
        const studentEmail = student ? student.email : student_id;
        
        await send(
          studentEmail,
          "Complaint Status Updated",
          `Your complaint "${title}" is now ${status}. Reply: "${reply || "No reply text provided."}"`
        );
      }

      else if (table === "fees") {
        const { student_id, title, amount, status, method } = doc;
        if (status === "paid") {
          const student = await Student.findById(student_id);
          const studentEmail = student ? student.email : student_id;
          const studentName = student ? student.full_name : "A student";
          
          await send(
            studentEmail,
            "Fee Payment Confirmed",
            `Payment of Rs. ${amount} for "${title}" via ${method || "online"} has been verified.`
          );

          await sendToAdmin(
            "Fee Payment Received",
            `${studentName} (${student ? student.roll_number : student_id}) paid Rs. ${amount} for "${title}" via ${method || "online"}.`
          );
        }
      }
    }
  } catch (err) {
    console.error("Error creating/emitting real-time notification:", err);
  }
};

// GET data (Read)
router.get("/:table", validateTable, async (req, res) => {
  const filters = { ...req.query };
  const orderCol = filters._order;
  const orderAsc = filters._asc !== "false";
  const limit = parseInt(filters._limit);

  delete filters._order;
  delete filters._asc;
  delete filters._limit;

  // Server-side filter to secure notifications by user ID, email, or role
  if (req.params.table === "notifications") {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecure_college_cms_secret_key_12345");
        const userId = decoded.id;
        const userEmail = decoded.email || "";
        
        const UserRole = modelsMap.user_roles;
        const userRoleDoc = await UserRole.findOne({ user_id: userId });
        const role = userRoleDoc ? userRoleDoc.role : "";

        const Notification = modelsMap.notifications;
        const allNotifications = await Notification.find();
        const filtered = allNotifications.filter(n => {
          const target = String(n.user_id || "").toLowerCase();
          return (
            target === String(userId).toLowerCase() ||
            target === String(userEmail).toLowerCase() ||
            target === String(role).toLowerCase()
          );
        });

        // Apply sort order if requested
        if (orderCol) {
          filtered.sort((a, b) => {
            const valA = a[orderCol];
            const valB = b[orderCol];
            if (valA < valB) return orderAsc ? -1 : 1;
            if (valA > valB) return orderAsc ? 1 : -1;
            return 0;
          });
        }
        
        // Apply limit if requested
        const finalDocs = limit ? filtered.slice(0, limit) : filtered;

        return res.status(200).json({
          data: finalDocs,
          count: finalDocs.length,
          error: null,
        });
      } catch (err) {
        console.error("Error decoding token in notifications GET:", err);
      }
    }
  }

  // Adapt queries for specific fields if needed
  // E.g., handling array element matching or exact matching
  try {
    let query = req.Model.find(filters);

    if (orderCol) {
      query = query.sort({ [orderCol]: orderAsc ? 1 : -1 });
    }

    if (limit) {
      query = query.limit(limit);
    }

    const docs = await query;
    // Debug logging: log number of documents and a sample
    if (req.params.table === "teachers") {
      console.log(`🔎 Fetched ${docs.length} teachers`);
      console.log(docs.slice(0, 3)); // log first 3 for inspection
    }
    return res.status(200).json({
      data: docs,
      count: docs.length,
      error: null,
    });
  } catch (error) {
    console.error(`Error reading from ${req.params.table}:`, error);
    return res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// POST data (Create)
router.post("/:table", validateTable, async (req, res) => {
  try {
    const data = req.body;
    let result;

    const table = req.params.table;
    
    // Duplicate project and member check for FYP Groups
    if (table === "fyp_groups") {
      const items = Array.isArray(data) ? data : [data];
      const FypGroup = modelsMap.fyp_groups;
      const allGroups = await FypGroup.find();
      for (const item of items) {
        const titleToCheck = (item.title || "").trim();
        if (titleToCheck) {
          const alreadyApproved = allGroups.find(
            g => g.status === "approved" && g.title.trim().toLowerCase() === titleToCheck.toLowerCase()
          );
          if (alreadyApproved) {
            return res.status(400).json({ error: { message: "This project is already taken" } });
          }
        }
        if (item.members && Array.isArray(item.members)) {
          for (const mId of item.members) {
            const alreadyInGroup = allGroups.find(g => g.members && g.members.includes(mId));
            if (alreadyInGroup) {
              return res.status(400).json({ error: { message: "One of the students is already in a group" } });
            }
          }
        }
      }
    }

    const User = modelsMap.users;
    const UserRole = modelsMap.user_roles;

    const autoCreateUserForProfile = async (profileData, role) => {
      if (!profileData.email) return;
      let user = await User.findOne({ email: profileData.email.toLowerCase() });
      if (!user) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("123456", salt);
        user = await User.create({
          email: profileData.email.toLowerCase(),
          password: hashedPassword,
          raw_user_meta_data: { full_name: profileData.full_name },
        });
        await UserRole.create({
          user_id: user._id,
          role,
        });
        console.log(`Auto-created user for admin-added ${role}: ${profileData.email}`);
      }
      profileData.user_id = user._id;
    };

    if (Array.isArray(data)) {
      if (table === "students") {
        for (const item of data) {
          await autoCreateUserForProfile(item, "student");
        }
      } else if (table === "teachers") {
        for (const item of data) {
          await autoCreateUserForProfile(item, "teacher");
        }
      }
      // Ensure all items have unique String _ids if not provided
      const prepared = data.map((item) => ({
        ...item,
      }));
      result = await req.Model.insertMany(prepared);
    } else {
      if (table === "students") {
        await autoCreateUserForProfile(data, "student");
      } else if (table === "teachers") {
        await autoCreateUserForProfile(data, "teacher");
      }
      const prepared = {
        ...data,
      };
      result = await req.Model.create(prepared);
    }

    // Auto-create profile if inserting a role into user_roles
    if (req.params.table === "user_roles") {
      const userRoleDoc = Array.isArray(result) ? result[0] : result;
      if (userRoleDoc) {
        const { user_id, role } = userRoleDoc;
        const User = modelsMap.users;
        const Student = modelsMap.students;
        const Teacher = modelsMap.teachers;

        const user = await User.findById(user_id);
        if (user) {
          const email = user.email;
          const fullName = user.raw_user_meta_data?.full_name || user.name || email.split("@")[0];

          if (role === "student") {
            const studentExists = await Student.findOne({ user_id });
            if (!studentExists) {
              await Student.create({
                user_id,
                roll_number: "ROLL-" + Math.floor(1000 + Math.random() * 9000),
                full_name: fullName,
                email: email,
                department_id: "dept-cs",
                degree: "BSCS",
                semester: 1,
              });
              console.log(`Auto-created Student profile for registered user: ${email}`);
            }
          } else if (role === "teacher") {
            const teacherExists = await Teacher.findOne({ user_id });
            if (!teacherExists) {
              await Teacher.create({
                user_id,
                employee_id: "EMP-" + Math.floor(1000 + Math.random() * 9000),
                full_name: fullName,
                email: email,
                department_id: "dept-cs",
                qualification: "MS CS",
                salary: 80000,
              });
              console.log(`Auto-created Teacher profile for registered user: ${email}`);
            }
          }
        }
      }
    }

    if (result) {
      const docs = Array.isArray(result) ? result : [result];
      for (const doc of docs) {
        createAndEmitNotification(req, req.params.table, "create", req.body, doc);
      }
    }

    return res.status(200).json({
      data: result,
      error: null,
    });
  } catch (error) {
    console.error(`Error writing to ${req.params.table}:`, error);
    return res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// PUT data (Update)
router.put("/:table", validateTable, async (req, res) => {
  const filters = { ...req.query };
  delete filters._order;
  delete filters._asc;
  delete filters._limit;

  try {
    // If updating a specific ID, MongoDB _id is string
    if (filters.id) {
      filters._id = filters.id;
      delete filters.id;
    }

    const updatePayload = req.body;

    // Validate approval of FYP Group duplicate title
    if (req.params.table === "fyp_groups") {
      const FypGroup = modelsMap.fyp_groups;
      if (updatePayload.status === "approved") {
        const targetGroups = await FypGroup.find(filters);
        for (const targetGroup of targetGroups) {
          const titleToCheck = (targetGroup.title || "").trim();
          if (titleToCheck) {
            const allGroups = await FypGroup.find();
            const alreadyApproved = allGroups.find(
              g => g.id !== targetGroup.id && g.status === "approved" && g.title.trim().toLowerCase() === titleToCheck.toLowerCase()
            );
            if (alreadyApproved) {
              return res.status(400).json({ error: { message: "This project is already taken" } });
            }
          }
        }
      }
    }

    const result = await req.Model.updateMany(filters, { $set: updatePayload });

    // Auto-reject other pending groups with same title upon approval
    if (req.params.table === "fyp_groups" && updatePayload.status === "approved") {
      try {
        const FypGroup = modelsMap.fyp_groups;
        const targetGroups = await FypGroup.find(filters);
        const allGroups = await FypGroup.find();
        for (const targetGroup of targetGroups) {
          const titleToCheck = (targetGroup.title || "").trim();
          if (titleToCheck) {
            const otherPendingGroups = allGroups.filter(
              g => g.id !== targetGroup.id && g.status === "pending" && g.title.trim().toLowerCase() === titleToCheck.toLowerCase()
            );
            for (const pending of otherPendingGroups) {
              await FypGroup.updateMany({ id: pending.id }, { $set: { status: "rejected" } });
              // Send notification to members of auto-rejected group
              if (pending.members && pending.members.length > 0) {
                const Student = modelsMap.students;
                const Notification = modelsMap.notifications;
                const io = req.app.get("io");
                for (const mId of pending.members) {
                  const student = await Student.findById(mId);
                  const studentEmail = student ? student.email : mId;
                  const msg = `Your FYP group request for "${pending.title}" was automatically rejected because the project is already taken.`;
                  const notif = await Notification.create({
                    user_id: studentEmail,
                    title: "FYP Project Taken",
                    message: msg,
                    read: false,
                  });
                  if (io) {
                    io.to(studentEmail.toLowerCase()).emit("notification", notif);
                    io.to(studentEmail).emit("notification", notif);
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to auto-reject other pending groups:", err);
      }
    }

    try {
      const updatedDocs = await req.Model.find(filters);
      for (const doc of updatedDocs) {
        createAndEmitNotification(req, req.params.table, "update", updatePayload, doc);
      }
    } catch (e) {
      console.error("Failed to query updated docs for notification:", e);
    }

    return res.status(200).json({
      data: result,
      error: null,
    });
  } catch (error) {
    console.error(`Error updating table ${req.params.table}:`, error);
    return res.status(500).json({ data: null, error: { message: error.message } });
  }
});

// DELETE data (Delete)
router.delete("/:table", validateTable, async (req, res) => {
  const filters = { ...req.query };
  delete filters._order;
  delete filters._asc;
  delete filters._limit;

  try {
    if (filters.id) {
      filters._id = filters.id;
      delete filters.id;
    }

    const result = await req.Model.deleteMany(filters);
    return res.status(200).json({
      data: result,
      error: null,
    });
  } catch (error) {
    console.error(`Error deleting from table ${req.params.table}:`, error);
    return res.status(500).json({ data: null, error: { message: error.message } });
  }
});

export default router;
