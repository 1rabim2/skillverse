import React, { useState } from 'react';
import { TrendingUp, AlertCircle, MessageSquare, Award } from 'lucide-react';

const InstructorStudentTracking = ({ students, course }) => {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [sortBy, setSortBy] = useState('progress');
  const [filterStatus, setFilterStatus] = useState('all');

  if (!students || students.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 border border-gray-200 text-center">
        <p className="text-gray-600">No students enrolled in this course yet</p>
      </div>
    );
  }

  // Filter students
  const filteredStudents = students.filter(student => {
    if (filterStatus === 'active') return student.lastActivityDate && new Date(student.lastActivityDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (filterStatus === 'inactive') return !student.lastActivityDate || new Date(student.lastActivityDate) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (filterStatus === 'at-risk') return (student.progress?.percent || 0) < 50 && student.lastActivityDate;
    return true;
  });

  // Sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortBy === 'progress') return (b.progress?.percent || 0) - (a.progress?.percent || 0);
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'recent') return new Date(b.lastActivityDate || 0) - new Date(a.lastActivityDate || 0);
    return 0;
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2">
          {['all', 'active', 'inactive', 'at-risk'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded text-sm font-semibold transition-colors capitalize ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'at-risk' ? 'At Risk' : status}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded font-semibold text-sm"
        >
          <option value="progress">Sort by Progress</option>
          <option value="name">Sort by Name</option>
          <option value="recent">Sort by Recent Activity</option>
        </select>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-gray-600 text-sm">Total Students</p>
          <p className="text-2xl font-bold text-gray-800">{students.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-gray-600 text-sm">Avg Progress</p>
          <p className="text-2xl font-bold text-blue-600">
            {Math.round(students.reduce((sum, s) => sum + (s.progress?.percent || 0), 0) / students.length)}%
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-gray-600 text-sm">Completed</p>
          <p className="text-2xl font-bold text-green-600">
            {students.filter(s => s.progress?.percent === 100).length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-gray-600 text-sm">At Risk</p>
          <p className="text-2xl font-bold text-red-600">
            {students.filter(s => (s.progress?.percent || 0) < 50).length}
          </p>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Student</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Progress</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Last Activity</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map(student => (
              <tr key={student._id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-3">
                  <div>
                    <p className="font-semibold text-gray-800">{student.name}</p>
                    <p className="text-sm text-gray-500">{student.email}</p>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <div className="w-32">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">{student.progress?.percent || 0}%</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full transition-all"
                        style={{ width: `${student.progress?.percent || 0}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {student.lastActivityDate
                    ? new Date(student.lastActivityDate).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className="px-6 py-3">
                  {(student.progress?.percent || 0) === 100 && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                      ✓ Completed
                    </span>
                  )}
                  {(student.progress?.percent || 0) < 50 && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      At Risk
                    </span>
                  )}
                  {(student.progress?.percent || 0) >= 50 && (student.progress?.percent || 0) < 100 && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                      In Progress
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 flex gap-2">
                  <button
                    onClick={() => setSelectedStudent(student._id)}
                    className="p-2 hover:bg-blue-100 rounded transition-colors"
                    title="View Details"
                  >
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    className="p-2 hover:bg-green-100 rounded transition-colors"
                    title="Send Message"
                  >
                    <MessageSquare className="w-4 h-4 text-green-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InstructorStudentTracking;
