import { DataTypes } from "sequelize";
import { randomUUID } from "crypto";
import { sequelize } from "../db.js";

// ---------- Common helpers ----------
const idCol = () => ({
  type: DataTypes.STRING(128),
  primaryKey: true,
  defaultValue: () => randomUUID(),
});

const defaultOpts = {
  timestamps: true,
  freezeTableName: true,
};

// ---------- Sequelize model definitions ----------
const SUser = sequelize.define(
  "users",
  {
    id: idCol(),
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING },
    googleId: { type: DataTypes.STRING, unique: true },
    name: { type: DataTypes.STRING },
    raw_user_meta_data: { type: DataTypes.JSONB, defaultValue: {} },
  },
  defaultOpts
);

const SDepartment = sequelize.define(
  "departments",
  {
    id: idCol(),
    name: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false },
  },
  defaultOpts
);

const SStudent = sequelize.define(
  "students",
  {
    id: idCol(),
    user_id: { type: DataTypes.STRING },
    roll_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    full_name: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING },
    department_id: { type: DataTypes.STRING },
    degree: { type: DataTypes.STRING },
    semester: { type: DataTypes.INTEGER, defaultValue: 1 },
    address: { type: DataTypes.STRING },
    image_url: { type: DataTypes.TEXT },
    courses: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  },
  defaultOpts
);

const STeacher = sequelize.define(
  "teachers",
  {
    id: idCol(),
    user_id: { type: DataTypes.STRING },
    employee_id: { type: DataTypes.STRING, allowNull: false, unique: true },
    full_name: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING },
    department_id: { type: DataTypes.STRING },
    qualification: { type: DataTypes.STRING },
    salary: { type: DataTypes.FLOAT, defaultValue: 0 },
  },
  defaultOpts
);

const SCourse = sequelize.define(
  "courses",
  {
    id: idCol(),
    code: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    credit_hours: { type: DataTypes.INTEGER, allowNull: false },
    semester: { type: DataTypes.INTEGER, allowNull: false },
    degree: { type: DataTypes.STRING, allowNull: false },
    department_id: { type: DataTypes.STRING },
    teacher_id: { type: DataTypes.STRING },
  },
  defaultOpts
);

const SAttendance = sequelize.define(
  "attendance",
  {
    id: idCol(),
    date: { type: DataTypes.STRING, allowNull: false },
    student_id: { type: DataTypes.STRING, allowNull: false },
    course_id: { type: DataTypes.STRING, allowNull: false },
    status: {
      type: DataTypes.ENUM("present", "absent", "late"),
      defaultValue: "present",
    },
  },
  defaultOpts
);

const STimetable = sequelize.define(
  "timetables",
  {
    id: idCol(),
    day: { type: DataTypes.STRING, allowNull: false },
    slot: { type: DataTypes.STRING, allowNull: false },
    room: { type: DataTypes.STRING, allowNull: false },
    course_id: { type: DataTypes.STRING, allowNull: false },
    teacher_id: { type: DataTypes.STRING, allowNull: false },
    department_id: { type: DataTypes.STRING, allowNull: false },
  },
  defaultOpts
);

const SFee = sequelize.define(
  "fees",
  {
    id: idCol(),
    student_id: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    due_date: { type: DataTypes.STRING, allowNull: false },
    status: {
      type: DataTypes.ENUM("pending", "paid"),
      defaultValue: "pending",
    },
    paid_at: { type: DataTypes.STRING },
    method: { type: DataTypes.STRING },
  },
  defaultOpts
);

const SFypGroup = sequelize.define(
  "fyp_groups",
  {
    id: idCol(),
    group_name: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    abstract: { type: DataTypes.TEXT },
    members: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    supervisor_id: { type: DataTypes.STRING },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      defaultValue: "pending",
    },
  },
  defaultOpts
);

const SFypSubmission = sequelize.define(
  "fyp_submissions",
  {
    id: idCol(),
    group_id: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    file_name: { type: DataTypes.STRING, allowNull: false },
    file_path: { type: DataTypes.TEXT },
    github_link: { type: DataTypes.TEXT },
    submitted_at: {
      type: DataTypes.STRING,
      defaultValue: () => new Date().toISOString(),
    },
    comments: { type: DataTypes.TEXT },
    grade: { type: DataTypes.STRING },
  },
  defaultOpts
);

const SComplaint = sequelize.define(
  "complaints",
  {
    id: idCol(),
    student_id: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM("pending", "resolved"),
      defaultValue: "pending",
    },
    reply: { type: DataTypes.TEXT },
  },
  defaultOpts
);

const SNotification = sequelize.define(
  "notifications",
  {
    id: idCol(),
    user_id: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    read: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  defaultOpts
);

const SDegree = sequelize.define(
  "degrees",
  {
    id: idCol(),
    name: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false },
    duration_years: { type: DataTypes.INTEGER, defaultValue: 4 },
  },
  defaultOpts
);

const SUserRole = sequelize.define(
  "user_roles",
  {
    id: idCol(),
    user_id: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM("admin", "teacher", "student"),
      allowNull: false,
    },
  },
  defaultOpts
);

