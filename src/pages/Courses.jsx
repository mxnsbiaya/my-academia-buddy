import { useState } from 'react';
import { useApp } from '../context/useApp';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
];

export function Courses() {
  const { courses, assignments, exams, addCourse, updateCourse, deleteCourse } = useApp();

  // Add form state
  const [name, setName] = useState('');
  const [instructor, setInstructor] = useState('');
  const [schedule, setSchedule] = useState('');
  const [credits, setCredits] = useState('3.0');
  const [difficulty, setDifficulty] = useState('Medium');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');

  // Edit Modal state
  const [editingCourse, setEditingCourse] = useState(null);
  const [editName, setEditName] = useState('');
  const [editInstructor, setEditInstructor] = useState('');
  const [editSchedule, setEditSchedule] = useState('');
  const [editCredits, setEditCredits] = useState('3.0');
  const [editDifficulty, setEditDifficulty] = useState('Medium');
  const [editColor, setEditColor] = useState(PRESET_COLORS[0]);
  const [editError, setEditError] = useState('');

  // Course deletion confirmation
  const [courseToDelete, setCourseToDelete] = useState(null);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a course code or name (e.g. SEG2105).');
      return;
    }

    // Check duplicate name
    if (courses.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())) {
      setError('A course with this name already exists.');
      return;
    }

    addCourse({
      name,
      instructor,
      schedule,
      credits,
      difficulty,
      color,
    });

    setName('');
    setInstructor('');
    setSchedule('');
    setCredits('3.0');
    setDifficulty('Medium');
    setColor(PRESET_COLORS[0]);
    setError('');
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setEditName(course.name);
    setEditInstructor(course.instructor || '');
    setEditSchedule(course.schedule || '');
    setEditCredits(course.credits || '3.0');
    setEditDifficulty(course.difficulty || 'Medium');
    setEditColor(course.color || PRESET_COLORS[0]);
    setEditError('');
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      setEditError('Course name cannot be empty.');
      return;
    }

    if (
      courses.some(
        (c) => c.id !== editingCourse.id && c.name.toLowerCase() === editName.trim().toLowerCase()
      )
    ) {
      setEditError('Another course already has this name.');
      return;
    }

    updateCourse(editingCourse.id, {
      name: editName,
      instructor: editInstructor,
      schedule: editSchedule,
      credits: editCredits,
      difficulty: editDifficulty,
      color: editColor,
    });

    setEditingCourse(null);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Course Management</h1>
          <p className="page-subtitle">
            Configure your registered courses, assign difficulty tiers, and track associated assignments and exams.
          </p>
        </div>
      </div>

      <div className="management-layout">
        {/* Course Creation Form Card */}
        <div className="form-column">
          <div className="card card-section">
            <h2 className="card-section-title">Add New Course</h2>

            {error && (
              <div className="form-error-banner" role="alert">
                <span>✕</span> {error}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="accessible-form">
              <div className="form-group">
                <label htmlFor="course-name" className="form-label">
                  Course Code & Name <span className="required">*</span>
                </label>
                <input
                  id="course-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. SEG2105 Software Engineering"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="course-difficulty" className="form-label">
                    Difficulty Tier
                  </label>
                  <select
                    id="course-difficulty"
                    className="form-select"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    <option value="Low">Low (Familiar material)</option>
                    <option value="Medium">Medium (Standard pace)</option>
                    <option value="High">High (Challenging / Math / Labs)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="course-credits" className="form-label">
                    Credits
                  </label>
                  <input
                    id="course-credits"
                    type="text"
                    className="form-input"
                    placeholder="3.0"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="course-instructor" className="form-label">
                  Instructor Name
                </label>
                <input
                  id="course-instructor"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dr. Timothy Lethbridge"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="course-schedule" className="form-label">
                  Weekly Class Schedule
                </label>
                <input
                  id="course-schedule"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Mon / Wed 10:00 - 11:30"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Color Theme Tag</label>
                <div className="color-picker-row">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`color-choice-btn ${color === c ? 'color-choice-active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Add Course to Workspace
              </button>
            </form>
          </div>
        </div>

        {/* Courses List */}
        <div className="list-column">
          <div className="list-header">
            <h2 className="list-title">Active Courses ({courses.length})</h2>
          </div>

          {courses.length === 0 ? (
            <div className="empty-state-card">
              <span className="empty-icon" aria-hidden="true">📚</span>
              <h3>No courses added yet</h3>
              <p>Add your first course using the form on the left to start building your study plan.</p>
            </div>
          ) : (
            <div className="card-stack">
              {courses.map((course) => {
                const courseAssignments = assignments.filter((a) => a.course === course.name);
                const completedCourseAssignments = courseAssignments.filter((a) => a.completed);
                const courseExams = exams.filter((e) => e.course === course.name);

                const progressPercentage =
                  courseAssignments.length === 0
                    ? 0
                    : Math.round((completedCourseAssignments.length / courseAssignments.length) * 100);

                return (
                  <div key={course.id} className="course-card" style={{ borderLeftColor: course.color }}>
                    <div className="course-card-top">
                      <div>
                        <div className="course-tag-row">
                          <h3 className="course-card-title">{course.name}</h3>
                          <Badge variant={course.difficulty}>{course.difficulty} Difficulty</Badge>
                          {course.credits && <span className="credits-pill">{course.credits} cr</span>}
                        </div>
                        {course.instructor && (
                          <p className="course-meta-text">
                            <strong>Instructor:</strong> {course.instructor}
                          </p>
                        )}
                        {course.schedule && (
                          <p className="course-meta-text">
                            <strong>Schedule:</strong> {course.schedule}
                          </p>
                        )}
                      </div>

                      <div className="card-controls">
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => openEditModal(course)}
                          aria-label={`Edit ${course.name}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setCourseToDelete(course)}
                          aria-label={`Delete ${course.name}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Associated Tasks summary */}
                    <div className="course-task-summary">
                      <div className="task-counts-badge">
                        <span>📝 {courseAssignments.length} Assignments ({completedCourseAssignments.length} done)</span>
                        <span>•</span>
                        <span>📅 {courseExams.length} Exams</span>
                      </div>

                      {courseAssignments.length > 0 && (
                        <div className="course-progress-mini">
                          <div className="progress-bar-track">
                            <div
                              className="progress-bar-fill fill-green"
                              style={{ width: `${progressPercentage}%` }}
                              role="progressbar"
                              aria-valuenow={progressPercentage}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            />
                          </div>
                          <span className="mini-progress-label">{progressPercentage}% assignments completed</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Course Modal */}
      <Modal
        isOpen={Boolean(editingCourse)}
        onClose={() => setEditingCourse(null)}
        title={`Edit Course: ${editingCourse?.name}`}
      >
        {editingCourse && (
          <form onSubmit={handleEditSubmit} className="accessible-form">
            {editError && (
              <div className="form-error-banner" role="alert">
                <span>✕</span> {editError}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="edit-course-name" className="form-label">
                Course Code & Name <span className="required">*</span>
              </label>
              <input
                id="edit-course-name"
                type="text"
                className="form-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="edit-course-diff" className="form-label">
                  Difficulty Tier
                </label>
                <select
                  id="edit-course-diff"
                  className="form-select"
                  value={editDifficulty}
                  onChange={(e) => setEditDifficulty(e.target.value)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="edit-course-credits" className="form-label">
                  Credits
                </label>
                <input
                  id="edit-course-credits"
                  type="text"
                  className="form-input"
                  value={editCredits}
                  onChange={(e) => setEditCredits(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="edit-course-instructor" className="form-label">
                Instructor
              </label>
              <input
                id="edit-course-instructor"
                type="text"
                className="form-input"
                value={editInstructor}
                onChange={(e) => setEditInstructor(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-course-schedule" className="form-label">
                Weekly Class Schedule
              </label>
              <input
                id="edit-course-schedule"
                type="text"
                className="form-input"
                value={editSchedule}
                onChange={(e) => setEditSchedule(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Color Theme Tag</label>
              <div className="color-picker-row">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-choice-btn ${editColor === c ? 'color-choice-active' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setEditColor(c)}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingCourse(null)}
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
        isOpen={Boolean(courseToDelete)}
        onClose={() => setCourseToDelete(null)}
        title="Confirm Course Deletion"
      >
        {courseToDelete && (
          <div>
            <p className="delete-dialog-text">
              Are you sure you want to delete <strong>{courseToDelete.name}</strong>?
            </p>
            <p className="delete-dialog-subtext">
              Assignments and exams previously associated with this course will remain in your workspace under &quot;General&quot;.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCourseToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  deleteCourse(courseToDelete.id);
                  setCourseToDelete(null);
                }}
              >
                Delete Course
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Courses;