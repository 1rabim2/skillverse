const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const Course = require('../models/Course');
const { displayCourseTitle } = require('../utils/courseVisibility');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const apply = process.argv.includes('--apply');
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI or MONGODB_URI is required');

  await mongoose.connect(uri);
  const courses = await Course.find({ title: /\s+\(Copy\)$/i }).select('_id title');

  if (courses.length === 0) {
    console.log('No course titles ending with "(Copy)" found.');
    return;
  }

  console.log(`${apply ? 'Updating' : 'Dry run:'} ${courses.length} course title(s) ending with "(Copy)".`);
  for (const course of courses) {
    const nextTitle = displayCourseTitle(course.title);
    console.log(`- ${course.title} -> ${nextTitle}`);
    if (apply) {
      course.title = nextTitle;
      await course.save();
    }
  }

  if (!apply) {
    console.log('Run `npm run cleanup:course-titles -- --apply` from backend/ to apply these changes.');
  }
}

main()
  .catch((err) => {
    console.error(err?.stack || err?.message || String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => null);
  });
