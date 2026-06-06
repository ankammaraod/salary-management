import type { Knex } from 'knex';
import { faker } from '@faker-js/faker';

const COUNTRIES = [
  { name: 'USA',            min: 60000,    max: 200000    },
  { name: 'United Kingdom', min: 30000,    max: 120000    },
  { name: 'Germany',        min: 35000,    max: 110000    },
  { name: 'France',         min: 30000,    max: 100000    },
  { name: 'India',          min: 500000,   max: 3000000   },
  { name: 'Japan',          min: 3000000,  max: 12000000  },
  { name: 'Brazil',         min: 50000,    max: 250000    },
  { name: 'Australia',      min: 55000,    max: 180000    },
];

const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'Finance'];

const ROLES = [
  'Software Engineer',
  'Engineering Manager',
  'Sales Representative',
  'Sales Manager',
  'Marketing Specialist',
  'Marketing Manager',
  'Financial Analyst',
  'Finance Manager',
];

const GENDERS: Array<'Male' | 'Female' | 'Other'> = ['Male', 'Female', 'Other'];
const GENDER_WEIGHTS = [45, 45, 10];

const EMPLOYMENT_TYPES: Array<'Full-time' | 'Contractor'> = ['Full-time', 'Contractor'];
const EMPLOYMENT_WEIGHTS = [80, 20];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return items[i];
  }
  return items[items.length - 1];
}

function roundToNearest100(n: number): number {
  return Math.round(n / 100) * 100;
}

export async function seed(knex: Knex): Promise<void> {
  await knex('employees').truncate();

  const employees = [];
  let globalIndex = 0;

  for (const country of COUNTRIES) {
    for (let j = 0; j < 1250; j++) {
      const i = globalIndex++;
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const emailLocal = faker.internet.email({ firstName, lastName }).split('@')[0];
      const email = `${emailLocal}_${String(i).padStart(4, '0')}@example.com`;
      const salary = roundToNearest100(
        faker.number.int({ min: country.min, max: country.max })
      );
      const joiningDate = faker.date
        .between({ from: '2016-01-01', to: '2026-06-06' })
        .toISOString()
        .slice(0, 10);

      employees.push({
        name: `${firstName} ${lastName}`,
        email,
        gender: weightedPick(GENDERS, GENDER_WEIGHTS),
        role: pick(ROLES),
        department: pick(DEPARTMENTS),
        country: country.name,
        salary,
        employment_type: weightedPick(EMPLOYMENT_TYPES, EMPLOYMENT_WEIGHTS),
        joining_date: joiningDate,
      });
    }
  }

  await knex.batchInsert('employees', employees, 100);
}
