const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function baseUrl() {
  const port = process.env.PORT || 4000;
  return process.env.BASE_URL || `http://localhost:${port}`;
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { res, data };
}

async function main() {
  const base = baseUrl();
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@skillverse.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin12345';

  const loginUrl = `${base}/api/admin/auth/login`;
  const seedUrl = `${base}/api/admin/seed/library`;

  console.log(`Using API base: ${base}`);

  const { res: loginRes, data: loginData } = await jsonFetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });

  if (!loginRes.ok || !loginData?.token) {
    console.error('Admin login failed. Make sure the backend is running and ADMIN_EMAIL/ADMIN_PASSWORD are correct.');
    console.error(loginData?.error || loginData);
    process.exit(1);
  }

  const token = loginData.token;

  const { res: seedRes, data: seedData } = await jsonFetch(seedUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ force: true })
  });

  if (!seedRes.ok) {
    console.error('Seeding failed:');
    console.error(seedData?.error || seedData);
    process.exit(1);
  }

  console.log('Seeded real course library:');
  console.log(JSON.stringify(seedData, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

