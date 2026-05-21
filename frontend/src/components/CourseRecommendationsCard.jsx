import React, { useState } from 'react';
import { BookOpen, Spark, TrendingUp, Clock } from 'lucide-react';

const CourseRecommendationsCard = ({ recommendations, onEnroll }) => {
  const [selectedCourse, setSelectedCourse] = useState(null);

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-100">
        <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
          <Spark className="w-5 h-5 mr-2 text-purple-600" />
          Recommended for You
        </h3>
        <p className="text-gray-600">Complete more courses to get personalized recommendations!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center">
          <Spark className="w-5 h-5 mr-2 text-purple-600" />
          Recommended for You
        </h3>
        <p className="text-sm text-gray-500">{recommendations.length} courses</p>
      </div>

      {/* Carousel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((course) => (
          <div
            key={course._id}
            className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedCourse(course._id)}
          >
            {/* Course Image */}
            <div className="bg-gradient-to-br from-purple-400 to-pink-400 rounded h-32 mb-3 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>

            {/* Course Info */}
            <h4 className="font-bold text-gray-800 mb-1">{course.title}</h4>
            <p className="text-xs text-gray-500 mb-2">{course.category}</p>

            {/* Recommendation Score */}
            <div className="flex items-center text-xs text-purple-600 mb-3">
              <TrendingUp className="w-3 h-3 mr-1" />
              {course.recommendationScore}% match
            </div>

            {/* Reason */}
            <p className="text-xs text-gray-600 mb-3 italic">
              {course.recommendationReason || 'Based on your learning history'}
            </p>

            {/* Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEnroll && onEnroll(course._id);
              }}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded transition-colors text-sm"
            >
              Explore Course
            </button>
          </div>
        ))}
      </div>

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            {/* Modal content here */}
            <button
              onClick={() => setSelectedCourse(null)}
              className="float-right text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseRecommendationsCard;
