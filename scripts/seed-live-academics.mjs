/**
 * Idempotent academic seed for the live Firebase project.
 *
 * Uses stable document IDs and merge writes. Existing documents outside the
 * `seed_*` namespace are never deleted or replaced.
 */
import admin from 'firebase-admin';
import { readFile } from 'node:fs/promises';

const serviceAccount = JSON.parse(
  await readFile(new URL('../secrets/firebase-service-account.json', import.meta.url), 'utf8'),
);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const { Timestamp, FieldValue } = admin.firestore;

const ORGANIZATION_ID = 'campusnexa';
const ORGANIZATION_SLUG = 'campusnexa';
const ACADEMIC_YEAR = '2026-27';
const now = Timestamp.now();

const departments = [
  { code: 'CSE', name: 'Computer Science & Engineering', building: 'Aryabhatta Block' },
  { code: 'ECE', name: 'Electronics & Communication Engineering', building: 'Tesla Block' },
  { code: 'ME', name: 'Mechanical Engineering', building: 'Vishwakarma Block' },
];

const faculty = [
  ['CSE01', 'Dr. Aditi Sharma', 'aditi.sharma@campusnexa.edu', 'CSE', 'Professor', 'Artificial Intelligence'],
  ['CSE02', 'Dr. Rohan Mehta', 'rohan.mehta@campusnexa.edu', 'CSE', 'Associate Professor', 'Database Systems'],
  ['CSE03', 'Prof. Neha Iyer', 'neha.iyer@campusnexa.edu', 'CSE', 'Assistant Professor', 'Computer Networks'],
  ['ECE01', 'Dr. Vikram Rao', 'vikram.rao@campusnexa.edu', 'ECE', 'Professor', 'Embedded Systems'],
  ['ECE02', 'Dr. Sana Khan', 'sana.khan@campusnexa.edu', 'ECE', 'Associate Professor', 'Signal Processing'],
  ['ECE03', 'Prof. Arjun Nair', 'arjun.nair@campusnexa.edu', 'ECE', 'Assistant Professor', 'VLSI Design'],
  ['ME01', 'Dr. Kavita Menon', 'kavita.menon@campusnexa.edu', 'ME', 'Professor', 'Thermal Engineering'],
  ['ME02', 'Dr. Aman Verma', 'aman.verma@campusnexa.edu', 'ME', 'Associate Professor', 'Machine Design'],
  ['ME03', 'Prof. Ishita Das', 'ishita.das@campusnexa.edu', 'ME', 'Assistant Professor', 'Manufacturing'],
].map(([employeeId, name, email, departmentCode, designation, specialization]) => ({
  id: `seed_faculty_${employeeId.toLowerCase()}`,
  employeeId, name, email, departmentCode, designation, specialization,
}));

const studentNames = [
  ['Aarav', 'Patel'], ['Ananya', 'Singh'], ['Arjun', 'Kapoor'], ['Diya', 'Nair'], ['Ishaan', 'Gupta'], ['Meera', 'Reddy'],
];
const students = departments.flatMap((department, departmentIndex) =>
  studentNames.map(([first, last], index) => {
    const sequence = departmentIndex * studentNames.length + index + 1;
    const enrollmentNumber = `CNX26${department.code}${String(index + 1).padStart(3, '0')}`;
    return {
      id: `seed_student_${department.code.toLowerCase()}_${String(index + 1).padStart(2, '0')}`,
      name: `${first} ${last}`,
      email: `${first}.${last}.${department.code}`.toLowerCase() + '@campusnexa.edu',
      enrollmentNumber,
      departmentCode: department.code,
      semester: 5,
      section: index < 3 ? 'A' : 'B',
      sequence,
    };
  }),
);

