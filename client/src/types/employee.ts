export interface Employee {
  id: number;
  name: string;
  email: string;
  gender: 'Male' | 'Female' | 'Other';
  role: string;
  department: string;
  country: string;
  salary: number;
  employment_type: 'Full-time' | 'Contractor';
  joining_date: string; // YYYY-MM-DD
}

export type CreateEmployeeDto = Omit<Employee, 'id'>;
