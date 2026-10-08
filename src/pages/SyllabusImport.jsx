import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/useApp';
import { extractTextFromPdf, isScannedPdf } from '../services/pdfExtractor';
import { parseSyllabusDocument } from '../services/syllabusParser';
import { SAMPLE_SYLLABI_PACK } from '../data/sampleSyllabi';
import { Badge } from '../components/Badge';

const PRESET_COURSE_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
];

export function SyllabusImport() {
  const navigate = useNavigate();
  const { importSemesterFromSyllabi, addToast } = useApp();

  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importedCourses, setImportedCourses] = useState([]);
  const [selectedCourseIndex, setSelectedCourseIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);

  // Direct Text Paste Mode
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [pastedFileName, setPastedFileName] = useState('Pasted_Syllabus.txt');

  // File processing list
  const [uploadedFiles, setUploadedFiles] = useState([]);

  /**
   * Process an individual document (PDF or Text)
   */
  const processDocument = useCallback(
    async (fileObj, colorIndex = 0) => {
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const fileName = fileObj.name || 'Syllabus.pdf';
      const fileSize = fileObj.size ? `${(fileObj.size / 1024).toFixed(1)} KB` : 'Text file';

      setUploadedFiles((prev) => [
        ...prev,
        {
          id: fileId,
          name: fileName,
          size: fileSize,
          status: 'extracting',
          progressText: 'Reading document bytes...',
        },
      ]);

      try {
        let text = '';
        let pages = [];
        let pageCount = 1;

        const isPdf =
          (fileObj.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) &&
          fileObj.type !== 'text/plain';

        if (isPdf) {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, progressText: 'Extracting PDF text layer (pdfjs-dist)...' } : f
            )
          );

          const pdfResult = await extractTextFromPdf(fileObj);
          text = pdfResult.text || pdfResult.fullText || '';
          pages = pdfResult.pages || [];
          pageCount = pdfResult.numPages || pdfResult.pageCount || 1;

          // Check if PDF is scanned or image-only
          if (pdfResult.isScanned || isScannedPdf(pdfResult)) {
            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? {
                      ...f,
                      status: 'scanned_warning',
                      pageCount,
                      warning:
                        'Scanned image-only PDF detected. Character count is too low for reliable rule-based extraction.',
                    }
                  : f
              )
            );
            addToast(
              `"${fileName}" appears to be a scanned image-only PDF. Please copy & paste syllabus text directly.`,
              'warning',
              6000
            );
            return null;
          }
        } else {
          // Plain text file
          text = typeof fileObj.text === 'function' ? await fileObj.text() : String(fileObj);
        }

        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, progressText: 'Parsing schedule, readings, assignments & exams...' }
              : f
          )
        );

        // Parse using modular syllabusParser engine
        const parsedResult = parseSyllabusDocument({
          text,
          pages,
          fileName,
          colorIndex,
          fallbackYear: new Date().getFullYear(),
        });

        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: 'ready',
                  pageCount,
                  courseName: parsedResult.course.name,
                  progressText: 'Extraction complete',
                }
              : f
          )
        );

        return {
          fileId,
          fileName,
          pageCount,
          ...parsedResult.course,
          topics: parsedResult.topics,
          assignments: parsedResult.assignments,
          exams: parsedResult.exams,
          gradingScheme: parsedResult.gradingScheme,
          metadata: parsedResult.metadata,
        };
      } catch (err) {
        console.error('Error processing document:', err);
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, status: 'error', error: err.message || 'Failed to process document' }
              : f
          )
        );
        addToast(`Could not process "${fileName}": ${err.message}`, 'error', 6000);
        return null;
      }
    },
    [addToast]
  );

  /**
   * Handle files selected via file input or drag-and-drop
   */
  const handleFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList).filter((f) =>
        f.type === 'application/pdf' ||
        f.name.toLowerCase().endsWith('.pdf') ||
        f.name.toLowerCase().endsWith('.txt')
      );

      if (files.length === 0) {
        addToast('Please upload valid PDF or TXT syllabus documents.', 'warning');
        return;
      }

      setIsProcessing(true);
      setProcessingStatus(`Analyzing ${files.length} document(s)...`);

      const newParsedCourses = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessingStatus(`Extracting ${file.name} (${i + 1}/${files.length})...`);
        const parsed = await processDocument(file, importedCourses.length + i);
        if (parsed) {
          newParsedCourses.push(parsed);
        }
      }

      if (newParsedCourses.length > 0) {
        setImportedCourses((prev) => [...prev, ...newParsedCourses]);
        setSelectedCourseIndex(importedCourses.length);
        addToast(
          `Successfully extracted ${newParsedCourses.length} course(s)! Review and confirm below.`,
          'success',
          5000
        );
      }

      setIsProcessing(false);
      setProcessingStatus('');
    },
    [importedCourses.length, processDocument, addToast]
  );

  /**
   * Handle Drag and Drop
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  /**
   * Instant Sample Pack Demo (Loads 5 realistic bilingual syllabi)
   */
  const handleLoadSamplePack = async () => {
    setIsProcessing(true);
    setProcessingStatus('Loading 5 University Syllabi (Bilingual EN & FR)...');
    setUploadedFiles([]);
    setImportedCourses([]);

    const results = [];
    const filesList = [];

    for (let i = 0; i < SAMPLE_SYLLABI_PACK.length; i++) {
      const sample = SAMPLE_SYLLABI_PACK[i];
      setProcessingStatus(`Parsing ${sample.courseCode} — ${sample.courseName}...`);

      const fileId = `sample-${sample.courseCode.replace(/\s+/g, '')}`;
      filesList.push({
        id: fileId,
        name: sample.fileName,
        size: '128.0 KB',
        pageCount: 3,
        status: 'ready',
        courseName: sample.courseCode,
        progressText: 'Extraction complete',
      });

      const parsedResult = parseSyllabusDocument({
        text: sample.text,
        fileName: sample.fileName,
        colorIndex: i,
        fallbackYear: new Date().getFullYear(),
      });

      results.push({
        fileId,
        fileName: sample.fileName,
        pageCount: 3,
        ...parsedResult.course,
        topics: parsedResult.topics,
        assignments: parsedResult.assignments,
        exams: parsedResult.exams,
        gradingScheme: parsedResult.gradingScheme,
        metadata: parsedResult.metadata,
      });
    }

    setUploadedFiles(filesList);
    setImportedCourses(results);
    setSelectedCourseIndex(0);
    setIsProcessing(false);
    setProcessingStatus('');
    addToast(
      '✨ 5 Sample Syllabi loaded and parsed! Inspect course topics, readings, assignments, and exams below.',
      'success',
      6000
    );
  };

  /**
   * Parse Pasted Text
   */
  const handleParsePastedText = async () => {
    if (!pastedText.trim()) {
      addToast('Please paste syllabus text first.', 'warning');
      return;
    }

    setIsProcessing(true);
    setShowPasteModal(false);

    const fileObj = new Blob([pastedText], { type: 'text/plain' });
    fileObj.name = pastedFileName || 'Pasted_Syllabus.txt';

    const parsed = await processDocument(fileObj, importedCourses.length);
    if (parsed) {
      setImportedCourses((prev) => [...prev, parsed]);
      setSelectedCourseIndex(importedCourses.length);
      addToast(`Parsed syllabus for "${parsed.name}".`, 'success');
      setPastedText('');
    }

    setIsProcessing(false);
  };

  /**
   * Update fields on the currently active course
   */
  const updateActiveCourse = (field, value) => {
    setImportedCourses((prev) =>
      prev.map((c, idx) => (idx === selectedCourseIndex ? { ...c, [field]: value } : c))
    );
  };

  /**
   * Update an assignment on active course
   */
  const updateAssignment = (asgIndex, field, value) => {
    setImportedCourses((prev) =>
      prev.map((c, idx) => {
        if (idx !== selectedCourseIndex) return c;
        const newAsgs = [...c.assignments];
        newAsgs[asgIndex] = { ...newAsgs[asgIndex], [field]: value };
        return { ...c, assignments: newAsgs };
      })
    );
  };

  /**
   * Add empty assignment to active course
   */
  const addAssignment = () => {
    setImportedCourses((prev) =>
      prev.map((c, idx) => {
        if (idx !== selectedCourseIndex) return c;
        const newAsg = {
          id: `asg-${Date.now()}`,
          title: 'New Assignment',
          dueDate: '',
          priority: 'Medium',
          weightPercent: 10,
          estimatedWorkload: 4,
          confidence: 'high',
        };
        return { ...c, assignments: [...c.assignments, newAsg] };
      })
    );
  };

  /**
   * Delete assignment on active course
   */
  const deleteAssignment = (asgIndex) => {
    setImportedCourses((prev) =>
      prev.map((c, idx) => {
        if (idx !== selectedCourseIndex) return c;
        return {
          ...c,
          assignments: c.assignments.filter((_, aIdx) => aIdx !== asgIndex),
        };
      })
    );
  };

  /**
   * Update an exam on active course
   */
  const updateExam = (examIndex, field, value) => {
    setImportedCourses((prev) =>
      prev.map((c, idx) => {
        if (idx !== selectedCourseIndex) return c;
        const newExams = [...c.exams];
        newExams[examIndex] = { ...newExams[examIndex], [field]: value };
        return { ...c, exams: newExams };
      })
    );
  };

  /**
   * Add exam to active course
   */
  const addExam = () => {
    setImportedCourses((prev) =>
      prev.map((c, idx) => {
        if (idx !== selectedCourseIndex) return c;
        const newExam = {
          id: `exam-${Date.now()}`,
          title: 'Midterm Exam',
          date: '',
          location: '',
          weightPercent: 25,
          estimatedWorkload: 8,
          confidence: 'high',
        };
        return { ...c, exams: [...c.exams, newExam] };
      })
    );
  };

  /**
   * Delete exam on active course
   */
  const deleteExam = (examIndex) => {
    setImportedCourses((prev) =>
      prev.map((c, idx) => {
        if (idx !== selectedCourseIndex) return c;
        return {
          ...c,
          exams: c.exams.filter((_, eIdx) => eIdx !== examIndex),
        };
      })
    );
  };

  /**
   * Update weekly topic on active course
   */
  const updateTopic = (topicIndex, field, value) => {
    setImportedCourses((prev) =>
      prev.map((c, idx) => {
        if (idx !== selectedCourseIndex) return c;
        const newTopics = [...c.topics];
        newTopics[topicIndex] = { ...newTopics[topicIndex], [field]: value };
        return { ...c, topics: newTopics };
      })
    );
  };

  /**
   * Add topic to active course
   */
  const addTopic = () => {
    setImportedCourses((prev) =>
      prev.map((c, idx) => {
        if (idx !== selectedCourseIndex) return c;
        const nextWeek = c.topics.length + 1;
        const newTopic = {
          id: `topic-${Date.now()}`,
          weekNumber: nextWeek,
          title: `Week ${nextWeek} Topic`,
          description: '',
          requiredReadings: '',
          practiceProblems: '',
          estimatedHours: 3.0,
          extractionConfidence: 'high',
        };
        return { ...c, topics: [...c.topics, newTopic] };
      })
    );
  };

  /**
   * Delete topic from active course
   */
  const deleteTopic = (topicIndex) => {
    setImportedCourses((prev) =>
      prev.map((c, idx) => {
        if (idx !== selectedCourseIndex) return c;
        return {
          ...c,
          topics: c.topics.filter((_, tIdx) => tIdx !== topicIndex),
        };
      })
    );
  };

  /**
   * Remove a course from imported set
   */
  const removeImportedCourse = (courseIndex) => {
    setImportedCourses((prev) => prev.filter((_, idx) => idx !== courseIndex));
    if (selectedCourseIndex >= courseIndex && selectedCourseIndex > 0) {
      setSelectedCourseIndex((prev) => prev - 1);
    }
  };

  /**
   * Final Step: Confirm and Save into AppContext
   */
  const handleFinalizeImport = () => {
    if (importedCourses.length === 0) {
      addToast('No extracted courses to import.', 'warning');
      return;
    }

    const result = importSemesterFromSyllabi({
      courses: importedCourses,
      replaceExisting,
    });

    if (result.success) {
      navigate('/courses');
    }
  };

  const activeCourse = importedCourses[selectedCourseIndex] || null;

  // Aggregate statistics for confirmation card
  const totalTopicsCount = importedCourses.reduce((sum, c) => sum + (c.topics?.length || 0), 0);
  const totalAssignmentsCount = importedCourses.reduce(
    (sum, c) => sum + (c.assignments?.length || 0),
    0
  );
  const totalExamsCount = importedCourses.reduce((sum, c) => sum + (c.exams?.length || 0), 0);

  return (
    <div className="syllabus-import-page" style={{ paddingBottom: '80px' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '28px' }}>
        <div className="page-header-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }} aria-hidden="true">
              📑
            </span>
            <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              Intelligent Syllabus Import
            </h1>
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              Phase 2: Client-Side PDF Engine
            </span>
          </div>
          <p
            className="page-header-subtitle"
            style={{ color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '850px' }}
          >
            Upload your university course syllabus PDFs to automatically construct your academic
            semester. Our rule-based extraction engine extracts lecture schedules, weekly topics,
            required readings, assignments, exams, and grading weights.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowPasteModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>📋</span> Paste Text
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLoadSamplePack}
            disabled={isProcessing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderColor: 'rgba(56, 189, 248, 0.4)',
              color: 'var(--accent-cyan)',
            }}
          >
            <span>✨</span> Try Sample Syllabi Pack (5 Courses)
          </button>
        </div>
      </div>

      {/* Upload Drop Zone Card */}
      <div
        className={`dropzone-card ${isDragging ? 'dropzone-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragging ? '2px dashed var(--accent-cyan)' : '2px dashed var(--border-default)',
          backgroundColor: isDragging ? 'rgba(56, 189, 248, 0.05)' : 'var(--bg-surface)',
          borderRadius: '16px',
          padding: '36px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: '28px',
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".pdf,.txt"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
            }
          }}
        />

        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '28px',
          }}
        >
          {isProcessing ? '⏳' : '📤'}
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>
          {isProcessing
            ? processingStatus || 'Processing documents...'
            : 'Drop your Course Syllabus PDFs here, or click to browse'}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '520px', margin: '0 auto' }}>
          Supports multiple PDF files (up to 5 courses simultaneously). Works with both English and
          French university syllabi. Pure client-side parsing — your documents never leave your browser.
        </p>
      </div>

      {/* Uploaded Documents Status Pills */}
      {uploadedFiles.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h4
            style={{
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '10px',
              letterSpacing: '0.5px',
            }}
          >
            Uploaded Documents ({uploadedFiles.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {uploadedFiles.map((f) => (
              <div
                key={f.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>
                    {f.status === 'ready'
                      ? '✅'
                      : f.status === 'scanned_warning'
                      ? '⚠️'
                      : f.status === 'error'
                      ? '❌'
                      : '⏳'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>
                      {f.name}{' '}
                      {f.courseName && (
                        <span style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>
                          → {f.courseName}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {f.size} {f.pageCount ? `• ${f.pageCount} page(s)` : ''} •{' '}
                      {f.progressText || f.status}
                    </div>
                  </div>
                </div>

                <div>
                  {f.status === 'ready' && (
                    <span
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'var(--success-light)',
                        color: 'var(--success)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      Ready for Review
                    </span>
                  )}
                  {f.status === 'scanned_warning' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '4px 10px' }}
                      onClick={() => setShowPasteModal(true)}
                    >
                      Paste Text Instead
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review and Correct Workspace */}
      {importedCourses.length > 0 && (
        <div className="review-workspace" style={{ marginTop: '20px' }}>
          {/* Course Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '1px solid var(--border-default)',
              paddingBottom: '12px',
              marginBottom: '24px',
              overflowX: 'auto',
            }}
          >
            {importedCourses.map((course, idx) => {
              const isActive = idx === selectedCourseIndex;
              return (
                <button
                  key={course.fileId || idx}
                  type="button"
                  onClick={() => setSelectedCourseIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: isActive
                      ? `2px solid ${course.color || 'var(--primary)'}`
                      : '1px solid var(--border-subtle)',
                    backgroundColor: isActive ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: course.color || 'var(--primary)',
                    }}
                  />
                  <span>{course.name || `Course ${idx + 1}`}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                    }}
                  >
                    {course.topics?.length || 0} topics
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImportedCourse(idx);
                    }}
                    title="Remove this course"
                    style={{
                      marginLeft: '4px',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    ✕
                  </span>
                </button>
              );
            })}
          </div>

          {activeCourse && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Course Meta Banner */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{activeCourse.name}</h2>
                    {activeCourse.metadata?.language && (
                      <span
                        style={{
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          borderRadius: '4px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        Language: {activeCourse.metadata.language}
                      </span>
                    )}
                    <Badge variant={activeCourse.difficulty || 'Medium'}>
                      {activeCourse.difficulty || 'Medium'} Workload
                    </Badge>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Source file: <strong>{activeCourse.fileName}</strong> • Extraction Quality:{' '}
                    <strong style={{ color: 'var(--success)' }}>
                      {activeCourse.metadata?.extractionQuality || 'High'}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => removeImportedCourse(selectedCourseIndex)}
                    style={{ fontSize: '12px', color: 'var(--danger)' }}
                  >
                    Remove Course
                  </button>
                </div>
              </div>

              {/* Grid: Course Info & Grading Scheme */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: '20px',
                }}
              >
                {/* Course Details Card */}
                <div
                  className="card"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '14px',
                    padding: '20px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>🏫</span> Course Information & Schedule
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          marginBottom: '4px',
                        }}
                      >
                        Course Name / Code
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={activeCourse.name}
                        onChange={(e) => updateActiveCourse('name', e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            marginBottom: '4px',
                          }}
                        >
                          Instructor
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={activeCourse.instructor || ''}
                          onChange={(e) => updateActiveCourse('instructor', e.target.value)}
                          placeholder="e.g. Dr. Lucia Moura"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            marginBottom: '4px',
                          }}
                        >
                          Office / Email
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={activeCourse.office || activeCourse.email || ''}
                          onChange={(e) => updateActiveCourse('office', e.target.value)}
                          placeholder="e.g. STE 5012"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          marginBottom: '4px',
                        }}
                      >
                        Weekly Lecture Schedule
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={activeCourse.schedule || ''}
                        onChange={(e) => updateActiveCourse('schedule', e.target.value)}
                        placeholder="e.g. Mon / Wed 10:00 - 11:30"
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            marginBottom: '4px',
                          }}
                        >
                          Credits
                        </label>
                        <select
                          className="form-input"
                          value={activeCourse.credits || '3.0'}
                          onChange={(e) => updateActiveCourse('credits', e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value="1.5">1.5</option>
                          <option value="3.0">3.0</option>
                          <option value="4.0">4.0</option>
                          <option value="6.0">6.0</option>
                        </select>
                      </div>

                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            marginBottom: '4px',
                          }}
                        >
                          Difficulty
                        </label>
                        <select
                          className="form-input"
                          value={activeCourse.difficulty || 'Medium'}
                          onChange={(e) => updateActiveCourse('difficulty', e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>

                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            marginBottom: '4px',
                          }}
                        >
                          Color
                        </label>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '38px' }}>
                          {PRESET_COURSE_COLORS.map((c) => (
                            <span
                              key={c}
                              onClick={() => updateActiveCourse('color', c)}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: c,
                                cursor: 'pointer',
                                border:
                                  activeCourse.color === c
                                    ? '2px solid #ffffff'
                                    : '1px solid transparent',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grading Scheme Card */}
                <div
                  className="card"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '14px',
                    padding: '20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span>📊</span> Course Evaluation Scheme
                    </h3>
                    {(() => {
                      const totalWeight = (activeCourse.gradingScheme || []).reduce(
                        (sum, g) => sum + (Number(g.weightPercent) || 0),
                        0
                      );
                      const isComplete = totalWeight >= 95 && totalWeight <= 105;
                      return (
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '8px',
                            backgroundColor: isComplete
                              ? 'var(--success-light)'
                              : 'var(--warning-light)',
                            color: isComplete ? 'var(--success)' : 'var(--warning)',
                          }}
                        >
                          Total: {totalWeight}% {isComplete ? '✓' : '⚠️'}
                        </span>
                      );
                    })()}
                  </div>

                  {activeCourse.gradingScheme && activeCourse.gradingScheme.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeCourse.gradingScheme.map((item, gIdx) => (
                        <div
                          key={gIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            backgroundColor: 'var(--bg-elevated)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <span style={{ fontWeight: 500, fontSize: '13px' }}>{item.component}</span>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '13px',
                              color: 'var(--accent-cyan)',
                            }}
                          >
                            {item.weightPercent}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      No separate grading table found in text. Check assignment and exam weights below.
                    </p>
                  )}
                </div>
              </div>

              {/* Weekly Topics with Readings */}
              <div
                className="card"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '14px',
                  padding: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span>📖</span> Weekly Syllabus Topics & Required Readings (
                      {activeCourse.topics?.length || 0})
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Used by Adaptive Academic Coach to track lecture attendance and comprehension.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addTopic}
                    style={{ fontSize: '12px' }}
                  >
                    + Add Topic
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(activeCourse.topics || []).map((topic, tIdx) => (
                    <div
                      key={topic.id || tIdx}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-subtle)',
                        display: 'grid',
                        gridTemplateColumns: '60px 1.5fr 1fr 1fr 30px',
                        gap: '12px',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--accent-cyan)',
                            textTransform: 'uppercase',
                          }}
                        >
                          Wk {topic.weekNumber}
                        </span>
                      </div>

                      <div>
                        <input
                          type="text"
                          className="form-input"
                          value={topic.title}
                          onChange={(e) => updateTopic(tIdx, 'title', e.target.value)}
                          placeholder="Lecture Topic Title"
                          style={{ width: '100%', fontSize: '13px' }}
                        />
                      </div>

                      <div>
                        <input
                          type="text"
                          className="form-input"
                          value={topic.requiredReadings || ''}
                          onChange={(e) => updateTopic(tIdx, 'requiredReadings', e.target.value)}
                          placeholder="Reading: e.g. CLRS Ch. 3"
                          style={{ width: '100%', fontSize: '12px' }}
                        />
                      </div>

                      <div>
                        <input
                          type="text"
                          className="form-input"
                          value={topic.practiceProblems || ''}
                          onChange={(e) => updateTopic(tIdx, 'practiceProblems', e.target.value)}
                          placeholder="Practice: e.g. Exercises 1.1-1.8"
                          style={{ width: '100%', fontSize: '12px' }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteTopic(tIdx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                        title="Remove topic"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Two Column: Assignments & Exams */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
                  gap: '20px',
                }}
              >
                {/* Assignments Card */}
                <div
                  className="card"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '14px',
                    padding: '20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span>📝</span> Assignments & Deliverables ({activeCourse.assignments?.length || 0})
                    </h3>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={addAssignment}
                      style={{ fontSize: '12px' }}
                    >
                      + Add Assignment
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(activeCourse.assignments || []).map((asg, aIdx) => (
                      <div
                        key={asg.id || aIdx}
                        style={{
                          padding: '12px',
                          backgroundColor: 'var(--bg-card)',
                          borderRadius: '10px',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={asg.title}
                            onChange={(e) => updateAssignment(aIdx, 'title', e.target.value)}
                            placeholder="Assignment Title"
                            style={{ flex: 1, fontSize: '13px', fontWeight: 600 }}
                          />
                          <button
                            type="button"
                            onClick={() => deleteAssignment(aIdx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              fontSize: '14px',
                            }}
                          >
                            ✕
                          </button>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1.4fr 1fr 1fr',
                            gap: '8px',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <label
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                display: 'block',
                              }}
                            >
                              Due Date
                            </label>
                            <input
                              type="date"
                              className="form-input"
                              value={asg.dueDate || ''}
                              onChange={(e) => updateAssignment(aIdx, 'dueDate', e.target.value)}
                              style={{ width: '100%', fontSize: '12px' }}
                            />
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                display: 'block',
                              }}
                            >
                              Weight (%)
                            </label>
                            <input
                              type="number"
                              className="form-input"
                              value={asg.weightPercent || ''}
                              onChange={(e) =>
                                updateAssignment(aIdx, 'weightPercent', Number(e.target.value))
                              }
                              placeholder="e.g. 15"
                              style={{ width: '100%', fontSize: '12px' }}
                            />
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                display: 'block',
                              }}
                            >
                              Priority
                            </label>
                            <select
                              className="form-input"
                              value={asg.priority || 'Medium'}
                              onChange={(e) => updateAssignment(aIdx, 'priority', e.target.value)}
                              style={{ width: '100%', fontSize: '12px' }}
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                            </select>
                          </div>
                        </div>

                        {asg.isYearEstimated && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--warning)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>⚠️</span> Syllabus did not specify year — please confirm due date.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exams Card */}
                <div
                  className="card"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '14px',
                    padding: '20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span>📅</span> Midterms & Exams ({activeCourse.exams?.length || 0})
                    </h3>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={addExam}
                      style={{ fontSize: '12px' }}
                    >
                      + Add Exam
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(activeCourse.exams || []).map((exam, eIdx) => (
                      <div
                        key={exam.id || eIdx}
                        style={{
                          padding: '12px',
                          backgroundColor: 'var(--bg-card)',
                          borderRadius: '10px',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={exam.title}
                            onChange={(e) => updateExam(eIdx, 'title', e.target.value)}
                            placeholder="Exam Title"
                            style={{ flex: 1, fontSize: '13px', fontWeight: 600 }}
                          />
                          <button
                            type="button"
                            onClick={() => deleteExam(eIdx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              fontSize: '14px',
                            }}
                          >
                            ✕
                          </button>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1.4fr 1.2fr 1fr',
                            gap: '8px',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <label
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                display: 'block',
                              }}
                            >
                              Exam Date
                            </label>
                            <input
                              type="date"
                              className="form-input"
                              value={exam.date || ''}
                              onChange={(e) => updateExam(eIdx, 'date', e.target.value)}
                              style={{ width: '100%', fontSize: '12px' }}
                            />
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                display: 'block',
                              }}
                            >
                              Location
                            </label>
                            <input
                              type="text"
                              className="form-input"
                              value={exam.location || ''}
                              onChange={(e) => updateExam(eIdx, 'location', e.target.value)}
                              placeholder="e.g. Marion Hall 150"
                              style={{ width: '100%', fontSize: '12px' }}
                            />
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                display: 'block',
                              }}
                            >
                              Weight (%)
                            </label>
                            <input
                              type="number"
                              className="form-input"
                              value={exam.weightPercent || ''}
                              onChange={(e) =>
                                updateExam(eIdx, 'weightPercent', Number(e.target.value))
                              }
                              placeholder="e.g. 30"
                              style={{ width: '100%', fontSize: '12px' }}
                            />
                          </div>
                        </div>

                        {exam.isYearEstimated && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--warning)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>⚠️</span> Syllabus did not specify year — please confirm exam date.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sticky Bottom Action Bar */}
          <div
            style={{
              position: 'fixed',
              bottom: '0',
              left: '260px',
              right: '0',
              padding: '16px 40px',
              backgroundColor: 'var(--bg-surface)',
              borderTop: '1px solid var(--border-default)',
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 30,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="replace-checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label
                  htmlFor="replace-checkbox"
                  style={{ fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  Replace existing semester courses (instead of appending)
                </label>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Ready to configure: <strong>{importedCourses.length} Courses</strong> •{' '}
                <strong>{totalTopicsCount} Topics</strong> •{' '}
                <strong>{totalAssignmentsCount} Assignments</strong> •{' '}
                <strong>{totalExamsCount} Exams</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setImportedCourses([])}
              >
                Clear All
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFinalizeImport}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  padding: '10px 24px',
                  fontSize: '14px',
                }}
              >
                <span>🚀</span> Finalize & Setup Academic Semester
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Text Paste Modal */}
      {showPasteModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowPasteModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '20px',
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '650px',
              width: '100%',
              border: '1px solid var(--border-default)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
                📋 Paste Syllabus Text Directly
              </h3>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '14px' }}>
              Paste syllabus text directly from course portals (Brightspace, Canvas, Moodle) or OCR tools.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Document Name
              </label>
              <input
                type="text"
                className="form-input"
                value={pastedFileName}
                onChange={(e) => setPastedFileName(e.target.value)}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Syllabus Content (Course code, schedule, weekly topics, assignments, exams)
              </label>
              <textarea
                className="form-input"
                rows={12}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="e.g. CSI 2110 — Data Structures and Algorithms&#10;Lectures: Mon / Wed 10:00 - 11:30&#10;Week 1: Algorithmic Complexity...&#10;Assignment 1: Due on October 18...&#10;Midterm Exam: October 28..."
                style={{ width: '100%', marginTop: '4px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPasteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleParsePastedText}
              >
                Parse Syllabus Text
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SyllabusImport;
