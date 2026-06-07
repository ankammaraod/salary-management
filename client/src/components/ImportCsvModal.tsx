import { useState } from 'react';
import { Modal, Alert, Button, Table, Spin, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';
import { useUpload } from '../hooks/useUpload';
import { validateCsvRows } from '../utils/validateCsvRows';
import type { RowError, BulkApiError } from '../types/upload';
import type { CreateEmployeeDto } from '../types/employee';
import type { ColumnsType } from 'antd/es/table';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_ROWS = 500;
const EXPECTED_HEADERS = ['name', 'email', 'gender', 'role', 'department', 'country', 'salary', 'employment_type', 'joining_date'];

type Phase =
  | { type: 'idle' }
  | { type: 'parsing' }
  | { type: 'file-error'; message: string }
  | { type: 'preview-errors'; errors: RowError[] }
  | { type: 'preview-valid'; rows: CreateEmployeeDto[] }
  | { type: 'uploading'; rows: CreateEmployeeDto[] }
  | { type: 'success'; inserted: number };

const errorColumns: ColumnsType<RowError> = [
  { title: 'Row', key: 'row', render: (_, r) => r.index + 2, width: 70 },
  { title: 'Field', dataIndex: 'field', key: 'field' },
  { title: 'Error', dataIndex: 'message', key: 'message' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ImportCsvModal({ open, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>({ type: 'idle' });
  const navigate = useNavigate();
  const mutation = useUpload();

  function reset() {
    setPhase({ type: 'idle' });
    mutation.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      setPhase({ type: 'file-error', message: 'File exceeds 2MB limit' });
      return false;
    }

    setPhase({ type: 'parsing' });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        const fields = results.meta.fields ?? [];
        const missing = EXPECTED_HEADERS.filter(h => !fields.includes(h));
        const extra = fields.filter(h => !EXPECTED_HEADERS.includes(h));

        if (missing.length > 0) {
          setPhase({ type: 'file-error', message: `Missing columns: ${missing.join(', ')}` });
          return;
        }
        if (extra.length > 0) {
          setPhase({ type: 'file-error', message: `Unexpected columns: ${extra.join(', ')}` });
          return;
        }

        const data = results.data;
        if (data.length === 0) {
          setPhase({ type: 'file-error', message: 'File has no data rows' });
          return;
        }
        if (data.length > MAX_ROWS) {
          setPhase({ type: 'file-error', message: `File exceeds ${MAX_ROWS} row limit` });
          return;
        }

        const { valid, errors } = validateCsvRows(data);
        if (errors.length > 0) {
          setPhase({ type: 'preview-errors', errors });
        } else {
          setPhase({ type: 'preview-valid', rows: valid });
        }
      },
      error: (err: { message: string }) => {
        setPhase({ type: 'file-error', message: err.message });
      },
    });

    return false;
  }

  function handleImport() {
    if (phase.type !== 'preview-valid') return;
    const rows = phase.rows;
    setPhase({ type: 'uploading', rows });

    mutation.mutate(rows, {
      onSuccess: (result) => {
        setPhase({ type: 'success', inserted: result.inserted });
      },
      onError: (err) => {
        const apiErr = err as BulkApiError;
        if (apiErr.details?.errors) {
          setPhase({ type: 'preview-errors', errors: apiErr.details.errors });
        } else {
          setPhase({ type: 'file-error', message: apiErr.error ?? 'Upload failed' });
        }
      },
    });
  }

  const rowCount =
    phase.type === 'preview-valid' || phase.type === 'uploading' ? phase.rows.length : 0;

  return (
    <Modal title="Import CSV" open={open} onCancel={handleClose} footer={null} destroyOnHidden width={640}>
      {phase.type === 'idle' && (
        <div>
          <Upload.Dragger accept=".csv,text/csv" showUploadList={false} beforeUpload={handleFile}>
            <p><UploadOutlined style={{ fontSize: 24 }} /></p>
            <p>Click or drag a CSV file here</p>
          </Upload.Dragger>
          <p style={{ marginTop: 12, color: '#888888', fontSize: 12 }}>
            Expected columns: name, email, gender, role, department, country, salary, employment_type, joining_date
          </p>
          <p style={{ color: '#888888', fontSize: 12 }}>Maximum {MAX_ROWS} rows · 2MB file size</p>
        </div>
      )}

      {phase.type === 'parsing' && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      )}

      {phase.type === 'file-error' && (
        <div>
          <Alert type="error" message={phase.message} />
          <Button style={{ marginTop: 12 }} onClick={reset}>Choose a different file</Button>
        </div>
      )}

      {phase.type === 'preview-errors' && (
        <div>
          <Alert
            type="error"
            message={`${phase.errors.length} error(s) found — fix the file and re-upload`}
            style={{ marginBottom: 12 }}
          />
          <Table
            dataSource={phase.errors}
            columns={errorColumns}
            rowKey={(r, i) => `${r.index}-${r.field}-${i}`}
            pagination={false}
            size="small"
            scroll={{ y: 320 }}
          />
          <Button style={{ marginTop: 12 }} onClick={reset}>Choose a different file</Button>
        </div>
      )}

      {(phase.type === 'preview-valid' || phase.type === 'uploading') && (
        <div>
          <Alert
            type="success"
            message={`${rowCount} employees ready to import`}
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={reset}>Choose a different file</Button>
            <Button
              type="primary"
              loading={phase.type === 'uploading'}
              onClick={handleImport}
            >
              Import {rowCount} employees
            </Button>
          </div>
        </div>
      )}

      {phase.type === 'success' && (
        <div>
          <Alert
            type="success"
            message={`${phase.inserted} employees imported successfully`}
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="primary" onClick={() => { handleClose(); navigate('/employees'); }}>
              View Employees
            </Button>
            <Button onClick={reset}>Upload another file</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
