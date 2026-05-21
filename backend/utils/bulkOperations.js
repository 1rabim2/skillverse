/**
 * Bulk Operations Utilities
 * Handles batch operations for admin management
 */

const performBulkUserOperation = async (User, userIds, operation, data) => {
  /**
   * Perform bulk operations on multiple users
   * Operations: 'suspend', 'activate', 'delete', 'updateRole', 'sendEmail'
   */
  const results = {
    successful: [],
    failed: [],
    errors: []
  };

  for (const userId of userIds) {
    try {
      let result;

      switch (operation) {
        case 'suspend':
          result = await User.findByIdAndUpdate(userId, { isActive: false }, { new: true });
          results.successful.push({ userId, action: 'suspended', user: result });
          break;

        case 'activate':
          result = await User.findByIdAndUpdate(userId, { isActive: true }, { new: true });
          results.successful.push({ userId, action: 'activated', user: result });
          break;

        case 'delete':
          result = await User.findByIdAndDelete(userId);
          results.successful.push({ userId, action: 'deleted', user: result });
          break;

        case 'updateRole':
          if (!data.role) throw new Error('Role is required');
          result = await User.findByIdAndUpdate(userId, { role: data.role }, { new: true });
          results.successful.push({ userId, action: 'role_updated', user: result });
          break;

        case 'addToBatch':
          result = await User.findByIdAndUpdate(userId, { batchId: data.batchId }, { new: true });
          results.successful.push({ userId, action: 'added_to_batch', user: result });
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      results.failed.push(userId);
      results.errors.push({ userId, error: error.message });
    }
  }

  return {
    ...results,
    summary: {
      total: userIds.length,
      successful: results.successful.length,
      failed: results.failed.length
    }
  };
};

const performBulkCourseOperation = async (Course, courseIds, operation, data) => {
  /**
   * Perform bulk operations on multiple courses
   * Operations: 'publish', 'unpublish', 'archive', 'updateCategory', 'assignInstructor'
   */
  const results = {
    successful: [],
    failed: [],
    errors: []
  };

  for (const courseId of courseIds) {
    try {
      let result;

      switch (operation) {
        case 'publish':
          result = await Course.findByIdAndUpdate(courseId, { status: 'published' }, { new: true });
          results.successful.push({ courseId, action: 'published', course: result });
          break;

        case 'unpublish':
          result = await Course.findByIdAndUpdate(courseId, { status: 'draft' }, { new: true });
          results.successful.push({ courseId, action: 'unpublished', course: result });
          break;

        case 'archive':
          result = await Course.findByIdAndUpdate(courseId, { status: 'archived' }, { new: true });
          results.successful.push({ courseId, action: 'archived', course: result });
          break;

        case 'updateCategory':
          if (!data.category) throw new Error('Category is required');
          result = await Course.findByIdAndUpdate(courseId, { category: data.category }, { new: true });
          results.successful.push({ courseId, action: 'category_updated', course: result });
          break;

        case 'assignInstructor':
          if (!data.instructorId) throw new Error('Instructor ID is required');
          result = await Course.findByIdAndUpdate(courseId, { instructorId: data.instructorId }, { new: true });
          results.successful.push({ courseId, action: 'instructor_assigned', course: result });
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      results.failed.push(courseId);
      results.errors.push({ courseId, error: error.message });
    }
  }

  return {
    ...results,
    summary: {
      total: courseIds.length,
      successful: results.successful.length,
      failed: results.failed.length
    }
  };
};

const exportUserData = (users, format = 'csv') => {
  /**
   * Export user data in various formats
   */
  if (format === 'csv') {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Active', 'Verified', 'Join Date', 'Last Activity'];
    const rows = users.map(u => [
      u._id,
      u.name || '',
      u.email,
      u.role,
      u.isActive ? 'Yes' : 'No',
      u.isVerified ? 'Yes' : 'No',
      new Date(u.createdAt).toLocaleDateString(),
      u.lastActivityDate ? new Date(u.lastActivityDate).toLocaleDateString() : 'Never'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csvContent;
  }

  if (format === 'json') {
    return JSON.stringify(users, null, 2);
  }

  throw new Error(`Unsupported format: ${format}`);
};

const buildAdvancedFilter = (filters) => {
  /**
   * Build MongoDB query from UI filters
   * Example filters: { role: 'student', isActive: true, status: 'verified', level: 'intermediate' }
   */
  const query = {};

  if (filters.role) query.role = filters.role;
  if (filters.isActive !== undefined) query.isActive = filters.isActive;
  if (filters.isVerified !== undefined) query.isVerified = filters.isVerified;
  if (filters.status) query.status = filters.status;

  // Date range filtering
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
  }

  // Text search
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } },
      { headline: { $regex: filters.search, $options: 'i' } }
    ];
  }

  // Category/Level filtering
  if (filters.category) query.category = filters.category;
  if (filters.level) query.level = filters.level;

  // Enrollment status
  if (filters.enrollmentStatus) {
    if (filters.enrollmentStatus === 'enrolled') {
      query.enrolledCourses = { $exists: true, $ne: [] };
    } else if (filters.enrollmentStatus === 'not-enrolled') {
      query.enrolledCourses = { $exists: false };
    }
  }

  return query;
};