// ---------- Mongoose-like wrapper ----------
// Converts a Sequelize instance/object to a plain doc with _id alias.
function toDoc(instance) {
  if (!instance) return null;
  const j = typeof instance.toJSON === "function" ? instance.toJSON() : { ...instance };
  if (j && j.id !== undefined) j._id = j.id;
  return j;
}

// Translate _id -> id in filter objects (Mongo style -> SQL column).
function normalizeFilter(filter = {}) {
  const out = { ...filter };
  if (out._id !== undefined) {
    out.id = out._id;
    delete out._id;
  }
  // Cast common boolean strings (from query string params) to native types.
  for (const k of Object.keys(out)) {
    if (out[k] === "true") out[k] = true;
    else if (out[k] === "false") out[k] = false;
    if (k === "email" && typeof out[k] === "string") {
      out[k] = out[k].toLowerCase().trim();
    }
  }
  return out;
}

function stripIdAlias(data = {}) {
  if (!data || typeof data !== "object") return data;
  const out = { ...data };
  if (out._id !== undefined) {
    if (out.id === undefined) out.id = out._id;
    delete out._id;
  }
  // Sequelize manages timestamps; ignore any incoming __v.
  delete out.__v;
  return out;
}

class FindQuery {
  constructor(M, where) {
    this.M = M;
    this.where = where;
    this._order = null;
    this._limit = null;
  }
  sort(s) {
    if (!s) return this;
    const colMap = { _id: "id", created_at: "createdAt", updated_at: "updatedAt" };
    this._order = Object.entries(s).map(([k, v]) => [
      colMap[k] || k,
      v === 1 || String(v).toLowerCase() === "asc" ? "ASC" : "DESC",
    ]);
    return this;
  }
  limit(n) {
    if (n) this._limit = parseInt(n, 10);
    return this;
  }
  async exec() {
    const opts = { where: this.where };
    if (this._order) opts.order = this._order;
    if (this._limit) opts.limit = this._limit;
    const rows = await this.M.findAll(opts);
    return rows.map(toDoc);
  }
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
  catch(reject) {
    return this.exec().catch(reject);
  }
}

class FindByIdQuery {
  constructor(M, id) {
    this.M = M;
    this.id = id;
    this._exclude = [];
  }
  select(spec) {
    if (!spec) return this;
    String(spec)
      .split(/\s+/)
      .filter(Boolean)
      .forEach((tok) => {
        if (tok.startsWith("-")) this._exclude.push(tok.slice(1));
      });
    return this;
  }
  async exec() {
    if (!this.id) return null;
    const opts = {};
    if (this._exclude.length) opts.attributes = { exclude: this._exclude };
    const r = await this.M.findByPk(this.id, opts);
    return r ? toDoc(r) : null;
  }
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
  catch(reject) {
    return this.exec().catch(reject);
  }
}

class MModel {
  constructor(M) {
    this.M = M;
  }
  find(filter = {}) {
    return new FindQuery(this.M, normalizeFilter(filter));
  }
  async findOne(filter = {}) {
    const r = await this.M.findOne({ where: normalizeFilter(filter) });
    return toDoc(r);
  }
  findById(id) {
    return new FindByIdQuery(this.M, id);
  }
  async create(data) {
    const r = await this.M.create(stripIdAlias(data));
    return toDoc(r);
  }
  async insertMany(arr) {
    const prepared = (arr || []).map((d) => stripIdAlias(d));
    const rs = await this.M.bulkCreate(prepared, { validate: true });
    return rs.map(toDoc);
  }
  async updateMany(filter, update) {
    const set = update && update.$set ? update.$set : update || {};
    const where = normalizeFilter(filter);
    const cleaned = stripIdAlias(set);
    delete cleaned.id; // never overwrite primary key in bulk update
    const [count] = await this.M.update(cleaned, { where });
    return { matchedCount: count, modifiedCount: count, acknowledged: true };
  }
  async deleteMany(filter) {
    const where = normalizeFilter(filter);
    const count = await this.M.destroy({ where });
    return { deletedCount: count, acknowledged: true };
  }
  async countDocuments(filter = {}) {
    return this.M.count({ where: normalizeFilter(filter) });
  }
}

// ---------- Public exports (same names as before) ----------
export const User = new MModel(SUser);
export const Department = new MModel(SDepartment);
export const Student = new MModel(SStudent);
export const Teacher = new MModel(STeacher);
export const Course = new MModel(SCourse);
export const Attendance = new MModel(SAttendance);
export const Timetable = new MModel(STimetable);
export const Fee = new MModel(SFee);
export const FypGroup = new MModel(SFypGroup);
export const FypSubmission = new MModel(SFypSubmission);
export const Complaint = new MModel(SComplaint);
export const Notification = new MModel(SNotification);
export const Degree = new MModel(SDegree);
export const UserRole = new MModel(SUserRole);

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

export const sequelizeModels = {
  users: SUser,
  departments: SDepartment,
  students: SStudent,
  teachers: STeacher,
  courses: SCourse,
  attendance: SAttendance,
  timetables: STimetable,
  fees: SFee,
  fyp_groups: SFypGroup,
  fyp_submissions: SFypSubmission,
  complaints: SComplaint,
  notifications: SNotification,
  degrees: SDegree,
  user_roles: SUserRole,
};
