import { NavLink } from 'react-router-dom';
import { useApp } from '../context/useApp';

export function Sidebar({ isOpen, onClose, onOpenDataModal }) {
  const { courses, assignments, exams, studyPlan } = useApp();

  const pendingAssignmentsCount = assignments.filter((a) => !a.completed).length;
  const taskSessionsCount = studyPlan.filter((s) => s.type !== 'Break' && !s.completed).length;

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
            <span className="brand-subtitle">v2.0 Productivity Suite</span>
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
          <NavLink to="/" end className={getLinkClass} onClick={onClose}>
            <span className="nav-icon" aria-hidden="true">🏠</span>
            <span className="nav-label">Dashboard</span>
          </NavLink>

          <NavLink to="/courses" className={getLinkClass} onClick={onClose}>
            <span className="nav-icon" aria-hidden="true">📚</span>
            <span className="nav-label">Courses</span>
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
            <span className="nav-label">Smart Planner</span>
            {taskSessionsCount > 0 && (
              <span className="nav-counter counter-accent">{taskSessionsCount}</span>
            )}
          </NavLink>
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

          <div className="sidebar-user-pill">
            <div className="status-indicator" />
            <div className="user-info">
              <span className="user-name">Local Student Mode</span>
              <span className="user-status">Private & Offline</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;