import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  safeGetScopedItem,
  safeSetScopedItem,
  migrateStorage,
  exportAllData,
  importAllData,
  clearAllData,
  loadScenarioData,
  getDefaultStudentProfile,
  getDefaultAdaptiveSignals,
  generateDefaultTopicsForCourse,
  ensureEntityMetadata,
  STORAGE_KEYS,
} from '../services/storage';
import { generateStudyPlan } from '../services/scheduler';
import {
  recalibrateAdaptiveSignals,
  identifyMissedTopicsForRescheduling,
} from '../services/coach';
import {
  enqueueMutation,
  pullCloudData,
  flushPendingQueue,
  subscribeSyncStatus,
  SYNC_STATUS,
} from '../services/syncService';
import { shouldPromptMigration } from '../services/migrationService';
import { detectSyllabusDuplicate, mergeSyllabusCourse } from '../services/duplicateDetector';
import { getLanguage, setLanguage, subscribeLanguage, t } from '../services/i18n';
import { useAuth } from './useAuth';
import { AppContext } from './AppContextDefinition';

const IMPORT_PRESET_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
];

export function AppProvider({ children }) {
  // Initialize storage migration once
  useEffect(() => {
    migrateStorage();
  }, []);

  const { user } = useAuth();
  const userId = user?.id || null;

  const [courses, setCourses] = useState(() => safeGetScopedItem(STORAGE_KEYS.COURSES, [], userId));
  const [assignments, setAssignments] = useState(() => safeGetScopedItem(STORAGE_KEYS.ASSIGNMENTS, [], userId));
  const [exams, setExams] = useState(() => safeGetScopedItem(STORAGE_KEYS.EXAMS, [], userId));
  const [availability, setAvailability] = useState(() => safeGetScopedItem(STORAGE_KEYS.AVAILABILITY, [], userId));
  const [studyPlan, setStudyPlan] = useState(() => safeGetScopedItem(STORAGE_KEYS.STUDY_PLAN, [], userId));
  const [insights, setInsights] = useState(() => safeGetScopedItem(STORAGE_KEYS.STUDY_INSIGHTS, null, userId));

  // Academic Coach State
  const [studentProfile, setStudentProfile] = useState(() =>
    safeGetScopedItem(STORAGE_KEYS.STUDENT_PROFILE, getDefaultStudentProfile(), userId)
  );
  const [syllabusTopics, setSyllabusTopics] = useState(() =>
    safeGetScopedItem(STORAGE_KEYS.SYLLABUS_TOPICS, [], userId)
  );
  const [checkIns, setCheckIns] = useState(() => safeGetScopedItem(STORAGE_KEYS.CHECK_INS, [], userId));
  const [adaptiveSignals, setAdaptiveSignals] = useState(() =>
    safeGetScopedItem(STORAGE_KEYS.ADAPTIVE_SIGNALS, getDefaultAdaptiveSignals(), userId)
  );
  const [emergencyExamMode, setEmergencyExamMode] = useState(false);

  // Phase 4 Timetable & Transition Buffer State
  const [timetable, setTimetable] = useState(() => safeGetScopedItem(STORAGE_KEYS.TIMETABLE, [], userId));
  const [transitionBufferMinutes, setTransitionBufferMinutes] = useState(15);
  const [timetableConflicts, setTimetableConflicts] = useState([]);

  // Bilingual Language State (Phase 4)
  const [language, setLanguageState] = useState(() => {
    return studentProfile?.preferredLanguage || getLanguage() || 'en';
  });

  useEffect(() => {
    return subscribeLanguage((newLang) => {
      setLanguageState(newLang);
    });
  }, []);

  // Sync status
  const [syncStatus, setSyncStatus] = useState(userId ? SYNC_STATUS.SYNCED : SYNC_STATUS.LOCAL_ONLY);
  const [syncConflict, setSyncConflict] = useState(null);

  useEffect(() => {
    return subscribeSyncStatus((status, conflict) => {
      setSyncStatus(status);
      setSyncConflict(conflict);
    });
  }, []);

  // Modal states
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(() => {
    const profile = safeGetScopedItem(STORAGE_KEYS.STUDENT_PROFILE, getDefaultStudentProfile(), userId);
    return profile?.onboardingCompleted === false;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  const openCheckInModal = useCallback(() => setIsCheckInModalOpen(true), []);
  const closeCheckInModal = useCallback(() => setIsCheckInModalOpen(false), []);
  const openProfileModal = useCallback(() => setIsProfileModalOpen(true), []);
  const closeProfileModal = useCallback(() => setIsProfileModalOpen(false), []);
  const openOnboardingModal = useCallback(() => setIsOnboardingModalOpen(true), []);
  const closeOnboardingModal = useCallback(() => setIsOnboardingModalOpen(false), []);
  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);
  const openMigrationModal = useCallback(() => setIsMigrationModalOpen(true), []);
  const closeMigrationModal = useCallback(() => setIsMigrationModalOpen(false), []);

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

  // User account switching / state reload & cloud synchronization
  const prevUserIdRef = useRef(userId);

  useEffect(() => {
    if (prevUserIdRef.current === userId) return;
    prevUserIdRef.current = userId;

    Promise.resolve().then(() => {
      // Load active user's scoped local storage
      setCourses(safeGetScopedItem(STORAGE_KEYS.COURSES, [], userId));
      setAssignments(safeGetScopedItem(STORAGE_KEYS.ASSIGNMENTS, [], userId));
      setExams(safeGetScopedItem(STORAGE_KEYS.EXAMS, [], userId));
      setAvailability(safeGetScopedItem(STORAGE_KEYS.AVAILABILITY, [], userId));
      setStudyPlan(safeGetScopedItem(STORAGE_KEYS.STUDY_PLAN, [], userId));
      setInsights(safeGetScopedItem(STORAGE_KEYS.STUDY_INSIGHTS, null, userId));
      setStudentProfile(safeGetScopedItem(STORAGE_KEYS.STUDENT_PROFILE, getDefaultStudentProfile(), userId));
      setSyllabusTopics(safeGetScopedItem(STORAGE_KEYS.SYLLABUS_TOPICS, [], userId));
      setCheckIns(safeGetScopedItem(STORAGE_KEYS.CHECK_INS, [], userId));
      setAdaptiveSignals(safeGetScopedItem(STORAGE_KEYS.ADAPTIVE_SIGNALS, getDefaultAdaptiveSignals(), userId));
      setTimetable(safeGetScopedItem(STORAGE_KEYS.TIMETABLE, [], userId));

      if (userId) {
        // Detect if migration is needed
        if (shouldPromptMigration(userId)) {
          setIsMigrationModalOpen(true);
        }

        // Pull cloud data
        pullCloudData(userId).then((cloudData) => {
          if (cloudData) {
            if (cloudData.courses?.length > 0) setCourses(cloudData.courses);
            if (cloudData.syllabusTopics?.length > 0) setSyllabusTopics(cloudData.syllabusTopics);
            if (cloudData.assignments?.length > 0) setAssignments(cloudData.assignments);
            if (cloudData.exams?.length > 0) setExams(cloudData.exams);
            if (cloudData.availability?.length > 0) setAvailability(cloudData.availability);
            if (cloudData.checkIns?.length > 0) setCheckIns(cloudData.checkIns);
            if (cloudData.adaptiveSignals) setAdaptiveSignals(cloudData.adaptiveSignals);
            if (cloudData.studentProfile) setStudentProfile(cloudData.studentProfile);
            if (cloudData.studyPlan?.length > 0) setStudyPlan(cloudData.studyPlan);
            if (cloudData.studyInsights) setInsights(cloudData.studyInsights);
            if (cloudData.timetable?.length > 0) setTimetable(cloudData.timetable);
          }
        });

        // Flush pending queue
        flushPendingQueue(userId);
      }
    });
  }, [userId]);

  // Sync state changes to scoped localStorage
  useEffect(() => {
    safeSetScopedItem(STORAGE_KEYS.COURSES, courses, userId);
  }, [courses, userId]);

  useEffect(() => {
    safeSetScopedItem(STORAGE_KEYS.ASSIGNMENTS, assignments, userId);
  }, [assignments, userId]);

  useEffect(() => {
    safeSetScopedItem(STORAGE_KEYS.EXAMS, exams, userId);
  }, [exams, userId]);

  useEffect(() => {
    safeSetScopedItem(STORAGE_KEYS.AVAILABILITY, availability, userId);
  }, [availability, userId]);

  useEffect(() => {
    safeSetScopedItem(STORAGE_KEYS.STUDY_PLAN, studyPlan, userId);
  }, [studyPlan, userId]);

  useEffect(() => {
    if (insights) {
      safeSetScopedItem(STORAGE_KEYS.STUDY_INSIGHTS, insights, userId);
    }
  }, [insights, userId]);

  useEffect(() => {
    safeSetScopedItem(STORAGE_KEYS.STUDENT_PROFILE, studentProfile, userId);
  }, [studentProfile, userId]);

  useEffect(() => {
    safeSetScopedItem(STORAGE_KEYS.SYLLABUS_TOPICS, syllabusTopics, userId);
  }, [syllabusTopics, userId]);

  useEffect(() => {
    safeSetScopedItem(STORAGE_KEYS.CHECK_INS, checkIns, userId);
  }, [checkIns, userId]);

  useEffect(() => {
    safeSetScopedItem(STORAGE_KEYS.ADAPTIVE_SIGNALS, adaptiveSignals, userId);
  }, [adaptiveSignals, userId]);

  useEffect(() => {
    safeSetScopedItem(STORAGE_KEYS.TIMETABLE, timetable, userId);
  }, [timetable, userId]);

  // --- Student Profile Operations ---
  const updateStudentProfile = useCallback(
    (profileUpdates) => {
      if (profileUpdates.preferredLanguage) {
        setLanguage(profileUpdates.preferredLanguage);
        setLanguageState(profileUpdates.preferredLanguage);
      }
      setStudentProfile((prev) => {
        const next = ensureEntityMetadata({
          ...prev,
          ...profileUpdates,
          lastUpdated: new Date().toISOString(),
        });
        enqueueMutation(userId, {
          entity: 'studentProfile',
          action: 'upsert',
          clientId: userId || 'profile',
          data: next,
        });
        return next;
      });
      addToast('Academic profile updated successfully.', 'success');
    },
    [userId, addToast]
  );

  const changeLanguage = useCallback(
    (newLang) => {
      if (newLang !== 'en' && newLang !== 'fr') return;
      setLanguage(newLang);
      setLanguageState(newLang);
      updateStudentProfile({ preferredLanguage: newLang });
    },
    [updateStudentProfile]
  );

  // --- Course Operations ---
  const addCourse = useCallback(
    (courseData) => {
      const newCourse = ensureEntityMetadata({
        id: Date.now(),
        name: courseData.name.trim(),
        instructor: courseData.instructor?.trim() || '',
        schedule: courseData.schedule?.trim() || '',
        credits: courseData.credits || '3.0',
        difficulty: courseData.difficulty || 'Medium',
        color: courseData.color || '#3b82f6',
        createdAt: new Date().toISOString(),
      });
      setCourses((prev) => [...prev, newCourse]);
      enqueueMutation(userId, {
        entity: 'courses',
        action: 'upsert',
        clientId: newCourse.id,
        data: newCourse,
      });

      // Automatically generate starter syllabus topics for the new course
      const initialTopics = generateDefaultTopicsForCourse(newCourse).map(ensureEntityMetadata);
      setSyllabusTopics((prev) => [...prev, ...initialTopics]);
      initialTopics.forEach((t) => {
        enqueueMutation(userId, {
          entity: 'syllabusTopics',
          action: 'upsert',
          clientId: t.id,
          data: t,
        });
      });

      addToast(`Course "${newCourse.name}" registered with starter syllabus topics.`, 'success');
      return newCourse;
    },
    [userId, addToast]
  );

  const updateCourse = useCallback(
    (id, updatedData) => {
      let updatedCourseObj = null;
      setCourses((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            updatedCourseObj = ensureEntityMetadata({
              ...c,
              ...updatedData,
              name: updatedData.name ? updatedData.name.trim() : c.name,
              version: (c.version || 1) + 1,
            });
            return updatedCourseObj;
          }
          return c;
        })
      );

      if (updatedCourseObj) {
        enqueueMutation(userId, {
          entity: 'courses',
          action: 'upsert',
          clientId: id,
          data: updatedCourseObj,
        });
      }

      // Synchronize courseName on linked topics
      if (updatedData.name) {
        setSyllabusTopics((prev) =>
          prev.map((t) => {
            if (t.courseId === id) {
              const updatedTopic = ensureEntityMetadata({
                ...t,
                courseName: updatedData.name.trim(),
                version: (t.version || 1) + 1,
              });
              enqueueMutation(userId, {
                entity: 'syllabusTopics',
                action: 'upsert',
                clientId: t.id,
                data: updatedTopic,
              });
              return updatedTopic;
            }
            return t;
          })
        );
      }
      addToast('Course details updated.', 'success');
    },
    [userId, addToast]
  );

  const deleteCourse = useCallback(
    (id) => {
      const courseToDelete = courses.find((c) => c.id === id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      setSyllabusTopics((prev) => prev.filter((t) => t.courseId !== id));

      enqueueMutation(userId, {
        entity: 'courses',
        action: 'delete',
        clientId: id,
      });

      addToast(`Course "${courseToDelete?.name || ''}" removed.`, 'info');
    },
    [courses, userId, addToast]
  );

  // --- Syllabus Topic Operations ---
  const addTopic = useCallback(
    (topicData) => {
      const newTopic = ensureEntityMetadata({
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
      });
      setSyllabusTopics((prev) => [...prev, newTopic]);
      enqueueMutation(userId, {
        entity: 'syllabusTopics',
        action: 'upsert',
        clientId: newTopic.id,
        data: newTopic,
      });

      addToast(`Added topic: "${newTopic.title}" to ${newTopic.courseName}`, 'success');
      return newTopic;
    },
    [userId, addToast]
  );

  const updateTopic = useCallback(
    (id, updatedData) => {
      let updatedObj = null;
      setSyllabusTopics((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            updatedObj = ensureEntityMetadata({
              ...t,
              ...updatedData,
              lastUpdated: new Date().toISOString(),
              version: (t.version || 1) + 1,
            });
            return updatedObj;
          }
          return t;
        })
      );

      if (updatedObj) {
        enqueueMutation(userId, {
          entity: 'syllabusTopics',
          action: 'upsert',
          clientId: id,
          data: updatedObj,
        });
      }
      addToast('Syllabus topic updated.', 'success');
    },
    [userId, addToast]
  );

  const deleteTopic = useCallback(
    (id) => {
      setSyllabusTopics((prev) => prev.filter((t) => t.id !== id));
      enqueueMutation(userId, {
        entity: 'syllabusTopics',
        action: 'delete',
        clientId: id,
      });
      addToast('Topic removed from syllabus.', 'info');
    },
    [userId, addToast]
  );

  const updateTopicProgress = useCallback(
    (id, { status, confidence }) => {
      let updatedObj = null;
      setSyllabusTopics((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            updatedObj = ensureEntityMetadata({
              ...t,
              status: status !== undefined ? status : t.status,
              confidence: confidence !== undefined ? confidence : t.confidence,
              lastUpdated: new Date().toISOString(),
              version: (t.version || 1) + 1,
            });
            return updatedObj;
          }
          return t;
        })
      );

      if (updatedObj) {
        enqueueMutation(userId, {
          entity: 'syllabusTopics',
          action: 'upsert',
          clientId: id,
          data: updatedObj,
        });
      }
    },
    [userId]
  );

  // --- Weekly Check-In Submission ---
  const submitCheckIn = useCallback(
    ({ responses, newCommitments }) => {
      const newCheckIn = ensureEntityMetadata({
        id: `checkin-${Date.now()}`,
        weekNumber: checkIns.length + 1,
        date: new Date().toISOString(),
        responses,
        newCommitmentsNoted: newCommitments || '',
        completedAt: new Date().toISOString(),
      });

      // 1. Save check-in
      const updatedCheckIns = [newCheckIn, ...checkIns];
      setCheckIns(updatedCheckIns);
      enqueueMutation(userId, {
        entity: 'checkIns',
        action: 'upsert',
        clientId: newCheckIn.id,
        data: newCheckIn,
      });

      // 2. Update topic progress based on check-in answers
      let updatedTopics = syllabusTopics;
      if (Array.isArray(responses) && responses.length > 0) {
        updatedTopics = syllabusTopics.map((t) => {
          const resp = responses.find((r) => r.topicId === t.id);
          if (resp) {
            let nextStatus = t.status;
            if (resp.field === 'lecture' && (resp.answer === 'completed' || resp.answer === 'partially_completed')) {
              if (t.status === 'not_started') nextStatus = 'attended_lecture';
            } else if (resp.field === 'reading' && resp.answer === 'completed') {
              nextStatus = 'reading_completed';
            } else if (resp.field === 'practice' && resp.answer === 'completed') {
              nextStatus = 'practiced';
            }
            const nextConf = resp.confidenceScore ? Number(resp.confidenceScore) : t.confidence;
            const updatedTopic = ensureEntityMetadata({
              ...t,
              status: nextStatus,
              confidence: nextConf,
              lastUpdated: new Date().toISOString(),
              version: (t.version || 1) + 1,
            });
            enqueueMutation(userId, {
              entity: 'syllabusTopics',
              action: 'upsert',
              clientId: t.id,
              data: updatedTopic,
            });
            return updatedTopic;
          }
          return t;
        });
        setSyllabusTopics(updatedTopics);
      }

      // 3. Recalibrate adaptive pacing signals
      const nextSignals = ensureEntityMetadata(
        recalibrateAdaptiveSignals(updatedCheckIns, studyPlan, adaptiveSignals)
      );
      setAdaptiveSignals(nextSignals);
      enqueueMutation(userId, {
        entity: 'adaptiveSignals',
        action: 'upsert',
        clientId: userId || 'signals',
        data: nextSignals,
      });

      // 4. Automatically adapt study plan if plan exists
      if (studyPlan && studyPlan.length > 0) {
        const missedTopics = identifyMissedTopicsForRescheduling(updatedCheckIns, updatedTopics);
        const missedIds = missedTopics.map((t) => t.id);

        const result = generateStudyPlan({
          courses,
          assignments,
          exams,
          availability,
          syllabusTopics: updatedTopics,
          existingPlan: studyPlan,
          preserveCompleted: true,
          adaptiveSignals: nextSignals,
          missedTopicIds: missedIds,
          emergencyExamMode,
        });

        if (result && result.plan) {
          const mappedPlan = result.plan.map(ensureEntityMetadata);
          setStudyPlan(mappedPlan);
          mappedPlan.forEach((s) => {
            enqueueMutation(userId, {
              entity: 'studyPlan',
              action: 'upsert',
              clientId: s.id,
              data: s,
            });
          });
          if (result.insights) {
            setInsights(result.insights);
            enqueueMutation(userId, {
              entity: 'studyInsights',
              action: 'upsert',
              clientId: userId || 'insights',
              data: result.insights,
            });
          }
        }
      }

      addToast('Weekly check-in complete! Your adaptive study plan was recalibrated.', 'success', 5000);
      return newCheckIn;
    },
    [
      checkIns,
      studyPlan,
      adaptiveSignals,
      syllabusTopics,
      courses,
      assignments,
      exams,
      availability,
      emergencyExamMode,
      userId,
      addToast,
    ]
  );

  // --- Assignment Operations ---
  const addAssignment = useCallback(
    (data) => {
      const newAssignment = ensureEntityMetadata({
        id: Date.now(),
        title: data.title.trim(),
        course: data.course?.trim() || '',
        dueDate: data.dueDate,
        priority: data.priority || 'Medium',
        estimatedWorkload: Number(data.estimatedWorkload) || 3,
        weightPercent: data.weightPercent || null,
        completed: false,
        createdAt: new Date().toISOString(),
      });
      setAssignments((prev) => [...prev, newAssignment]);
      enqueueMutation(userId, {
        entity: 'assignments',
        action: 'upsert',
        clientId: newAssignment.id,
        data: newAssignment,
      });
      addToast(`Assignment "${newAssignment.title}" created.`, 'success');
      return newAssignment;
    },
    [userId, addToast]
  );

  const updateAssignment = useCallback(
    (id, updatedData) => {
      let updatedObj = null;
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.id === id) {
            updatedObj = ensureEntityMetadata({
              ...a,
              ...updatedData,
              version: (a.version || 1) + 1,
            });
            return updatedObj;
          }
          return a;
        })
      );
      if (updatedObj) {
        enqueueMutation(userId, {
          entity: 'assignments',
          action: 'upsert',
          clientId: id,
          data: updatedObj,
        });
      }
      addToast('Assignment updated.', 'success');
    },
    [userId, addToast]
  );

  const deleteAssignment = useCallback(
    (id) => {
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      enqueueMutation(userId, {
        entity: 'assignments',
        action: 'delete',
        clientId: id,
      });
      addToast('Assignment removed.', 'info');
    },
    [userId, addToast]
  );

  const toggleAssignmentCompleted = useCallback(
    (id) => {
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.id === id) {
            const nextState = !a.completed;
            const updated = ensureEntityMetadata({
              ...a,
              completed: nextState,
              version: (a.version || 1) + 1,
            });
            enqueueMutation(userId, {
              entity: 'assignments',
              action: 'upsert',
              clientId: id,
              data: updated,
            });
            addToast(nextState ? `Marked "${a.title}" as completed!` : `Reopened "${a.title}".`, 'info');
            return updated;
          }
          return a;
        })
      );
    },
    [userId, addToast]
  );

  // --- Exam Operations ---
  const addExam = useCallback(
    (data) => {
      const newExam = ensureEntityMetadata({
        id: Date.now(),
        title: data.title?.trim() || `${data.course} Exam`,
        course: data.course?.trim() || '',
        date: data.date,
        location: data.location?.trim() || '',
        notes: data.notes?.trim() || '',
        priority: data.priority || 'High',
        estimatedWorkload: Number(data.estimatedWorkload) || 5,
        weightPercent: data.weightPercent || null,
        createdAt: new Date().toISOString(),
      });
      setExams((prev) => [...prev, newExam]);
      enqueueMutation(userId, {
        entity: 'exams',
        action: 'upsert',
        clientId: newExam.id,
        data: newExam,
      });
      addToast(`Exam "${newExam.title}" scheduled.`, 'success');
      return newExam;
    },
    [userId, addToast]
  );

  const updateExam = useCallback(
    (id, updatedData) => {
      let updatedObj = null;
      setExams((prev) =>
        prev.map((e) => {
          if (e.id === id) {
            updatedObj = ensureEntityMetadata({
              ...e,
              ...updatedData,
              version: (e.version || 1) + 1,
            });
            return updatedObj;
          }
          return e;
        })
      );
      if (updatedObj) {
        enqueueMutation(userId, {
          entity: 'exams',
          action: 'upsert',
          clientId: id,
          data: updatedObj,
        });
      }
      addToast('Exam details updated.', 'success');
    },
    [userId, addToast]
  );

  const deleteExam = useCallback(
    (id) => {
      setExams((prev) => prev.filter((e) => e.id !== id));
      enqueueMutation(userId, {
        entity: 'exams',
        action: 'delete',
        clientId: id,
      });
      addToast('Exam removed.', 'info');
    },
    [userId, addToast]
  );

  // --- Availability Operations ---
  const addAvailability = useCallback(
    (slotData) => {
      const newSlot = ensureEntityMetadata({
        id: Date.now(),
        day: slotData.day,
        startTime: slotData.startTime,
        endTime: slotData.endTime,
        warning: slotData.warning || '',
      });
      setAvailability((prev) => [...prev, newSlot]);
      enqueueMutation(userId, {
        entity: 'availability',
        action: 'upsert',
        clientId: newSlot.id,
        data: newSlot,
      });
      addToast(`Added availability for ${newSlot.day}.`, 'success');
      return newSlot;
    },
    [userId, addToast]
  );

  const deleteAvailability = useCallback(
    (id) => {
      setAvailability((prev) => prev.filter((slot) => slot.id !== id));
      enqueueMutation(userId, {
        entity: 'availability',
        action: 'delete',
        clientId: id,
      });
      addToast('Availability window deleted.', 'info');
    },
    [userId, addToast]
  );

  // --- Timetable & Class Schedule Operations ---
  const addTimetableEntry = useCallback(
    (data) => {
      const newEntry = ensureEntityMetadata({
        id: `tt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        courseCode: data.courseCode?.trim() || 'GEN 1000',
        courseName: data.courseName?.trim() || data.courseCode?.trim() || 'Course',
        section: data.section?.trim() || '',
        activityType: data.activityType || 'lecture',
        dayOfWeek: data.dayOfWeek || 'Monday',
        startTime: data.startTime || '10:00',
        endTime: data.endTime || '11:20',
        location: data.location?.trim() || '',
        instructor: data.instructor?.trim() || '',
        term: data.term || 'Fall 2026',
        color: data.color || '#3b82f6',
        createdAt: new Date().toISOString(),
      });
      setTimetable((prev) => [...prev, newEntry]);
      enqueueMutation(userId, {
        entity: 'timetable',
        action: 'upsert',
        clientId: newEntry.id,
        data: newEntry,
      });
      addToast(`Class "${newEntry.courseCode}" added to timetable.`, 'success');
      return newEntry;
    },
    [userId, addToast]
  );

  const updateTimetableEntry = useCallback(
    (id, updatedData) => {
      let updatedObj = null;
      setTimetable((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            updatedObj = ensureEntityMetadata({
              ...item,
              ...updatedData,
              version: (item.version || 1) + 1,
            });
            return updatedObj;
          }
          return item;
        })
      );
      if (updatedObj) {
        enqueueMutation(userId, {
          entity: 'timetable',
          action: 'upsert',
          clientId: id,
          data: updatedObj,
        });
        addToast('Timetable class updated.', 'success');
      }
    },
    [userId, addToast]
  );

  const deleteTimetableEntry = useCallback(
    (id) => {
      setTimetable((prev) => prev.filter((item) => item.id !== id));
      enqueueMutation(userId, {
        entity: 'timetable',
        action: 'delete',
        clientId: id,
      });
      addToast('Timetable class removed.', 'info');
    },
    [userId, addToast]
  );

  const importTimetableEntries = useCallback(
    (newEntries = [], replaceExisting = false) => {
      if (replaceExisting) {
        timetable.forEach((e) => {
          enqueueMutation(userId, {
            entity: 'timetable',
            action: 'delete',
            clientId: e.id,
          });
        });
      }
      const prepared = newEntries.map((e) =>
        ensureEntityMetadata({
          ...e,
          id: e.id || `tt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          createdAt: new Date().toISOString(),
        })
      );
      setTimetable((prev) => (replaceExisting ? prepared : [...prev, ...prepared]));
      prepared.forEach((e) => {
        enqueueMutation(userId, {
          entity: 'timetable',
          action: 'upsert',
          clientId: e.id,
          data: e,
        });
      });
      addToast(`Imported ${prepared.length} class(es) into your timetable.`, 'success');
    },
    [timetable, userId, addToast]
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
        timetable,
        transitionBufferMinutes,
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

      const planWithMeta = (result.plan || []).map(ensureEntityMetadata);
      setStudyPlan(planWithMeta);
      setInsights(result.insights);
      setTimetableConflicts(result.timetableConflicts || []);

      if (userId) {
        planWithMeta.forEach((s) => {
          enqueueMutation(userId, {
            entity: 'studyPlan',
            action: 'upsert',
            clientId: s.id,
            data: s,
          });
        });
        if (result.insights) {
          enqueueMutation(userId, {
            entity: 'studyInsights',
            action: 'upsert',
            clientId: userId,
            data: result.insights,
          });
        }
      }

      if (emergencyExamMode) {
        addToast('⚡ Emergency Exam Prep plan generated with intensive mock review blocks!', 'warning', 7000);
      } else if (result.timetableConflicts && result.timetableConflicts.length > 0) {
        addToast(
          `Study plan calibrated! Notice: ${result.timetableConflicts.length} study slot(s) conflicted with scheduled classes and were automatically buffered around them.`,
          'info',
          7000
        );
      } else if (result.insights?.hasImpossibleSchedule) {
        addToast(
          'Plan generated with warnings: some deliverables exceed your available study hours.',
          'warning',
          7000
        );
      } else {
        addToast('Adaptive study plan generated with concrete action steps!', 'success');
      }

      return { success: true, plan: planWithMeta, insights: result.insights, timetableConflicts: result.timetableConflicts };
    },
    [
      courses,
      assignments,
      exams,
      availability,
      timetable,
      transitionBufferMinutes,
      syllabusTopics,
      studyPlan,
      checkIns,
      adaptiveSignals,
      emergencyExamMode,
      userId,
      addToast,
    ]
  );

  const toggleSessionCompleted = useCallback(
    (sessionId) => {
      setStudyPlan((prev) =>
        prev.map((s) => {
          if (s.id === sessionId) {
            const nextCompleted = !s.completed;
            const updated = ensureEntityMetadata({
              ...s,
              completed: nextCompleted,
              version: (s.version || 1) + 1,
            });
            enqueueMutation(userId, {
              entity: 'studyPlan',
              action: 'upsert',
              clientId: sessionId,
              data: updated,
            });
            return updated;
          }
          return s;
        })
      );
    },
    [userId]
  );

  const clearPlan = useCallback(() => {
    studyPlan.forEach((s) => {
      enqueueMutation(userId, {
        entity: 'studyPlan',
        action: 'delete',
        clientId: s.id,
      });
    });
    setStudyPlan([]);
    setInsights(null);
    addToast('Study plan cleared.', 'info');
  }, [studyPlan, userId, addToast]);

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

  // --- Intelligent Syllabus Import Semester Setup with Duplicate Protection & Merging ---
  const importSemesterFromSyllabi = useCallback(
    ({ courses: newCoursesList = [], replaceExisting = false }) => {
      let baseCourses = replaceExisting ? [] : [...courses];
      let baseTopics = replaceExisting ? [] : [...syllabusTopics];
      let baseAssignments = replaceExisting ? [] : [...assignments];
      let baseExams = replaceExisting ? [] : [...exams];

      let addedCourseCount = 0;
      let updatedCourseCount = 0;
      let addedTopicCount = 0;
      let addedAssignmentCount = 0;
      let addedExamCount = 0;

      newCoursesList.forEach((imported, idx) => {
        // Check if course already exists (exact hash match or normalized code/term match)
        const dupCheck = !replaceExisting
          ? detectSyllabusDuplicate({
              incomingCourse: imported,
              existingCourses: baseCourses,
              fileHash: imported.contentHash || imported.syllabusFileHash,
              existingCollections: {
                topics: baseTopics,
                assignments: baseAssignments,
                exams: baseExams,
              },
            })
          : { isDuplicate: false };

        const strategy = imported.importStrategy || (dupCheck.isDuplicate ? 'merge' : 'new');

        if (dupCheck.isDuplicate && strategy === 'cancel') {
          return; // Skipped by student
        }

        if (dupCheck.isDuplicate && (strategy === 'merge' || strategy === 'update')) {
          // Safe, non-destructive merge that preserves student progress and completed tasks
          const mergeResult = mergeSyllabusCourse({
            existingCourse: dupCheck.existingCourse,
            incomingCourse: imported,
            strategy,
            existingTopics: baseTopics,
            existingAssignments: baseAssignments,
            existingExams: baseExams,
            fileHash: imported.contentHash || imported.syllabusFileHash,
          });

          if (mergeResult.success) {
            // Update existing course in baseCourses
            baseCourses = baseCourses.map((c) =>
              c.id === mergeResult.updatedCourse.id ? ensureEntityMetadata(mergeResult.updatedCourse) : c
            );
            enqueueMutation(userId, {
              entity: 'courses',
              action: 'upsert',
              clientId: mergeResult.updatedCourse.id,
              data: mergeResult.updatedCourse,
            });
            updatedCourseCount++;

            // Append newly discovered topics
            mergeResult.addedTopics.forEach((t) => {
              const topicObj = ensureEntityMetadata(t);
              baseTopics.push(topicObj);
              enqueueMutation(userId, {
                entity: 'syllabusTopics',
                action: 'upsert',
                clientId: topicObj.id,
                data: topicObj,
              });
              addedTopicCount++;
            });

            // Append newly discovered assignments (while preserving existing completed tasks)
            mergeResult.addedAssignments.forEach((a) => {
              const asgObj = ensureEntityMetadata(a);
              baseAssignments.push(asgObj);
              enqueueMutation(userId, {
                entity: 'assignments',
                action: 'upsert',
                clientId: asgObj.id,
                data: asgObj,
              });
              addedAssignmentCount++;
            });

            // Append newly discovered exams
            mergeResult.addedExams.forEach((e) => {
              const examObj = ensureEntityMetadata(e);
              baseExams.push(examObj);
              enqueueMutation(userId, {
                entity: 'exams',
                action: 'upsert',
                clientId: examObj.id,
                data: examObj,
              });
              addedExamCount++;
            });
          }
        } else {
          // Genuinely new course
          const courseId = Date.now() + idx + Math.floor(Math.random() * 1000);
          const courseObj = ensureEntityMetadata({
            id: courseId,
            name: imported.name || imported.courseCode || `Course ${idx + 1}`,
            instructor: imported.instructor || '',
            schedule: imported.schedule || '',
            credits: imported.credits || '3.0',
            difficulty: imported.difficulty || 'Medium',
            color: imported.color || IMPORT_PRESET_COLORS[idx % IMPORT_PRESET_COLORS.length],
            term: imported.term || 'Fall',
            year: imported.year || new Date().getFullYear(),
            institution: imported.institution || '',
            syllabusFileHash: imported.contentHash || null,
            createdAt: new Date().toISOString(),
            gradingScheme: imported.gradingScheme || [],
          });
          baseCourses.push(courseObj);
          enqueueMutation(userId, {
            entity: 'courses',
            action: 'upsert',
            clientId: courseObj.id,
            data: courseObj,
          });
          addedCourseCount++;

          // Add weekly topics
          if (imported.topics && imported.topics.length > 0) {
            imported.topics.forEach((t, tIdx) => {
              const topicObj = ensureEntityMetadata({
                id: `topic-${Date.now()}-${idx}-${tIdx}`,
                courseId: courseId,
                courseName: courseObj.name,
                weekNumber: Number(t.weekNumber) || tIdx + 1,
                title: t.title?.trim() || `Week ${tIdx + 1} Lecture`,
                description: t.description?.trim() || '',
                requiredReadings: t.requiredReadings?.trim() || '',
                practiceProblems: t.practiceProblems?.trim() || '',
                estimatedHours: Number(t.estimatedHours) || 3.0,
                prerequisiteTopicIds: [],
                status: 'not_started',
                confidence: 3,
                lastUpdated: new Date().toISOString(),
              });
              baseTopics.push(topicObj);
              enqueueMutation(userId, {
                entity: 'syllabusTopics',
                action: 'upsert',
                clientId: topicObj.id,
                data: topicObj,
              });
              addedTopicCount++;
            });
          }

          // Add assignments
          if (imported.assignments && imported.assignments.length > 0) {
            imported.assignments.forEach((a, aIdx) => {
              const asgObj = ensureEntityMetadata({
                id: `asg-${Date.now()}-${idx}-${aIdx}`,
                title: a.title?.trim() || a.originalName || `Assignment ${aIdx + 1}`,
                originalName: a.originalName || a.title?.trim() || `Assignment ${aIdx + 1}`,
                course: courseObj.name,
                dueDate: a.dueDate || '',
                dueTime: a.dueTime || '23:59',
                priority: a.priority || (a.weightPercent && a.weightPercent >= 15 ? 'High' : 'Medium'),
                estimatedWorkload: a.estimatedWorkload || (a.weightPercent && a.weightPercent >= 15 ? 6 : 4),
                weightPercent: a.weightPercent || null,
                completed: false,
                createdAt: new Date().toISOString(),
              });
              baseAssignments.push(asgObj);
              enqueueMutation(userId, {
                entity: 'assignments',
                action: 'upsert',
                clientId: asgObj.id,
                data: asgObj,
              });
              addedAssignmentCount++;
            });
          }

          // Add exams
          if (imported.exams && imported.exams.length > 0) {
            imported.exams.forEach((e, eIdx) => {
              const examObj = ensureEntityMetadata({
                id: `exam-${Date.now()}-${idx}-${eIdx}`,
                title: e.title?.trim() || e.originalName || 'Exam',
                originalName: e.originalName || e.title?.trim() || 'Exam',
                course: courseObj.name,
                date: e.date || '',
                time: e.time || '',
                location: e.location?.trim() || '',
                notes: e.notes || (e.weightPercent ? `Grading weight: ${e.weightPercent}%` : ''),
                priority: 'High',
                estimatedWorkload: e.estimatedWorkload || 8,
                weightPercent: e.weightPercent || null,
                createdAt: new Date().toISOString(),
              });
              baseExams.push(examObj);
              enqueueMutation(userId, {
                entity: 'exams',
                action: 'upsert',
                clientId: examObj.id,
                data: examObj,
              });
              addedExamCount++;
            });
          }
        }
      });

      setCourses(baseCourses);
      setSyllabusTopics(baseTopics);
      setAssignments(baseAssignments);
      setExams(baseExams);

      const msg = updatedCourseCount > 0
        ? `✨ Semester updated: merged into ${updatedCourseCount} course(s), added ${addedTopicCount} new topics, ${addedAssignmentCount} assignments, ${addedExamCount} exams. Existing progress preserved!`
        : `🎉 Semester configured! Added ${addedCourseCount} course(s), ${addedTopicCount} syllabus topics, ${addedAssignmentCount} assignments, and ${addedExamCount} exams.`;

      addToast(msg, 'success', 7000);

      return {
        success: true,
        addedCourseCount,
        updatedCourseCount,
        addedTopicCount,
        addedAssignmentCount,
        addedExamCount,
      };
    },
    [courses, syllabusTopics, assignments, exams, userId, addToast]
  );

  // --- Global Backup & Demo Operations ---
  const handleLoadScenario = useCallback(
    (scenarioType = 'consistent') => {
      const data = loadScenarioData(scenarioType);
      setCourses(data.courses);
      setAssignments(data.assignments);
      setExams(data.exams);
      setAvailability(data.availability);
      setStudentProfile(data.profile);
      setSyllabusTopics(data.topics);
      setCheckIns(data.checkIns);
      setAdaptiveSignals(data.adaptiveSignals);

      const missedTopics = identifyMissedTopicsForRescheduling(data.checkIns, data.topics);
      const missedIds = missedTopics.map((t) => t.id);
      const planResult = generateStudyPlan({
        courses: data.courses,
        assignments: data.assignments,
        exams: data.exams,
        availability: data.availability,
        syllabusTopics: data.topics,
        existingPlan: [],
        preserveCompleted: false,
        adaptiveSignals: data.adaptiveSignals,
        missedTopicIds: missedIds,
        emergencyExamMode: false,
      });

      if (planResult && planResult.plan) {
        setStudyPlan(planResult.plan);
        setInsights(planResult.insights || null);
      } else {
        setStudyPlan([]);
        setInsights(null);
      }

      const personaLabel =
        scenarioType === 'delayed'
          ? 'Jordan Taylor (Delayed Student — +30% Buffer Pace, Exam Alerts)'
          : 'Alex Chen (Consistent Student — Balanced Pace, High Readiness)';
      addToast(`Loaded Persona: ${personaLabel}`, 'success', 6000);
    },
    [addToast]
  );

  const handleLoadDemo = useCallback(() => {
    handleLoadScenario('consistent');
  }, [handleLoadScenario]);

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
        setCourses(safeGetScopedItem(STORAGE_KEYS.COURSES, [], userId));
        setAssignments(safeGetScopedItem(STORAGE_KEYS.ASSIGNMENTS, [], userId));
        setExams(safeGetScopedItem(STORAGE_KEYS.EXAMS, [], userId));
        setAvailability(safeGetScopedItem(STORAGE_KEYS.AVAILABILITY, [], userId));
        setStudentProfile(safeGetScopedItem(STORAGE_KEYS.STUDENT_PROFILE, getDefaultStudentProfile(), userId));
        setSyllabusTopics(safeGetScopedItem(STORAGE_KEYS.SYLLABUS_TOPICS, [], userId));
        setCheckIns(safeGetScopedItem(STORAGE_KEYS.CHECK_INS, [], userId));
        setAdaptiveSignals(safeGetScopedItem(STORAGE_KEYS.ADAPTIVE_SIGNALS, getDefaultAdaptiveSignals(), userId));
        setStudyPlan(safeGetScopedItem(STORAGE_KEYS.STUDY_PLAN, [], userId));
        setInsights(safeGetScopedItem(STORAGE_KEYS.STUDY_INSIGHTS, null, userId));
        addToast(result.message, 'success');
        return true;
      } else {
        addToast(result.message, 'error', 6000);
        return false;
      }
    },
    [userId, addToast]
  );

  const handleMigrationComplete = useCallback(
    () => {
      if (userId) {
        pullCloudData(userId).then((cloudData) => {
          if (cloudData) {
            if (cloudData.courses) setCourses(cloudData.courses);
            if (cloudData.syllabusTopics) setSyllabusTopics(cloudData.syllabusTopics);
            if (cloudData.assignments) setAssignments(cloudData.assignments);
            if (cloudData.exams) setExams(cloudData.exams);
            if (cloudData.availability) setAvailability(cloudData.availability);
            if (cloudData.checkIns) setCheckIns(cloudData.checkIns);
            if (cloudData.adaptiveSignals) setAdaptiveSignals(cloudData.adaptiveSignals);
            if (cloudData.studentProfile) setStudentProfile(cloudData.studentProfile);
          }
        });
      }
      addToast('Local data migration confirmed and synced to cloud!', 'success', 5000);
    },
    [userId, addToast]
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
      syncStatus,
      syncConflict,
      flushSync: () => flushPendingQueue(userId),
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
      loadScenario: handleLoadScenario,
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
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      isMigrationModalOpen,
      openMigrationModal,
      closeMigrationModal,
      handleMigrationComplete,
      // Bilingual i18n (Phase 4)
      language,
      changeLanguage,
      t,
      // Timetable & Transition Buffer (Phase 4)
      timetable,
      transitionBufferMinutes,
      setTransitionBufferMinutes,
      timetableConflicts,
      addTimetableEntry,
      updateTimetableEntry,
      deleteTimetableEntry,
      importTimetableEntries,
      exportData: exportAllData,
      importData: handleImportBackup,
      importSemesterFromSyllabi,
    }),
    [
      language,
      changeLanguage,
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
      syncStatus,
      syncConflict,
      userId,
      isCheckInModalOpen,
      openCheckInModal,
      closeCheckInModal,
      isProfileModalOpen,
      openProfileModal,
      closeProfileModal,
      isOnboardingModalOpen,
      openOnboardingModal,
      closeOnboardingModal,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      isMigrationModalOpen,
      openMigrationModal,
      closeMigrationModal,
      handleMigrationComplete,
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
      handleLoadScenario,
      handleClearAll,
      handleImportBackup,
      importSemesterFromSyllabi,
      timetable,
      transitionBufferMinutes,
      timetableConflicts,
      addTimetableEntry,
      updateTimetableEntry,
      deleteTimetableEntry,
      importTimetableEntries,
    ]
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export default AppProvider;
