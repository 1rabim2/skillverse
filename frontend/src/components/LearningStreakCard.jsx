import React from 'react';
import { Flame, Target, Award, BarChart3 } from 'lucide-react';

const LearningStreakCard = ({ streak, dailyGoal = 30 }) => {
  const streakPercentage = Math.min((streak / dailyGoal) * 100, 100);
  const nextMilestone = Math.ceil((streak + 1) / 10) * 10;
  const daysToMilestone = nextMilestone - streak;

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Flame className="w-6 h-6 text-orange-500 mr-2" />
          <h3 className="text-lg font-bold text-gray-800">Learning Streak</h3>
        </div>
        <div className="text-3xl font-bold text-orange-600">{streak}</div>
      </div>

      {/* Days Counter */}
      <div className="text-sm text-gray-600 mb-3">
        Days learning • Next milestone: {nextMilestone} days ({daysToMilestone} to go)
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
        <div
          className="bg-gradient-to-r from-orange-400 to-red-500 h-full transition-all duration-500"
          style={{ width: `${streakPercentage}%` }}
        />
      </div>

      {/* Streak Rewards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded p-3 text-center">
          <div className="text-2xl mb-1">🏆</div>
          <div className="text-xs text-gray-600 font-semibold">7 Day</div>
          <div className="text-xs text-orange-600">{streak >= 7 ? '✓' : 'Locked'}</div>
        </div>
        <div className="bg-white rounded p-3 text-center">
          <div className="text-2xl mb-1">🔥</div>
          <div className="text-xs text-gray-600 font-semibold">30 Day</div>
          <div className="text-xs text-orange-600">{streak >= 30 ? '✓' : 'Locked'}</div>
        </div>
        <div className="bg-white rounded p-3 text-center">
          <div className="text-2xl mb-1">👑</div>
          <div className="text-xs text-gray-600 font-semibold">100 Day</div>
          <div className="text-xs text-orange-600">{streak >= 100 ? '✓' : 'Locked'}</div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-4 pt-4 border-t border-orange-200">
        <p className="text-sm text-gray-600">
          💡 <span className="font-semibold">Pro Tip:</span> Keep learning every day to maintain your streak!
        </p>
      </div>
    </div>
  );
};

export default LearningStreakCard;
