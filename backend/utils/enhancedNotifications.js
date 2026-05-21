/**
 * Enhanced Notifications System
 * Handles various notification types and preferences
 */

const NOTIFICATION_TYPES = {
  COURSE_MILESTONE: 'course_milestone',
  ASSIGNMENT_DUE: 'assignment_due',
  MENTOR_MESSAGE: 'mentor_message',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  STREAK_WARNING: 'streak_warning',
  COURSE_RECOMMENDATION: 'course_recommendation',
  PROJECT_FEEDBACK: 'project_feedback',
  CERTIFICATE_EARNED: 'certificate_earned',
  SUBSCRIPTION_REMINDER: 'subscription_reminder',
  ADMIN_ANNOUNCEMENT: 'admin_announcement'
};

const createNotification = (userId, type, data) => {
  /**
   * Create a notification for a user
   */
  const templates = {
    [NOTIFICATION_TYPES.COURSE_MILESTONE]: {
      title: `${data.courseName} Milestone Reached!`,
      message: `You've reached ${data.milestone}% completion in ${data.courseName}. Great progress!`,
      icon: '🎯',
      priority: 'medium'
    },
    [NOTIFICATION_TYPES.ASSIGNMENT_DUE]: {
      title: 'Assignment Due Soon',
      message: `${data.assignmentName} is due in ${data.hoursRemaining} hours.`,
      icon: '⏰',
      priority: 'high'
    },
    [NOTIFICATION_TYPES.MENTOR_MESSAGE]: {
      title: `Message from ${data.mentorName}`,
      message: data.preview || 'You have a new message',
      icon: '💬',
      priority: 'high'
    },
    [NOTIFICATION_TYPES.ACHIEVEMENT_UNLOCKED]: {
      title: `Achievement Unlocked: ${data.achievementName}`,
      message: `${data.description}`,
      icon: '🏆',
      priority: 'medium'
    },
    [NOTIFICATION_TYPES.STREAK_WARNING]: {
      title: 'Your Streak is At Risk!',
      message: `You have ${data.hoursRemaining} hours to maintain your ${data.currentStreak}-day streak.`,
      icon: '🔥',
      priority: 'high'
    },
    [NOTIFICATION_TYPES.COURSE_RECOMMENDATION]: {
      title: 'Recommended for You',
      message: `Based on your learning, we think you'd like "${data.courseName}"`,
      icon: '💡',
      priority: 'low'
    },
    [NOTIFICATION_TYPES.PROJECT_FEEDBACK]: {
      title: 'Feedback on Your Project',
      message: `Instructor feedback received: ${data.preview || 'Check your project'}`,
      icon: '📝',
      priority: 'high'
    },
    [NOTIFICATION_TYPES.CERTIFICATE_EARNED]: {
      title: `Certificate Earned: ${data.courseName}`,
      message: 'Congratulations on completing the course!',
      icon: '📜',
      priority: 'high'
    },
    [NOTIFICATION_TYPES.SUBSCRIPTION_REMINDER]: {
      title: 'Subscription Expiring Soon',
      message: `Your premium subscription expires in ${data.daysRemaining} days.`,
      icon: '💳',
      priority: 'medium'
    },
    [NOTIFICATION_TYPES.ADMIN_ANNOUNCEMENT]: {
      title: data.title,
      message: data.message,
      icon: '📢',
      priority: 'medium'
    }
  };

  const template = templates[type] || { title: 'Notification', message: '', icon: '🔔', priority: 'low' };

  return {
    userId,
    type,
    title: template.title,
    message: template.message,
    icon: template.icon,
    priority: template.priority,
    data,
    read: false,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  };
};

const getNotificationPreferences = (user) => {
  /**
   * Get user's notification preferences
   */
  return {
    email: {
      courseMilestones: user.preferences?.email?.courseMilestones !== false,
      assignmentReminders: user.preferences?.email?.assignmentReminders !== false,
      mentorMessages: user.preferences?.email?.mentorMessages !== false,
      achievements: user.preferences?.email?.achievements !== false,
      weeklyDigest: user.preferences?.email?.weeklyDigest !== false
    },
    inApp: {
      courseMilestones: user.preferences?.inApp?.courseMilestones !== false,
      assignmentReminders: user.preferences?.inApp?.assignmentReminders !== false,
      mentorMessages: user.preferences?.inApp?.mentorMessages !== false,
      achievements: user.preferences?.inApp?.achievements !== false
    },
    push: {
      enabled: user.preferences?.push?.enabled !== false,
      assignments: user.preferences?.push?.assignments !== false,
      messages: user.preferences?.push?.messages !== false
    },
    frequency: user.preferences?.frequency || 'immediate' // immediate, daily, weekly
  };
};

