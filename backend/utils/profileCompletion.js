/**
 * Profile Completion Tracking
 * Calculates user profile completion percentage and provides guidance
 */

const calculateProfileCompletion = (user) => {
  if (!user) return { percentage: 0, sections: {} };

  const sections = {
    basic: {
      weight: 20,
      fields: ['name', 'email'],
      completed: (user.name ? 1 : 0) + (user.email ? 1 : 0),
      total: 2
    },
    contact: {
      weight: 15,
      fields: ['phone', 'location'],
      completed: (user.phone ? 1 : 0) + (user.location ? 1 : 0),
      total: 2
    },
    social: {
      weight: 15,
      fields: ['github', 'linkedin', 'website'],
      completed: (user.github ? 1 : 0) + (user.linkedin ? 1 : 0) + (user.website ? 1 : 0),
      total: 3
    },
    bio: {
      weight: 20,
      fields: ['headline', 'bio'],
      completed: (user.headline ? 1 : 0) + (user.bio ? 1 : 0),
      total: 2
    },
    avatar: {
      weight: 15,
      fields: ['avatarUrl'],
      completed: user.avatarUrl ? 1 : 0,
      total: 1
    },
    verification: {
      weight: 15,
      fields: ['isVerified'],
      completed: user.isVerified ? 1 : 0,
      total: 1
    }
  };

  // Calculate percentage
  let totalWeight = 0;
  let earnedWeight = 0;

  Object.values(sections).forEach(section => {
    const sectionPercentage = (section.completed / section.total) * 100;
    totalWeight += section.weight;
    earnedWeight += (sectionPercentage / 100) * section.weight;
  });

  const percentage = Math.round(earnedWeight);

  // Generate missing fields list
  const missingFields = [];
  Object.entries(sections).forEach(([sectionKey, section]) => {
    section.fields.forEach(field => {
      if (!user[field]) {
        missingFields.push({ section: sectionKey, field });
      }
    });
  });

  return {
    percentage,
    sections: Object.entries(sections).reduce((acc, [key, val]) => {
      acc[key] = {
        percentage: Math.round((val.completed / val.total) * 100),
        completed: val.completed,
        total: val.total
      };
      return acc;
    }, {}),
    missingFields,
    nextAction: missingFields[0] ? `Complete your ${missingFields[0].field} in ${missingFields[0].section}` : 'Profile complete! 🎉'
  };
};

const getProfileCompletionBadges = (percentage) => {
  const badges = [];
  if (percentage >= 25) badges.push({ name: 'Starting Out', icon: '🌱' });
  if (percentage >= 50) badges.push({ name: 'Building Profile', icon: '🔨' });
  if (percentage >= 75) badges.push({ name: 'Nearly There', icon: '⭐' });
  if (percentage === 100) badges.push({ name: 'Profile Master', icon: '👑' });
  return badges;
};

const getSuggestedProfileImprovements = (user) => {
  const suggestions = [];

  if (!user.headline) {
    suggestions.push({
      type: 'headline',
      title: 'Add a Professional Headline',
      description: 'Let others know what you do',
      example: 'Full Stack Developer | React Enthusiast | Open Source Contributor'
    });
  }

  if (!user.bio) {
    suggestions.push({
      type: 'bio',
      title: 'Write Your Bio',
      description: 'Tell your story and what you\'re passionate about',
      example: 'Learning full-stack development, passionate about building scalable applications'
    });
  }

  if (!user.github && !user.linkedin) {
    suggestions.push({
      type: 'social',
      title: 'Add Social Links',
      description: 'Connect your GitHub and LinkedIn profiles',
      benefit: 'Showcase your work and professional network'
    });
  }

  if (!user.avatarUrl) {
    suggestions.push({
      type: 'avatar',
      title: 'Upload a Profile Picture',
      description: 'A professional photo helps others recognize you',
      benefit: 'Increases profile credibility and engagement'
    });
  }

  if (!user.isVerified) {
    suggestions.push({
      type: 'verification',
      title: 'Verify Your Email',
      description: 'Complete email verification',
      benefit: 'Unlock additional platform features'
    });
  }

  return suggestions;
};

module.exports = {
  calculateProfileCompletion,
  getProfileCompletionBadges,
  getSuggestedProfileImprovements
};
