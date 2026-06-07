import type { Knex } from 'knex';
import type { InsightsDto } from '../types/insights';

export interface IInsightsRepository {
  listCountries(): Promise<string[]>;
  getInsights(country: string): Promise<InsightsDto>;
}

export class InsightsRepository implements IInsightsRepository {
  constructor(private readonly knex: Knex) {}

  async listCountries(): Promise<string[]> {
    const rows = await this.knex('employees').distinct('country').orderBy('country', 'asc');
    return rows.map((r: { country: string }) => r.country);
  }

  async getInsights(country: string): Promise<InsightsDto> {
    const [genderRows, employmentRows, salaryRow, deptRows] = await Promise.all([
      this.knex('employees').where({ country }).select('gender').count('* as count').groupBy('gender'),
      this.knex('employees').where({ country }).select('employment_type').count('* as count').groupBy('employment_type'),
      this.knex('employees')
        .where({ country })
        .avg('salary as avgSalary')
        .min('salary as minSalary')
        .max('salary as maxSalary')
        .sum('salary as totalPayroll')
        .first<{ avgSalary: number | string; minSalary: number | string; maxSalary: number | string; totalPayroll: number | string }>(),
      this.knex('employees')
        .where({ country })
        .select('department')
        .count('* as headcount')
        .avg('salary as avgSalary')
        .groupBy('department')
        .orderBy('headcount', 'desc'),
    ]);

    const genderBreakdown = { Male: 0, Female: 0, Other: 0 };
    let headcount = 0;
    for (const row of genderRows as Array<{ gender: string; count: number | string }>) {
      const count = Number(row.count);
      genderBreakdown[row.gender as keyof typeof genderBreakdown] = count;
      headcount += count;
    }

    const employmentTypeBreakdown = { 'Full-time': 0, Contractor: 0 };
    for (const row of employmentRows as Array<{ employment_type: string; count: number | string }>) {
      employmentTypeBreakdown[row.employment_type as keyof typeof employmentTypeBreakdown] = Number(row.count);
    }

    return {
      headcount,
      genderBreakdown,
      employmentTypeBreakdown,
      avgSalary: Math.round(Number(salaryRow?.avgSalary ?? 0)),
      minSalary: Number(salaryRow?.minSalary ?? 0),
      maxSalary: Number(salaryRow?.maxSalary ?? 0),
      totalPayroll: Number(salaryRow?.totalPayroll ?? 0),
      departmentBreakdown: (deptRows as Array<{ department: string; headcount: number | string; avgSalary: number | string }>).map((r) => ({
        department: r.department,
        headcount: Number(r.headcount),
        avgSalary: Math.round(Number(r.avgSalary)),
      })),
    };
  }
}
