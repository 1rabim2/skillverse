const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Course = require('../models/Course');
const SkillPath = require('../models/SkillPath');
const User = require('../models/User');

const DEMO_PASSWORD = 'Demo@12345';
const INSTRUCTOR_EMAIL = 'mentor@skillverse.com';
const STUDENT_EMAIL = 'student@skillverse.com';

function question(prompt, options, correctIndex, explanation) {
  return { prompt, options, correctIndex, explanation };
}

function quiz(title, questions, passPercent = 70) {
  return {
    title,
    type: 'quiz',
    content: 'Answer these questions to check your understanding.',
    durationMin: 12,
    quiz: { passPercent, questions }
  };
}

function courseTemplate({ title, category, level, description, thumbnailUrl, videoUrl, resourceLink, project, questions }) {
  return {
    title,
    category,
    level,
    description,
    thumbnailUrl,
    videoUrl,
    resourceLink,
    status: 'published',
    isApproved: true,
    approvalRequestedAt: null,
    approvedAt: new Date(),
    chapters: [
      {
        title: 'Start Here',
        order: 1,
        lessons: [
          {
            title: 'Course overview',
            type: 'reading',
            content: `${description}\n\nBy the end, you should be able to explain the core idea, build a small feature, and answer the final quiz.`,
            durationMin: 8,
            order: 1
          },
          {
            title: 'Watch the introduction',
            type: 'video',
            content: 'Watch this short video, then write three notes in your own words.',
            videoUrl,
            resourceLink,
            durationMin: 20,
            order: 2
          }
        ]
      },
      {
        title: 'Build Skills',
        order: 2,
        lessons: [
          {
            title: 'Official reading',
            type: 'reading',
            content: 'Read the linked resource. Focus on examples, terminology, and the common mistakes beginners make.',
            resourceLink,
            durationMin: 35,
            order: 1
          },
          {
            title: 'Practice task',
            type: 'project',
            content: project,
            resourceLink,
            durationMin: 50,
            order: 2
          },
          quiz('Checkpoint quiz', questions.slice(0, 3), 60)
        ]
      },
      {
        title: 'Portfolio Task',
        order: 3,
        lessons: [
          {
            title: 'Mini project brief',
            type: 'project',
            content: `${project}\n\nAdd a short README explaining what you built, what was difficult, and how you solved it.`,
            durationMin: 60,
            order: 1
          },
          {
            title: 'Review and improve',
            type: 'reading',
            content: 'Check naming, layout, accessibility, and whether another student could understand your solution.',
            durationMin: 15,
            order: 2
          },
          quiz('Final quiz', questions, 70)
        ]
      }
    ]
  };
}

const skillPaths = [
  {
    title: 'Frontend Developer Roadmap',
    description: 'HTML, CSS, JavaScript, React, and portfolio projects.'
  },
  {
    title: 'MERN Backend Roadmap',
    description: 'Node, Express, MongoDB, authentication, and APIs.'
  },
  {
    title: 'Interview Practice Track',
    description: 'Quick quizzes and practical tasks for FYP viva and job interviews.'
  }
];

