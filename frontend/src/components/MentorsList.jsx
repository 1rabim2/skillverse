import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';
import { resolveAssetUrl } from '../lib/assets';
import Button from './ui/Button';

export default function MentorsList({ mentors = [] }) {
  const { t } = useTranslation();

  if (!mentors || mentors.length === 0) {
    return null;
  }

  function startChat(mentorId, courseId) {
    if (!courseId) {
      return;
    }
    // Navigate to the course chat page
    window.location.href = `/courses/${encodeURIComponent(courseId)}/chat`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t('dashboard.mentors', 'Your Mentors')}
        </h3>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {mentors.length} {mentors.length === 1 ? 'mentor' : 'mentors'}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {mentors.map((mentor) => (
          <div
            key={mentor.id}
            className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                {mentor.avatarUrl ? (
                  <img
                    src={resolveAssetUrl(mentor.avatarUrl)}
                    alt={mentor.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {(mentor.name || 'M').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 dark:text-white truncate">
                    {mentor.name}
                  </div>
                  {mentor.headline && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {mentor.headline}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {mentor.coursesCount && (
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                {mentor.coursesCount} {mentor.coursesCount === 1 ? 'course' : 'courses'}
              </div>
            )}

            <Button
              variant="primary"
              size="sm"
              className="mt-3 w-full"
              onClick={() => startChat(mentor.id, mentor.courseId)}
            >
              <MessageCircle className="mr-2 inline-block h-4 w-4" />
              Chat
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
