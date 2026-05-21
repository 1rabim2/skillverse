import React, { useState } from 'react';
import { BarChart3, TrendingUp, Clock, BookOpen } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const StudentAnalyticsDashboard = ({ analytics }) => {
  const [timeFrame, setTimeFrame] = useState('all');

  if (!analytics) return null;

  const { overview, engagement, learning, gamification } = analytics;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Completed Courses</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-800">{overview.completedCourses}</div>
          <p className="text-xs text-gray-500 mt-1">{overview.completionRate}% completion rate</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">In Progress</span>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-800">{overview.inProgressCourses}</div>
          <p className="text-xs text-gray-500 mt-1">Avg {overview.averageProgress}% complete</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Study Hours</span>
            <Clock className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-gray-800">{engagement.totalLessonHours}</div>
          <p className="text-xs text-gray-500 mt-1">{engagement.averageLessonsPerDay} lessons/day</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Total XP</span>
            <BarChart3 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-800">{gamification.xp.totalXP}</div>
          <p className="text-xs text-gray-500 mt-1">+{gamification.xp.xpThisWeek} this week</p>
        </div>
      </div>

      {/* Quiz Performance */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-4">Quiz Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{learning.quizStats.total}</div>
            <p className="text-xs text-gray-600">Total Attempts</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{learning.quizStats.passed}</div>
            <p className="text-xs text-gray-600">Passed</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{learning.quizStats.passRate}%</div>
            <p className="text-xs text-gray-600">Pass Rate</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{learning.quizStats.averageScore}%</div>
            <p className="text-xs text-gray-600">Avg Score</p>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center">
          <span className="text-2xl mr-2">🏆</span>
          Badges Earned ({gamification.badgeCount})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {gamification.badges.map((badge, idx) => (
            <div key={idx} className="text-center p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded border border-yellow-200">
              <div className="text-3xl mb-2">{badge.icon || '⭐'}</div>
              <p className="text-xs font-semibold text-gray-800">{badge.name}</p>
              <p className="text-xs text-gray-600 mt-1">{new Date(badge.earnedAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Estimated Completions */}
      {learning.estimatedCompletionDates.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">Estimated Completions</h3>
          <div className="space-y-2">
            {learning.estimatedCompletionDates.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">Course {idx + 1}</span>
                <span className="text-sm font-semibold text-blue-600">
                  {new Date(item.estimatedCompleteDate).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAnalyticsDashboard;
