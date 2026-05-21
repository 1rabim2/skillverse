/**
 * Grading Rubrics
 * Defines rubrics for project and assignment grading
 */

const DEFAULT_RUBRICS = {
  projectSubmission: {
    name: 'Project Submission Rubric',
    description: 'Standard rubric for evaluating course projects',
    criteria: [
      {
        id: 'functionality',
        name: 'Functionality & Features',
        weight: 30,
        levels: [
          { score: 0, label: 'Incomplete', description: 'Project does not work or is missing major features' },
          { score: 1, label: 'Below Expectations', description: 'Works but is missing several key features' },
          { score: 2, label: 'Meets Expectations', description: 'All required features implemented and working' },
          { score: 3, label: 'Exceeds Expectations', description: 'All features work perfectly, includes bonus features' }
        ]
      },
      {
        id: 'codeQuality',
        name: 'Code Quality & Structure',
        weight: 25,
        levels: [
          { score: 0, label: 'Poor', description: 'Code is unorganized and difficult to read' },
          { score: 1, label: 'Fair', description: 'Code is somewhat organized but needs improvement' },
          { score: 2, label: 'Good', description: 'Well-organized code with proper structure and comments' },
          { score: 3, label: 'Excellent', description: 'Clean, well-documented, follows best practices' }
        ]
      },
      {
        id: 'testing',
        name: 'Testing & Debugging',
        weight: 20,
        levels: [
          { score: 0, label: 'None', description: 'No evidence of testing' },
          { score: 1, label: 'Minimal', description: 'Limited testing, some bugs present' },
          { score: 2, label: 'Adequate', description: 'Reasonable testing, mostly bug-free' },
          { score: 3, label: 'Comprehensive', description: 'Thorough testing, well-tested edge cases' }
        ]
      },
      {
        id: 'documentation',
        name: 'Documentation & Comments',
        weight: 15,
        levels: [
          { score: 0, label: 'Missing', description: 'No documentation or comments' },
          { score: 1, label: 'Minimal', description: 'Sparse documentation' },
          { score: 2, label: 'Adequate', description: 'Good documentation of functions and logic' },
          { score: 3, label: 'Excellent', description: 'Comprehensive documentation with README and API docs' }
        ]
      },
      {
        id: 'userExperience',
        name: 'User Experience',
        weight: 10,
        levels: [
          { score: 0, label: 'Poor', description: 'Confusing interface, poor usability' },
          { score: 1, label: 'Fair', description: 'Works but UI/UX needs improvement' },
          { score: 2, label: 'Good', description: 'User-friendly interface' },
          { score: 3, label: 'Excellent', description: 'Intuitive, polished, professional appearance' }
        ]
      }
    ]
  },

  assignmentCompletion: {
    name: 'Assignment Completion Rubric',
    description: 'Rubric for evaluating lesson assignments',
    criteria: [
      {
        id: 'completeness',
        name: 'Completeness',
        weight: 40,
        levels: [
          { score: 0, label: 'Incomplete', description: 'Less than 50% of assignment completed' },
          { score: 1, label: 'Partially Complete', description: '50-75% of assignment completed' },
          { score: 2, label: 'Mostly Complete', description: '75-99% of assignment completed' },
          { score: 3, label: 'Complete', description: '100% of assignment completed' }
        ]
      },
      {
        id: 'correctness',
        name: 'Correctness & Accuracy',
        weight: 40,
        levels: [
          { score: 0, label: 'Incorrect', description: 'Most answers/solutions are incorrect' },
          { score: 1, label: 'Partially Correct', description: 'About 50% of answers are correct' },
          { score: 2, label: 'Mostly Correct', description: 'About 75-90% of answers are correct' },
          { score: 3, label: 'Fully Correct', description: 'All or nearly all answers are correct' }
        ]
      },
      {
        id: 'timeliness',
        name: 'Timeliness',
        weight: 20,
        levels: [
          { score: 0, label: 'Late', description: 'Submitted more than 5 days late' },
          { score: 1, label: 'Somewhat Late', description: 'Submitted 2-5 days late' },
          { score: 2, label: 'Slightly Late', description: 'Submitted within 24 hours of deadline' },
          { score: 3, label: 'On Time', description: 'Submitted before deadline' }
        ]
      }
    ]
  },

  participation: {
    name: 'Class Participation Rubric',
    description: 'Rubric for evaluating student participation',
    criteria: [
      {
        id: 'frequency',
        name: 'Frequency of Participation',
        weight: 33,
        levels: [
          { score: 0, label: 'Never', description: 'Does not participate' },
          { score: 1, label: 'Rarely', description: 'Participates occasionally' },
          { score: 2, label: 'Regularly', description: 'Participates consistently' },
          { score: 3, label: 'Very Actively', description: 'Participates frequently and enthusiastically' }
        ]
      },
      {
        id: 'quality',
        name: 'Quality of Contributions',
        weight: 33,
        levels: [
          { score: 0, label: 'Poor', description: 'Contributions are off-topic or incorrect' },
          { score: 1, label: 'Fair', description: 'Contributions are somewhat relevant' },
          { score: 2, label: 'Good', description: 'Contributions are relevant and insightful' },
          { score: 3, label: 'Excellent', description: 'Contributions are highly insightful and help others learn' }
        ]
      },
      {
        id: 'engagement',
        name: 'Engagement with Peers',
        weight: 34,
        levels: [
          { score: 0, label: 'Isolated', description: 'Does not interact with peers' },
          { score: 1, label: 'Limited', description: 'Minimal peer interaction' },
          { score: 2, label: 'Good', description: 'Interacts respectfully with peers' },
          { score: 3, label: 'Excellent', description: 'Actively helps and collaborates with peers' }
        ]
      }
    ]
  }
};

