const Course = require('../models/Course');
const SkillPath = require('../models/SkillPath');

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

async function upsertCourse({ adminId, skillPathId, course }) {
  const existing = await Course.findOne({ title: course.title });
  if (existing) {
    // Keep it simple: if a course exists by title, leave it as-is.
    return { course: existing, created: false };
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
    skillPath: skillPathId,
    createdBy: adminId || null
  });
  return { course: created, created: true };
}

async function seedLibrary({ adminId, force = false } = {}) {
  const existingCount = await Course.countDocuments();
  if (!force && existingCount > 0) {
    return { skipped: true, reason: 'Courses already exist', skillPathsCreated: 0, coursesCreated: 0 };
  }

  let skillPathsCreated = 0;
  let coursesCreated = 0;

  for (const sp of LIBRARY) {
    // eslint-disable-next-line no-await-in-loop
    const { skillPath, created: spCreated } = await upsertSkillPath({ title: sp.title, description: sp.description });
    if (spCreated) skillPathsCreated += 1;

    const createdCourseIds = [];
    for (const c of sp.courses) {
      // eslint-disable-next-line no-await-in-loop
      const { course, created } = await upsertCourse({ adminId, skillPathId: skillPath._id, course: c });
      if (created) coursesCreated += 1;
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

  return { skipped: false, skillPathsCreated, coursesCreated };
}

module.exports = { seedLibrary, LIBRARY };
