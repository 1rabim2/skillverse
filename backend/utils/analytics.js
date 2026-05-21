/**
 * Analytics Utilities
 * Provides detailed analytics for students, admins, and instructors
 */

const getStudentAnalytics = (user) => {
  /**
   * Comprehensive student analytics dashboard
   */
  if (!user || !user.progress) return null;

  const totalCourses = user.enrolledCourses.length;
  const completedCourses = user.progress.filter(p => p.completedAt).length;
  const inProgressCourses = totalCourses - completedCourses;

  // Calculate average progress
  const avgProgress = totalCourses > 0
    ? Math.round(user.progress.reduce((sum, p) => sum + p.percent, 0) / totalCourses)
    : 0;

  // Learning streak
  const currentStreak = calculateStreak(user);

  // Estimate completion times
  const estimatedCompletionDates = user.progress
    .filter(p => !p.completedAt && p.percent > 0)
    .map(p => ({
      courseId: p.course,
      estimatedDays: Math.ceil((100 - p.percent) / 5), // Rough estimate
      estimatedCompleteDate: new Date(Date.now() + Math.ceil((100 - p.percent) / 5) * 24 * 60 * 60 * 1000)
    }));

  // Time spent analysis
  const totalLessonHours = calculateTotalStudyHours(user);
  const avgLessonsPerDay = calculateAvgLessonsPerDay(user);

  // Quiz performance
  const quizStats = getQuizStatistics(user);

  // XP and badges info
  const xpInfo = {
    totalXP: user.xp || 0,
    xpThisWeek: calculateWeeklyXP(user),
    nextMilestone: getNextXPMilestone(user.xp || 0)
  };

  return {
    overview: {
      totalCourses,
      completedCourses,
      inProgressCourses,
      averageProgress: avgProgress,
      completionRate: totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0
    },
    engagement: {
      currentStreak,
      totalLessonHours,
      averageLessonsPerDay: avgLessonsPerDay,
      lastActivityDate: user.lastActivityDate
    },
    learning: {
      quizStats,
      estimatedCompletionDates: estimatedCompletionDates.slice(0, 5),
      favoriteCategory: getFavoriteCategory(user),
      preferredLearningLevel: getPreferredLevel(user)
    },
    gamification: {
      xp: xpInfo,
      badges: user.badges || [],
      badgeCount: (user.badges || []).length,
      totalBadgesAvailable: 20 // Adjust based on your system
    }
  };
};

const getAdminAnalytics = async (User, Course, Certificate, Payment) => {
  /**
   * System-wide analytics for admin dashboard
   */
  const totalUsers = await User.countDocuments({ role: 'student' });
  const totalInstructors = await User.countDocuments({ role: 'instructor' });
  const totalAdmins = await User.countDocuments({ role: 'admin' });
  const activeUsers = await User.countDocuments({ 
    isActive: true, 
    lastActivityDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  });

  const totalCourses = await Course.countDocuments();
  const publishedCourses = await Course.countDocuments({ status: 'published' });
  const pendingCourses = await Course.countDocuments({ status: 'pending' });

  const totalCertificates = await Certificate.countDocuments();
  const thisMonthCerts = await Certificate.countDocuments({
    issuedAt: { $gte: new Date(new Date().setDate(1)) }
  });

  const totalRevenue = await Payment.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  const monthlyRegistrations = await getMonthlyStats(User, 'createdAt', 12);
  const courseCompletionTrend = await getMonthlyStats(Certificate, 'issuedAt', 12);

  const topCourses = await Course.find({ status: 'published' })
    .sort({ enrollmentCount: -1 })
    .limit(5);

  const userRetentionRate = await calculateRetentionRate(User);

  return {
    users: {
      total: totalUsers,
      instructors: totalInstructors,
      admins: totalAdmins,
      activeThisMonth: activeUsers,
      retentionRate: userRetentionRate
    },
    courses: {
      total: totalCourses,
      published: publishedCourses,
      pending: pendingCourses,
      avgEnrollmentsPerCourse: totalCourses > 0 ? Math.round(totalUsers / totalCourses) : 0
    },
    certificates: {
      total: totalCertificates,
      thisMonth: thisMonthCerts,
      completionRate: totalCourses > 0 ? Math.round((totalCertificates / totalCourses) * 100) : 0
    },
    revenue: {
      total: totalRevenue[0]?.total || 0,
      thisMonth: await getMonthlyRevenue(Payment)
    },
    trends: {
      monthlyRegistrations,
      courseCompletion: courseCompletionTrend
    },
    topPerformers: {
      courses: topCourses,
      instructors: [] // Would require more complex query
    }
  };
};

