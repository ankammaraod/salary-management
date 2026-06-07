/*
 * Generate a CSV file for testing the bulk-upload feature.
 *
 * Usage:
 *   node scripts/generate-employees-csv.js <rows> [outputPath]
 *
 * Example:
 *   node scripts/generate-employees-csv.js 250 ./test-employees.csv
 *
 * The output matches the bulk-upload contract exactly:
 *   columns: name,email,gender,role,department,country,salary,employment_type,joining_date
 *   - gender ∈ Male | Female | Other
 *   - employment_type ∈ Full-time | Contractor
 *   - salary is a positive integer in the country's local-currency range
 *   - joining_date is YYYY-MM-DD
 *   - emails are unique within the file and use a dedicated domain so they
 *     do not collide with the seeded data already in the database
 *
 * Note: the upload feature rejects files with more than 500 rows.
 */

const fs = require('fs');
const path = require('path');

const HEADERS = ['name', 'email', 'gender', 'role', 'department', 'country', 'salary', 'employment_type', 'joining_date'];

// Country salary ranges mirror the seed script so generated data is realistic for insights.
const COUNTRIES = [
  { name: 'USA',            min: 60000,   max: 200000   },
  { name: 'United Kingdom', min: 30000,   max: 120000   },
  { name: 'Germany',        min: 35000,   max: 110000   },
  { name: 'France',         min: 30000,   max: 100000   },
  { name: 'India',          min: 500000,  max: 3000000  },
  { name: 'Japan',          min: 3000000, max: 12000000 },
  { name: 'Brazil',         min: 50000,   max: 250000   },
  { name: 'Australia',      min: 55000,   max: 180000   },
];

const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'Finance'];
const ROLES = [
  'Software Engineer', 'Engineering Manager', 'Sales Representative', 'Sales Manager',
  'Marketing Specialist', 'Marketing Manager', 'Financial Analyst', 'Finance Manager',
];
const FIRST_NAMES = ['Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy', 'Mallory', 'Niaj', 'Olivia', 'Peggy', 'Rupert', 'Sybil', 'Trent', 'Victor', 'Walter', 'Yvonne'];
const LAST_NAMES = ['Anderson', 'Brown', 'Clark', 'Davis', 'Evans', 'Garcia', 'Harris', 'Johnson', 'Kumar', 'Lopez', 'Martin', 'Nguyen', 'Owens', 'Patel', 'Quinn', 'Roberts', 'Smith', 'Taylor', 'Walker', 'Young'];

const GENDERS = ['Male', 'Female', 'Other'];
const GENDER_WEIGHTS = [45, 45, 10];
const EMPLOYMENT_TYPES = ['Full-time', 'Contractor'];
const EMPLOYMENT_WEIGHTS = [80, 20];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick(items, weights) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return items[i];
  }
  return items[items.length - 1];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundToNearest100(n) {
  return Math.round(n / 100) * 100;
}

function randomDate() {
  const start = new Date('2016-01-01').getTime();
  const end = new Date('2026-06-06').getTime();
  return new Date(randomInt(start, end)).toISOString().slice(0, 10);
}

// Quote a field if it contains a comma, quote, or newline (RFC 4180).
function csvField(value) {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function generateRows(count, stamp) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const country = pick(COUNTRIES);
    rows.push({
      name: `${firstName} ${lastName}`,
      // index + stamp guarantee uniqueness within the file and across runs;
      // the dedicated domain avoids collisions with seeded @example.com data.
      email: `${firstName}.${lastName}.${i}.${stamp}@bulkupload.test`.toLowerCase(),
      gender: weightedPick(GENDERS, GENDER_WEIGHTS),
      role: pick(ROLES),
      department: pick(DEPARTMENTS),
      country: country.name,
      salary: roundToNearest100(randomInt(country.min, country.max)),
      employment_type: weightedPick(EMPLOYMENT_TYPES, EMPLOYMENT_WEIGHTS),
      joining_date: randomDate(),
    });
  }
  return rows;
}

function main() {
  const rows = Number(process.argv[2]);
  if (!Number.isInteger(rows) || rows <= 0) {
    console.error('Usage: node scripts/generate-employees-csv.js <rows> [outputPath]');
    console.error('  <rows> must be a positive integer.');
    process.exit(1);
  }
  if (rows > 500) {
    console.warn(`⚠  ${rows} rows exceeds the bulk-upload limit of 500 — the upload feature will reject this file.`);
  }

  const stamp = Date.now().toString(36);
  const outputPath = process.argv[3]
    ? path.resolve(process.argv[3])
    : path.resolve(process.cwd(), `employees-${rows}.csv`);

  const data = generateRows(rows, stamp);
  const lines = [HEADERS.join(',')];
  for (const row of data) {
    lines.push(HEADERS.map(h => csvField(row[h])).join(','));
  }
  fs.writeFileSync(outputPath, lines.join('\n') + '\n');

  console.log(`✓ Generated ${rows} employees → ${outputPath}`);
}

main();