const courses = [
  ['CS501', 'Database Management Systems', 'CSE', 4, 'CSE02'],
  ['CS502', 'Operating Systems', 'CSE', 4, 'CSE01'],
  ['CS503', 'Computer Networks', 'CSE', 4, 'CSE03'],
  ['CS504', 'Machine Learning', 'CSE', 3, 'CSE01'],
  ['EC501', 'Digital Signal Processing', 'ECE', 4, 'ECE02'],
  ['EC502', 'Embedded Systems', 'ECE', 4, 'ECE01'],
  ['EC503', 'VLSI Design', 'ECE', 4, 'ECE03'],
  ['EC504', 'Communication Systems', 'ECE', 3, 'ECE02'],
  ['ME501', 'Thermal Engineering', 'ME', 4, 'ME01'],
  ['ME502', 'Machine Design', 'ME', 4, 'ME02'],
  ['ME503', 'Manufacturing Processes', 'ME', 4, 'ME03'],
  ['ME504', 'Industrial Automation', 'ME', 3, 'ME02'],
].map(([code, name, departmentCode, credits, employeeId]) => {
  const instructor = faculty.find((item) => item.employeeId === employeeId);
  return {
    id: `seed_course_${code.toLowerCase()}`,
    code, name, departmentCode, credits, semester: 5,
    facultyId: instructor.id, facultyName: instructor.name,
  };
});

const writes = [];
function merge(collection, id, data) {
  writes.push({ ref: db.collection(collection).doc(id), data, options: { merge: true } });
}

for (const department of departments) {
  const head = faculty.find((item) => item.departmentCode === department.code && item.designation === 'Professor');
  merge('departments', `seed_dept_${department.code.toLowerCase()}`, {
    ...department,
    head: head.name,
    headId: head.id,
    organizationId: ORGANIZATION_ID,
    organizationSlug: ORGANIZATION_SLUG,
    status: 'active',
    updatedAt: now,
  });
}

for (const member of faculty) {
  const department = departments.find((item) => item.code === member.departmentCode);
  merge('users', member.id, {
    uid: member.id,
    fullName: member.name,
    displayName: member.name,
    name: member.name,
    email: member.email,
    role: 'faculty',
    department: department.name,
    departmentCode: department.code,
    organizationId: ORGANIZATION_ID,
    organizationSlug: ORGANIZATION_SLUG,
    profileComplete: true,
    status: 'active',
    updatedAt: now,
  });
  merge('facultyProfiles', member.id, {
    uid: member.id,
    employeeId: member.employeeId,
    designation: member.designation,
    department: department.name,
    departmentCode: department.code,
    specialization: member.specialization,
    qualification: 'Ph.D.',
    yearsOfExperience: 7 + Number(member.employeeId.slice(-1)) * 2,
    phone: `+91 98765 ${String(41000 + Number(member.employeeId.replace(/\D/g, ''))).padStart(5, '0')}`,
    office: `${department.code}-${200 + Number(member.employeeId.slice(-1))}`,
    organizationId: ORGANIZATION_ID,
    status: 'active',
    updatedAt: now,
  });
}

for (const student of students) {
  const department = departments.find((item) => item.code === student.departmentCode);
  merge('users', student.id, {
    uid: student.id,
    fullName: student.name,
    displayName: student.name,
    name: student.name,
    email: student.email,
    enrollmentNumber: student.enrollmentNumber,
    role: 'student',
    department: department.name,
    departmentCode: department.code,
    semester: student.semester,
    section: student.section,
    organizationId: ORGANIZATION_ID,
    organizationSlug: ORGANIZATION_SLUG,
    profileComplete: true,
    status: 'active',
    updatedAt: now,
  });
  merge('studentProfiles', student.id, {
    uid: student.id,
    studentId: student.enrollmentNumber,
    enrollmentNumber: student.enrollmentNumber,
    department: department.name,
    departmentCode: department.code,
    semester: student.semester,
    section: student.section,
    batch: '2024-2028',
    dateOfBirth: `2006-${String((student.sequence % 12) + 1).padStart(2, '0')}-${String((student.sequence % 20) + 5).padStart(2, '0')}`,
    phone: `+91 90000 ${String(10000 + student.sequence).padStart(5, '0')}`,
    guardianName: `Mr. ${student.name.split(' ')[1]}`,
    guardianPhone: `+91 91111 ${String(10000 + student.sequence).padStart(5, '0')}`,
    address: `${20 + student.sequence}, University Enclave, Chandigarh`,
    organizationId: ORGANIZATION_ID,
    status: 'active',
    updatedAt: now,
  });
}

