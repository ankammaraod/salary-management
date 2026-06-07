import { Select, Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export default function PaginationBar({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationBarProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#888888' }}>Rows per page:</span>
        <Select
          value={pageSize}
          onChange={onPageSizeChange}
          options={[
            { value: 20, label: '20' },
            { value: 50, label: '50' },
            { value: 100, label: '100' },
          ]}
          style={{ width: 72 }}
          size="small"
        />
      </div>
      <span style={{ fontSize: 13 }}>
        {total === 0 ? '0 of 0' : `${start}–${end} of ${total.toLocaleString()}`}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        <Button
          icon={<LeftOutlined />}
          size="small"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        />
        <Button
          icon={<RightOutlined />}
          size="small"
          disabled={page * pageSize >= total}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        />
      </div>
    </div>
  );
}