const shouldNotify = (user, notificationType, channel = 'inApp') => {
  /**
   * Determine if user should receive notification for this type and channel
   */
  const prefs = getNotificationPreferences(user);

  const typeMap = {
    [NOTIFICATION_TYPES.COURSE_MILESTONE]: 'courseMilestones',
    [NOTIFICATION_TYPES.ASSIGNMENT_DUE]: 'assignmentReminders',
    [NOTIFICATION_TYPES.MENTOR_MESSAGE]: 'mentorMessages',
    [NOTIFICATION_TYPES.ACHIEVEMENT_UNLOCKED]: 'achievements'
  };

  const prefKey = typeMap[notificationType] || 'courseMilestones';

  if (channel === 'inApp') return prefs.inApp[prefKey];
  if (channel === 'email') return prefs.email[prefKey];
  if (channel === 'push') return prefs.push.enabled && prefs.push[prefKey];

  return true;
};

const createNotificationDigest = (notifications) => {
  /**
   * Group notifications into a daily or weekly digest
   */
  const grouped = {};

  notifications.forEach(notif => {
    const type = notif.type;
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(notif);
  });

  const digest = {
    createdAt: new Date(),
    summary: `You have ${notifications.length} new notifications`,
    sections: Object.entries(grouped).map(([type, notifs]) => ({
      type,
      count: notifs.length,
      notifications: notifs.slice(0, 5) // Show first 5
    })),
    totalNotifications: notifications.length
  };

  return digest;
};

const scheduleNotification = (notification, delay) => {
  /**
   * Schedule a notification to be sent after delay (in minutes)
   */
  return {
    ...notification,
    scheduled: true,
    scheduleTime: new Date(Date.now() + delay * 60 * 1000),
    delivered: false
  };
};

const triggerNotificationEvent = (type, data) => {
  /**
   * Trigger a notification event that should be sent to relevant users
   */
  const eventMap = {
    'course-published': async (Notification, User, data) => {
      // Notify all instructors following course category
      return {
        type: NOTIFICATION_TYPES.COURSE_RECOMMENDATION,
        query: { 'preferences.interests': data.category },
        data: { courseName: data.courseName, courseId: data.courseId }
      };
    },
    'project-submitted': async (data) => {
      // Notify instructor
      return {
        type: NOTIFICATION_TYPES.PROJECT_FEEDBACK,
        userId: data.instructorId,
        data: { studentName: data.studentName, projectName: data.projectName }
      };
    },
    'streak-expiring': async (data) => {
      // Notify student
      return {
        type: NOTIFICATION_TYPES.STREAK_WARNING,
        userId: data.userId,
        data: { currentStreak: data.streak, hoursRemaining: 24 }
      };
    }
  };

  return eventMap[type] ? eventMap[type](data) : null;
};

const unreadNotificationCount = (notifications) => {
  return notifications.filter(n => !n.read).length;
};

const getNotificationsByPriority = (notifications) => {
  const priorities = {
    high: [],
    medium: [],
    low: []
  };

  notifications.forEach(notif => {
    if (!priorities[notif.priority]) {
      priorities.medium.push(notif);
    } else {
      priorities[notif.priority].push(notif);
    }
  });

  return priorities;
};

const archiveOldNotifications = (notifications, daysOld = 30) => {
  /**
   * Mark old notifications for archival
   */
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return notifications.map(notif => ({
    ...notif,
    archived: notif.createdAt < cutoffDate && notif.read
  }));
};

module.exports = {
  NOTIFICATION_TYPES,
  createNotification,
  getNotificationPreferences,
  shouldNotify,
  createNotificationDigest,
  scheduleNotification,
  triggerNotificationEvent,
  unreadNotificationCount,
  getNotificationsByPriority,
  archiveOldNotifications
};
