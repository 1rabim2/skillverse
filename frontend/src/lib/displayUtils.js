/**
 * Shared display and formatting utilities
 * Prevents duplication across components
 */

export const COURSE_LEVELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert'
};

export const COURSE_CATEGORIES = {
  'web-development': 'Web Development',
  'mobile-development': 'Mobile Development',
  'data-science': 'Data Science',
  'ai-ml': 'AI & Machine Learning',
  'devops': 'DevOps',
  'cloud': 'Cloud Computing',
  'databases': 'Databases',
  'design': 'Design',
  'business': 'Business',
  'other': 'Other'
};

export const USER_ROLES = {
  student: 'Student',
  instructor: 'Instructor',
  admin: 'Admin'
};

/**
 * Format course level for display
 */
export function displayLevel(level) {
  return COURSE_LEVELS[level] || level || 'Beginner';
}

/**
 * Format course category for display
 */
export function displayCategory(category) {
  return COURSE_CATEGORIES[category] || category || 'Other';
}

/**
 * Get badge color class for level
 */
export function getLevelColorClass(level) {
  const colorMap = {
    beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    intermediate: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    advanced: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    expert: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  };
  return colorMap[level] || 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300';
}

/**
 * Get badge color class for category
 */
export function getCategoryColorClass(category) {
  const colorMap = {
    'web-development': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    'mobile-development': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    'data-science': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'ai-ml': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    'devops': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    'design': 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300'
  };
  return colorMap[category] || 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300';
}

/**
 * Format date for display
 */
export function displayDate(date) {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '';
  }
}

/**
 * Format time duration (e.g., "5h 30m")
 */
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength).trim()}...`;
}

/**
 * Format percentage with proper decimals
 */
export function formatPercentage(value, decimals = 0) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)}%`;
}

/**
 * Get role display name
 */
export function displayRole(role) {
  return USER_ROLES[role] || role || 'User';
}

/**
 * Capitalize first letter
 */
export function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format large numbers (e.g., 1000 -> 1K)
 */
export function formatNumber(num) {
  if (!Number.isFinite(num)) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
