import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, BookOpen, Award, DollarSign } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AdminAnalyticsDashboard = ({ analytics }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!analytics) return null;

  const { users, courses, certificates, revenue, trends, topPerformers } = analytics;

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700 text-sm font-semibold">Total Users</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{users.total}</div>
          <p className="text-xs text-gray-600 mt-2">
            {users.activeThisMonth} active this month
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700 text-sm font-semibold">Courses</span>
            <BookOpen className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{courses.published}</div>
          <p className="text-xs text-gray-600 mt-2">
            {courses.pending} pending review
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700 text-sm font-semibold">Certificates</span>
            <Award className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{certificates.total}</div>
          <p className="text-xs text-gray-600 mt-2">
            {certificates.thisMonth} this month
          </p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700 text-sm font-semibold">Revenue</span>
            <DollarSign className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">Rs. {revenue.total}</div>
          <p className="text-xs text-gray-600 mt-2">
            +Rs. {revenue.thisMonth} this month
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700 text-sm font-semibold">Retention</span>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{users.retentionRate}%</div>
          <p className="text-xs text-gray-600 mt-2">
            30-60 day retention
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {['overview', 'trends', 'topPerformers'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'trends' && 'Trends'}
            {tab === 'topPerformers' && 'Top Performers'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-4">System Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Instructors</p>
                <p className="text-2xl font-bold text-gray-800">{users.instructors}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-gray-800">{users.admins}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg per Course</p>
                <p className="text-2xl font-bold text-gray-800">{courses.avgEnrollmentsPerCourse}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-800">{certificates.completionRate}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trends' && trends && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">Monthly Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends.monthlyRegistrations}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                name="New Registrations"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'topPerformers' && topPerformers && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">Top Performing Courses</h3>
          <div className="space-y-2">
            {topPerformers.courses && topPerformers.courses.map((course, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center">
                  <span className="font-bold text-gray-400 mr-3">#{idx + 1}</span>
                  <span className="text-gray-800 font-semibold">{course.title}</span>
                </div>
                <span className="text-blue-600 font-semibold">{course.enrollmentCount} enrolled</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnalyticsDashboard;
