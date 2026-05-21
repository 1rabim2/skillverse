import React, { useState } from 'react';
import { CheckSquare, Trash2, Mail, Download, Filter } from 'lucide-react';

const AdminBulkOperations = ({ users, onBulkAction, onExport }) => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [operation, setOperation] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u._id));
    }
  };

  const handleBulkAction = async () => {
    if (!selectedUsers.length || !operation) return;

    setIsProcessing(true);
    try {
      await onBulkAction(selectedUsers, operation);
      setSelectedUsers([]);
      setOperation('');
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    const toExport = selectedUsers.length > 0
      ? users.filter(u => selectedUsers.includes(u._id))
      : users;
    onExport(toExport, 'csv');
  };

  const filteredUsers = users.filter(user => {
    if (filterType === 'active') return user.isActive;
    if (filterType === 'inactive') return !user.isActive;
    if (filterType === 'verified') return user.isVerified;
    if (filterType === 'unverified') return !user.isVerified;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <span className="text-sm font-semibold text-gray-700">
              {selectedUsers.length} selected
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-semibold text-sm transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>

            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={selectedUsers.length === 0}
            >
              <option value="">Select Action...</option>
              <option value="suspend">Suspend</option>
              <option value="activate">Activate</option>
              <option value="updateRole">Change Role</option>
              <option value="delete">Delete</option>
            </select>

            <button
              onClick={handleBulkAction}
              disabled={!selectedUsers.length || !operation || isProcessing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-semibold text-sm transition-colors"
            >
              {isProcessing ? 'Processing...' : 'Apply'}
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded font-semibold text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { value: 'all', label: 'All Users' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'verified', label: 'Verified' },
              { value: 'unverified', label: 'Unverified' }
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setFilterType(filter.value)}
                className={`px-3 py-2 rounded text-sm font-semibold transition-colors ${
                  filterType === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user._id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user._id)}
                    onChange={() => toggleUserSelection(user._id)}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-800">{user.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    user.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No users match your filters
        </div>
      )}
    </div>
  );
};

export default AdminBulkOperations;