const courses = [
  {
    path: 'Frontend Developer Roadmap',
    data: courseTemplate({
      title: 'HTML & CSS Portfolio Foundations',
      category: 'Web Fundamentals',
      level: 'Beginner',
      description: 'Learn semantic HTML, accessible structure, responsive CSS, and build a clean personal portfolio section.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
      videoUrl: 'https://www.youtube.com/watch?v=G3e-cpL7ofc',
      resourceLink: 'https://developer.mozilla.org/en-US/docs/Learn',
      project: 'Build a one-page portfolio with a hero, skills list, project card, contact section, and responsive mobile layout.',
      questions: [
        question('Which HTML element is best for the main page content?', ['section', 'main', 'span', 'br'], 1, 'The main element identifies the primary content of the page.'),
        question('What does responsive design mean?', ['Only desktop design', 'Layout adapts to screen sizes', 'No CSS', 'Only images change'], 1, 'Responsive layouts work across mobile, tablet, and desktop.'),
        question('Which CSS feature is commonly used for two-dimensional layouts?', ['Flexbox', 'Grid', 'Alert', 'Prompt'], 1, 'CSS Grid is designed for rows and columns.'),
        question('Why should images have alt text?', ['For accessibility', 'For larger files', 'To hide images', 'To disable CSS'], 0, 'Alt text helps screen readers and fallback content.'),
        question('Which selector targets a class named card?', ['#card', '.card', 'card', '*card'], 1, 'Class selectors start with a dot.')
      ]
    })
  },
  {
    path: 'Frontend Developer Roadmap',
    data: courseTemplate({
      title: 'JavaScript Essentials for Interactive Websites',
      category: 'Frontend',
      level: 'Beginner',
      description: 'Practice variables, functions, arrays, DOM events, and simple validation through small browser tasks.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
      videoUrl: 'https://www.youtube.com/watch?v=W6NZfCO5SIk',
      resourceLink: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript',
      project: 'Create an interactive quiz card that checks answers, updates score, and shows feedback without refreshing the page.',
      questions: [
        question('Which keyword declares a block-scoped variable?', ['var', 'let', 'echo', 'print'], 1, 'let and const are block scoped in modern JavaScript.'),
        question('What does addEventListener do?', ['Adds CSS only', 'Listens for browser/user events', 'Creates a database', 'Deletes HTML'], 1, 'It registers a function to run when an event occurs.'),
        question('Which method converts JSON text into an object?', ['JSON.parse', 'JSON.stringify', 'Array.map', 'Object.keys'], 0, 'JSON.parse reads JSON text.'),
        question('What is the DOM?', ['Database object model', 'Document Object Model', 'Design only mode', 'Deploy object manager'], 1, 'The DOM represents the page structure for scripts.'),
        question('Which array method creates a new transformed array?', ['map', 'push', 'pop', 'shift'], 0, 'map returns a new array from transformed items.')
      ]
    })
  },
  {
    path: 'Frontend Developer Roadmap',
    data: courseTemplate({
      title: 'React Components and State',
      category: 'Frontend',
      level: 'Intermediate',
      description: 'Build reusable React components, pass props, manage state, and handle form interactions.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1200&q=80',
      videoUrl: 'https://www.youtube.com/watch?v=bMknfKXIFA8',
      resourceLink: 'https://react.dev/learn',
      project: 'Build a course card list with search, filters, and a saved/favorite button using React state.',
      questions: [
        question('What are props in React?', ['Database rows', 'Values passed into components', 'CSS files only', 'Server logs'], 1, 'Props pass data from parent to child components.'),
        question('Which hook manages local component state?', ['useState', 'useServer', 'useDatabase', 'useClass'], 0, 'useState stores local UI state.'),
        question('Why should lists have keys?', ['For stable rendering', 'For colors', 'For passwords', 'For API URLs'], 0, 'Keys help React track list items.'),
        question('What should a React component return?', ['SQL query', 'JSX/UI', 'Mongo document', 'Terminal command'], 1, 'Components return JSX describing UI.'),
        question('When should state be lifted up?', ['When sibling components need shared data', 'Never', 'Only for CSS', 'Only after deployment'], 0, 'Shared state belongs in a common parent.')
      ]
    })
  },
  {
    path: 'MERN Backend Roadmap',
    data: courseTemplate({
      title: 'Node.js and Express API Basics',
      category: 'Backend',
      level: 'Intermediate',
      description: 'Create Express routes, validate requests, return JSON, and understand middleware.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80',
      videoUrl: 'https://www.youtube.com/watch?v=Oe421EPjeBE',
      resourceLink: 'https://expressjs.com/en/starter/installing.html',
      project: 'Build a small REST API for courses with GET, POST, PUT, and DELETE routes plus validation.',
      questions: [
        question('What is Express used for?', ['Building Node web APIs', 'Editing images', 'Styling CSS', 'Compiling Java'], 0, 'Express is a Node.js web framework.'),
        question('What is middleware?', ['A function in the request-response pipeline', 'A database table', 'A CSS class', 'A deployment domain'], 0, 'Middleware can read/modify requests and responses.'),
        question('Which status code means created?', ['200', '201', '404', '500'], 1, '201 means a resource was created.'),
        question('Why validate request bodies?', ['To reduce bad data and errors', 'To slow apps', 'To remove routes', 'To change fonts'], 0, 'Validation protects data quality and security.'),
        question('What does res.json send?', ['JSON response', 'HTML only', 'Image only', 'Terminal output'], 0, 'res.json sends JSON to the client.')
      ]
    })
  },
  {
    path: 'MERN Backend Roadmap',
    data: courseTemplate({
      title: 'MongoDB Atlas and Mongoose Models',
      category: 'Database',
      level: 'Intermediate',
      description: 'Model collections with Mongoose, connect to MongoDB Atlas, and write useful queries.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1200&q=80',
      videoUrl: 'https://www.youtube.com/watch?v=-56x56UppqQ',
      resourceLink: 'https://mongoosejs.com/docs/guide.html',
      project: 'Create User and Course schemas, seed sample documents, and build a query to list published courses.',
      questions: [
        question('What is a Mongoose schema?', ['A structure definition for documents', 'A CSS reset', 'A browser event', 'A cloud bill'], 0, 'Schemas define fields, types, defaults, and validation.'),
        question('What is MongoDB Atlas?', ['Cloud-hosted MongoDB service', 'A CSS framework', 'A code editor', 'A payment gateway'], 0, 'Atlas hosts MongoDB databases in the cloud.'),
        question('Which method finds many documents?', ['find', 'findOneAndDelete only', 'listen', 'render'], 0, 'Model.find returns matching documents.'),
        question('Why use indexes?', ['To improve query performance', 'To add images', 'To make passwords', 'To change ports'], 0, 'Indexes help MongoDB find data faster.'),
        question('What does populate help with?', ['Loading referenced documents', 'Deploying frontend', 'Compressing images', 'Changing HTML'], 0, 'populate replaces references with document data.')
      ]
    })
  }
];

