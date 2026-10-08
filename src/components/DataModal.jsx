import { useState, useRef } from 'react';
import { useApp } from '../context/useApp';
import { Modal } from './Modal';

export function DataModal({ isOpen, onClose }) {
  const { exportData, importData, loadScenario, clearAllData, addToast } = useApp();
  const fileInputRef = useRef(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleExport = () => {
    try {
      const jsonString = exportData();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my-academia-buddy-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('Backup downloaded successfully.', 'success');
    } catch (e) {
      addToast(`Export failed: ${e.message}`, 'error');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const success = importData(content);
        if (success) {
          onClose();
        }
      }
    };
    reader.onerror = () => {
      addToast('Failed to read backup file.', 'error');
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearAllData();
    setConfirmClear(false);
    onClose();
  };

  const handleLoadConsistent = () => {
    loadScenario('consistent');
    onClose();
  };

  const handleLoadDelayed = () => {
    loadScenario('delayed');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Data Management & Backup">
      <div className="data-modal-content">
        <p className="data-modal-intro">
          My Academia Buddy stores your courses, tasks, and schedules locally in your browser. Use the controls below to backup, restore, or reset your workspace.
        </p>

        <div className="data-action-grid">
          <div className="data-card">
            <h4>📦 Export Backup</h4>
            <p>Download a JSON snapshot of your courses, assignments, exams, and study plan.</p>
            <button type="button" className="btn btn-secondary" onClick={handleExport}>
              Download Backup JSON
            </button>
          </div>

          <div className="data-card">
            <h4>📥 Import Backup</h4>
            <p>Restore your data from a previously exported JSON backup file.</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,application/json"
              style={{ display: 'none' }}
              aria-label="Upload JSON backup file"
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Backup File
            </button>
          </div>

          <div className="data-card">
            <h4>🟢 Scenario A: On-Track Student</h4>
            <p><strong>Alex Chen:</strong> 4 courses (CSI2110, SEG2105, MAT1348, ENG1112), high syllabus completion (96%), balanced 1.0x pace, 85-94% readiness across all courses.</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleLoadConsistent}>
              Load Alex (On-Track)
            </button>
          </div>

          <div className="data-card">
            <h4>🟠 Scenario B: Delayed Student</h4>
            <p><strong>Jordan Taylor:</strong> Same 4 courses with 2-3 weeks of accumulated delays, +30% buffer pace (1.3x), rescheduled recovery topics, low confidence & exam critical alerts.</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleLoadDelayed}>
              Load Jordan (Delayed)
            </button>
          </div>

          <div className="data-card data-card-danger">
            <h4>⚠️ Reset Storage</h4>
            <p>Clear all local courses, tasks, and study plans permanently from this browser.</p>
            <button
              type="button"
              className={`btn ${confirmClear ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={handleClear}
            >
              {confirmClear ? 'Confirm Complete Reset' : 'Clear All Data'}
            </button>
          </div>
        </div>

        <div className="data-supabase-note">
          <div className="supabase-badge">Future Cloud Roadmap</div>
          <p>
            <strong>Looking to sync across devices?</strong> The upcoming v3.0 release plans integration with Supabase for multi-device authentication and real-time cloud database persistence. See <a href="#roadmap" onClick={(e) => { e.preventDefault(); onClose(); }}>docs/ROADMAP.md</a> for the migration architecture.
          </p>
        </div>
      </div>
    </Modal>
  );
}
