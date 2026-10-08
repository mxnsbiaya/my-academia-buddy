import { NavLink } from 'react-router-dom';
import { useApp } from '../context/useApp';

export function Sidebar({ isOpen, onClose, onOpenDataModal }) {
  const {
    courses,
    assignments,
    exams,
    studyPlan,
    studentProfile,
    checkIns = [],
    openCheckInModal,
    openProfileModal,
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
            <span className="nav-label">Dashboard</span>
          </NavLink>

          <NavLink to="/courses" className={getLinkClass} onClick={onClose}>
            <span className="nav-icon" aria-hidden="true">📚</span>
            <span className="nav-label">Courses & Syllabus</span>
            {courses.length > 0 && <span className="nav-counter">{courses.length}</span>}
          </NavLink>

          <NavLink to="/assignments" className={getLinkClass} onClick={onClose}>
            <span className="nav-icon" aria-hidden="true">📝</span>
            <span className="nav-label">Assignments</span>
            {pendingAssignmentsCount > 0 && (
              <span className="nav-counter counter-urgent">{pendingAssignmentsCount}</span>
            )}
          </NavLink>

          <NavLink to="/exams" className={getLinkClass} onClick={onClose}>
            <span className="nav-icon" aria-hidden="true">📅</span>
            <span className="nav-label">Exams</span>
            {exams.length > 0 && <span className="nav-counter">{exams.length}</span>}
          </NavLink>

          <NavLink to="/study-planner" className={getLinkClass} onClick={onClose}>
            <span className="nav-icon" aria-hidden="true">✨</span>
            <span className="nav-label">Adaptive Planner</span>
            {taskSessionsCount > 0 && (
              <span className="nav-counter counter-accent">{taskSessionsCount}</span>
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
            <span className="nav-label">Weekly Check-In</span>
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
            <span className="nav-label">Student Profile</span>
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
            <span>Data & Backup</span>
          </button>

          <div
            className="sidebar-user-pill clickable-pill"
            onClick={() => {
              if (onClose) onClose();
              openProfileModal();
            }}
            title="Click to view student profile"
          >
            <div className="status-indicator" />
            <div className="user-info">
              <span className="user-name">
                {studentProfile?.name || 'Local Student'}
              </span>
              <span className="user-status">
                {studentProfile?.program
                  ? `${studentProfile.program} • ${studentProfile.semester || 'S1'}`
                  : 'Private & Offline'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;