const buildSortOptions = (sortBy = 'newest', order = 'desc') => {
  /**
   * Build sort options for various sorting preferences
   */
  const sortMap = {
    'newest': { createdAt: order === 'desc' ? -1 : 1 },
    'oldest': { createdAt: order === 'asc' ? -1 : 1 },
    'name-az': { name: 1 },
    'name-za': { name: -1 },
    'active': { isActive: -1 },
    'inactive': { isActive: 1 },
    'xp': { xp: -1 },
    'progress': { 'progress.percent': -1 },
    'most-enrolled': { enrolledCourses: -1 }
  };

  return sortMap[sortBy] || sortMap.newest;
};

const createUserSegment = (users, filters) => {
  /**
   * Create a segment of users based on filters for targeted campaigns
   */
  const segmentedUsers = users.filter(user => {
    if (filters.role && user.role !== filters.role) return false;
    if (filters.isActive !== undefined && user.isActive !== filters.isActive) return false;
    if (filters.minXP && (user.xp || 0) < filters.minXP) return false;
    if (filters.maxXP && (user.xp || 0) > filters.maxXP) return false;
    if (filters.minCourses && user.enrolledCourses.length < filters.minCourses) return false;
    if (filters.maxCourses && user.enrolledCourses.length > filters.maxCourses) return false;
    return true;
  });

  return {
    segmentName: filters.name || 'Custom Segment',
    userCount: segmentedUsers.length,
    users: segmentedUsers,
    filters,
    createdAt: new Date()
  };
};

const sendBulkEmail = async (emailService, userIds, users, emailTemplate, subject) => {
  /**
   * Send bulk emails to multiple users
   * Would integrate with email service (SendGrid, etc.)
   */
  const results = {
    sent: [],
    failed: [],
    errors: []
  };

  for (const userId of userIds) {
    try {
      const user = users.find(u => String(u._id) === String(userId));
      if (!user || !user.email) throw new Error('User or email not found');

      // Here you would call your email service
      // const response = await emailService.send({
      //   to: user.email,
      //   subject,
      //   html: emailTemplate
      // });

      results.sent.push({ userId, email: user.email });
    } catch (error) {
      results.failed.push(userId);
      results.errors.push({ userId, error: error.message });
    }
  }

  return {
    ...results,
    summary: {
      total: userIds.length,
      sent: results.sent.length,
      failed: results.failed.length
    }
  };
};

module.exports = {
  performBulkUserOperation,
  performBulkCourseOperation,
  exportUserData,
  buildAdvancedFilter,
  buildSortOptions,
  createUserSegment,
  sendBulkEmail
};
