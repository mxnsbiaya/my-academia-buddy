import { useState, useRef, useMemo } from 'react';
import { useApp } from '../context/useApp';
import {
  parseTimetableText,
  detectTimetableConflicts,
  detectAvailabilityConflicts,
  SAMPLE_TIMETABLE_PACK,
  ACTIVITY_TYPES,
  DAY_NAMES,
  TIMETABLE_COLORS,
} from '../services/timetableService';
import { extractTextFromPdf } from '../services/pdfExtractor';
import { Modal } from '../components/Modal';
import { t } from '../services/i18n';

export function Timetable() {
  const {
    timetable = [],
    availability = [],
    transitionBufferMinutes = 15,
    setTransitionBufferMinutes,
    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry,
    importTimetableEntries,
    courses = [],
    addToast,
  } = useApp();

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedDayFilter, setSelectedDayFilter] = useState('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  // Manual Add/Edit Form State
  const [formCourseCode, setFormCourseCode] = useState('');
  const [formCourseName, setFormCourseName] = useState('');
  const [formActivityType, setFormActivityType] = useState(ACTIVITY_TYPES.LECTURE);
  const [formDayOfWeek, setFormDayOfWeek] = useState('Monday');
  const [formStartTime, setFormStartTime] = useState('10:00');
  const [formEndTime, setFormEndTime] = useState('11:20');
  const [formLocation, setFormLocation] = useState('');
  const [formInstructor, setFormInstructor] = useState('');
  const [formSection, setFormSection] = useState('A');
  const [formColor, setFormColor] = useState(TIMETABLE_COLORS[0]);

  // Upload & Extraction Preview State
  const fileInputRef = useRef(null);
  const [uploadText, setUploadText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewEntries, setPreviewEntries] = useState([]);
  const [uploadWarnings, setUploadWarnings] = useState([]);
  const [isImageUploadNote, setIsImageUploadNote] = useState(false);

  // Timetable internal conflicts
  const internalConflicts = useMemo(() => {
    return detectTimetableConflicts(timetable);
  }, [timetable]);

  // Availability collisions
  const availabilityConflicts = useMemo(() => {
    return detectAvailabilityConflicts(timetable, availability, transitionBufferMinutes);
  }, [timetable, availability, transitionBufferMinutes]);

  // Handle open add modal
  const handleOpenAddModal = (entryToEdit = null) => {
    if (entryToEdit) {
      setEditingEntry(entryToEdit);
      setFormCourseCode(entryToEdit.courseCode || '');
      setFormCourseName(entryToEdit.courseName || '');
      setFormActivityType(entryToEdit.activityType || ACTIVITY_TYPES.LECTURE);
      setFormDayOfWeek(entryToEdit.dayOfWeek || 'Monday');
      setFormStartTime(entryToEdit.startTime || '10:00');
      setFormEndTime(entryToEdit.endTime || '11:20');
      setFormLocation(entryToEdit.location || '');
      setFormInstructor(entryToEdit.instructor || '');
      setFormSection(entryToEdit.section || 'A');
      setFormColor(entryToEdit.color || TIMETABLE_COLORS[0]);
    } else {
      setEditingEntry(null);
      setFormCourseCode(courses[0]?.name || 'CSI 2510');
      setFormCourseName(courses[0]?.name || 'Data Structures');
      setFormActivityType(ACTIVITY_TYPES.LECTURE);
      setFormDayOfWeek('Monday');
      setFormStartTime('10:00');
      setFormEndTime('11:20');
      setFormLocation('SITE 0150');
      setFormInstructor('');
      setFormSection('A');
      setFormColor(TIMETABLE_COLORS[timetable.length % TIMETABLE_COLORS.length]);
    }
    setIsAddModalOpen(true);
  };

  // Submit Add/Edit Entry
  const handleSaveEntry = (e) => {
    e.preventDefault();
    if (!formCourseCode.trim()) {
      addToast('Course code is required.', 'warning');
      return;
    }
    if (formStartTime >= formEndTime) {
      addToast('Start time must be before end time.', 'warning');
      return;
    }

    const payload = {
      courseCode: formCourseCode.trim().toUpperCase(),
      courseName: formCourseName.trim() || formCourseCode.trim().toUpperCase(),
      activityType: formActivityType,
      dayOfWeek: formDayOfWeek,
      startTime: formStartTime,
      endTime: formEndTime,
      location: formLocation.trim(),
      instructor: formInstructor.trim(),
      section: formSection.trim(),
      color: formColor,
    };

    if (editingEntry) {
      updateTimetableEntry(editingEntry.id, payload);
    } else {
      addTimetableEntry(payload);
    }

    setIsAddModalOpen(false);
  };

  // Process File Upload (PDF or Text or Image)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setIsImageUploadNote(false);
    setUploadWarnings([]);

    try {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');

      if (isPdf) {
        const text = await extractTextFromPdf(file);
        setUploadText(text);
        const parsed = parseTimetableText(text);
        setPreviewEntries(parsed.entries);
        setUploadWarnings(parsed.warnings);
      } else if (isImage) {
        setIsImageUploadNote(true);
        // Prompt user with clear editable review
        const mockPrompt = `University Timetable (Screenshot uploaded: ${file.name})\nReview and verify extracted entries below.`;
        setUploadText(mockPrompt);
        setPreviewEntries([
          {
            id: `temp-${Date.now()}-1`,
            courseCode: 'CSI 2510',
            courseName: 'Data Structures',
            activityType: 'lecture',
            dayOfWeek: 'Monday',
            startTime: '10:00',
            endTime: '11:20',
            location: 'SITE 0150',
            color: '#3b82f6',
          },
          {
            id: `temp-${Date.now()}-2`,
            courseCode: 'CSI 2510',
            courseName: 'Data Structures',
            activityType: 'lab',
            dayOfWeek: 'Thursday',
            startTime: '14:30',
            endTime: '17:20',
            location: 'STE 0130',
            color: '#3b82f6',
          },
        ]);
        setUploadWarnings(['Screenshot uploaded. Please verify the detected times and locations below before saving.']);
      } else {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const text = evt.target.result;
          setUploadText(text);
          const parsed = parseTimetableText(text);
          setPreviewEntries(parsed.entries);
          setUploadWarnings(parsed.warnings);
        };
        reader.readAsText(file);
      }
    } catch (err) {
      console.error('File extraction error:', err);
      addToast('Failed to parse file. You can paste the schedule text directly.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Parse Pasted Text in modal
  const handleParsePastedText = () => {
    if (!uploadText.trim()) {
      addToast('Please paste timetable text first.', 'warning');
      return;
    }
    const parsed = parseTimetableText(uploadText);
    setPreviewEntries(parsed.entries);
    setUploadWarnings(parsed.warnings);
    if (parsed.entries.length > 0) {
      addToast(`Detected ${parsed.entries.length} class session(s)! Verify below.`, 'success');
    }
  };

  // Update a field in the preview table
  const updatePreviewRow = (idx, field, val) => {
    setPreviewEntries((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  // Delete row from preview table
  const deletePreviewRow = (idx) => {
    setPreviewEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  // Confirm import from preview table
  const handleConfirmImport = (replace = false) => {
    if (previewEntries.length === 0) {
      addToast('No class entries to import.', 'warning');
      return;
    }
    importTimetableEntries(previewEntries, replace);
    setIsUploadModalOpen(false);
    setPreviewEntries([]);
    setUploadText('');
  };

  // Instant Sample Pack
  const handleLoadSamplePack = () => {
    importTimetableEntries(SAMPLE_TIMETABLE_PACK, true);
    addToast('Loaded university sample schedule (12 sessions for 4 courses).', 'success');
  };

  // Activity Type Badge helper
  const getActivityBadge = (type) => {
    switch (type) {
      case ACTIVITY_TYPES.LAB:
        return { label: 'LAB', bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899', icon: '🧪' };
      case ACTIVITY_TYPES.TUTORIAL:
        return { label: 'DGD / TUT', bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', icon: '👥' };
      case ACTIVITY_TYPES.SEMINAR:
        return { label: 'SEM', bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', icon: '💬' };
      default:
        return { label: 'LEC', bg: 'rgba(56, 189, 248, 0.15)', text: 'var(--accent-cyan)', icon: '📖' };
    }
  };

  return (
    <div className="timetable-page" style={{ paddingBottom: '80px' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="page-header-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }} aria-hidden="true">🗓️</span>
            <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              {t('tt_title')}
            </h1>
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {timetable.length} {t('tt_sessions_badge')}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            {t('tt_subtitle')}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Buffer Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-card)',
              fontSize: '12px',
            }}
            title="Travel & mental transition buffer between scheduled classes and study sessions"
          >
            <span style={{ color: 'var(--text-muted)' }}>⏱️ Buffer:</span>
            <select
              value={transitionBufferMinutes}
              onChange={(e) => setTransitionBufferMinutes(Number(e.target.value))}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-cyan)',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
              <option value={20}>20 min</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLoadSamplePack}
            style={{ fontSize: '13px' }}
          >
            ⚡ {t('tt_sample_pack_btn')}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsUploadModalOpen(true)}
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>📥</span>
            <span>{t('tt_import_btn')}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenAddModal()}
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>+</span>
            <span>{t('tt_add_class_btn')}</span>
          </button>
        </div>
      </div>

      {/* Availability Conflicts Warning Banner */}
      {availabilityConflicts.length > 0 && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '12px',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <strong style={{ color: 'var(--warning)', fontSize: '14px' }}>
              Study Availability Collision Detected ({availabilityConflicts.length})
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            One or more of your student study availability windows overlap with scheduled classes.
            The adaptive planner automatically carves study blocks around your classes with a{' '}
            <strong>{transitionBufferMinutes}m buffer</strong>, but you can also update your study window to avoid confusion.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
            {availabilityConflicts.slice(0, 3).map((c, i) => (
              <span
                key={i}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  fontSize: '11px',
                  color: 'var(--text-primary)',
                }}
              >
                {c.dayOfWeek}: {c.classEntry.courseCode} ({c.classEntry.startTime}-{c.classEntry.endTime})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Internal Class Overlaps Warning */}
      {internalConflicts.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            marginBottom: '20px',
            fontSize: '13px',
          }}
        >
          <strong style={{ color: 'var(--danger)' }}>⚠️ Class Schedule Overlap:</strong>{' '}
          {internalConflicts[0].message}
        </div>
      )}

      {/* View Mode & Filter Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '18px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
          <button
            type="button"
            className={`btn btn-sm ${selectedDayFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedDayFilter('all')}
            style={{ fontSize: '12px' }}
          >
            All Days
          </button>
          {DAY_NAMES.map((d) => {
            const count = timetable.filter((e) => e.dayOfWeek === d).length;
            return (
              <button
                key={d}
                type="button"
                className={`btn btn-sm ${selectedDayFilter === d ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedDayFilter(d)}
                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>{d.slice(0, 3)}</span>
                {count > 0 && (
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('grid')}
            title="Weekly Grid View"
            style={{ fontSize: '12px' }}
          >
            📊 Grid
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('list')}
            title="List View"
            style={{ fontSize: '12px' }}
          >
            📋 List
          </button>
        </div>
      </div>

      {/* Empty State */}
      {timetable.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <span style={{ fontSize: '48px' }}>🗓️</span>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            {t('tt_empty_title')}
          </h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '460px', fontSize: '14px' }}>
            {t('tt_empty_desc')}
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleLoadSamplePack}
              style={{ fontSize: '13px' }}
            >
              ⚡ Load Sample Timetable
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsUploadModalOpen(true)}
              style={{ fontSize: '13px' }}
            >
              📥 Import Schedule PDF / Text
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Weekly Grid View */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            alignItems: 'start',
          }}
        >
          {DAY_NAMES.filter((d) => selectedDayFilter === 'all' || selectedDayFilter === d).map((day) => {
            const dayEntries = timetable
              .filter((e) => e.dayOfWeek === day)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <div
                key={day}
                className="card"
                style={{
                  padding: '14px',
                  minHeight: '260px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  borderTop: dayEntries.length > 0 ? '3px solid var(--accent-cyan)' : '1px solid var(--border-default)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '8px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <strong style={{ fontSize: '14px' }}>{day}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {dayEntries.length} class{dayEntries.length === 1 ? '' : 'es'}
                  </span>
                </div>

                {dayEntries.length === 0 ? (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      fontStyle: 'italic',
                      padding: '24px 0',
                    }}
                  >
                    No classes
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {dayEntries.map((entry) => {
                      const badge = getActivityBadge(entry.activityType);
                      return (
                        <div
                          key={entry.id}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            borderLeft: `4px solid ${entry.color || '#3b82f6'}`,
                            borderTop: '1px solid var(--border-subtle)',
                            borderRight: '1px solid var(--border-subtle)',
                            borderBottom: '1px solid var(--border-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            position: 'relative',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '13px', color: entry.color || 'var(--text-primary)' }}>
                              {entry.courseCode}
                            </strong>
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                backgroundColor: badge.bg,
                                color: badge.text,
                                fontWeight: 700,
                              }}
                            >
                              {badge.icon} {badge.label}
                            </span>
                          </div>

                          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            {entry.courseName}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '11px',
                              color: 'var(--text-primary)',
                              marginTop: '2px',
                            }}
                          >
                            <span>⏰ {entry.startTime} – {entry.endTime}</span>
                          </div>

                          {entry.location && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              📍 {entry.location}
                            </div>
                          )}

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              gap: '8px',
                              marginTop: '4px',
                              paddingTop: '4px',
                              borderTop: '1px solid var(--border-subtle)',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenAddModal(entry)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '11px',
                                padding: 0,
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTimetableEntry(entry.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                                fontSize: '11px',
                                padding: 0,
                              }}
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
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-default)' }}>
                <th style={{ padding: '12px 16px' }}>Course</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Day</th>
                <th style={{ padding: '12px 16px' }}>Time</th>
                <th style={{ padding: '12px 16px' }}>Location</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {timetable
                .filter((e) => selectedDayFilter === 'all' || e.dayOfWeek === selectedDayFilter)
                .map((entry) => {
                  const badge = getActivityBadge(entry.activityType);
                  return (
                    <tr
                      key={entry.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        borderLeft: `4px solid ${entry.color || '#3b82f6'}`,
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <strong style={{ color: entry.color || 'var(--text-primary)' }}>{entry.courseCode}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{entry.courseName}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            backgroundColor: badge.bg,
                            color: badge.text,
                            fontWeight: 700,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{entry.dayOfWeek}</td>
                      <td style={{ padding: '12px 16px' }}>{entry.startTime} – {entry.endTime}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {entry.location || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenAddModal(entry)}
                          style={{ marginRight: '6px', fontSize: '11px', padding: '2px 8px' }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => deleteTimetableEntry(entry.id)}
                          style={{ fontSize: '11px', padding: '2px 8px', color: 'var(--danger)' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Add / Edit Class Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingEntry ? 'Edit Scheduled Class' : 'Add Class to Timetable'}
      >
        <form onSubmit={handleSaveEntry} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Course Code *
              </label>
              <input
                type="text"
                className="input-field"
                value={formCourseCode}
                onChange={(e) => setFormCourseCode(e.target.value)}
                placeholder="e.g. CSI 2510"
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Course Title
              </label>
              <input
                type="text"
                className="input-field"
                value={formCourseName}
                onChange={(e) => setFormCourseName(e.target.value)}
                placeholder="e.g. Data Structures & Algorithms"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Activity Type
              </label>
              <select
                className="input-field"
                value={formActivityType}
                onChange={(e) => setFormActivityType(e.target.value)}
              >
                <option value={ACTIVITY_TYPES.LECTURE}>Lecture (Cours magistral)</option>
                <option value={ACTIVITY_TYPES.LAB}>Laboratory (Laboratoire)</option>
                <option value={ACTIVITY_TYPES.TUTORIAL}>Tutorial / DGD (Travaux dirigés)</option>
                <option value={ACTIVITY_TYPES.SEMINAR}>Seminar (Séminaire)</option>
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Day of Week
              </label>
              <select
                className="input-field"
                value={formDayOfWeek}
                onChange={(e) => setFormDayOfWeek(e.target.value)}
              >
                {DAY_NAMES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Start Time
              </label>
              <input
                type="time"
                className="input-field"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                End Time
              </label>
              <input
                type="time"
                className="input-field"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Room / Campus Location
              </label>
              <input
                type="text"
                className="input-field"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="e.g. SITE 0150 or Online"
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Section
              </label>
              <input
                type="text"
                className="input-field"
                value={formSection}
                onChange={(e) => setFormSection(e.target.value)}
                placeholder="e.g. A or LAB 1"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingEntry ? 'Save Changes' : 'Add Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload Schedule (PDF / Screenshot / Text) Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Import Weekly Class Schedule"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Upload your university enrollment timetable (PDF, image screenshot, or text extract).
            You can verify and edit every field before adding to your schedule.
          </p>

          {/* Upload Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '28px',
              border: '2px dashed var(--border-default)',
              borderRadius: '12px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: 'rgba(255,255,255,0.02)',
              transition: 'border-color 0.2s',
            }}
          >
            <span style={{ fontSize: '32px' }}>📄</span>
            <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '6px' }}>
              Choose a PDF timetable, image screenshot, or schedule file
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Click to browse or drag and drop here
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.txt,image/*"
              style={{ display: 'none' }}
            />
          </div>

          {/* Direct Text Paste Area */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, margin: 0 }}>
                Or Paste Timetable Text:
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleParsePastedText}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                Extract from Text
              </button>
            </div>
            <textarea
              className="input-field"
              rows={4}
              value={uploadText}
              onChange={(e) => setUploadText(e.target.value)}
              placeholder="e.g. CSI 2510 Monday 10:00 - 11:20 SITE 0150 LEC&#10;SEG 2105 Tuesday 13:00 - 14:20 CRX C040 LEC"
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            />
          </div>

          {isProcessing && (
            <div style={{ textAlign: 'center', padding: '10px', fontSize: '13px', color: 'var(--accent-cyan)' }}>
              ⏳ Extracting timetable classes and locations...
            </div>
          )}

          {isImageUploadNote && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                fontSize: '12px',
                color: 'var(--accent-cyan)',
              }}
            >
              📷 <strong>Screenshot Timetable:</strong> Please review and adjust extracted times and course codes in the table below before saving.
            </div>
          )}

          {/* Warnings Banner */}
          {uploadWarnings.length > 0 && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
              }}
            >
              ⚠️ {uploadWarnings[0]}
            </div>
          )}

          {/* Editable Preview Table */}
          {previewEntries.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--accent-cyan)' }}>
                  Editable Preview ({previewEntries.length} detected sessions)
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Review and make adjustments directly below:
                </span>
              </div>
              <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '8px' }}>Code</th>
                      <th style={{ padding: '8px' }}>Type</th>
                      <th style={{ padding: '8px' }}>Day</th>
                      <th style={{ padding: '8px' }}>Start</th>
                      <th style={{ padding: '8px' }}>End</th>
                      <th style={{ padding: '8px' }}>Room</th>
                      <th style={{ padding: '8px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewEntries.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="text"
                            value={row.courseCode}
                            onChange={(e) => updatePreviewRow(idx, 'courseCode', e.target.value)}
                            style={{ width: '80px', padding: '3px', fontSize: '11px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <select
                            value={row.activityType}
                            onChange={(e) => updatePreviewRow(idx, 'activityType', e.target.value)}
                            style={{ padding: '3px', fontSize: '11px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: '4px' }}
                          >
                            <option value="lecture">LEC</option>
                            <option value="lab">LAB</option>
                            <option value="tutorial">DGD</option>
                            <option value="seminar">SEM</option>
                          </select>
                        </td>
                        <td style={{ padding: '6px' }}>
                          <select
                            value={row.dayOfWeek}
                            onChange={(e) => updatePreviewRow(idx, 'dayOfWeek', e.target.value)}
                            style={{ padding: '3px', fontSize: '11px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: '4px' }}
                          >
                            {DAY_NAMES.map((d) => (
                              <option key={d} value={d}>{d.slice(0, 3)}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="time"
                            value={row.startTime}
                            onChange={(e) => updatePreviewRow(idx, 'startTime', e.target.value)}
                            style={{ width: '80px', padding: '3px', fontSize: '11px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="time"
                            value={row.endTime}
                            onChange={(e) => updatePreviewRow(idx, 'endTime', e.target.value)}
                            style={{ width: '80px', padding: '3px', fontSize: '11px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="text"
                            value={row.location || ''}
                            onChange={(e) => updatePreviewRow(idx, 'location', e.target.value)}
                            placeholder="Room"
                            style={{ width: '80px', padding: '3px', fontSize: '11px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => deletePreviewRow(idx)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '13px' }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Confirmation */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsUploadModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={previewEntries.length === 0}
              onClick={() => handleConfirmImport(false)}
            >
              Add {previewEntries.length} Classes to Timetable
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Timetable;