async function upsertUser({ email, name, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    existing.name = name;
    existing.role = role;
    existing.isActive = true;
    existing.isVerified = true;
    if (!existing.password) existing.password = await bcrypt.hash(DEMO_PASSWORD, 10);
    await existing.save();
    return existing;
  }

  return User.create({
    name,
    email,
    role,
    password: await bcrypt.hash(DEMO_PASSWORD, 10),
    isActive: true,
    isVerified: true,
    verificationToken: undefined
  });
}

async function upsertSkillPath(pathData) {
  const existing = await SkillPath.findOne({ title: pathData.title });
  if (existing) {
    existing.description = pathData.description;
    await existing.save();
    return existing;
  }
  return SkillPath.create({ ...pathData, courses: [] });
}

async function upsertCourse(courseData, skillPath, instructor) {
  const existing = await Course.findOne({ title: courseData.title });
  const payload = {
    ...courseData,
    skillPath: skillPath._id,
    instructorId: instructor._id,
    createdBy: null,
    status: 'published',
    isApproved: true,
    approvalRequestedAt: null,
    approvedAt: new Date()
  };

  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return existing;
  }

  return Course.create(payload);
}

async function main() {
  const mongo = process.env.MONGO_URI;
  if (!mongo) throw new Error('Missing MONGO_URI');

  await mongoose.connect(mongo, { serverSelectionTimeoutMS: 10000 });

  const instructor = await upsertUser({
    email: INSTRUCTOR_EMAIL,
    name: 'SkillVerse Mentor',
    role: 'instructor'
  });
  const student = await upsertUser({
    email: STUDENT_EMAIL,
    name: 'Demo Student',
    role: 'student'
  });

  const pathByTitle = new Map();
  for (const pathData of skillPaths) {
    const sp = await upsertSkillPath(pathData);
    sp.courses = [];
    pathByTitle.set(sp.title, sp);
  }

  const seededCourses = [];
  for (const item of courses) {
    const sp = pathByTitle.get(item.path);
    const course = await upsertCourse(item.data, sp, instructor);
    seededCourses.push(course);
    if (!sp.courses.map((id) => String(id)).includes(String(course._id))) sp.courses.push(course._id);
  }

  for (const sp of pathByTitle.values()) {
    await sp.save();
  }

  const existingEnrollments = new Set((student.enrolledCourses || []).map((id) => String(id)));
  for (const course of seededCourses) {
    if (!existingEnrollments.has(String(course._id))) student.enrolledCourses.push(course._id);
  }
  await student.save();

  console.log(JSON.stringify({
    ok: true,
    skillPaths: Array.from(pathByTitle.keys()),
    courses: seededCourses.map((c) => c.title),
    instructorLogin: { email: INSTRUCTOR_EMAIL, password: DEMO_PASSWORD },
    studentLogin: { email: STUDENT_EMAIL, password: DEMO_PASSWORD },
    note: 'Demo student is enrolled in seeded courses, so Quiz Game has questions.'
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