const calculateRubricScore = (responses, rubric) => {
  /**
   * Calculate total score based on rubric responses
   * responses: { criteriaId: scoreLevel }
   */
  let totalPoints = 0;
  let maxPoints = 0;

  rubric.criteria.forEach(criterion => {
    const scoreLevel = responses[criterion.id];
    if (scoreLevel !== undefined) {
      const level = criterion.levels[scoreLevel];
      totalPoints += (level.score / 3) * criterion.weight;
    }
    maxPoints += criterion.weight;
  });

  const percentage = Math.round((totalPoints / maxPoints) * 100);
  const letterGrade = getLetterGrade(percentage);

  return {
    points: Math.round(totalPoints),
    maxPoints,
    percentage,
    letterGrade,
    feedback: getScoreFeedback(percentage)
  };
};

const getLetterGrade = (percentage) => {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
};

const getScoreFeedback = (percentage) => {
  if (percentage >= 90) return 'Excellent work! Keep it up.';
  if (percentage >= 80) return 'Good job! Continue to improve.';
  if (percentage >= 70) return 'Satisfactory work. Please review feedback for improvement areas.';
  if (percentage >= 60) return 'Below expectations. Please review the material and resubmit.';
  return 'Insufficient. Please meet with instructor.';
};

const generateRubricFeedback = (responses, rubric) => {
  /**
   * Generate detailed feedback for each criterion
   */
  const feedback = [];

  rubric.criteria.forEach(criterion => {
    const scoreLevel = responses[criterion.id];
    if (scoreLevel !== undefined) {
      const level = criterion.levels[scoreLevel];
      feedback.push({
        criterion: criterion.name,
        score: level.label,
        feedback: level.description,
        scorePoints: (level.score / 3) * criterion.weight,
        maxPoints: criterion.weight,
        weight: criterion.weight
      });
    }
  });

  return feedback;
};

const getRubricTemplate = (rubricType) => {
  return DEFAULT_RUBRICS[rubricType] || DEFAULT_RUBRICS.projectSubmission;
};

const getAllRubrics = () => {
  return Object.entries(DEFAULT_RUBRICS).map(([key, value]) => ({
    id: key,
    ...value
  }));
};

module.exports = {
  DEFAULT_RUBRICS,
  calculateRubricScore,
  generateRubricFeedback,
  getRubricTemplate,
  getAllRubrics,
  getLetterGrade,
  getScoreFeedback
};
