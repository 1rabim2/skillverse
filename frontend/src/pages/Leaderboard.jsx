import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/apiFetch';
import StudentLayout from '../components/StudentLayout';
import Card from '../components/ui/Card';
import { Medal, Zap, Trophy } from 'lucide-react';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [sortBy, setSortBy] = useState('xp');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userStats, setUserStats] = useState(null);

  useEffect(() => {
    loadLeaderboard();
    loadUserStats();
  }, [sortBy]);

  async function loadLeaderboard() {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch(`/user/leaderboard?sortBy=${sortBy}&limit=50`);
      const data = await res.json();
      if (res.ok) {
        setLeaderboard(data.items || []);
      } else {
        setError(data.error || 'Failed to load leaderboard');
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserStats() {
    try {
      const res = await apiFetch('/user/me/stats');
      const data = await res.json();
      if (res.ok) {
        setUserStats(data);
      }
    } catch (err) {
      console.error('Failed to load user stats:', err);
    }
  }

  const getRankMedalIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  return (
    <StudentLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-50 px-4 py-10 dark:from-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-8 h-8 text-amber-500" />
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Leaderboard</h1>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              See how you rank against other learners. Complete courses and earn XP to climb the ranks!
            </p>
          </div>

          {/* User Stats Card */}
          {userStats && (
            <Card className="mb-8 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950">
              <div className="p-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    #{userStats.rank}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">Your Rank</div>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {userStats.xp}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">XP</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {userStats.badgeCount}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">Badges</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {userStats.percentile}%
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">Percentile</div>
                </div>
              </div>
            </Card>
          )}

          {/* Sort Buttons */}
          <div className="mb-6 flex gap-2 flex-wrap">
            <button
              onClick={() => setSortBy('xp')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                sortBy === 'xp'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              💎 XP
            </button>
            <button
              onClick={() => setSortBy('streak')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                sortBy === 'streak'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              🔥 Streak
            </button>
            <button
              onClick={() => setSortBy('certificates')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                sortBy === 'certificates'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              🏆 Certificates
            </button>
          </div>

          {/* Leaderboard Table */}
          {loading ? (
            <Card>
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                Loading leaderboard...
              </div>
            </Card>
          ) : error ? (
            <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950">
              <div className="p-6 text-red-600 dark:text-red-300">{error}</div>
            </Card>
          ) : leaderboard.length === 0 ? (
            <Card>
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                No users on leaderboard yet. Keep learning!
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((user) => {
                const medalIcon = getRankMedalIcon(user.rank);
                return (
                  <Card key={user.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900 dark:to-blue-900 font-bold text-slate-900 dark:text-white">
                        {medalIcon || `#${user.rank}`}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {user.name}
                        </div>
                        {user.headline && (
                          <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                            {user.headline}
                          </div>
                        )}
                        {user.badges && user.badges.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {user.badges.map((badge, idx) => (
                              <span key={idx} title={badge.description}>
                                {badge.icon}
                              </span>
                            ))}
                            {user.badgeCount > 3 && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                +{user.badgeCount - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex gap-6 text-right">
                        <div>
                          <div className="flex items-center gap-1 justify-end font-bold text-yellow-600 dark:text-yellow-400">
                            <Zap className="w-4 h-4" />
                            {user.xp}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">XP</div>
                        </div>
                        {user.currentStreak > 0 && (
                          <div>
                            <div className="font-bold text-red-500">🔥 {user.currentStreak}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Days</div>
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-purple-600 dark:text-purple-400">
                            {user.certificateCount}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Certs</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
