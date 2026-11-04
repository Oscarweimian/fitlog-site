import { useRef } from 'react';

export default function BackupActions({ onExport, onRestore }) {
  const fileInputRef = useRef(null);

  return <div className="backup-actions" role="group" aria-label="Journal backup">
    <button type="button" onClick={onExport}>Export backup</button>
    <button type="button" onClick={() => fileInputRef.current?.click()}>Restore backup</button>
    <input ref={fileInputRef} type="file" accept=".json,application/json" hidden onChange={onRestore} />
  </div>;
}
