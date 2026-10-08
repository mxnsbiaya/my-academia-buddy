import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  safeGetItem,
  safeSetItem,
  migrateStorage,
  exportAllData,
  importAllData,
  clearAllData,
  loadSampleDemoData,
  getDefaultStudentProfile,
  getDefaultAdaptiveSignals,
  generateDefaultTopicsForCourse,
  STORAGE_KEYS,
} from '../services/storage';
import { generateStudyPlan } from '../services/scheduler';
import {
  recalibrateAdaptiveSignals,
  identifyMissedTopicsForRescheduling,
} from '../services/coach';
import { AppContext } from './AppContextDefinition';

export function AppProvider({ children }) {
  // Initialize storage migration once
  useEffect(() => {
    migrateStorage();
  }, []);

  const [courses, setCourses] = useState(() => safeGetItem(STORAGE_KEYS.COURSES, []));
  const [assignments, setAssignments] = useState(() => safeGetItem(STORAGE_KEYS.ASSIGNMENTS, []));
  const [exams, setExams] = useState(() => safeGetItem(STORAGE_KEYS.EXAMS, []));
  const [availability, setAvailability] = useState(() => safeGetItem(STORAGE_KEYS.AVAILABILITY, []));
  const [studyPlan, setStudyPlan] = useState(() => safeGetItem(STORAGE_KEYS.STUDY_PLAN, []));
  const [insights, setInsights] = useState(() => safeGetItem(STORAGE_KEYS.STUDY_INSIGHTS, null));

  // Academic Coach State
  const [studentProfile, setStudentProfile] = useState(() =>
    safeGetItem(STORAGE_KEYS.STUDENT_PROFILE, getDefaultStudentProfile())
  );
  const [syllabusTopics, setSyllabusTopics] = useState(() =>
    safeGetItem(STORAGE_KEYS.SYLLABUS_TOPICS, [])
  );
  const [checkIns, setCheckIns] = useState(() => safeGetItem(STORAGE_KEYS.CHECK_INS, []));
  const [adaptiveSignals, setAdaptiveSignals] = useState(() =>
    safeGetItem(STORAGE_KEYS.ADAPTIVE_SIGNALS, getDefaultAdaptiveSignals())
  );
  const [emergencyExamMode, setEmergencyExamMode] = useState(false);

  // Coach Modal states
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(() => {
    const profile = safeGetItem(STORAGE_KEYS.STUDENT_PROFILE, getDefaultStudentProfile());
    return profile?.onboardingCompleted === false;
  });

  const openCheckInModal = useCallback(() => setIsCheckInModalOpen(true), []);
  const closeCheckInModal = useCallback(() => setIsCheckInModalOpen(false), []);
  const openProfileModal = useCallback(() => setIsProfileModalOpen(true), []);
  const closeProfileModal = useCallback(() => setIsProfileModalOpen(false), []);
  const openOnboardingModal = useCallback(() => setIsOnboardingModalOpen(true), []);
  const closeOnboardingModal = useCallback(() => setIsOnboardingModalOpen(false), []);

  // Non-blocking in-app notification toasts
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Sync state changes to localStorage
  useEffect(() => {
    safeSetItem(STORAGE_KEYS.COURSES, courses);
  }, [courses]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.ASSIGNMENTS, assignments);
  }, [assignments]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.EXAMS, exams);
  }, [exams]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.AVAILABILITY, availability);
  }, [availability]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.STUDY_PLAN, studyPlan);
  }, [studyPlan]);

  useEffect(() => {
    if (insights) {
      safeSetItem(STORAGE_KEYS.STUDY_INSIGHTS, insights);
    }
  }, [insights]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.STUDENT_PROFILE, studentProfile);
  }, [studentProfile]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.SYLLABUS_TOPICS, syllabusTopics);
  }, [syllabusTopics]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.CHECK_INS, checkIns);
  }, [checkIns]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.ADAPTIVE_SIGNALS, adaptiveSignals);
  }, [adaptiveSignals]);

  // --- Student Profile Operations ---
  const updateStudentProfile = useCallback(
    (profileUpdates) => {
      setStudentProfile((prev) => {
        const next = { ...prev, ...profileUpdates, lastUpdated: new Date().toISOString() };
        return next;
      });
      addToast('Academic profile updated successfully.', 'success');
    },
    [addToast]
  );

  // --- Course Operations ---
  const addCourse = useCallback(
    (courseData) => {
      const newCourse = {
        id: Date.now(),
        name: courseData.name.trim(),
        instructor: courseData.instructor?.trim() || '',
        schedule: courseData.schedule?.trim() || '',
        credits: courseData.credits || '3.0',
        difficulty: courseData.difficulty || 'Medium',
        color: courseData.color || '#3b82f6',
        createdAt: new Date().toISOString(),
      };
      setCourses((prev) => [...prev, newCourse]);

      // Automatically generate starter syllabus topics for the new course
      const initialTopics = generateDefaultTopicsForCourse(newCourse);
      setSyllabusTopics((prev) => [...prev, ...initialTopics]);

      addToast(`Course "${newCourse.name}" registered with starter syllabus topics.`, 'success');
      return newCourse;
    },
    [addToast]
  );

  const updateCourse = useCallback(
    (id, updatedData) => {
      setCourses((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updatedData, name: updatedData.name.trim() } : c))
      );
      // Synchronize courseName on linked topics
      if (updatedData.name) {
        setSyllabusTopics((prev) =>
          prev.map((t) => (t.courseId === id ? { ...t, courseName: updatedData.name.trim() } : t))
        );
      }
      addToast('Course details updated.', 'success');
    },
    [addToast]
  );

  const deleteCourse = useCallback(
    (id) => {
      const courseToDelete = courses.find((c) => c.id === id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      setSyllabusTopics((prev) => prev.filter((t) => t.courseId !== id));
      addToast(`Course "${courseToDelete?.name || ''}" removed.`, 'info');
    },
    [courses, addToast]
  );

  // --- Syllabus Topic Operations ---
  const addTopic = useCallback(
    (topicData) => {
      const newTopic = {
        id: `topic-${Date.now()}`,
        courseId: topicData.courseId,
        courseName: topicData.courseName,
        weekNumber: Number(topicData.weekNumber) || 1,
        title: topicData.title.trim(),
        description: topicData.description?.trim() || '',
        requiredReadings: topicData.requiredReadings?.trim() || '',
        practiceProblems: topicData.practiceProblems?.trim() || '',
        estimatedHours: Number(topicData.estimatedHours) || 3.0,
        prerequisiteTopicIds: topicData.prerequisiteTopicIds || [],
        status: topicData.status || 'not_started',
        confidence: Number(topicData.confidence) || 3,
        lastUpdated: new Date().toISOString(),
      };
      setSyllabusTopics((prev) => [...prev, newTopic]);
      addToast(`Added topic: "${newTopic.title}" to ${newTopic.courseName}`, 'success');
      return newTopic;
    },
    [addToast]
  );

  const updateTopic = useCallback(
    (id, updatedData) => {
      setSyllabusTopics((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updatedData, lastUpdated: new Date().toISOString() } : t))
      );
      addToast('Syllabus topic updated.', 'success');
    },
    [addToast]
  );

  const deleteTopic = useCallback(
    (id) => {
      setSyllabusTopics((prev) => prev.filter((t) => t.id !== id));
      addToast('Topic removed from syllabus.', 'info');
    },
    [addToast]
  );

  const updateTopicProgress = useCallback(
    (id, { status, confidence }) => {
      setSyllabusTopics((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            return {
              ...t,
              status: status !== undefined ? status : t.status,
              confidence: confidence !== undefined ? confidence : t.confidence,
              lastUpdated: new Date().toISOString(),
            };
          }
          return t;
        })
      );
    },
    []
  );

  // --- Weekly Check-In Submission ---
  const submitCheckIn = useCallback(
    ({ responses, newCommitments }) => {
      const newCheckIn = {
        id: `checkin-${Date.now()}`,
        weekNumber: checkIns.length + 1,
        date: new Date().toISOString(),
        responses,
        newCommitmentsNoted: newCommitments || '',
        completedAt: new Date().toISOString(),
      };

      // 1. Save check-in
      const updatedCheckIns = [newCheckIn, ...checkIns];
      setCheckIns(updatedCheckIns);

      // 2. Update topic progress based on check-in answers
      responses.forEach((resp) => {
        if (resp.topicId) {
          setSyllabusTopics((prev) =>
            prev.map((t) => {
              if (t.id === resp.topicId) {
                let nextStatus = t.status;
                if (resp.field === 'lecture' && resp.answer === 'completed') {
                  if (t.status === 'not_started') nextStatus = 'attended_lecture';
                } else if (resp.field === 'reading' && resp.answer === 'completed') {
                  nextStatus = 'reading_completed';
                } else if (resp.field === 'practice' && resp.answer === 'completed') {
                  nextStatus = 'practiced';
                }
                const nextConf = resp.confidenceScore ? Number(resp.confidenceScore) : t.confidence;
                return { ...t, status: nextStatus, confidence: nextConf, lastUpdated: new Date().toISOString() };
              }
              return t;
            })
          );
        }
      });

      // 3. Recalibrate adaptive pacing signals
      const nextSignals = recalibrateAdaptiveSignals(updatedCheckIns, studyPlan, adaptiveSignals);
      setAdaptiveSignals(nextSignals);

      addToast('Weekly check-in complete! Your adaptive study plan was recalibrated.', 'success', 5000);
      return newCheckIn;
    },
    [checkIns, studyPlan, adaptiveSignals, addToast]
  );

  // --- Assignment Operations ---
  const addAssignment = useCallback(
    (data) => {
      const newAssignment = {
        id: Date.now(),
        title: data.title.trim(),
        course: data.course?.trim() || '',
        dueDate: data.dueDate,
        priority: data.priority || 'Medium',
        estimatedWorkload: Number(data.estimatedWorkload) || 3,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      setAssignments((prev) => [...prev, newAssignment]);
      addToast(`Assignment "${newAssignment.title}" created.`, 'success');
      return newAssignment;
    },
    [addToast]
  );

  const updateAssignment = useCallback(
    (id, updatedData) => {
      setAssignments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updatedData } : a))
      );
      addToast('Assignment updated.', 'success');
    },
    [addToast]
  );

  const deleteAssignment = useCallback(
    (id) => {
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      addToast('Assignment removed.', 'info');
    },
    [addToast]
  );

  const toggleAssignmentCompleted = useCallback(
    (id) => {
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.id === id) {
            const nextState = !a.completed;
            addToast(nextState ? `Marked "${a.title}" as completed!` : `Reopened "${a.title}".`, 'info');
            return { ...a, completed: nextState };
          }
          return a;
        })
      );
    },
    [addToast]
  );

  // --- Exam Operations ---
  const addExam = useCallback(
    (data) => {
      const newExam = {
        id: Date.now(),
        title: data.title?.trim() || `${data.course} Exam`,
        course: data.course?.trim() || '',
        date: data.date,
        location: data.location?.trim() || '',
        notes: data.notes?.trim() || '',
        priority: data.priority || 'High',
        estimatedWorkload: Number(data.estimatedWorkload) || 5,
        createdAt: new Date().toISOString(),
      };
      setExams((prev) => [...prev, newExam]);
      addToast(`Exam "${newExam.title}" scheduled.`, 'success');
      return newExam;
    },
    [addToast]
  );

  const updateExam = useCallback(
    (id, updatedData) => {
      setExams((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updatedData } : e))
      );
      addToast('Exam details updated.', 'success');
    },
    [addToast]
  );

  const deleteExam = useCallback(
    (id) => {
      setExams((prev) => prev.filter((e) => e.id !== id));
      addToast('Exam removed.', 'info');
    },
    [addToast]
  );

  // --- Availability Operations ---
  const addAvailability = useCallback(
    (slotData) => {
      const newSlot = {
        id: Date.now(),
        day: slotData.day,
        startTime: slotData.startTime,
        endTime: slotData.endTime,
        warning: slotData.warning || '',
      };
      setAvailability((prev) => [...prev, newSlot]);
      addToast(`Added availability for ${newSlot.day}.`, 'success');
      return newSlot;
    },
    [addToast]
  );

  const deleteAvailability = useCallback(
    (id) => {
      setAvailability((prev) => prev.filter((slot) => slot.id !== id));
      addToast('Availability window deleted.', 'info');
    },
    [addToast]
  );

  // --- Smart Study Planner Operations ---
  const handleGeneratePlan = useCallback(
    (options = { preserveCompleted: true }) => {
      const missedTopics = identifyMissedTopicsForRescheduling(checkIns, syllabusTopics);
      const missedIds = missedTopics.map((t) => t.id);

      const result = generateStudyPlan({
        courses,
        assignments,
        exams,
        availability,
        syllabusTopics,
        existingPlan: studyPlan,
        preserveCompleted: options.preserveCompleted,
        adaptiveSignals,
        missedTopicIds: missedIds,
        emergencyExamMode,
      });

      if (result.errors && result.errors.length > 0) {
        addToast(result.errors[0], 'error', 6000);
        return { success: false, errors: result.errors };
      }

      setStudyPlan(result.plan);
      setInsights(result.insights);

      if (emergencyExamMode) {
        addToast('⚡ Emergency Exam Prep plan generated with intensive mock review blocks!', 'warning', 7000);
      } else if (result.insights?.hasImpossibleSchedule) {
        addToast(
          'Plan generated with warnings: some deliverables exceed your available study hours.',
          'warning',
          7000
        );
      } else {
        addToast('Adaptive study plan generated with concrete action steps!', 'success');
      }

      return { success: true, plan: result.plan, insights: result.insights };
    },
    [courses, assignments, exams, availability, syllabusTopics, studyPlan, checkIns, adaptiveSignals, emergencyExamMode, addToast]
  );

  const toggleSessionCompleted = useCallback((sessionId) => {
    setStudyPlan((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, completed: !s.completed } : s))
    );
  }, []);

  const clearPlan = useCallback(() => {
    setStudyPlan([]);
    setInsights(null);
    addToast('Study plan cleared.', 'info');
  }, [addToast]);

  const toggleEmergencyExamMode = useCallback(
    (forcedValue) => {
      setEmergencyExamMode((prev) => {
        const next = forcedValue !== undefined ? forcedValue : !prev;
        addToast(
          next
            ? '⚡ Emergency Exam Preparation Mode Activated: focusing on high-yield review!'
            : 'Standard Balanced Planning Mode Restored.',
          next ? 'warning' : 'info'
        );
        return next;
      });
    },
    [addToast]
  );

  // --- Global Backup & Demo Operations ---
  const handleLoadDemo = useCallback(() => {
    loadSampleDemoData();
    setCourses(safeGetItem(STORAGE_KEYS.COURSES, []));
    setAssignments(safeGetItem(STORAGE_KEYS.ASSIGNMENTS, []));
    setExams(safeGetItem(STORAGE_KEYS.EXAMS, []));
    setAvailability(safeGetItem(STORAGE_KEYS.AVAILABILITY, []));
    setStudentProfile(safeGetItem(STORAGE_KEYS.STUDENT_PROFILE, getDefaultStudentProfile()));
    setSyllabusTopics(safeGetItem(STORAGE_KEYS.SYLLABUS_TOPICS, []));
    setCheckIns(safeGetItem(STORAGE_KEYS.CHECK_INS, []));
    setAdaptiveSignals(safeGetItem(STORAGE_KEYS.ADAPTIVE_SIGNALS, getDefaultAdaptiveSignals()));
    setStudyPlan([]);
    setInsights(null);
    addToast('Loaded university demo dataset with courses, syllabus topics, and coach history.', 'success');
  }, [addToast]);

  const handleClearAll = useCallback(() => {
    clearAllData();
    setCourses([]);
    setAssignments([]);
    setExams([]);
    setAvailability([]);
    setStudentProfile(getDefaultStudentProfile());
    setSyllabusTopics([]);
    setCheckIns([]);
    setAdaptiveSignals(getDefaultAdaptiveSignals());
    setStudyPlan([]);
    setInsights(null);
    addToast('All data has been cleared.', 'info');
  }, [addToast]);

  const handleImportBackup = useCallback(
    (jsonString) => {
      const result = importAllData(jsonString);
      if (result.success) {
        setCourses(safeGetItem(STORAGE_KEYS.COURSES, []));
        setAssignments(safeGetItem(STORAGE_KEYS.ASSIGNMENTS, []));
        setExams(safeGetItem(STORAGE_KEYS.EXAMS, []));
        setAvailability(safeGetItem(STORAGE_KEYS.AVAILABILITY, []));
        setStudentProfile(safeGetItem(STORAGE_KEYS.STUDENT_PROFILE, getDefaultStudentProfile()));
        setSyllabusTopics(safeGetItem(STORAGE_KEYS.SYLLABUS_TOPICS, []));
        setCheckIns(safeGetItem(STORAGE_KEYS.CHECK_INS, []));
        setAdaptiveSignals(safeGetItem(STORAGE_KEYS.ADAPTIVE_SIGNALS, getDefaultAdaptiveSignals()));
        setStudyPlan(safeGetItem(STORAGE_KEYS.STUDY_PLAN, []));
        setInsights(safeGetItem(STORAGE_KEYS.STUDY_INSIGHTS, null));
        addToast(result.message, 'success');
        return true;
      } else {
        addToast(result.message, 'error', 6000);
        return false;
      }
    },
    [addToast]
  );

  const contextValue = useMemo(
    () => ({
      courses,
      assignments,
      exams,
      availability,
      studyPlan,
      insights,
      studentProfile,
      syllabusTopics,
      checkIns,
      adaptiveSignals,
      emergencyExamMode,
      toasts,
      addToast,
      removeToast,
      updateStudentProfile,
      addCourse,
      updateCourse,
      deleteCourse,
      addTopic,
      updateTopic,
      deleteTopic,
      updateTopicProgress,
      submitCheckIn,
      addAssignment,
      updateAssignment,
      deleteAssignment,
      toggleAssignmentCompleted,
      addExam,
      updateExam,
      deleteExam,
      addAvailability,
      deleteAvailability,
      generatePlan: handleGeneratePlan,
      toggleSessionCompleted,
      clearPlan,
      toggleEmergencyExamMode,
      loadDemoData: handleLoadDemo,
      clearAllData: handleClearAll,
      isCheckInModalOpen,
      openCheckInModal,
      closeCheckInModal,
      isProfileModalOpen,
      openProfileModal,
      closeProfileModal,
      isOnboardingModalOpen,
      openOnboardingModal,
      closeOnboardingModal,
      exportData: exportAllData,
      importData: handleImportBackup,
    }),
    [
      courses,
      assignments,
      exams,
      availability,
      studyPlan,
      insights,
      studentProfile,
      syllabusTopics,
      checkIns,
      adaptiveSignals,
      emergencyExamMode,
      isCheckInModalOpen,
      openCheckInModal,
      closeCheckInModal,
      isProfileModalOpen,
      openProfileModal,
      closeProfileModal,
      isOnboardingModalOpen,
      openOnboardingModal,
      closeOnboardingModal,
      toasts,
      addToast,
      removeToast,
      updateStudentProfile,
      addCourse,
      updateCourse,
      deleteCourse,
      addTopic,
      updateTopic,
      deleteTopic,
      updateTopicProgress,
      submitCheckIn,
      addAssignment,
      updateAssignment,
      deleteAssignment,
      toggleAssignmentCompleted,
      addExam,
      updateExam,
      deleteExam,
      addAvailability,
      deleteAvailability,
      handleGeneratePlan,
      toggleSessionCompleted,
      clearPlan,
      toggleEmergencyExamMode,
      handleLoadDemo,
      handleClearAll,
      handleImportBackup,
    ]
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export default AppProvider;
