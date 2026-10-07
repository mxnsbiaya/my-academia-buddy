import { useState, useMemo } from 'react';
import { useApp } from '../context/useApp';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export function Assignments() {
  const {
    courses,
    assignments,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    toggleAssignmentCompleted,
  } = useApp();

  // Creation form state
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [estimatedWorkload, setEstimatedWorkload] = useState('3');
  const [formError, setFormError] = useState('');

  // Edit modal state
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCourse, setEditCourse] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState('Medium');
  const [editEstimatedWorkload, setEditEstimatedWorkload] = useState('3');
  const [editError, setEditError] = useState('');

  // Filters & sorting
  const [filterStatus, setFilterStatus] = useState('all'); // all | pending | completed
  const [filterCourse, setFilterCourse] = useState('all');
  const [sortBy, setSortBy] = useState('dueDate'); // dueDate | priority | title

  // Item deletion state
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please enter an assignment title.');
      return;
    }
    if (!dueDate) {
      setFormError('Please select a due date.');
      return;
    }
    const workloadNumber = Number(estimatedWorkload);
    if (isNaN(workloadNumber) || workloadNumber <= 0) {
      setFormError('Estimated workload must be greater than 0 hours.');
      return;
    }

    addAssignment({
      title,
      course,
      dueDate,
      priority,
      estimatedWorkload: workloadNumber,
    });

    setTitle('');
    setCourse('');
    setDueDate('');
    setPriority('Medium');
    setEstimatedWorkload('3');
    setFormError('');
  };

  const openEditModal = (assignment) => {
    setEditingAssignment(assignment);
    setEditTitle(assignment.title);
    setEditCourse(assignment.course || '');
    setEditDueDate(assignment.dueDate || '');
    setEditPriority(assignment.priority || 'Medium');
    setEditEstimatedWorkload(String(assignment.estimatedWorkload || 3));
    setEditError('');
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      setEditError('Title cannot be empty.');
      return;
    }
    if (!editDueDate) {
      setEditError('Please select a due date.');
      return;
    }
    const workloadNumber = Number(editEstimatedWorkload);
    if (isNaN(workloadNumber) || workloadNumber <= 0) {
      setEditError('Estimated workload must be greater than 0.');
      return;
    }

    updateAssignment(editingAssignment.id, {
      title: editTitle,
      course: editCourse,
      dueDate: editDueDate,
      priority: editPriority,
      estimatedWorkload: workloadNumber,
    });

    setEditingAssignment(null);
  };

  const filteredAssignments = useMemo(() => {
    let result = [...assignments];

    if (filterStatus === 'pending') {
      result = result.filter((a) => !a.completed);
    } else if (filterStatus === 'completed') {
      result = result.filter((a) => a.completed);
    }

    if (filterCourse !== 'all') {
      result = result.filter((a) => a.course === filterCourse);
    }

    const priorityRank = { High: 3, Medium: 2, Low: 1 };

    result.sort((a, b) => {
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      if (sortBy === 'priority') {
        return (priorityRank[b.priority] || 2) - (priorityRank[a.priority] || 2);
      }
      return a.title.localeCompare(b.title);
    });

    return result;
  }, [assignments, filterStatus, filterCourse, sortBy]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Assignment Management</h1>
          <p className="page-subtitle">
            Keep track of deadlines, estimate workload hours, assign priorities, and organize submissions.
          </p>
        </div>
      </div>

      <div className="management-layout">
        {/* Left Column: Form */}
        <div className="form-column">
          <div className="card card-section">
            <h2 className="card-section-title">Create Assignment</h2>

            {formError && (
              <div className="form-error-banner" role="alert">
                <span>✕</span> {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="accessible-form">
              <div className="form-group">
                <label htmlFor="assign-title" className="form-label">
                  Assignment Title <span className="required">*</span>
                </label>
                <input
                  id="assign-title"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sprint 2 Architecture Report"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (formError) setFormError('');
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="assign-course" className="form-label">
                  Associated Course
                </label>
                <select
                  id="assign-course"
                  className="form-select"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                >
                  <option value="">Select course (Optional)</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {courses.length === 0 && (
                  <span className="field-hint">
                    Tip: Add courses in the Courses tab to link assignments.
                  </span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="assign-due" className="form-label">
                    Due Date <span className="required">*</span>
                  </label>
                  <input
                    id="assign-due"
                    type="date"
                    className="form-input"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      if (formError) setFormError('');
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="assign-priority" className="form-label">
                    Priority
                  </label>
                  <select
                    id="assign-priority"
                    className="form-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="High">High (Major weighting / urgent)</option>
                    <option value="Medium">Medium (Standard homework)</option>
                    <option value="Low">Low (Minor review / optional)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="assign-workload" className="form-label">
                  Estimated Workload (Hours)
                </label>
                <input
                  id="assign-workload"
                  type="number"
                  min="0.5"
                  step="0.5"
                  className="form-input"
                  placeholder="3"
                  value={estimatedWorkload}
                  onChange={(e) => setEstimatedWorkload(e.target.value)}
                />
                <span className="field-hint">
                  The study planner uses this to schedule realistic blocks before the deadline.
                </span>
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Save Assignment
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: List & Filters */}
        <div className="list-column">
          <div className="filter-bar">
            <div className="filter-group">
              <label htmlFor="filter-status" className="filter-label">Status:</label>
              <select
                id="filter-status"
                className="filter-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All ({assignments.length})</option>
                <option value="pending">Pending ({assignments.filter((a) => !a.completed).length})</option>
                <option value="completed">Completed ({assignments.filter((a) => a.completed).length})</option>
              </select>
            </div>

            {courses.length > 0 && (
              <div className="filter-group">
                <label htmlFor="filter-course" className="filter-label">Course:</label>
                <select
                  id="filter-course"
                  className="filter-select"
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                >
                  <option value="all">All Courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="filter-group">
              <label htmlFor="sort-assignments" className="filter-label">Sort By:</label>
              <select
                id="sort-assignments"
                className="filter-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="dueDate">Due Date</option>
                <option value="priority">Priority</option>
                <option value="title">Title</option>
              </select>
            </div>
          </div>

          {filteredAssignments.length === 0 ? (
            <div className="empty-state-card">
              <span className="empty-icon" aria-hidden="true">📝</span>
              <h3>No assignments found</h3>
              <p>
                {assignments.length === 0
                  ? 'Add your upcoming deliverables using the form on the left.'
                  : 'No assignments match the selected filters.'}
              </p>
            </div>
          ) : (
            <div className="card-stack">
              {filteredAssignments.map((assignment) => {
                const isOverdue =
                  !assignment.completed &&
                  assignment.dueDate &&
                  new Date(`${assignment.dueDate}T23:59:59`) < new Date();

                return (
                  <div
                    key={assignment.id}
                    className={`task-card ${assignment.completed ? 'task-card-completed' : ''}`}
                  >
                    <div className="task-card-main">
                      <div className="task-checkbox-col">
                        <button
                          type="button"
                          className={`custom-checkbox ${assignment.completed ? 'checkbox-checked' : ''}`}
                          onClick={() => toggleAssignmentCompleted(assignment.id)}
                          aria-label={
                            assignment.completed
                              ? `Mark "${assignment.title}" as incomplete`
                              : `Mark "${assignment.title}" as completed`
                          }
                        >
                          {assignment.completed && '✓'}
                        </button>
                      </div>

                      <div className="task-info-col">
                        <div className="task-header-row">
                          <h3 className={`task-title ${assignment.completed ? 'task-title-struck' : ''}`}>
                            {assignment.title}
                          </h3>
                          <Badge variant={assignment.priority}>{assignment.priority} Priority</Badge>
                        </div>

                        <div className="task-meta-row">
                          {assignment.course ? (
                            <span className="course-pill">{assignment.course}</span>
                          ) : (
                            <span className="course-pill unassigned">General</span>
                          )}

                          <span className={`date-pill ${isOverdue ? 'date-pill-overdue' : ''}`}>
                            📅 Due: {assignment.dueDate} {isOverdue && '(Overdue)'}
                          </span>

                          <span className="workload-pill">
                            ⏱️ {assignment.estimatedWorkload || 3}h workload
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="task-actions-col">
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => openEditModal(assignment)}
                        aria-label={`Edit ${assignment.title}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setAssignmentToDelete(assignment)}
                        aria-label={`Delete ${assignment.title}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={Boolean(editingAssignment)}
        onClose={() => setEditingAssignment(null)}
        title="Edit Assignment"
      >
        {editingAssignment && (
          <form onSubmit={handleEditSubmit} className="accessible-form">
            {editError && (
              <div className="form-error-banner" role="alert">
                <span>✕</span> {editError}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="edit-assign-title" className="form-label">
                Title <span className="required">*</span>
              </label>
              <input
                id="edit-assign-title"
                type="text"
                className="form-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-assign-course" className="form-label">
                Course
              </label>
              <select
                id="edit-assign-course"
                className="form-select"
                value={editCourse}
                onChange={(e) => setEditCourse(e.target.value)}
              >
                <option value="">General (No course)</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="edit-assign-due" className="form-label">
                  Due Date <span className="required">*</span>
                </label>
                <input
                  id="edit-assign-due"
                  type="date"
                  className="form-input"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-assign-priority" className="form-label">
                  Priority
                </label>
                <select
                  id="edit-assign-priority"
                  className="form-select"
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="edit-assign-workload" className="form-label">
                Estimated Workload (Hours)
              </label>
              <input
                id="edit-assign-workload"
                type="number"
                min="0.5"
                step="0.5"
                className="form-input"
                value={editEstimatedWorkload}
                onChange={(e) => setEditEstimatedWorkload(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingAssignment(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(assignmentToDelete)}
        onClose={() => setAssignmentToDelete(null)}
        title="Delete Assignment"
      >
        {assignmentToDelete && (
          <div>
            <p className="delete-dialog-text">
              Are you sure you want to delete <strong>{assignmentToDelete.title}</strong>?
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAssignmentToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  deleteAssignment(assignmentToDelete.id);
                  setAssignmentToDelete(null);
                }}
              >
                Delete Assignment
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Assignments;