for (const course of courses) {
  const department = departments.find((item) => item.code === course.departmentCode);
  merge('courses', course.id, {
    code: course.code,
    name: course.name,
    description: `${course.name} for Semester ${course.semester} ${department.name} students.`,
    department: department.name,
    departmentCode: department.code,
    semester: course.semester,
    credits: course.credits,
    facultyId: course.facultyId,
    facultyName: course.facultyName,
    academicYear: ACADEMIC_YEAR,
    maxStudents: 60,
    enrolledStudents: students.filter((item) => item.departmentCode === course.departmentCode).length,
    organizationId: ORGANIZATION_ID,
    organizationSlug: ORGANIZATION_SLUG,
    status: 'active',
    updatedAt: now,
  });
  merge('facultyAssignments', `seed_assignment_${course.id}`, {
    facultyId: course.facultyId,
    courseId: course.id,
    semester: course.semester,
    academicYear: ACADEMIC_YEAR,
    organizationId: ORGANIZATION_ID,
    status: 'active',
    assignedAt: now,
  });
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const slots = ['09:00-10:00', '10:00-11:00', '11:00-12:00', '14:00-15:00', '15:00-16:00'];
for (const [courseIndex, course] of courses.entries()) {
  for (let session = 0; session < 3; session += 1) {
    const departmentOffset = departments.findIndex((item) => item.code === course.departmentCode);
    const day = days[(courseIndex + session * 2) % days.length];
    const timeSlot = slots[(courseIndex + departmentOffset + session) % slots.length];
    merge('timetable', `seed_tt_${course.code.toLowerCase()}_${session + 1}`, {
      day,
      timeSlot,
      courseId: course.id,
      courseName: course.name,
      courseCode: course.code,
      facultyId: course.facultyId,
      facultyName: course.facultyName,
      department: departments.find((item) => item.code === course.departmentCode).name,
      departmentCode: course.departmentCode,
      semester: course.semester,
      room: session === 2 ? `${course.departmentCode} Lab-${(courseIndex % 3) + 1}` : `LH-${201 + courseIndex}`,
      organizationId: ORGANIZATION_ID,
      academicYear: ACADEMIC_YEAR,
      updatedAt: now,
    });
  }
}

const examBase = new Date('2026-12-01T10:00:00+05:30');
for (const [courseIndex, course] of courses.entries()) {
  const examDate = new Date(examBase);
  examDate.setDate(examDate.getDate() + courseIndex);
  merge('examSchedules', `seed_exam_${course.code.toLowerCase()}`, {
    courseId: course.id,
    courseCode: course.code,
    courseName: course.name,
    date: Timestamp.fromDate(examDate),
    startTime: courseIndex % 2 === 0 ? '10:00' : '14:00',
    endTime: courseIndex % 2 === 0 ? '13:00' : '17:00',
    room: `Exam Hall ${String.fromCharCode(65 + (courseIndex % 4))}`,
    type: 'End Semester',
    semester: course.semester,
    academicYear: ACADEMIC_YEAR,
    organizationId: ORGANIZATION_ID,
    status: 'scheduled',
    updatedAt: now,
  });
  merge('assignments', `seed_homework_${course.code.toLowerCase()}`, {
    courseId: course.id,
    courseCode: course.code,
    courseName: course.name,
    title: `${course.name} – Applied Problem Set`,
    description: 'Complete all questions and include working, references, and a short reflection.',
    dueDate: Timestamp.fromDate(new Date('2026-10-15T23:59:00+05:30')),
    totalPoints: 100,
    facultyId: course.facultyId,
    organizationId: ORGANIZATION_ID,
    status: 'active',
    updatedAt: now,
  });
}

const gradeScale = [
  { grade: 'A+', points: 10, marks: 94 },
  { grade: 'A', points: 9, marks: 86 },
  { grade: 'B+', points: 8, marks: 79 },
  { grade: 'B', points: 7, marks: 72 },
];
for (const student of students) {
  const studentCourses = courses.filter((course) => course.departmentCode === student.departmentCode);
  for (const [courseIndex, course] of studentCourses.entries()) {
    merge('enrollments', `seed_enrollment_${student.id}_${course.code.toLowerCase()}`, {
      studentId: student.id,
      courseId: course.id,
      semester: student.semester,
      academicYear: ACADEMIC_YEAR,
      organizationId: ORGANIZATION_ID,
      status: 'active',
      enrolledAt: Timestamp.fromDate(new Date('2026-07-15T09:00:00+05:30')),
      updatedAt: now,
    });

    const result = gradeScale[(student.sequence + courseIndex) % gradeScale.length];
    merge('grades', `seed_grade_${student.id}_${course.code.toLowerCase()}`, {
      studentId: student.id,
      courseId: course.id,
      courseCode: course.code,
      courseName: course.name,
      semester: student.semester,
      academicYear: ACADEMIC_YEAR,
      credits: course.credits,
      midtermMarks: Math.round(result.marks * 0.4),
      finalMarks: Math.round(result.marks * 0.6),
      totalMarks: result.marks,
      grade: result.grade,
      gradePoints: result.points,
      status: 'published',
      organizationId: ORGANIZATION_ID,
      updatedAt: now,
    });

    for (let meeting = 0; meeting < 10; meeting += 1) {
      const classDate = new Date('2026-08-03T09:00:00+05:30');
      classDate.setDate(classDate.getDate() + meeting * 3 + courseIndex);
      const absent = (student.sequence + courseIndex * 2 + meeting) % 11 === 0;
      merge('attendance', `seed_attendance_${student.id}_${course.code.toLowerCase()}_${meeting + 1}`, {
        studentId: student.id,
        courseId: course.id,
        courseCode: course.code,
        date: Timestamp.fromDate(classDate),
        status: absent ? 'absent' : 'present',
        markedBy: course.facultyId,
        organizationId: ORGANIZATION_ID,
        academicYear: ACADEMIC_YEAR,
        updatedAt: now,
      });
    }
  }

  const totalFee = 82500;
  const paid = student.sequence % 4 === 0 ? 42500 : totalFee;
  merge('feeRecords', `seed_fee_${student.id}_2026`, {
    studentId: student.id,
    studentName: student.name,
    enrollmentNumber: student.enrollmentNumber,
    academicYear: ACADEMIC_YEAR,
    semester: student.semester,
    feeType: 'Semester Fee',
    amount: totalFee,
    paidAmount: paid,
    balance: totalFee - paid,
    status: paid === totalFee ? 'paid' : 'partial',
    dueDate: Timestamp.fromDate(new Date('2026-08-15T23:59:00+05:30')),
    organizationId: ORGANIZATION_ID,
    updatedAt: now,
  });
}

for (let index = 0; index < writes.length; index += 400) {
  const batch = db.batch();
  for (const write of writes.slice(index, index + 400)) {
    batch.set(write.ref, write.data, write.options);
  }
  await batch.commit();
}

const collections = [
  'users', 'studentProfiles', 'facultyProfiles', 'departments', 'courses',
  'facultyAssignments', 'enrollments', 'timetable', 'attendance', 'grades',
  'assignments', 'examSchedules', 'feeRecords',
];
console.log(`Seeded ${writes.length} linked records into ${serviceAccount.project_id}.`);
for (const collectionName of collections) {
  const snapshot = await db.collection(collectionName).count().get();
  console.log(`${collectionName}: ${snapshot.data().count}`);
}

await admin.app().delete();
