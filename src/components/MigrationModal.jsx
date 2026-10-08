import { useState } from 'react';
import { Modal } from './Modal';
import { executeMigration, skipMigration, getGuestInventorySummary } from '../services/migrationService';
import { exportAllData } from '../services/storage';

export function MigrationModal({ isOpen, onClose, userId, onMigrationComplete }) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const inventory = getGuestInventorySummary();

  const handleDownloadBackup = () => {
    try {
      const json = exportAllData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `academia-buddy-pre-migration-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      setErrorMsg(`Failed to download backup: ${e.message}`);
    }
  };

  const handleMigrate = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const result = await executeMigration(userId);
      if (result.success) {
        setSuccessMsg('All local courses and coach records have been securely synchronized to your cloud account!');
        setTimeout(() => {
          if (onMigrationComplete) onMigrationComplete(result);
          onClose();
        }, 1500);
      } else {
        setErrorMsg('Migration failed to complete. Your local data remains safely intact.');
      }
    } catch (err) {
      setErrorMsg(`Migration error: ${err.message}. Local data was preserved.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    skipMigration(userId);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleSkip} title="Sync Local Academic Data">
      <div className="migration-modal-content">
        <p className="migration-intro">
          We found existing academic data saved on this browser. Would you like to migrate this data to your cloud account so you can access your schedule and coach progress from any device?
        </p>

        {errorMsg && <div className="auth-alert auth-alert-error">{errorMsg}</div>}
        {successMsg && <div className="auth-alert auth-alert-success">{successMsg}</div>}

        <div className="migration-inventory-grid">
          <div className="inventory-stat-card">
            <span className="inventory-stat-icon">📚</span>
            <span className="inventory-stat-value">{inventory.coursesCount}</span>
            <span className="inventory-stat-label">Courses</span>
          </div>

          <div className="inventory-stat-card">
            <span className="inventory-stat-icon">📑</span>
            <span className="inventory-stat-value">{inventory.topicsCount}</span>
            <span className="inventory-stat-label">Syllabus Topics</span>
          </div>

          <div className="inventory-stat-card">
            <span className="inventory-stat-icon">📝</span>
            <span className="inventory-stat-value">{inventory.assignmentsCount}</span>
            <span className="inventory-stat-label">Assignments</span>
          </div>

          <div className="inventory-stat-card">
            <span className="inventory-stat-icon">📅</span>
            <span className="inventory-stat-value">{inventory.examsCount}</span>
            <span className="inventory-stat-label">Exams</span>
          </div>

          <div className="inventory-stat-card">
            <span className="inventory-stat-icon">🧭</span>
            <span className="inventory-stat-value">{inventory.checkInsCount}</span>
            <span className="inventory-stat-label">Check-Ins</span>
          </div>
        </div>

        <div className="migration-backup-hint">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={handleDownloadBackup}
          >
            💾 Download Local Backup First (.json)
          </button>
          <small className="text-muted">
            An immutable recovery backup is also automatically retained in your browser.
          </small>
        </div>

        <div className="migration-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSkip}
            disabled={submitting}
          >
            Start Fresh (Don't Sync)
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleMigrate}
            disabled={submitting}
          >
            {submitting ? 'Verifying & Syncing...' : 'Sync to Cloud Account'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default MigrationModal;
