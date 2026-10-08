import { useMemo } from 'react';
import { useApp } from '../context/useApp';
import { useAuth } from '../context/useAuth';

export function Header({ onToggleSidebar, onOpenDataModal }) {
  const { user } = useAuth();
  const {
    assignments,
    exams,
    studentProfile,
    checkIns = [],
    openCheckInModal,
    openProfileModal,
    openAuthModal,
    adaptiveSignals,
    syncStatus,
    syncConflict,
  } = useApp();

  const urgentCount = useMemo(() => {
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + 3);

    const urgentAssignments = assignments.filter((a) => {
      if (a.completed || !a.dueDate) return false;
      const due = new Date(`${a.dueDate}T12:00:00`);
      return due <= threshold;
    }).length;

    const urgentExams = exams.filter((e) => {
      if (!e.date) return false;
      const examDate = new Date(`${e.date}T12:00:00`);
      return examDate <= threshold;
    }).length;

    return urgentAssignments + urgentExams;
  }, [assignments, exams]);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const hasRecentCheckIn = useMemo(() => {
    if (!checkIns || checkIns.length === 0) return false;
    const last = checkIns[checkIns.length - 1];
    if (!last?.date) return false;
    const diffDays = (new Date() - new Date(last.date)) / (1000 * 60 * 60 * 24);
    return diffDays < 5;
  }, [checkIns]);

  const syncStatusDetails = useMemo(() => {
    switch (syncStatus) {
      case 'synced':
        return { label: 'Synced', icon: '🟢', className: 'sync-pill-synced', title: 'All academic data synced to cloud' };
      case 'syncing':
        return { label: 'Syncing...', icon: '🟡', className: 'sync-pill-syncing', title: 'Saving changes to Supabase...' };
      case 'offline':
        return { label: 'Offline', icon: '⚪', className: 'sync-pill-offline', title: 'Working offline. Changes queued in local cache.' };
      case 'conflict':
        return { label: 'Conflict', icon: '🔴', className: 'sync-pill-conflict', title: `Edit conflict detected: ${syncConflict?.entity || 'record'}. Retaining local version.` };
      default:
        return { label: 'Local Only', icon: '💾', className: 'sync-pill-local', title: 'Saved locally in browser. Sign in to sync across devices.' };
    }
  }, [syncStatus, syncConflict]);

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <span className="hamburger-icon" aria-hidden="true">☰</span>
        </button>

        <div className="header-date-badge">
          <span className="calendar-icon" aria-hidden="true">📅</span>
          <span>{todayFormatted}</span>
        </div>

        {urgentCount > 0 && (
          <div className="header-alert-pill" title="Deadlines within 72 hours">
            <span className="pulse-dot" />
            <span>{urgentCount} due soon</span>
          </div>
        )}

        {adaptiveSignals?.paceMultiplier > 1.05 && (
          <div className="header-coach-pill" title="Adaptive Pace Buffer active">
            <span className="coach-dot">🛡️</span>
            <span>+20% Buffer Active</span>
          </div>
        )}

        {/* Real-time Cloud Sync Pill */}
        <div className={`header-sync-pill ${syncStatusDetails.className}`} title={syncStatusDetails.title}>
          <span className="sync-icon" aria-hidden="true">{syncStatusDetails.icon}</span>
          <span className="sync-label">{syncStatusDetails.label}</span>
        </div>
      </div>

      <div className="header-right">
        {/* Weekly Check-In Quick Button */}
        <button
          type="button"
          className={`header-btn checkin-trigger-btn ${!hasRecentCheckIn ? 'checkin-pulse' : ''}`}
          onClick={openCheckInModal}
          title="Take 2-minute weekly check-in"
        >
          <span aria-hidden="true">🧭</span>
          <span className="header-btn-label">Weekly Check-In</span>
          {!hasRecentCheckIn && <span className="header-checkin-badge">Due</span>}
        </button>

        {/* Profile / Coach Preferences */}
        <button
          type="button"
          className="header-btn"
          onClick={openProfileModal}
          title="View Student Profile & Availability Preferences"
        >
          <span aria-hidden="true">👤</span>
          <span className="header-btn-label">
            {studentProfile?.name ? studentProfile.name.split(' ')[0] : 'Profile'}
          </span>
        </button>

        {/* Account / Cloud Authentication */}
        <button
          type="button"
          className={`header-btn header-account-btn ${user ? 'account-active' : ''}`}
          onClick={openAuthModal}
          title={user ? `Signed in as ${user.email}` : 'Sign in or create account to sync across devices'}
        >
          <span aria-hidden="true">{user ? '🎓' : '🔑'}</span>
          <span className="header-btn-label">
            {user ? (user.user_metadata?.full_name ? user.user_metadata.full_name.split(' ')[0] : user.email?.split('@')[0]) : 'Sign In'}
          </span>
        </button>

        {/* Data Backup */}
        <button
          type="button"
          className="header-btn"
          onClick={onOpenDataModal}
          title="Backup and Restore Data"
        >
          <span aria-hidden="true">💾</span>
          <span className="header-btn-label">Backup / Restore</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
