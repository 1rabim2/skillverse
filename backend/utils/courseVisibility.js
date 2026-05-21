function publicTutorCourseFilter() {
  return {
    $and: [
      { $or: [{ status: 'published' }, { status: { $exists: false } }] },
      { isApproved: true },
      { instructorId: { $exists: true, $ne: null } }
    ]
  };
}

function isPublicTutorCourse(course) {
  if (!course) return false;
  const status = String(course.status || '').trim();
  if (status && status !== 'published') return false;
  if (course.isApproved !== true) return false;
  return !!course.instructorId;
}

function displayCourseTitle(title, fallback = 'Course') {
  return String(title || fallback).replace(/\s+\(Copy\)$/i, '');
}

module.exports = {
  publicTutorCourseFilter,
  isPublicTutorCourse,
  displayCourseTitle
};
