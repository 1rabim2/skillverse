import React, { useState, useEffect } from 'react';
import { Check, Target, Zap, Award } from 'lucide-react';

const ProfileCompletionCard = ({ user, completionData }) => {
  const [expanded, setExpanded] = useState(false);

  if (!completionData) return null;

  const { percentage, sections, missingFields, nextAction } = completionData;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 mb-6 border border-blue-100">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Profile Completion</h3>
          <p className="text-sm text-gray-600 mt-1">{nextAction}</p>
        </div>
        <div className="flex items-center">
          <div className="text-3xl font-bold text-indigo-600">{percentage}%</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Section Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {Object.entries(sections).map(([key, value]) => (
          <div key={key} className="bg-white rounded p-3 text-center">
            <div className="text-2xl font-bold text-indigo-600">{value.percentage}%</div>
            <div className="text-xs text-gray-600 capitalize">{key}</div>
          </div>
        ))}
      </div>

      {/* Missing Fields */}
      {missingFields.length > 0 && (
        <div className={`${expanded ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white rounded p-4 mb-3">
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
              <Target className="w-4 h-4 mr-2 text-orange-500" />
              Next Steps
            </h4>
            <ul className="space-y-2">
              {missingFields.slice(0, expanded ? undefined : 3).map((field, idx) => (
                <li key={idx} className="flex items-start text-sm">
                  <span className="text-orange-500 mr-2">•</span>
                  <span className="text-gray-600">
                    Update <span className="font-semibold capitalize">{field.field}</span> in {field.section}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Expand Button */}
      {missingFields.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="md:hidden text-indigo-600 text-sm font-semibold"
        >
          {expanded ? 'Show Less' : 'Show More'}
        </button>
      )}

      {/* Badges */}
      {percentage >= 50 && (
        <div className="mt-4 pt-4 border-t border-indigo-200">
          <div className="flex items-center text-sm">
            <Award className="w-4 h-4 text-yellow-500 mr-2" />
            <span className="text-gray-700">
              {percentage === 100 ? '👑 Profile Master!' : `${Math.floor(percentage / 25) * 25}% Complete Badge Earned`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileCompletionCard;
