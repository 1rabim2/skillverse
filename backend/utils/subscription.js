function isSubscriptionActive(user) {
  if (!user) return false;
  const status = String(user.subscription?.status || 'none');
  if (status !== 'active') return false;
  const end = user.subscription?.currentPeriodEnd ? new Date(user.subscription.currentPeriodEnd) : null;
  if (!end || Number.isNaN(end.getTime())) return false;
  return end > new Date();
}

function sanitizeCourseForNonSubscriber(courseObj) {
  if (!courseObj || typeof courseObj !== 'object') return courseObj;
  const safe = { ...courseObj };
  safe.videoUrl = '';
  const chapters = Array.isArray(safe.chapters) ? safe.chapters : [];
  safe.chapters = chapters.map((ch) => {
    const lessons = Array.isArray(ch?.lessons) ? ch.lessons : [];
    return {
      ...ch,
      lessons: lessons.map((ls) => ({ ...ls, videoUrl: '' }))
    };
  });
  return safe;
}

module.exports = { isSubscriptionActive, sanitizeCourseForNonSubscriber };

