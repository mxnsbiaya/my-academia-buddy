import { useState } from 'react';
import { Link } from 'react-router-dom';
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

const TOPIC_STATUS_LABELS = {
  not_started: { label: 'Not Started', badge: 'neutral' },
  attended_lecture: { label: 'Attended Lecture', badge: 'accent' },
  reading_completed: { label: 'Reading Done', badge: 'Medium' },
  practiced: { label: 'Practiced', badge: 'High' },
  reviewed: { label: 'Fully Reviewed', badge: 'Low' },
};

export function Courses() {
  const {
    courses,
    assignments,
    exams,
    syllabusTopics = [],
    addCourse,
    updateCourse,
    deleteCourse,
    addTopic,
    updateTopicProgress,
    deleteTopic,
  } = useApp();

  // Add course form state
  const [name, setName] = useState('');
  const [instructor, setInstructor] = useState('');
  const [schedule, setSchedule] = useState('');
  const [credits, setCredits] = useState('3.0');
  const [difficulty, setDifficulty] = useState('Medium');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');

  // Edit Course Modal state
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

  // Expanded courses syllabus accordion
  const [expandedCourseId, setExpandedCourseId] = useState(null);

  // Add Topic Modal state
  const [topicModalCourse, setTopicModalCourse] = useState(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicWeek, setTopicWeek] = useState('1');
  const [topicReading, setTopicReading] = useState('');
  const [topicHours, setTopicHours] = useState('2.5');
  const [topicDifficulty, setTopicDifficulty] = useState('Medium');
  const [topicError, setTopicError] = useState('');

  // Syllabus Import (Review-and-Correct) Modal state
  const [importModalCourse, setImportModalCourse] = useState(null);
  const [importRawText, setImportRawText] = useState('');
  const [parsedImportRows, setParsedImportRows] = useState([]);
  const [importStep, setImportStep] = useState('input'); // 'input' | 'review'

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a course code or name (e.g. CSI 2110).');
      return;
    }

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

  // Add Topic submission
  const handleAddTopicSubmit = (e) => {
    e.preventDefault();
    if (!topicTitle.trim()) {
      setTopicError('Topic title is required.');
      return;
    }

    addTopic({
      courseId: topicModalCourse.id,
      courseName: topicModalCourse.name,
      week: Number(topicWeek) || 1,
      title: topicTitle.trim(),
      requiredReading: topicReading.trim(),
      estimatedHours: Number(topicHours) || 2.5,
      difficulty: topicDifficulty,
      status: 'not_started',
      confidence: 3,
    });

    setTopicModalCourse(null);
    setTopicTitle('');
    setTopicWeek('1');
    setTopicReading('');
    setTopicHours('2.5');
    setTopicDifficulty('Medium');
    setTopicError('');
  };

  // Parse Syllabus Raw Text for Review-and-Correct
  const handleParseSyllabusText = () => {
    if (!importRawText.trim()) return;

    const lines = importRawText.split('\n').filter((l) => l.trim().length > 0);
    const extracted = [];
    let currentWeek = 1;

    lines.forEach((line) => {
      const cleanLine = line.trim();
      // Match Week patterns e.g. "Week 1: Topic", "W1 - Topic", "Module 2: Topic"
      const weekMatch = cleanLine.match(/(?:Week|Module|W)\s*(\d+)[:\s-]+(.*)/i);
      if (weekMatch) {
        const weekNum = parseInt(weekMatch[1], 10) || currentWeek;
        const rest = weekMatch[2].trim();
        const readingMatch = rest.match(/(?:Reading|Ch|Chapter|Textbook)[:\s]+(.*)/i);
        const title = readingMatch ? rest.replace(readingMatch[0], '').replace(/[-–;,]+$/, '').trim() : rest;
        const reading = readingMatch ? readingMatch[1].trim() : '';

        extracted.push({
          id: `temp-${Date.now()}-${Math.random()}`,
          week: weekNum,
          title: title || `Topic for Week ${weekNum}`,
          requiredReading: reading,
          estimatedHours: 2.5,
          included: true,
        });
        currentWeek = weekNum + 1;
      } else {
        // Line without explicit week prefix
        extracted.push({
          id: `temp-${Date.now()}-${Math.random()}`,
          week: currentWeek,
          title: cleanLine,
          requiredReading: '',
          estimatedHours: 2.0,
          included: true,
        });
        currentWeek += 1;
      }
    });

    setParsedImportRows(extracted);
    setImportStep('review');
  };

  const handleConfirmSyllabusImport = () => {
    if (!importModalCourse) return;

    const confirmedRows = parsedImportRows.filter((r) => r.included && r.title.trim());
    confirmedRows.forEach((row) => {
      addTopic({
        courseId: importModalCourse.id,
        courseName: importModalCourse.name,
        week: Number(row.week) || 1,
        title: row.title.trim(),
        requiredReading: row.requiredReading || '',
        estimatedHours: Number(row.estimatedHours) || 2.5,
        difficulty: 'Medium',
        status: 'not_started',
        confidence: 3,
      });
    });

    setImportModalCourse(null);
    setImportRawText('');
    setParsedImportRows([]);
    setImportStep('input');
    setExpandedCourseId(importModalCourse.id);
  };

  const loadSampleSyllabus = () => {
    setImportRawText(
      `Week 1: Course Overview, Computational Complexity & Big-O Notation (Reading: CLRS Ch. 1-3)\n` +
      `Week 2: Advanced Graph Algorithms: Dijkstra & Bellman-Ford (Reading: CLRS Ch. 24)\n` +
      `Week 3: Minimum Spanning Trees (Kruskal & Prim) and Disjoint Sets (Reading: CLRS Ch. 23)\n` +
      `Week 4: Dynamic Programming & Memoization Patterns (Reading: CLRS Ch. 15)\n` +
      `Week 5: Greedy Algorithms & Huffman Coding (Reading: CLRS Ch. 16)\n` +
      `Week 6: Midterm Preparation & Comprehensive Problem Solving`
    );
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Course & Syllabus Management</h1>
          <p className="page-subtitle">
            Configure courses, maintain weekly syllabus topics, and record observable mastery progress.
          </p>
        </div>
        <div>
          <Link
            to="/syllabus-import"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 600 }}
          >
            <span>📑</span> Intelligent Syllabus Import (PDF)
          </Link>
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
                  placeholder="e.g. CSI 2110 Data Structures"
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
                const courseTopics = syllabusTopics.filter(
                  (t) => t.courseId === course.id || t.courseName === course.name
                );
                const completedTopics = courseTopics.filter((t) => t.status === 'reviewed' || t.status === 'practiced');

                const progressPercentage =
                  courseAssignments.length === 0
                    ? 0
                    : Math.round((completedCourseAssignments.length / courseAssignments.length) * 100);

                const isExpanded = expandedCourseId === course.id;

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

                    {/* Associated Tasks & Topics summary */}
                    <div className="course-task-summary">
                      <div className="task-counts-badge">
                        <span>📝 {courseAssignments.length} Assignments ({completedCourseAssignments.length} done)</span>
                        <span>•</span>
                        <span>📅 {courseExams.length} Exams</span>
                        <span>•</span>
                        <span>📖 {courseTopics.length} Topics ({completedTopics.length} practiced/reviewed)</span>
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

                    {/* Syllabus Accordion Toggle & Action Buttons */}
                    <div className="syllabus-accordion-header">
                      <button
                        type="button"
                        className="btn-accordion-toggle"
                        onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                        aria-expanded={isExpanded}
                      >
                        <span className="accordion-arrow">{isExpanded ? '▼' : '▶'}</span>
                        <strong>Syllabus & Weekly Topics</strong>
                        <span className="topic-count-pill">{courseTopics.length} topics</span>
                      </button>

                      <div className="syllabus-header-btns">
                        <button
                          type="button"
                          className="btn btn-xs btn-outline"
                          onClick={() => {
                            setTopicModalCourse(course);
                            setTopicTitle('');
                            setTopicWeek(String(courseTopics.length + 1));
                            setTopicReading('');
                            setTopicHours('2.5');
                          }}
                        >
                          + Add Topic
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-secondary"
                          onClick={() => {
                            setImportModalCourse(course);
                            setImportStep('input');
                            setImportRawText('');
                            setParsedImportRows([]);
                          }}
                          title="Import syllabus text with mandatory review step"
                        >
                          📄 Import Syllabus
                        </button>
                      </div>
                    </div>

                    {/* Syllabus Topics Content */}
                    {isExpanded && (
                      <div className="syllabus-topics-panel">
                        {courseTopics.length === 0 ? (
                          <div className="syllabus-empty-state">
                            <p>No syllabus topics defined for this course yet.</p>
                            <p className="subtext">
                              Add topics manually or click <strong>&quot;Import Syllabus&quot;</strong> to parse your course outline.
                            </p>
                          </div>
                        ) : (
                          <div className="topics-list">
                            {courseTopics
                              .sort((a, b) => a.week - b.week)
                              .map((topic) => {
                                const currentStatus = topic.status || 'not_started';
                                const statusConfig = TOPIC_STATUS_LABELS[currentStatus] || TOPIC_STATUS_LABELS.not_started;

                                return (
                                  <div key={topic.id} className="topic-row-card">
                                    <div className="topic-main-info">
                                      <div className="topic-header-line">
                                        <span className="topic-week-badge">Week {topic.week}</span>
                                        <strong className="topic-title-text">{topic.title}</strong>
                                        <Badge variant={statusConfig.badge}>{statusConfig.label}</Badge>
                                      </div>

                                      {topic.requiredReading && (
                                        <div className="topic-reading-text">
                                          📖 <em>{topic.requiredReading}</em>
                                        </div>
                                      )}

                                      <div className="topic-meta-line">
                                        <span>Est. Workload: ~{topic.estimatedHours || 2}h</span>
                                        <span>•</span>
                                        <span>Confidence: {topic.confidence || 3}/5</span>
                                      </div>
                                    </div>

                                    <div className="topic-controls">
                                      <div className="topic-status-select-wrap">
                                        <label htmlFor={`status-${topic.id}`} className="sr-only">Topic Status</label>
                                        <select
                                          id={`status-${topic.id}`}
                                          className="form-select form-select-xs"
                                          value={currentStatus}
                                          onChange={(e) =>
                                            updateTopicProgress(topic.id, { status: e.target.value })
                                          }
                                        >
                                          <option value="not_started">⚪ Not Started</option>
                                          <option value="attended_lecture">🎓 Attended Lecture</option>
                                          <option value="reading_completed">📖 Reading Done</option>
                                          <option value="practiced">✍️ Practiced</option>
                                          <option value="reviewed">⭐ Fully Reviewed</option>
                                        </select>
                                      </div>

                                      <div className="topic-confidence-selector" title="Self-reported confidence">
                                        {[1, 2, 3, 4, 5].map((level) => (
                                          <button
                                            key={level}
                                            type="button"
                                            className={`star-btn ${level <= (topic.confidence || 3) ? 'star-active' : ''}`}
                                            onClick={() => updateTopicProgress(topic.id, { confidence: level })}
                                            aria-label={`Rate confidence ${level} of 5`}
                                          >
                                            ★
                                          </button>
                                        ))}
                                      </div>

                                      <button
                                        type="button"
                                        className="topic-del-btn"
                                        onClick={() => deleteTopic(topic.id)}
                                        aria-label={`Remove topic ${topic.title}`}
                                        title="Delete topic"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    )}
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

      {/* Add Topic Modal */}
      <Modal
        isOpen={Boolean(topicModalCourse)}
        onClose={() => setTopicModalCourse(null)}
        title={`Add Syllabus Topic to ${topicModalCourse?.name}`}
      >
        {topicModalCourse && (
          <form onSubmit={handleAddTopicSubmit} className="accessible-form">
            {topicError && (
              <div className="form-error-banner" role="alert">
                <span>✕</span> {topicError}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="topic-title" className="form-label">
                Topic Title <span className="required">*</span>
              </label>
              <input
                id="topic-title"
                type="text"
                className="form-input"
                placeholder="e.g. Graph Algorithms & Dijkstra's Algorithm"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="topic-week" className="form-label">
                  Week Number
                </label>
                <input
                  id="topic-week"
                  type="number"
                  min="1"
                  max="16"
                  className="form-input"
                  value={topicWeek}
                  onChange={(e) => setTopicWeek(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="topic-hours" className="form-label">
                  Est. Study Workload (Hours)
                </label>
                <input
                  id="topic-hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="20"
                  className="form-input"
                  value={topicHours}
                  onChange={(e) => setTopicHours(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="topic-reading" className="form-label">
                Required Reading / Textbook Reference
              </label>
              <input
                id="topic-reading"
                type="text"
                className="form-input"
                placeholder="e.g. Textbook Chapter 4.1-4.4"
                value={topicReading}
                onChange={(e) => setTopicReading(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="topic-diff" className="form-label">
                Topic Difficulty Tier
              </label>
              <select
                id="topic-diff"
                className="form-select"
                value={topicDifficulty}
                onChange={(e) => setTopicDifficulty(e.target.value)}
              >
                <option value="Low">Low (Introductory)</option>
                <option value="Medium">Medium (Standard)</option>
                <option value="High">High (Complex proofs / labs)</option>
              </select>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTopicModalCourse(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add Topic
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Syllabus Import with Mandatory Review-and-Correct Step Modal */}
      <Modal
        isOpen={Boolean(importModalCourse)}
        onClose={() => setImportModalCourse(null)}
        title={`Import Syllabus: ${importModalCourse?.name}`}
      >
        {importModalCourse && (
          <div className="syllabus-import-modal-content">
            <div className="import-notice-box">
              <div className="notice-icon">🛡️</div>
              <div className="notice-text">
                <strong>Mandatory Review & Correct:</strong> To protect academic accuracy, extracted syllabus items are never silently committed. Review and edit the parsed topics below before saving.
              </div>
            </div>

            {importStep === 'input' ? (
              <div className="import-input-step">
                <p className="import-instructions">
                  Paste your syllabus outline or weekly course schedule below. You can also test with our sample syllabus outline.
                </p>

                <textarea
                  className="form-textarea import-textarea"
                  rows={8}
                  placeholder="Paste syllabus text here... Example:&#10;Week 1: Introduction to Algorithms - Reading: Ch 1&#10;Week 2: Graph Theory & BFS/DFS - Reading: Ch 22&#10;Week 3: Shortest Paths..."
                  value={importRawText}
                  onChange={(e) => setImportRawText(e.target.value)}
                />

                <div className="import-step-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={loadSampleSyllabus}
                  >
                    Load Sample Syllabus Text
                  </button>

                  <div className="right-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setImportModalCourse(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!importRawText.trim()}
                      onClick={handleParseSyllabusText}
                    >
                      Parse & Review Topics →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="import-review-step">
                <p className="import-instructions">
                  Detected {parsedImportRows.length} topics. You can uncheck items or edit any field before importing.
                </p>

                <div className="review-table-container">
                  <table className="review-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>Include</th>
                        <th style={{ width: '70px' }}>Week</th>
                        <th>Topic Title</th>
                        <th>Required Reading</th>
                        <th style={{ width: '80px' }}>Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedImportRows.map((row, idx) => (
                        <tr key={row.id} className={!row.included ? 'row-excluded' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              checked={row.included}
                              onChange={(e) => {
                                const updated = [...parsedImportRows];
                                updated[idx].included = e.target.checked;
                                setParsedImportRows(updated);
                              }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-input form-input-xs"
                              value={row.week}
                              onChange={(e) => {
                                const updated = [...parsedImportRows];
                                updated[idx].week = Number(e.target.value) || 1;
                                setParsedImportRows(updated);
                              }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-input form-input-xs"
                              value={row.title}
                              onChange={(e) => {
                                const updated = [...parsedImportRows];
                                updated[idx].title = e.target.value;
                                setParsedImportRows(updated);
                              }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-input form-input-xs"
                              value={row.requiredReading}
                              onChange={(e) => {
                                const updated = [...parsedImportRows];
                                updated[idx].requiredReading = e.target.value;
                                setParsedImportRows(updated);
                              }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.5"
                              className="form-input form-input-xs"
                              value={row.estimatedHours}
                              onChange={(e) => {
                                const updated = [...parsedImportRows];
                                updated[idx].estimatedHours = Number(e.target.value) || 2;
                                setParsedImportRows(updated);
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="import-step-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setImportStep('input')}
                  >
                    ← Back to Raw Text
                  </button>

                  <div className="right-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setImportModalCourse(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={handleConfirmSyllabusImport}
                    >
                      Confirm & Add {parsedImportRows.filter((r) => r.included).length} Topics ✓
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
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
              Assignments, exams, and syllabus topics associated with this course will remain in your workspace or be detached.
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