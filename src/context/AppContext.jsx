import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  safeGetItem,
  safeSetItem,
  migrateStorage,
  exportAllData,
  importAllData,
  clearAllData,
  loadSampleDemoData,
  STORAGE_KEYS,
} from '../services/storage';
import { generateStudyPlan } from '../services/scheduler';

const AppContext = createContext(null);

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

  // --- Course Operations ---
  const addCourse = useCallback((courseData) => {
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
    addToast(`Course "${newCourse.name}" added successfully.`, 'success');
    return newCourse;
  }, [addToast]);

  const updateCourse = useCallback((id, updatedData) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updatedData, name: updatedData.name.trim() } : c))
    );
    addToast('Course details updated.', 'success');
  }, [addToast]);

  const deleteCourse = useCallback((id) => {
    const courseToDelete = courses.find((c) => c.id === id);
    setCourses((prev) => prev.filter((c) => c.id !== id));
    addToast(`Course "${courseToDelete?.name || ''}" deleted.`, 'info');
  }, [courses, addToast]);

  // --- Assignment Operations ---
  const addAssignment = useCallback((data) => {
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
  }, [addToast]);

  const updateAssignment = useCallback((id, updatedData) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updatedData } : a))
    );
    addToast('Assignment updated.', 'success');
  }, [addToast]);

  const deleteAssignment = useCallback((id) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    addToast('Assignment removed.', 'info');
  }, [addToast]);

  const toggleAssignmentCompleted = useCallback((id) => {
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
  }, [addToast]);

  // --- Exam Operations ---
  const addExam = useCallback((data) => {
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
  }, [addToast]);

  const updateExam = useCallback((id, updatedData) => {
    setExams((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updatedData } : e))
    );
    addToast('Exam details updated.', 'success');
  }, [addToast]);

  const deleteExam = useCallback((id) => {
    setExams((prev) => prev.filter((e) => e.id !== id));
    addToast('Exam removed.', 'info');
  }, [addToast]);

  // --- Availability Operations ---
  const addAvailability = useCallback((slotData) => {
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
  }, [addToast]);

  const deleteAvailability = useCallback((id) => {
    setAvailability((prev) => prev.filter((slot) => slot.id !== id));
    addToast('Availability window deleted.', 'info');
  }, [addToast]);

  // --- Smart Study Planner Operations ---
  const handleGeneratePlan = useCallback((options = { preserveCompleted: true }) => {
    const result = generateStudyPlan({
      courses,
      assignments,
      exams,
      availability,
      existingPlan: studyPlan,
      preserveCompleted: options.preserveCompleted,
    });

    if (result.errors && result.errors.length > 0) {
      addToast(result.errors[0], 'error', 6000);
      return { success: false, errors: result.errors };
    }

    setStudyPlan(result.plan);
    setInsights(result.insights);

    if (result.insights?.hasImpossibleSchedule) {
      addToast(
        'Plan generated with warnings: some tasks exceed your available hours before deadlines.',
        'warning',
        7000
      );
    } else {
      addToast('Smart study plan successfully generated!', 'success');
    }

    return { success: true, plan: result.plan, insights: result.insights };
  }, [courses, assignments, exams, availability, studyPlan, addToast]);

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

  // --- Global Backup & Demo Operations ---
  const handleLoadDemo = useCallback(() => {
    loadSampleDemoData();
    setCourses(safeGetItem(STORAGE_KEYS.COURSES, []));
    setAssignments(safeGetItem(STORAGE_KEYS.ASSIGNMENTS, []));
    setExams(safeGetItem(STORAGE_KEYS.EXAMS, []));
    setAvailability(safeGetItem(STORAGE_KEYS.AVAILABILITY, []));
    setStudyPlan([]);
    setInsights(null);
    addToast('Loaded sample university courses, assignments, and exams.', 'success');
  }, [addToast]);

  const handleClearAll = useCallback(() => {
    clearAllData();
    setCourses([]);
    setAssignments([]);
    setExams([]);
    setAvailability([]);
    setStudyPlan([]);
    setInsights(null);
    addToast('All data has been cleared.', 'info');
  }, [addToast]);

  const handleImportBackup = useCallback((jsonString) => {
    const result = importAllData(jsonString);
    if (result.success) {
      setCourses(safeGetItem(STORAGE_KEYS.COURSES, []));
      setAssignments(safeGetItem(STORAGE_KEYS.ASSIGNMENTS, []));
      setExams(safeGetItem(STORAGE_KEYS.EXAMS, []));
      setAvailability(safeGetItem(STORAGE_KEYS.AVAILABILITY, []));
      setStudyPlan(safeGetItem(STORAGE_KEYS.STUDY_PLAN, []));
      setInsights(safeGetItem(STORAGE_KEYS.STUDY_INSIGHTS, null));
      addToast(result.message, 'success');
      return true;
    } else {
      addToast(result.message, 'error', 6000);
      return false;
    }
  }, [addToast]);

  const contextValue = useMemo(
    () => ({
      courses,
      assignments,
      exams,
      availability,
      studyPlan,
      insights,
      toasts,
      addToast,
      removeToast,
      addCourse,
      updateCourse,
      deleteCourse,
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
      loadDemoData: handleLoadDemo,
      clearAllData: handleClearAll,
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
      toasts,
      addToast,
      removeToast,
      addCourse,
      updateCourse,
      deleteCourse,
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
      handleLoadDemo,
      handleClearAll,
      handleImportBackup,
    ]
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
