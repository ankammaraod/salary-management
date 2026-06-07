export interface DepartmentStat {
  department: string;
  headcount: number;
  avgSalary: number;
}

export interface InsightsDto {
  headcount: number;
  genderBreakdown: { Male: number; Female: number; Other: number };
  employmentTypeBreakdown: { 'Full-time': number; Contractor: number };
  avgSalary: number;
  minSalary: number;
  maxSalary: number;
  totalPayroll: number;
  departmentBreakdown: DepartmentStat[];
}
