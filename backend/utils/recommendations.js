/**
 * Course Recommendation Engine
 * Suggests courses based on user learning history, skills, and progress
 */

const getCourseRecommendations = async (user, allCourses) => {
  if (!user || !allCourses) return [];

  const enrolledCourseIds = user.enrolledCourses.map(id => String(id));
  const completedCourses = user.progress.filter(p => p.completedAt).map(p => String(p.course));
  
  // Extract user's interest areas from completed courses
  const userSkills = new Set();
  const userCategories = new Set();
  const userLevels = ['beginner'];

  allCourses.forEach(course => {
    if (completedCourses.includes(String(course._id))) {
      if (course.category) userCategories.add(course.category);
      if (course.level && course.level !== 'beginner') {
        userLevels.push(course.level);
      }
    }
  });

  // Score each unenrolled course
  const recommendations = allCourses
    .filter(course => !enrolledCourseIds.includes(String(course._id)))
    .map(course => {
      let score = 0;

      // Category match (40 points)
      if (userCategories.has(course.category)) score += 40;
      
      // Level progression (30 points)
      if (userLevels.includes('intermediate') && course.level === 'intermediate') score += 30;
      if (userLevels.includes('advanced') && course.level === 'advanced') score += 30;
      
      // Skill continuity (20 points)
      if (course.tags && course.tags.length > 0) {
        score += course.tags.length * 5;
      }

      // Popularity/rating (10 points)
      if (course.rating && course.rating >= 4.5) score += 10;

      return {
        course,
        score,
        reason: generateRecommendationReason(course, userCategories, userLevels)
      };
    })
    .filter(rec => rec.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(rec => ({
      ...rec.course.toObject ? rec.course.toObject() : rec.course,
      recommendationScore: rec.score,
      recommendationReason: rec.reason
    }));

  return recommendations;
};

const generateRecommendationReason = (course, userCategories, userLevels) => {
  if (userCategories.has(course.category)) {
    return `Continue your ${course.category} learning journey`;
  }
  
  if (userLevels.includes('intermediate')) {
    return 'Level up your skills with this intermediate course';
  }

  return 'Based on your learning history';
};

const getLearningPath = (user, allCourses) => {
  /**
   * Suggests a structured learning path
   * Example: "Web Development Specialist" path
   */
  const paths = [
    {
      id: 'web-dev',
      name: 'Web Development Specialist',
      description: 'Master frontend, backend, and full-stack development',
      courses: ['html-css', 'javascript', 'react', 'nodejs', 'databases', 'deploy'],
      duration: '6-9 months'
    },
    {
      id: 'data-science',
      name: 'Data Science Professional',
      description: 'Learn data analysis, visualization, and ML',
      courses: ['python', 'sql', 'statistics', 'pandas', 'ml-basics', 'visualization'],
      duration: '5-8 months'
    },
    {
      id: 'mobile-dev',
      name: 'Mobile App Developer',
      description: 'Build iOS and Android applications',
      courses: ['javascript', 'react-native', 'swift', 'firebase', 'app-deployment'],
      duration: '4-6 months'
    }
  ];

  // Return recommended paths based on completed courses
  return paths.map(path => ({
    ...path,
    completionPercentage: calculatePathCompletion(user, path),
    nextCourse: getNextCourseInPath(user, path, allCourses)
  }));
};

const calculatePathCompletion = (user, path) => {
  if (!path.courses || path.courses.length === 0) return 0;
  
  const completedCount = user.progress
    .filter(p => p.completedAt)
    .length;

  return Math.round((completedCount / path.courses.length) * 100);
};

const getNextCourseInPath = (user, path, allCourses) => {
  const completedCourseIds = user.progress
    .filter(p => p.completedAt)
    .map(p => String(p.course));

  const nextCourseId = path.courses.find(
    courseId => !completedCourseIds.includes(courseId)
  );

  return allCourses.find(c => c._id.toString() === nextCourseId);
};

const getSimilarCourses = (course, allCourses, limit = 3) => {
  /**
   * Find similar courses based on category, tags, and level
   */
  if (!course) return [];

  const similar = allCourses
    .filter(c => String(c._id) !== String(course._id))
    .map(c => {
      let similarity = 0;
      
      if (c.category === course.category) similarity += 40;
      if (c.level === course.level) similarity += 30;
      if (c.tags && course.tags) {
        const commonTags = c.tags.filter(t => course.tags.includes(t));
        similarity += commonTags.length * 15;
      }

      return { course: c, similarity };
    })
    .filter(item => item.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return similar.map(item => ({
    ...item.course.toObject ? item.course.toObject() : item.course,
    similarity: item.similarity
  }));
};

module.exports = {
  getCourseRecommendations,
  getLearningPath,
  getSimilarCourses,
  generateRecommendationReason
};