const getInstructorAnalytics = (instructor) => {
  /**
   * Analytics specific to instructor dashboard
   */
  if (!instructor) return null;

  return {
    overview: {
      totalCourses: instructor.myCourses?.length || 0,
      publishedCourses: instructor.myCourses?.filter(c => c.status === 'published').length || 0,
      draftCourses: instructor.myCourses?.filter(c => c.status === 'draft').length || 0,
      totalStudents: calculateTotalStudents(instructor),
      libraryItems: instructor.libraryItems?.length || 0
    }
  };
};

const getMonthlyStats = async (Model, dateField, months) => {
  const stats = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    const count = await Model.countDocuments({
      [dateField]: { $gte: startDate, $lt: endDate }
    });

    stats.push({
      month: startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
      count
    });
  }

  return stats;
};

const getMonthlyRevenue = async (Payment) => {
  const startDate = new Date();
  startDate.setDate(1);

  const result = await Payment.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: { _id: null, total: { $sum: '$amount' } }
    }
  ]);

  return result[0]?.total || 0;
};

const calculateStreak = (user) => {
  return user.currentStreak || 0;
};

const calculateTotalStudyHours = (user) => {
  // Rough estimate based on completed lessons
  const totalLessons = user.progress.reduce((sum, p) => {
    return sum + (p.completedLessons?.length || 0);
  }, 0);
  return Math.round(totalLessons * 0.5); // Assume 30 min per lesson
};

const calculateAvgLessonsPerDay = (user) => {
  if (!user.lastActivityDate) return 0;
  const daysSinceJoin = Math.ceil((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
  const totalLessons = user.progress.reduce((sum, p) => sum + (p.completedLessons?.length || 0), 0);
  return (totalLessons / daysSinceJoin).toFixed(2);
};

const getQuizStatistics = (user) => {
  let totalQuizzes = 0;
  let passedQuizzes = 0;
  let totalScore = 0;
  let maxScore = 0;

  user.progress.forEach(p => {
    if (p.quizAttempts) {
      p.quizAttempts.forEach(attempt => {
        totalQuizzes++;
        if (attempt.passed) passedQuizzes++;
        totalScore += attempt.scorePercent;
      });
    }
  });

  return {
    total: totalQuizzes,
    passed: passedQuizzes,
    passRate: totalQuizzes > 0 ? Math.round((passedQuizzes / totalQuizzes) * 100) : 0,
    averageScore: totalQuizzes > 0 ? Math.round(totalScore / totalQuizzes) : 0
  };
};

const calculateWeeklyXP = (user) => {
  // This would require tracking XP history
  // For now, return a portion of total XP
  return Math.round((user.xp || 0) * 0.2);
};

const getNextXPMilestone = (currentXP) => {
  const milestones = [100, 250, 500, 1000, 2500, 5000, 10000];
  return milestones.find(m => m > currentXP) || 10000;
};

const getFavoriteCategory = (user) => {
  // Analyze completed courses to find favorite category
  return 'Web Development'; // Placeholder
};

const getPreferredLevel = (user) => {
  const levels = user.progress.map(p => p.courseLevel || 'beginner');
  return levels[0] || 'beginner';
};

const calculateTotalStudents = (instructor) => {
  // Would need to query enrollments
  return 0;
};

const calculateRetentionRate = async (User) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const usersBefore = await User.countDocuments({ createdAt: { $lte: sixtyDaysAgo } });
  const usersAfter = await User.countDocuments({
    createdAt: { $lte: sixtyDaysAgo },
    lastActivityDate: { $gte: thirtyDaysAgo }
  });

  return usersBefore > 0 ? Math.round((usersAfter / usersBefore) * 100) : 0;
};

module.exports = {
  getStudentAnalytics,
  getAdminAnalytics,
  getInstructorAnalytics
};
