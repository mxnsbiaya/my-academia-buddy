import { useState, useMemo } from 'react';
import { useApp } from '../context/useApp';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export function Exams() {
  const { courses, exams, addExam, updateExam, deleteExam } = useApp();

  // Create form state
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('High');
  const [estimatedWorkload, setEstimatedWorkload] = useState('6');
  const [formError, setFormError] = useState('');

  // Edit modal state
  const [editingExam, setEditingExam] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCourse, setEditCourse] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPriority, setEditPriority] = useState('High');
  const [editEstimatedWorkload, setEditEstimatedWorkload] = useState('6');
  const [editError, setEditError] = useState('');

  // Delete confirmation
  const [examToDelete, setExamToDelete] = useState(null);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please enter an exam title (e.g. Midterm 1).');
      return;
    }
    if (!date) {
      setFormError('Please specify the exam date.');
      return;
    }
    const workloadNumber = Number(estimatedWorkload);
    if (isNaN(workloadNumber) || workloadNumber <= 0) {
      setFormError('Estimated prep workload must be greater than 0 hours.');
      return;
    }

    addExam({
      title,
      course,
      date,
      location,
      notes,
      priority,
      estimatedWorkload: workloadNumber,
    });

    setTitle('');
    setCourse('');
    setDate('');
    setLocation('');
    setNotes('');
    setPriority('High');
    setEstimatedWorkload('6');
    setFormError('');
  };

  const openEditModal = (exam) => {
    setEditingExam(exam);
    setEditTitle(exam.title);
    setEditCourse(exam.course || '');
    setEditDate(exam.date || '');
    setEditLocation(exam.location || '');
    setEditNotes(exam.notes || '');
    setEditPriority(exam.priority || 'High');
    setEditEstimatedWorkload(String(exam.estimatedWorkload || 6));
    setEditError('');
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      setEditError('Exam title cannot be empty.');
      return;
    }
    if (!editDate) {
      setEditError('Please specify an exam date.');
      return;
    }
    const workloadNumber = Number(editEstimatedWorkload);
    if (isNaN(workloadNumber) || workloadNumber <= 0) {
      setEditError('Estimated prep workload must be greater than 0.');
      return;
    }

    updateExam(editingExam.id, {
      title: editTitle,
      course: editCourse,
      date: editDate,
      location: editLocation,
      notes: editNotes,
      priority: editPriority,
      estimatedWorkload: workloadNumber,
    });

    setEditingExam(null);
  };

  const sortedExams = useMemo(() => {
    return [...exams].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });
  }, [exams]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Exam Management</h1>
          <p className="page-subtitle">
            Track midterm and final exam schedules, set preparation workloads, and reserve targeted study blocks.
          </p>
        </div>
      </div>

      <div className="management-layout">
        {/* Left Column: Form */}
        <div className="form-column">
          <div className="card card-section">
            <h2 className="card-section-title">Schedule New Exam</h2>

            {formError && (
              <div className="form-error-banner" role="alert">
                <span>✕</span> {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="accessible-form">
              <div className="form-group">
                <label htmlFor="exam-title" className="form-label">
                  Exam Title <span className="required">*</span>
                </label>
                <input
                  id="exam-title"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Midterm 1 - Algorithms & Data Structures"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (formError) setFormError('');
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="exam-course" className="form-label">
                  Associated Course
                </label>
                <select
                  id="exam-course"
                  className="form-select"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                >
                  <option value="">Select course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="exam-date" className="form-label">
                    Exam Date <span className="required">*</span>
                  </label>
                  <input
                    id="exam-date"
                    type="date"
                    className="form-input"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      if (formError) setFormError('');
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="exam-priority" className="form-label">
                    Priority
                  </label>
                  <select
                    id="exam-priority"
                    className="form-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="High">High (Major weighting)</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="exam-location" className="form-label">
                    Location / Room
                  </label>
                  <input
                    id="exam-location"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Marion Hall 150"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="exam-workload" className="form-label">
                    Prep Workload (Hours)
                  </label>
                  <input
                    id="exam-workload"
                    type="number"
                    min="1"
                    step="1"
                    className="form-input"
                    placeholder="6"
                    value={estimatedWorkload}
                    onChange={(e) => setEstimatedWorkload(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="exam-notes" className="form-label">
                  Preparation Notes / Scope
                </label>
                <textarea
                  id="exam-notes"
                  rows="3"
                  className="form-textarea"
                  placeholder="e.g. Chapters 1-5, focus on heap operations and graph traversals"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Schedule Exam
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: List */}
        <div className="list-column">
          <div className="list-header">
            <h2 className="list-title">Upcoming Exams ({exams.length})</h2>
          </div>

          {sortedExams.length === 0 ? (
            <div className="empty-state-card">
              <span className="empty-icon" aria-hidden="true">📅</span>
              <h3>No exams scheduled</h3>
              <p>Add your midterms or finals to let the planner schedule dedicated study sessions.</p>
            </div>
          ) : (
            <div className="card-stack">
              {sortedExams.map((exam) => {
                const examDateObj = new Date(`${exam.date}T23:59:59`);
                const isPast = examDateObj < new Date();

                return (
                  <div key={exam.id} className={`exam-card ${isPast ? 'exam-past' : ''}`}>
                    <div className="exam-card-main">
                      <div className="exam-header-row">
                        <div className="exam-title-group">
                          <h3 className="exam-title">{exam.title}</h3>
                          <Badge variant="exam">Exam</Badge>
                          <Badge variant={exam.priority}>{exam.priority} Priority</Badge>
                        </div>

                        <div className="card-controls">
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => openEditModal(exam)}
                            aria-label={`Edit ${exam.title}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setExamToDelete(exam)}
                            aria-label={`Delete ${exam.title}`}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="exam-meta-row">
                        {exam.course && <span className="course-pill">{exam.course}</span>}
                        <span className="date-pill">📅 Date: {exam.date} {isPast && '(Completed)'}</span>
                        {exam.location && <span className="location-pill">📍 {exam.location}</span>}
                        <span className="workload-pill">⏱️ {exam.estimatedWorkload || 6}h prep workload</span>
                      </div>

                      {exam.notes && (
                        <p className="exam-notes-text">
                          <strong>Notes:</strong> {exam.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Exam Modal */}
      <Modal
        isOpen={Boolean(editingExam)}
        onClose={() => setEditingExam(null)}
        title="Edit Exam"
      >
        {editingExam && (
          <form onSubmit={handleEditSubmit} className="accessible-form">
            {editError && (
              <div className="form-error-banner" role="alert">
                <span>✕</span> {editError}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="edit-exam-title" className="form-label">
                Exam Title <span className="required">*</span>
              </label>
              <input
                id="edit-exam-title"
                type="text"
                className="form-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-exam-course" className="form-label">
                Course
              </label>
              <select
                id="edit-exam-course"
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
                <label htmlFor="edit-exam-date" className="form-label">
                  Date <span className="required">*</span>
                </label>
                <input
                  id="edit-exam-date"
                  type="date"
                  className="form-input"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-exam-priority" className="form-label">
                  Priority
                </label>
                <select
                  id="edit-exam-priority"
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

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="edit-exam-location" className="form-label">
                  Location
                </label>
                <input
                  id="edit-exam-location"
                  type="text"
                  className="form-input"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-exam-workload" className="form-label">
                  Prep Workload (Hours)
                </label>
                <input
                  id="edit-exam-workload"
                  type="number"
                  min="1"
                  step="1"
                  className="form-input"
                  value={editEstimatedWorkload}
                  onChange={(e) => setEditEstimatedWorkload(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="edit-exam-notes" className="form-label">
                Notes
              </label>
              <textarea
                id="edit-exam-notes"
                rows="3"
                className="form-textarea"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingExam(null)}
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
        isOpen={Boolean(examToDelete)}
        onClose={() => setExamToDelete(null)}
        title="Delete Exam"
      >
        {examToDelete && (
          <div>
            <p className="delete-dialog-text">
              Are you sure you want to delete <strong>{examToDelete.title}</strong>?
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setExamToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  deleteExam(examToDelete.id);
                  setExamToDelete(null);
                }}
              >
                Delete Exam
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Exams;