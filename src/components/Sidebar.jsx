import { NavLink } from 'react-router-dom';
import { useApp } from '../context/useApp';
import { useAuth } from '../context/useAuth';
import { t } from '../services/i18n';

export function Sidebar({ isOpen, onClose, onOpenDataModal }) {
  const { user } = useAuth();
  const {
    courses,
    assignments,
    exams,
    studyPlan,
    studentProfile,
    timetable = [],
    checkIns = [],
    openCheckInModal,
    openProfileModal,
    openAuthModal,
    openHelpModal,
    syncStatus,
  } = useApp();

  const pendingAssignmentsCount = assignments.filter((a) => !a.completed).length;
  const taskSessionsCount = studyPlan.filter((s) => s.type !== 'Break' && !s.completed).length;

  const hasRecentCheckIn = (() => {
    if (!checkIns || checkIns.length === 0) return false;
    const last = checkIns[checkIns.length - 1];
    if (!last?.date) return false;
    const diffDays = (new Date() - new Date(last.date)) / (1000 * 60 * 60 * 24);
    return diffDays < 5;
  })();

  const getLinkClass = ({ isActive }) =>
    isActive ? 'sidebar-nav-item active' : 'sidebar-nav-item';

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`} aria-label="Main Navigation">
        <div className="sidebar-brand">
          <div className="brand-logo" aria-hidden="true">
            <span className="brand-icon">🎓</span>
          </div>
          <div className="brand-text">
            <h1 className="brand-title">Academia Buddy</h1>
            <span className="brand-subtitle">Adaptive Academic Coach</span>
          </div>
          {isOpen && (
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={onClose}
              aria-label="Close navigation"
            >
              ✕
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">CORE WORKSPACE</div>

          <NavLink to="/" end className={getLinkClass} onClick={onClose}>
            <span className="nav-icon" aria-hidden="true">🏠</span>
            <span className="nav-label">{t('nav_dashboard')}</span>
          </NavLink>

          <NavLink to="/courses" className={getLinkClass} onClick={onClose}>
            <span className="nav-icon" aria-hidden="true">📚</span>
            <span className="nav-label">{t('nav_courses')}</span>
            {courses.length > 0 && <span className="nav-counter">{courses.length}</span>}
          </NavLink>

          <NavLink to="/syllabus-import" className={getLinkClass} onClick={onClose}>
            <span className="nav-icon" aria-hidden="true">📑</span>
            <span className="nav-label">{t('nav_syllabus_import')}</span>
            <span className="nav-counter" style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: 'var(--accent-cyan)' }}>
              Auto
            </span>
          </NavLink>

          <NavLink to="/assignments" className={getLinkClass} onClick={onClose}>
            <span className="nav-icon" aria-hidden="true">📝</span>
            <span className="nav-label">{t('nav_assignments')}</span>
            {pendingAssignmentsCount > 0 && (
              <span className="nav-counter counter-urgent">{pendingAssignmentsCount}</span>
            )}
          </NavLink>

          <NavLink to="/exams" className={getLinkClass} onClick={onClose}>
            <span className="nav-icon" aria-hidden="true">📅</span>
            <span className="nav-label">{t('nav_exams')}</span>
            {exams.length > 0 && <span className="nav-counter">{exams.length}</span>}
          </NavLink>

          <NavLink to="/study-planner" className={getLinkClass} onClick={onClose}>
            <span className="nav-icon" aria-hidden="true">✨</span>
            <span className="nav-label">{t('nav_study_planner')}</span>
            {taskSessionsCount > 0 && (
              <span className="nav-counter counter-accent">{taskSessionsCount}</span>
            )}
          </NavLink>

          <NavLink to="/timetable" className={getLinkClass} onClick={onClose}>
            <span className="nav-icon" aria-hidden="true">🗓️</span>
            <span className="nav-label">{t('nav_timetable')}</span>
            {timetable.length > 0 && (
              <span className="nav-counter" style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: 'var(--accent-cyan)' }}>
                {timetable.length}
              </span>
            )}
          </NavLink>

          <div className="nav-section-title" style={{ marginTop: '16px' }}>ACADEMIC COACH</div>

          <button
            type="button"
            className="sidebar-coach-nav-btn"
            onClick={() => {
              if (onClose) onClose();
              openCheckInModal();
            }}
          >
            <span className="nav-icon" aria-hidden="true">🧭</span>
            <span className="nav-label">{t('nav_checkin')}</span>
            {!hasRecentCheckIn && (
              <span className="checkin-badge-pill">Due</span>
            )}
          </button>

          <button
            type="button"
            className="sidebar-coach-nav-btn"
            onClick={() => {
              if (onClose) onClose();
              openProfileModal();
            }}
          >
            <span className="nav-icon" aria-hidden="true">👤</span>
            <span className="nav-label">{t('nav_profile')}</span>
          </button>

          <button
            type="button"
            className="sidebar-coach-nav-btn"
            onClick={() => {
              if (onClose) onClose();
              openHelpModal();
            }}
          >
            <span className="nav-icon" aria-hidden="true">❓</span>
            <span className="nav-label">{t('nav_help_tour')}</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-action-btn"
            onClick={() => {
              if (onClose) onClose();
              if (onOpenDataModal) onOpenDataModal();
            }}
          >
            <span aria-hidden="true">⚙️</span>
            <span>{t('nav_backup_restore')}</span>
          </button>

          <button
            type="button"
            className="sidebar-action-btn sidebar-account-trigger"
            onClick={() => {
              if (onClose) onClose();
              openAuthModal();
            }}
          >
            <span aria-hidden="true">{user ? '🎓' : '🔑'}</span>
            <span>{user ? t('nav_account_cloud') : t('nav_sign_in')}</span>
          </button>

          <div
            className="sidebar-user-pill clickable-pill"
            onClick={() => {
              if (onClose) onClose();
              openProfileModal();
            }}
            title="Click to view student profile"
          >
            <div className={`status-indicator ${syncStatus === 'synced' ? 'status-synced' : syncStatus === 'syncing' ? 'status-syncing' : ''}`} />
            <div className="user-info">
              <span className="user-name">
                {user ? (user.user_metadata?.full_name || user.email) : (studentProfile?.name || 'Local Student')}
              </span>
              <span className="user-status">
                {user ? 'Cloud Synced' : (studentProfile?.program ? `${studentProfile.program} • ${studentProfile.semester || 'S1'}` : 'Private & Offline')}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;