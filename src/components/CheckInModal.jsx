import { useState, useMemo } from 'react';
import { useApp } from '../context/useApp';
import { Modal } from './Modal';
import { generateWeeklyCheckInQuestions, CHECK_IN_ANSWERS } from '../services/coach';

export function CheckInModal({ isOpen, onClose }) {
  const { courses, syllabusTopics, checkIns, submitCheckIn } = useApp();

  const questions = useMemo(() => {
    return generateWeeklyCheckInQuestions(courses, syllabusTopics, checkIns);
  }, [courses, syllabusTopics, checkIns]);

  // Form answers state keyed by question id
  const [answers, setAnswers] = useState({});
  const [confidenceScores, setConfidenceScores] = useState({});
  const [newCommitments, setNewCommitments] = useState('');
  const [formError, setFormError] = useState('');

  const handleSelectAnswer = (qId, value) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
    if (formError) setFormError('');
  };

  const handleSelectConfidence = (qId, score) => {
    setConfidenceScores((prev) => ({ ...prev, [qId]: score }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const formattedResponses = questions
      .filter((q) => q.type !== 'commitments')
      .map((q) => ({
        topicId: q.topicId,
        courseName: q.courseName,
        topicTitle: q.topicTitle,
        questionText: q.questionText,
        field: q.field,
        type: q.type,
        answer: q.type === 'confidence' ? confidenceScores[q.id] || 3 : answers[q.id] || CHECK_IN_ANSWERS.COMPLETED,
        confidenceScore: confidenceScores[q.id] || 3,
      }));

    submitCheckIn({
      responses: formattedResponses,
      newCommitments,
    });

    onClose();
  };

  const handleQuickFill = () => {
    const allDone = {};
    const highConf = {};
    questions.forEach((q) => {
      if (q.type !== 'commitments' && q.type !== 'confidence') {
        allDone[q.id] = CHECK_IN_ANSWERS.COMPLETED;
      } else if (q.type === 'confidence') {
        highConf[q.id] = 4;
      }
    });
    setAnswers(allDone);
    setConfidenceScores(highConf);
    setFormError('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Weekly Academic Check-In (2 Minutes)">
      <div className="checkin-modal-container">
        <div className="checkin-intro-card">
          <span className="checkin-coach-icon" aria-hidden="true">🎯</span>
          <div style={{ flex: 1 }}>
            <strong>Personalized Weekly Check-In</strong>
            <p>
              Your academic coach uses these quick questions to understand your actual progress on specific course topics, identify delays, and adapt your study schedule.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-xs btn-outline"
            onClick={handleQuickFill}
            title="Quickly mark all questions as completed on schedule"
          >
            ⚡ Quick Fill: All On Track
          </button>
        </div>

        {formError && (
          <div className="form-error-banner" role="alert">
            <span>✕</span> {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="checkin-form">
          <div className="checkin-questions-list">
            {questions.map((q, idx) => {
              if (q.type === 'commitments') {
                return (
                  <div key={q.id} className="checkin-question-card">
                    <span className="question-number">Schedule Calibration</span>
                    <h3 className="question-title">{q.questionText}</h3>
                    <textarea
                      rows="2"
                      className="form-textarea"
                      placeholder="e.g. Extra 4-hour shift on Friday evening, or travel this weekend..."
                      value={newCommitments}
                      onChange={(e) => setNewCommitments(e.target.value)}
                    />
                  </div>
                );
              }

              if (q.type === 'confidence') {
                const currentScore = confidenceScores[q.id] || 3;
                return (
                  <div key={q.id} className="checkin-question-card">
                    <div className="question-header">
                      <span className="question-tag course-tag">{q.courseName}</span>
                      <span className="question-number">Question {idx + 1}</span>
                    </div>
                    <h3 className="question-title">{q.questionText}</h3>

                    <div className="confidence-selector">
                      <span className="confidence-label">Confidence Level:</span>
                      <div className="confidence-buttons">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            className={`btn-confidence ${currentScore === num ? 'confidence-active' : ''}`}
                            onClick={() => handleSelectConfidence(q.id, num)}
                            aria-label={`Confidence score ${num} out of 5`}
                          >
                            {num === 1 && '1 (Unsure)'}
                            {num === 2 && '2 (Low)'}
                            {num === 3 && '3 (Moderate)'}
                            {num === 4 && '4 (Good)'}
                            {num === 5 && '5 (Mastered)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }

              // Status Question
              const selectedValue = answers[q.id];
              return (
                <div key={q.id} className="checkin-question-card">
                  <div className="question-header">
                    <span className="question-tag course-tag">{q.courseName}</span>
                    <span className="question-number">Question {idx + 1}</span>
                  </div>
                  <h3 className="question-title">{q.questionText}</h3>

                  <div className="checkin-options-grid">
                    <button
                      type="button"
                      className={`btn-checkin-opt opt-completed ${
                        selectedValue === CHECK_IN_ANSWERS.COMPLETED ? 'opt-active' : ''
                      }`}
                      onClick={() => handleSelectAnswer(q.id, CHECK_IN_ANSWERS.COMPLETED)}
                    >
                      <span className="opt-symbol">✓</span> Completed
                    </button>

                    <button
                      type="button"
                      className={`btn-checkin-opt opt-partial ${
                        selectedValue === CHECK_IN_ANSWERS.PARTIALLY_COMPLETED ? 'opt-active' : ''
                      }`}
                      onClick={() => handleSelectAnswer(q.id, CHECK_IN_ANSWERS.PARTIALLY_COMPLETED)}
                    >
                      <span className="opt-symbol">◐</span> Partially Done
                    </button>

                    <button
                      type="button"
                      className={`btn-checkin-opt opt-notstarted ${
                        selectedValue === CHECK_IN_ANSWERS.NOT_STARTED ? 'opt-active' : ''
                      }`}
                      onClick={() => handleSelectAnswer(q.id, CHECK_IN_ANSWERS.NOT_STARTED)}
                    >
                      <span className="opt-symbol">○</span> Not Started
                    </button>

                    <button
                      type="button"
                      className={`btn-checkin-opt opt-skipped ${
                        selectedValue === CHECK_IN_ANSWERS.SKIPPED ? 'opt-active' : ''
                      }`}
                      onClick={() => handleSelectAnswer(q.id, CHECK_IN_ANSWERS.SKIPPED)}
                    >
                      <span className="opt-symbol">⏭</span> Skipped
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Submit Check-In & Calibrate Plan
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default CheckInModal;
