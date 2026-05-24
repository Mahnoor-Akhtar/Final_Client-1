export const parseCourseIds = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      const trimmed = value.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const inner = trimmed.slice(1, -1);
        if (!inner) return [];
        return inner
          .split(',')
          .map((item) => item.trim().replace(/^"|"$/g, '').replace(/\\"/g, '"').replace(/\\\\/g, '\\'))
          .filter(Boolean);
      }
    }
  }

  return [];
};

export const getTeacherProfile = (teachers: any[], email?: string | null, userId?: string | null) => {
  const normalizedEmail = email?.toLowerCase();
  if (!normalizedEmail && !userId) return null;
  if (normalizedEmail) {
    const byEmail = teachers.find((teacher: any) => teacher.email?.toLowerCase() === normalizedEmail);
    if (byEmail) return byEmail;
  }
  if (userId) {
    const byUserId = teachers.find((teacher: any) => teacher.user_id === userId);
    if (byUserId) return byUserId;
  }
  return null;
};

export const getTeacherCourseIds = (courses: any[], teacherId?: string | null) => {
  if (!teacherId) return [];
  return courses.filter((course: any) => course.teacher_id === teacherId).map((course: any) => course.id);
};

export const getStudentCourseIds = (student: any) => parseCourseIds(student?.courses);

export const getTeacherStudents = (students: any[], teacherCourseIds: string[]) => {
  if (!teacherCourseIds.length) return [];
  return students.filter((student: any) => {
    const studentCourseIds = getStudentCourseIds(student);
    return studentCourseIds.some((courseId) => teacherCourseIds.includes(courseId));
  });
};

export const getComplaintTitle = (complaint: any) => complaint?.title ?? complaint?.subject ?? '';

export const getComplaintReply = (complaint: any) => complaint?.reply ?? complaint?.admin_reply ?? '';

export const getTeacherComplaints = (
  complaints: any[],
  students: any[],
  teacherCourseIds: string[],
  teacherId?: string | null,
) => {
  if (!teacherCourseIds.length && !teacherId) return [];

  const studentToCourses = new Map<string, string[]>();
  students.forEach((student: any) => {
    studentToCourses.set(student.id, getStudentCourseIds(student));
  });

  return complaints.filter((complaint: any) => {
    if (teacherId && complaint.teacher_id === teacherId) return true;
    const studentCourseIds = studentToCourses.get(complaint.student_id) ?? [];
    return studentCourseIds.some((courseId) => teacherCourseIds.includes(courseId));
  });
};