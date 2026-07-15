import { NavLink } from "react-router-dom";

function Sidebar() {
  const getLinkClass = ({ isActive }) =>
    isActive ? "sidebar-link active" : "sidebar-link";

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">🎓</div>

        <div>
          <h2>My Academia Buddy</h2>
          <p>Study smarter</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={getLinkClass}>
          <span>🏠</span>
          Dashboard
        </NavLink>

        <NavLink to="/courses" className={getLinkClass}>
          <span>📚</span>
          Courses
        </NavLink>

        <NavLink to="/assignments" className={getLinkClass}>
          <span>📝</span>
          Assignments
        </NavLink>

        <NavLink to="/exams" className={getLinkClass}>
          <span>📅</span>
          Exams
        </NavLink>

        <NavLink to="/study-planner" className={getLinkClass}>
          <span>✨</span>
          Smart Study Planner
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <p>Academic Assistant</p>
        <small>Version 1.0</small>
      </div>
    </aside>
  );
}

export default Sidebar;