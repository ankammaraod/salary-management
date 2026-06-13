import { useState } from 'react';
import { Select, Card, Statistic, Table, Spin, Alert, Typography } from 'antd';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { useCountries, useInsights } from '../hooks/useInsights';
import { getCurrencySymbol } from '../utils/currency';
import type { ColumnsType } from 'antd/es/table';
import type { DepartmentStat } from '../types/insights';

const { Title } = Typography;

const GENDER_COLORS: Record<string, string> = {
  Male: '#1677ff',
  Female: '#722ed1',
  Other: '#888888',
};

const EMPLOYMENT_COLORS: Record<string, string> = {
  'Full-time': '#52c41a',
  Contractor: '#fa8c16',
};

export default function InsightsPage() {
  const [country, setCountry] = useState('');
  const { data: countries = [] } = useCountries();
  const { data: insights, isLoading, isError } = useInsights(country);

  const symbol = getCurrencySymbol(country);

  function formatSalary(value: number) {
    return `${symbol}${value.toLocaleString()}`;
  }

  function formatPayroll(value: number) {
    if (value >= 1_000_000_000) return `${symbol}${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
    return `${symbol}${value.toLocaleString()}`;
  }

  const deptColumns: ColumnsType<DepartmentStat> = [
    { title: 'Department', dataIndex: 'department', key: 'department' },
    {
      title: 'Headcount',
      dataIndex: 'headcount',
      key: 'headcount',
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: 'Avg Salary',
      dataIndex: 'avgSalary',
      key: 'avgSalary',
      render: (v: number) => formatSalary(v),
    },
  ];

  const genderData = insights
    ? Object.entries(insights.genderBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  const employmentData = insights
    ? Object.entries(insights.employmentTypeBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div style={{ maxWidth: 'min(900px, 90vw)', margin: '0 auto' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Salary Insights</Title>
        <Select
          style={{ width: 240 }}
          placeholder="Select a country"
          options={countries.map((c) => ({ label: c, value: c }))}
          onChange={(value) => setCountry(value)}
          value={country || undefined}
        />
      </div>

      <Card style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e8e8' }}>
        {!country && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888888' }}>
            Select a country to view salary insights
          </div>
        )}

        {country && isLoading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
          </div>
        )}

        {country && isError && (
          <Alert type="error" message="Failed to load insights" />
        )}

        {country && insights && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Card style={{ flex: 1, minWidth: 130 }}>
                <Statistic title="Headcount" value={insights.headcount.toLocaleString()} />
              </Card>
              <Card style={{ flex: 1, minWidth: 130 }}>
                <Statistic title="Avg Salary" value={formatSalary(insights.avgSalary)} />
              </Card>
              <Card style={{ flex: 1, minWidth: 130 }}>
                <Statistic title="Min Salary" value={formatSalary(insights.minSalary)} />
              </Card>
              <Card style={{ flex: 1, minWidth: 130 }}>
                <Statistic title="Max Salary" value={formatSalary(insights.maxSalary)} />
              </Card>
              <Card style={{ flex: 1, minWidth: 130 }}>
                <Statistic title="Total Payroll" value={formatPayroll(insights.totalPayroll)} />
              </Card>
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Card title="Gender Breakdown" style={{ flex: 1, minWidth: 260 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                      {genderData.map((entry) => (
                        <Cell key={entry.name} fill={GENDER_COLORS[entry.name] ?? '#cccccc'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
              <Card title="Employment Type" style={{ flex: 1, minWidth: 260 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={employmentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                      {employmentData.map((entry) => (
                        <Cell key={entry.name} fill={EMPLOYMENT_COLORS[entry.name] ?? '#cccccc'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <Card title="Department Breakdown">
              <Table
                dataSource={insights.departmentBreakdown}
                columns={deptColumns}
                rowKey="department"
                pagination={false}
                size="small"
              />
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}
