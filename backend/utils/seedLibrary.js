const Course = require('../models/Course');
const SkillPath = require('../models/SkillPath');

function toTitleSlug(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function buildCurriculum({ title, category, resourceLink, videoUrl }) {
  const safeTitle = String(title || 'Course').trim() || 'Course';
  const safeCategory = String(category || 'General').trim() || 'General';
  const link = String(resourceLink || '').trim();
  const vid = String(videoUrl || '').trim();
  const slug = toTitleSlug(safeTitle);

  const practiceSuggestionsByCategory = {
    'Web Fundamentals': 'Build a simple personal landing page using semantic HTML and basic CSS. Add one interactive JavaScript feature (e.g., theme toggle).',
    Frontend: 'Build a small UI (e.g., todo app) and practice component structure, state management, and routing.',
    Backend: 'Build a small REST API with 2–3 endpoints, add validation, and test with Postman/Thunder Client.',
    Database: 'Create a small schema, insert sample data, and write a few queries/aggregations. Then model it in Mongoose.',
    Tools: 'Create a repo, commit frequently, open a PR, and practice branching + merge workflow.',
    General: 'Take notes while learning and build a small project to apply what you learned.'
  };

  const practice = practiceSuggestionsByCategory[safeCategory] || practiceSuggestionsByCategory.General;

  const interestingVideoByCategory = {
    'Web Fundamentals': 'https://www.youtube.com/watch?v=G3e-cpL7ofc',
    Frontend: 'https://www.youtube.com/watch?v=bMknfKXIFA8',
    Backend: 'https://www.youtube.com/watch?v=Oe421EPjeBE',
    Database: 'https://www.youtube.com/watch?v=-56x56UppqQ',
    Tools: 'https://www.youtube.com/watch?v=RGOj5yH7evk',
    General: ''
  };
  const interestingVideo = interestingVideoByCategory[safeCategory] || '';

  const finalExamQuestions = [
    {
      prompt: `Which statement best describes the main goal of "${safeTitle}"?`,
      options: ['To memorize syntax only', 'To understand concepts and apply them in practice', 'To avoid building projects', 'To learn unrelated topics'],
      correctIndex: 1,
      explanation: 'The goal is understanding + application through practice.'
    },
    {
      prompt: 'When learning from official docs, what is the best approach?',
      options: ['Skip examples', 'Copy-paste without understanding', 'Read, try examples, and take notes', 'Only watch videos'],
      correctIndex: 2,
      explanation: 'Hands-on practice + notes helps retention and skill-building.'
    },
    {
      prompt: 'What should you do when something doesn’t work as expected?',
      options: ['Ignore errors', 'Guess randomly', 'Use debugging and read error messages', 'Delete the project'],
      correctIndex: 2,
      explanation: 'Debugging is a core skill; errors guide you to the fix.'
    },
    {
      prompt: 'Which outcome is a good sign you completed the course well?',
      options: ['You finished the reading only', 'You built a small project/practice task', 'You never tried anything', 'You skipped the final quiz'],
      correctIndex: 1,
      explanation: 'Practice is required to convert knowledge into skill.'
    },
    {
      prompt: 'Why is it important to understand fundamentals before advanced topics?',
      options: ['It is not important', 'Fundamentals help you reason and debug', 'Advanced topics replace fundamentals', 'Only fundamentals exist'],
      correctIndex: 1,
      explanation: 'Strong fundamentals make everything else easier.'
    },
    {
      prompt: 'If you want to learn faster, which habit helps most?',
      options: ['Never take notes', 'Build tiny projects regularly', 'Avoid questions', 'Only read headlines'],
      correctIndex: 1,
      explanation: 'Small projects force you to apply concepts and reveal gaps.'
    },
    {
      prompt: 'Which is the best way to validate your understanding?',
      options: ['Explain the concept in your own words', 'Hide your code', 'Skip practice', 'Avoid quizzes'],
      correctIndex: 0,
      explanation: 'If you can explain it, you understand it.'
    },
    {
      prompt: 'When you finish a section of docs, what is a good next step?',
      options: ['Rewrite the docs', 'Try one variation of the example', 'Stop learning', 'Delete your notes'],
      correctIndex: 1,
      explanation: 'Tweaking examples builds intuition.'
    },
    {
      prompt: 'What should the final certificate represent?',
      options: ['Time spent only', 'Passing the final exam with enough marks', 'Skipping assessments', 'Random completion'],
      correctIndex: 1,
      explanation: 'Certificate should be based on passing the final exam.'
    },
    {
      prompt: 'If you fail the final exam, what should you do?',
      options: ['Give up', 'Review the weak topics and retake', 'Delete your account', 'Ignore feedback'],
      correctIndex: 1,
      explanation: 'Use the score + explanations to focus on weak areas, then retry.'
    }
  ];

  // Create a richer curriculum (real links + practice + final exam quiz)
  return [
    {
      title: 'Orientation',
      order: 1,
      lessons: [
        {
          title: 'Welcome & outcomes',
          type: 'reading',
          content:
            `You will learn the key concepts for: ${safeTitle}.\n\n` +
            `How to complete this course:\n` +
            `1) Follow the official resource links.\n` +
            `2) Do the practice tasks.\n` +
            `3) Pass the Final Exam quiz to earn the certificate.`,
          durationMin: 8,
          order: 1
        },
        {
          title: 'Watch an explainer (video)',
          type: 'video',
          content: 'Watch the explainer video, then return and continue with the official resource.',
          videoUrl: vid || interestingVideo,
          resourceLink: '',
          durationMin: 20,
          order: 2
        }
      ]
    },
    {
      title: 'Core Learning (Official)',
      order: 2,
      lessons: [
        {
          title: 'Read: official guide',
          type: 'reading',
          content:
            link
              ? `Open the official guide and complete the key sections. Take notes and try the examples.\n\nTip: keep a small notes file with “What I learned” + “Questions”.`
              : 'Complete the official reading for this topic and take notes.',
          resourceLink: link,
          durationMin: 45,
          order: 1
        },
        {
          title: 'Mini practice',
          type: 'project',
          content: practice,
          resourceLink: link,
          durationMin: 35,
          order: 2
        },
        {
          title: 'Checkpoint quiz',
          type: 'quiz',
          content: 'Quick checkpoint to ensure you understood the basics. Pass to mark this lesson complete.',
          durationMin: 10,
          order: 3,
          quiz: {
            passPercent: 60,
            questions: [
              {
                prompt: 'What is the best next step after reading a section?',
                options: ['Move on immediately', 'Try the example and change it', 'Close the browser', 'Skip practice'],
                correctIndex: 1,
                explanation: 'Trying + modifying examples builds real understanding.'
              },
              {
                prompt: 'What should you do if you feel stuck?',
                options: ['Stop completely', 'Search the docs and read error messages', 'Delete everything', 'Avoid debugging'],
                correctIndex: 1,
                explanation: 'Docs + errors are your best helpers.'
              }
            ]
          }
        }
      ]
    },
    {
      title: 'Project',
      order: 3,
      lessons: [
        {
          title: 'Project brief',
          type: 'reading',
          content:
            `Build a small project that proves you can apply ${safeTitle}.\n\n` +
            `Requirements:\n- Small but complete\n- Uses what you learned\n- You can explain your choices`,
          durationMin: 10,
          order: 1
        },
        {
          title: 'Build the project',
          type: 'project',
          content:
            `Implement the project now.\n\n` +
            `Suggested approach:\n` +
            `- Start with a simple version\n` +
            `- Add features one by one\n` +
            `- Test after each change`,
          durationMin: 60,
          order: 2
        },
        {
          title: 'Polish & review',
          type: 'reading',
          content:
            `Review your work:\n` +
            `- Can you explain each part?\n` +
            `- Can you fix one bug quickly?\n` +
            `- Is your code readable?\n` +
            `Then move to the Final Exam.`,
          durationMin: 12,
          order: 3
        }
      ]
    },
    {
      title: 'Final Exam',
      order: 4,
      lessons: [
        {
          title: 'Exam review (video)',
          type: 'video',
          content: 'Watch the review video and recap your notes before attempting the final exam.',
          videoUrl: interestingVideo,
          resourceLink: link,
          durationMin: 15,
          order: 1
        },
        {
          title: 'Final Exam',
          type: 'quiz',
          content:
            `Pass this exam to earn the certificate.\n\n` +
            `Rules:\n- Passing score: 70%\n- You can retry if you fail\n\n` +
            `Tip: if you fail, review the official resource and try again.`,
          durationMin: 20,
          order: 2,
          videoUrl: interestingVideo,
          resourceLink: link,
          quiz: {
            passPercent: 70,
            questions: finalExamQuestions
          }
        },
        {
          title: 'Next steps',
          type: 'reading',
          content:
            `Great job.\n\n` +
            `Next:\n- Continue to the next course in this skill path.\n- Keep building small projects.`,
          durationMin: 8,
          order: 3
        }
      ]
    }
  ];
}

const LIBRARY = [
  {
    title: 'Web Foundations',
    description: 'Core web skills: HTML, CSS, JavaScript, and accessibility.',
    courses: [
      {
        title: 'HTML Fundamentals (MDN)',
        category: 'Web Fundamentals',
        level: 'Beginner',
        description: 'Learn semantic HTML, forms, and how to structure web pages using the MDN Learn curriculum.',
        resourceLink: 'https://developer.mozilla.org/en-US/docs/Learn/HTML',
        videoUrl: ''
      },
      {
        title: 'CSS Fundamentals (MDN)',
        category: 'Web Fundamentals',
        level: 'Beginner',
        description: 'Learn CSS basics, selectors, the box model, and how to build layouts with MDN Learn.',
        resourceLink: 'https://developer.mozilla.org/en-US/docs/Learn/CSS/First_steps/Getting_started',
        videoUrl: ''
      },
      {
        title: 'JavaScript Fundamentals (MDN)',
        category: 'Web Fundamentals',
        level: 'Beginner',
        description: 'Learn JavaScript fundamentals: variables, functions, objects, DOM basics, and debugging.',
        resourceLink: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript',
        videoUrl: ''
      },
      {
        title: 'Accessibility Basics (MDN)',
        category: 'Web Fundamentals',
        level: 'Beginner',
        description: 'Learn accessibility best practices so your sites work for more people.',
        resourceLink: 'https://developer.mozilla.org/docs/Learn_web_development/Core/Accessibility',
        videoUrl: ''
      }
    ]
  },
  {
    title: 'Frontend (React)',
    description: 'Modern frontend development with React and tooling.',
    courses: [
      {
        title: 'React - Learn (Official)',
        category: 'Frontend',
        level: 'Beginner',
        description: 'Official React learning path: components, props, state, hooks, and thinking in React.',
        resourceLink: 'https://react.dev/learn',
        videoUrl: ''
      },
      {
        title: 'Vite - Getting Started',
        category: 'Frontend',
        level: 'Beginner',
        description: 'Learn Vite project setup and development workflow.',
        resourceLink: 'https://vite.dev/guide/',
        videoUrl: ''
      },
      {
        title: 'Tailwind CSS - Installation',
        category: 'Frontend',
        level: 'Beginner',
        description: 'Set up Tailwind CSS and learn the utility-first workflow.',
        resourceLink: 'https://tailwindcss.com/docs/installation/tailwind-cli',
        videoUrl: ''
      }
    ]
  },
  {
    title: 'Backend (Node + Express)',
    description: 'APIs, authentication, and backend basics with Node.js and Express.',
    courses: [
      {
        title: 'Node.js - Learn (Official)',
        category: 'Backend',
        level: 'Beginner',
        description: 'Official Node.js learning resources: core concepts, async patterns, and building servers.',
        resourceLink: 'https://nodejs.org/en/learn',
        videoUrl: ''
      },
      {
        title: 'Express.js - Installing and Hello World',
        category: 'Backend',
        level: 'Beginner',
        description: 'Get started with Express and build a basic web server.',
        resourceLink: 'https://expressjs.com/en/starter/installing.html',
        videoUrl: ''
      },
      {
        title: 'JWT Authentication Basics',
        category: 'Backend',
        level: 'Intermediate',
        description: 'Understand JSON Web Tokens (JWT) and how they are used for auth in web apps.',
        resourceLink: 'https://jwt.io/introduction/',
        videoUrl: ''
      },
      {
        title: 'OWASP Top 10 (Web Security)',
        category: 'Backend',
        level: 'Intermediate',
        description: 'Learn common web security risks and how to think about secure design.',
        resourceLink: 'https://owasp.org/Top10/2021/',
        videoUrl: ''
      }
    ]
  },
  {
    title: 'Database (MongoDB)',
    description: 'MongoDB fundamentals, data modeling, and Mongoose schemas.',
    courses: [
      {
        title: 'Introduction to MongoDB (MongoDB University)',
        category: 'Database',
        level: 'Beginner',
        description: 'MongoDB University learning path covering Atlas, CRUD, aggregation, indexing, and modeling.',
        resourceLink: 'https://learn.mongodb.com/learning-paths/introduction-to-mongodb-for-ict-students',
        videoUrl: ''
      },
      {
        title: 'Mongoose Schemas (Official Docs)',
        category: 'Database',
        level: 'Intermediate',
        description: 'Learn Mongoose schema design, models, and validation patterns.',
        resourceLink: 'https://mongoosejs.com/docs/guide.html',
        videoUrl: ''
      }
    ]
  },
  {
    title: 'Developer Tools',
    description: 'Git, GitHub workflow, and practical tooling for projects.',
    courses: [
      {
        title: 'Get Started with GitHub',
        category: 'Tools',
        level: 'Beginner',
        description: 'Learn GitHub basics: repos, commits, collaboration, and GitHub workflow.',
        resourceLink: 'https://docs.github.com/en/get-started',
        videoUrl: ''
      }
    ]
  }
];

async function upsertSkillPath({ title, description }) {
  const existing = await SkillPath.findOne({ title });
  if (existing) {
    if (description && existing.description !== description) {
      existing.description = description;
      await existing.save();
    }
    return { skillPath: existing, created: false };
  }
  const created = await SkillPath.create({ title, description, courses: [] });
  return { skillPath: created, created: true };
}

async function upsertCourse({ adminId, skillPathId, course, force }) {
  const existing = await Course.findOne({ title: course.title });
  if (existing) {
    // If a course exists by title, only hydrate missing curriculum (chapters).
    let updated = false;
    if (force && Array.isArray(course.chapters) && course.chapters.length > 0) {
      existing.chapters = course.chapters;
      updated = true;
    } else if ((!Array.isArray(existing.chapters) || existing.chapters.length === 0) && Array.isArray(course.chapters) && course.chapters.length > 0) {
      existing.chapters = course.chapters;
      updated = true;
    }
    // Ensure published for the student-facing app.
    if (existing.status !== 'published') {
      existing.status = 'published';
      updated = true;
    }
    // Keep the course attached to the skillPath if missing.
    if (!existing.skillPath && skillPathId) {
      existing.skillPath = skillPathId;
      updated = true;
    }
    if (updated) await existing.save();
    return { course: existing, created: false, updated };
  }
  const created = await Course.create({
    title: course.title,
    category: course.category,
    description: course.description,
    level: course.level,
    status: 'published',
    videoUrl: course.videoUrl,
    resourceLink: course.resourceLink,
    thumbnailUrl: '',
    chapters: Array.isArray(course.chapters) ? course.chapters : [],
    skillPath: skillPathId,
    createdBy: adminId || null
  });
  return { course: created, created: true, updated: false };
}

async function seedLibrary({ adminId, force = false } = {}) {
  const existingCount = await Course.countDocuments();
  if (!force && existingCount > 0) {
    return { skipped: true, reason: 'Courses already exist', skillPathsCreated: 0, coursesCreated: 0, coursesUpdated: 0 };
  }

  let skillPathsCreated = 0;
  let coursesCreated = 0;
  let coursesUpdated = 0;

  for (const sp of LIBRARY) {
    // eslint-disable-next-line no-await-in-loop
    const { skillPath, created: spCreated } = await upsertSkillPath({ title: sp.title, description: sp.description });
    if (spCreated) skillPathsCreated += 1;

    const createdCourseIds = [];
    for (const c of sp.courses) {
      const courseWithCurriculum = {
        ...c,
        chapters: buildCurriculum(c)
      };
      // eslint-disable-next-line no-await-in-loop
      const { course, created, updated } = await upsertCourse({ adminId, skillPathId: skillPath._id, course: courseWithCurriculum, force });
      if (created) coursesCreated += 1;
      if (updated) coursesUpdated += 1;
      createdCourseIds.push(course._id);
    }

    // Keep the path ordered according to the library.
    const unique = new Set((skillPath.courses || []).map((id) => String(id)));
    const merged = [...(skillPath.courses || [])];
    for (const id of createdCourseIds) {
      if (!unique.has(String(id))) merged.push(id);
    }
    skillPath.courses = merged;
    // eslint-disable-next-line no-await-in-loop
    await skillPath.save();
  }

  return { skipped: false, skillPathsCreated, coursesCreated, coursesUpdated };
}

module.exports = { seedLibrary, LIBRARY };
