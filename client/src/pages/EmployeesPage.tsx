import { useState } from 'react';
import EmployeeList from '../components/EmployeeList';
import EmployeeForm from '../components/EmployeeForm';

type PanelState =
  | { mode: 'empty' }
  | { mode: 'create' }
  | { mode: 'view'; employeeId: number }
  | { mode: 'edit'; employeeId: number };

export default function EmployeesPage() {
  const [panelState, setPanelState] = useState<PanelState>({ mode: 'empty' });
  const [prevState, setPrevState] = useState<PanelState>({ mode: 'empty' });

  function handleSelect(id: number) {
    setPanelState({ mode: 'view', employeeId: id });
  }

  function handleNew() {
    setPrevState(panelState);
    setPanelState({ mode: 'create' });
  }

  function handleEdit(id: number) {
    setPrevState(panelState);
    setPanelState({ mode: 'edit', employeeId: id });
  }

  function handleCreated(id: number) {
    setPanelState({ mode: 'view', employeeId: id });
  }

  function handleSaved(id: number) {
    setPanelState({ mode: 'view', employeeId: id });
  }

  function handleDeleted() {
    setPanelState({ mode: 'empty' });
  }

  function handleCancel() {
    setPanelState(prevState);
  }

  const selectedId =
    panelState.mode === 'view' || panelState.mode === 'edit'
      ? panelState.employeeId
      : null;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f5f5' }}>
      <div style={{ width: '35%', background: '#fff', borderRight: '1px solid #e8e8e8', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeList selectedId={selectedId} onSelect={handleSelect} onNew={handleNew} />
      </div>
      <div style={{ flex: 1, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {panelState.mode === 'empty' ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa', fontSize: 14 }}>
            Select an employee or click New to create one
          </div>
        ) : (
          <EmployeeForm
            mode={panelState.mode}
            employeeId={'employeeId' in panelState ? panelState.employeeId : null}
            onCreated={handleCreated}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            onCancel={handleCancel}
            onEdit={handleEdit}
          />
        )}
      </div>
    </div>
  );
}
