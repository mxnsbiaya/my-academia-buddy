/**
 * Cloud Synchronization & Offline Persistence Service
 * Enforces versioned updates, offline queues preserved across refreshes,
 * conflict detection, and real-time sync status reporting.
 */
import { getSupabase, isSupabaseConfigured } from './supabase';
import { safeGetItem, safeSetItem } from './storage';

export const SYNC_STATUS = {
  SYNCED: 'synced',
  SYNCING: 'syncing',
  OFFLINE: 'offline',
  LOCAL_ONLY: 'local_only',
  CONFLICT: 'conflict',
  ERROR: 'error',
};

const SYNC_QUEUE_KEY_PREFIX = 'mab_pending_sync_';
const SYNC_LAST_PULL_KEY_PREFIX = 'mab_last_pull_';

let currentStatus = isSupabaseConfigured() ? SYNC_STATUS.SYNCED : SYNC_STATUS.LOCAL_ONLY;
const statusListeners = new Set();
let activeConflict = null;

/**
 * Register a listener for sync status updates
 * @param {(status: string, conflict: object|null) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function subscribeSyncStatus(callback) {
  statusListeners.add(callback);
  callback(currentStatus, activeConflict);
  return () => {
    statusListeners.delete(callback);
  };
}

function setSyncStatus(status, conflict = null) {
  currentStatus = status;
  activeConflict = conflict;
  statusListeners.forEach((fn) => {
    try {
      fn(status, conflict);
    } catch (e) {
      console.error('[syncService] Error notifying sync listener:', e);
    }
  });
}

export function getSyncStatus() {
  return { status: currentStatus, conflict: activeConflict };
}

/**
 * Returns the offline sync queue key for a given user
 * @param {string} userId
 */
function getQueueKey(userId) {
  return `${SYNC_QUEUE_KEY_PREFIX}${userId}`;
}

/**
 * Retrieves pending offline mutations for a user
 * @param {string} userId
 * @returns {Array}
 */
export function getPendingQueue(userId) {
  if (!userId) return [];
  return safeGetItem(getQueueKey(userId), []);
}

/**
 * Enqueues a mutation to be synchronized to Supabase
 * @param {string} userId
 * @param {{ entity: string, action: 'upsert'|'delete', clientId: string|number, data?: any }} mutation
 */
export function enqueueMutation(userId, mutation) {
  if (!userId) return;

  const queue = getPendingQueue(userId);
  const now = new Date().toISOString();
  const entry = {
    id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...mutation,
    clientId: String(mutation.clientId),
    queuedAt: now,
  };

  // Coalesce / deduplicate consecutive mutations on the same entity & client_id
  const filtered = queue.filter(
    (m) => !(m.entity === mutation.entity && String(m.clientId) === String(mutation.clientId))
  );
  filtered.push(entry);

  safeSetItem(getQueueKey(userId), filtered);

  if (!navigator.onLine) {
    setSyncStatus(SYNC_STATUS.OFFLINE);
  } else if (!isSupabaseConfigured()) {
    setSyncStatus(SYNC_STATUS.LOCAL_ONLY);
  } else {
    // Attempt background sync
    triggerDebouncedFlush(userId);
  }
}

let flushTimeout = null;
function triggerDebouncedFlush(userId) {
  if (flushTimeout) clearTimeout(flushTimeout);
  flushTimeout = setTimeout(() => {
    flushPendingQueue(userId).catch((err) => {
      console.warn('[syncService] Background flush failed:', err);
    });
  }, 350);
}

/**
 * Table name mapping from frontend entity to Supabase table
 */
export const ENTITY_TABLE_MAP = {
  courses: 'courses',
  syllabusTopics: 'syllabus_topics',
  assignments: 'assignments',
  exams: 'exams',
  availability: 'availability_slots',
  checkIns: 'check_ins',
  adaptiveSignals: 'adaptive_signals',
  studyPlan: 'study_sessions',
  studyInsights: 'study_insights',
  studentProfile: 'profiles',
  timetable: 'timetable_entries',
};

/**
 * Converts frontend domain model into Supabase database record
 */
export function toDatabaseRow(entity, item, userId) {
  const version = typeof item.version === 'number' ? item.version : 1;
  const clientUpdatedAt = item.client_updated_at || new Date().toISOString();

  switch (entity) {
    case 'courses':
      return {
        user_id: userId,
        client_id: String(item.id),
        name: item.name,
        instructor: item.instructor || '',
        schedule: item.schedule || '',
        credits: String(item.credits || '3.0'),
        difficulty: item.difficulty || 'Medium',
        color: item.color || '#3b82f6',
        grading_scheme: item.gradingScheme || [],
        version,
        client_updated_at: clientUpdatedAt,
      };

    case 'syllabusTopics':
      return {
        user_id: userId,
        client_id: String(item.id),
        course_client_id: String(item.courseId),
        course_name: item.courseName || '',
        week_number: Number(item.weekNumber || item.week || 1),
        title: item.title,
        description: item.description || '',
        required_readings: item.requiredReadings || '',
        practice_problems: item.practiceProblems || '',
        estimated_hours: Number(item.estimatedHours || 3.0),
        prerequisite_topic_ids: item.prerequisiteTopicIds || [],
        status: item.status || 'not_started',
        confidence: Number(item.confidence || 3),
        version,
        client_updated_at: clientUpdatedAt,
      };

    case 'assignments':
      return {
        user_id: userId,
        client_id: String(item.id),
        course: item.course || '',
        title: item.title,
        due_date: item.dueDate || '',
        priority: item.priority || 'Medium',
        estimated_workload: Number(item.estimatedWorkload || 3),
        weight_percent: item.weightPercent ?? null,
        completed: Boolean(item.completed),
        version,
        client_updated_at: clientUpdatedAt,
      };

    case 'exams':
      return {
        user_id: userId,
        client_id: String(item.id),
        course: item.course || '',
        title: item.title,
        date: item.date || '',
        location: item.location || '',
        notes: item.notes || '',
        priority: item.priority || 'High',
        estimated_workload: Number(item.estimatedWorkload || 5),
        weight_percent: item.weightPercent ?? null,
        version,
        client_updated_at: clientUpdatedAt,
      };

    case 'availability':
      return {
        user_id: userId,
        client_id: String(item.id),
        day: item.day,
        start_time: item.startTime,
        end_time: item.endTime,
        warning: item.warning || '',
        version,
        client_updated_at: clientUpdatedAt,
      };

    case 'checkIns':
      return {
        user_id: userId,
        client_id: String(item.id),
        week_number: Number(item.weekNumber || 1),
        date: item.date || new Date().toISOString(),
        responses: item.responses || [],
        new_commitments_noted: item.newCommitmentsNoted || '',
        completed_at: item.completedAt || new Date().toISOString(),
        version,
        client_updated_at: clientUpdatedAt,
      };

    case 'adaptiveSignals':
      return {
        user_id: userId,
        completion_rate: Number(item.completionRate || 100),
        pace_multiplier: Number(item.paceMultiplier || 1.0),
        missed_sessions_count: Number(item.missedSessionsCount || 0),
        postponement_count: Number(item.postponementCount || 0),
        preferred_session_duration: Number(item.preferredSessionDuration || 60),
        observed_velocity_by_course: item.observedVelocityByCourse || {},
        last_recalibration_date: item.lastRecalibrationDate || new Date().toISOString(),
        coach_insight: item.coachInsight || '',
        version,
        client_updated_at: clientUpdatedAt,
      };

    case 'studyPlan':
      return {
        user_id: userId,
        client_id: String(item.id),
        day: item.day || '',
        date: item.date || '',
        time: item.time || '',
        start_time: item.startTime || '',
        end_time: item.endTime || '',
        duration: Number(item.duration || 1),
        type: item.type || 'Task',
        title: item.title || '',
        course: item.course || '',
        details: item.details || '',
        completed: Boolean(item.completed),
        micro_steps: item.microSteps || [],
        priority: item.priority || 'Medium',
        topic_id: item.topicId ? String(item.topicId) : null,
        assignment_id: item.assignmentId ? String(item.assignmentId) : null,
        exam_id: item.examId ? String(item.examId) : null,
        version,
        client_updated_at: clientUpdatedAt,
      };

    case 'studyInsights':
      return {
        user_id: userId,
        insights_data: item || {},
        version,
        client_updated_at: clientUpdatedAt,
      };

    case 'studentProfile':
      return {
        id: userId,
        full_name: item.name || '',
        program: item.program || 'Computer Science',
        semester: item.semester || 'Undergraduate',
        organization_level: item.organizationLevel || 'Building Habits',
        academic_goal: item.academicGoal || '',
        weekly_work_hours: Number(item.weeklyWorkHours || 10),
        work_schedule_summary: item.workScheduleSummary || '',
        weekly_study_goal_hours: Number(item.weeklyStudyGoalHours || 18),
        preferred_language: item.preferredLanguage || 'en',
        preferred_study_periods: item.preferredStudyPeriods || ['afternoon', 'evening'],
        recurring_commitments: item.recurringCommitments || [],
        onboarding_completed: Boolean(item.onboardingCompleted),
        version,
        client_updated_at: clientUpdatedAt,
      };

    case 'timetable':
      return {
        user_id: userId,
        client_id: String(item.id),
        course_code: item.courseCode || '',
        course_name: item.courseName || '',
        section: item.section || '',
        activity_type: item.activityType || 'lecture',
        day_of_week: item.dayOfWeek || 'Monday',
        start_time: item.startTime,
        end_time: item.endTime,
        location: item.location || '',
        instructor: item.instructor || '',
        term: item.term || 'Fall 2026',
        color: item.color || '#3b82f6',
        version,
        client_updated_at: clientUpdatedAt,
      };

    default:
      throw new Error(`[syncService] Unknown entity type "${entity}"`);
  }
}

/**
 * Converts Supabase database row back into frontend domain model
 */
export function fromDatabaseRow(entity, row) {
  if (!row) return null;

  switch (entity) {
    case 'courses':
      return {
        id: isNaN(Number(row.client_id)) ? row.client_id : Number(row.client_id),
        name: row.name,
        instructor: row.instructor || '',
        schedule: row.schedule || '',
        credits: row.credits || '3.0',
        difficulty: row.difficulty || 'Medium',
        color: row.color || '#3b82f6',
        gradingScheme: row.grading_scheme || [],
        version: row.version || 1,
        client_updated_at: row.client_updated_at || row.updated_at,
        createdAt: row.created_at,
      };

    case 'syllabusTopics':
      return {
        id: row.client_id,
        courseId: isNaN(Number(row.course_client_id)) ? row.course_client_id : Number(row.course_client_id),
        courseName: row.course_name,
        weekNumber: row.week_number,
        week: row.week_number,
        title: row.title,
        description: row.description || '',
        requiredReadings: row.required_readings || '',
        practiceProblems: row.practice_problems || '',
        estimatedHours: Number(row.estimated_hours || 3.0),
        prerequisiteTopicIds: row.prerequisite_topic_ids || [],
        status: row.status || 'not_started',
        confidence: row.confidence || 3,
        version: row.version || 1,
        client_updated_at: row.client_updated_at || row.updated_at,
        lastUpdated: row.updated_at,
      };

    case 'assignments':
      return {
        id: isNaN(Number(row.client_id)) ? row.client_id : Number(row.client_id),
        course: row.course,
        title: row.title,
        dueDate: row.due_date || '',
        priority: row.priority || 'Medium',
        estimatedWorkload: Number(row.estimated_workload || 3),
        weightPercent: row.weight_percent,
        completed: Boolean(row.completed),
        version: row.version || 1,
        client_updated_at: row.client_updated_at || row.updated_at,
        createdAt: row.created_at,
      };

    case 'exams':
      return {
        id: isNaN(Number(row.client_id)) ? row.client_id : Number(row.client_id),
        course: row.course,
        title: row.title,
        date: row.date || '',
        location: row.location || '',
        notes: row.notes || '',
        priority: row.priority || 'High',
        estimatedWorkload: Number(row.estimated_workload || 5),
        weightPercent: row.weight_percent,
        version: row.version || 1,
        client_updated_at: row.client_updated_at || row.updated_at,
        createdAt: row.created_at,
      };

    case 'availability':
      return {
        id: isNaN(Number(row.client_id)) ? row.client_id : Number(row.client_id),
        day: row.day,
        startTime: row.start_time,
        endTime: row.end_time,
        warning: row.warning || '',
        version: row.version || 1,
        client_updated_at: row.client_updated_at || row.updated_at,
      };

    case 'checkIns':
      return {
        id: row.client_id,
        weekNumber: row.week_number,
        date: row.date,
        responses: row.responses || [],
        newCommitmentsNoted: row.new_commitments_noted || '',
        completedAt: row.completed_at,
        version: row.version || 1,
        client_updated_at: row.client_updated_at || row.updated_at,
      };

    case 'adaptiveSignals':
      return {
        completionRate: Number(row.completion_rate ?? 100),
        paceMultiplier: Number(row.pace_multiplier ?? 1.0),
        missedSessionsCount: Number(row.missed_sessions_count ?? 0),
        postponementCount: Number(row.postponement_count ?? 0),
        preferredSessionDuration: Number(row.preferred_session_duration ?? 60),
        observedVelocityByCourse: row.observed_velocity_by_course || {},
        lastRecalibrationDate: row.last_recalibration_date || new Date().toISOString(),
        coachInsight: row.coach_insight || '',
        version: row.version || 1,
        client_updated_at: row.client_updated_at || row.updated_at,
      };

    case 'studyPlan':
      return {
        id: row.client_id,
        day: row.day || '',
        date: row.date || '',
        time: row.time || '',
        startTime: row.start_time || '',
        endTime: row.end_time || '',
        duration: Number(row.duration || 1),
        type: row.type || 'Task',
        title: row.title || '',
        course: row.course || '',
        details: row.details || '',
        completed: Boolean(row.completed),
        microSteps: row.micro_steps || [],
        priority: row.priority || 'Medium',
        topicId: row.topic_id,
        assignmentId: row.assignment_id,
        examId: row.exam_id,
        version: row.version || 1,
        client_updated_at: row.client_updated_at || row.updated_at,
      };

    case 'studyInsights':
      return row.insights_data || null;

    case 'studentProfile':
      return {
        name: row.full_name || '',
        program: row.program || 'Computer Science',
        semester: row.semester || 'Undergraduate',
        organizationLevel: row.organization_level || 'Building Habits',
        academicGoal: row.academic_goal || '',
        weeklyWorkHours: Number(row.weekly_work_hours || 10),
        workScheduleSummary: row.work_schedule_summary || '',
        weeklyStudyGoalHours: Number(row.weekly_study_goal_hours || 18),
        preferredLanguage: row.preferred_language || 'en',
        preferredStudyPeriods: row.preferred_study_periods || ['afternoon', 'evening'],
        recurringCommitments: row.recurring_commitments || [],
        onboardingCompleted: Boolean(row.onboarding_completed),
        version: row.version || 1,
        client_updated_at: row.client_updated_at || row.updated_at,
      };

    case 'timetable':
      return {
        id: row.client_id,
        courseCode: row.course_code,
        courseName: row.course_name,
        section: row.section || '',
        activityType: row.activity_type || 'lecture',
        dayOfWeek: row.day_of_week,
        startTime: row.start_time,
        endTime: row.end_time,
        location: row.location || '',
        instructor: row.instructor || '',
        term: row.term || 'Fall 2026',
        color: row.color || '#3b82f6',
        version: row.version || 1,
        client_updated_at: row.client_updated_at || row.updated_at,
      };

    default:
      return row;
  }
}

/**
 * Flushes all pending mutations for a user with conflict detection and version check
 * @param {string} userId
 */
export async function flushPendingQueue(userId) {
  if (!userId) return { success: true, count: 0 };

  if (!navigator.onLine) {
    setSyncStatus(SYNC_STATUS.OFFLINE);
    return { success: false, reason: 'offline' };
  }

  if (!isSupabaseConfigured()) {
    setSyncStatus(SYNC_STATUS.LOCAL_ONLY);
    return { success: false, reason: 'unconfigured' };
  }

  const supabase = getSupabase();
  if (!supabase) return { success: false, reason: 'no_client' };

  const queue = getPendingQueue(userId);
  if (queue.length === 0) {
    setSyncStatus(SYNC_STATUS.SYNCED);
    return { success: true, count: 0 };
  }

  setSyncStatus(SYNC_STATUS.SYNCING);

  const remainingQueue = [...queue];
  let processedCount = 0;

  for (const mutation of queue) {
    const table = ENTITY_TABLE_MAP[mutation.entity];
    if (!table) {
      remainingQueue.shift();
      continue;
    }

    try {
      if (mutation.action === 'delete') {
        const { error } = await supabase
          .from(table)
          .delete()
          .match({ user_id: userId, client_id: mutation.clientId });

        if (error) throw error;
      } else {
        // Upsert operation
        const row = toDatabaseRow(mutation.entity, mutation.data, userId);

        // Fetch remote record first to verify version conflict
        let remoteQuery = supabase.from(table).select('version, client_updated_at, updated_at');
        if (table === 'profiles') {
          remoteQuery = remoteQuery.eq('id', userId);
        } else if (table === 'adaptive_signals' || table === 'study_insights') {
          remoteQuery = remoteQuery.eq('user_id', userId);
        } else {
          remoteQuery = remoteQuery.match({ user_id: userId, client_id: mutation.clientId });
        }

        const { data: remoteData, error: fetchErr } = await remoteQuery.maybeSingle();

        if (!fetchErr && remoteData) {
          const remoteVersion = remoteData.version || 1;
          const localVersion = row.version || 1;

          // Detect true conflict: Remote has advanced beyond the local base version
          if (remoteVersion > localVersion) {
            console.warn(
              `[syncService] Conflict detected on ${mutation.entity} (${mutation.clientId}). Remote v${remoteVersion} > Local v${localVersion}`
            );
            setSyncStatus(SYNC_STATUS.CONFLICT, {
              entity: mutation.entity,
              clientId: mutation.clientId,
              localVersion,
              remoteVersion,
            });
            // Stop processing this conflicting mutation to prevent silent overwrite
            continue;
          }
        }

        // Increment version on write
        row.version = (row.version || 1) + 1;

        let upsertQuery;
        if (table === 'profiles') {
          upsertQuery = supabase.from(table).upsert(row, { onConflict: 'id' });
        } else if (table === 'adaptive_signals' || table === 'study_insights') {
          upsertQuery = supabase.from(table).upsert(row, { onConflict: 'user_id' });
        } else {
          upsertQuery = supabase.from(table).upsert(row, { onConflict: 'user_id, client_id' });
        }

        const { error: upsertErr } = await upsertQuery;
        if (upsertErr) throw upsertErr;
      }

      // Successful write, remove from queue
      const idx = remainingQueue.findIndex((m) => m.id === mutation.id);
      if (idx !== -1) remainingQueue.splice(idx, 1);
      processedCount++;
    } catch (err) {
      console.error(`[syncService] Failed to sync mutation for ${mutation.entity}:`, err);
      setSyncStatus(SYNC_STATUS.ERROR);
      // Persist what couldn't be synced so it survives refreshes
      safeSetItem(getQueueKey(userId), remainingQueue);
      return { success: false, error: err, processedCount };
    }
  }

  // Update persisted queue
  safeSetItem(getQueueKey(userId), remainingQueue);

  if (remainingQueue.length === 0) {
    setSyncStatus(SYNC_STATUS.SYNCED);
  }

  return { success: true, processedCount };
}

/**
 * Pulls all cloud data for a user and merges safely with local cache
 * @param {string} userId
 */
export async function pullCloudData(userId) {
  if (!userId || !isSupabaseConfigured() || !navigator.onLine) {
    return null;
  }

  const supabase = getSupabase();
  if (!supabase) return null;

  setSyncStatus(SYNC_STATUS.SYNCING);

  try {
    const [
      coursesRes,
      topicsRes,
      assignmentsRes,
      examsRes,
      availabilityRes,
      checkInsRes,
      signalsRes,
      studyPlanRes,
      insightsRes,
      profileRes,
      timetableRes,
    ] = await Promise.all([
      supabase.from('courses').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('syllabus_topics').select('*').eq('user_id', userId).order('week_number', { ascending: true }),
      supabase.from('assignments').select('*').eq('user_id', userId).order('due_date', { ascending: true }),
      supabase.from('exams').select('*').eq('user_id', userId).order('date', { ascending: true }),
      supabase.from('availability_slots').select('*').eq('user_id', userId),
      supabase.from('check_ins').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('adaptive_signals').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('study_sessions').select('*').eq('user_id', userId),
      supabase.from('study_insights').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('timetable_entries').select('*').eq('user_id', userId).order('day_of_week', { ascending: true }),
    ]);

    const result = {
      courses: (coursesRes.data || []).map((r) => fromDatabaseRow('courses', r)),
      syllabusTopics: (topicsRes.data || []).map((r) => fromDatabaseRow('syllabusTopics', r)),
      assignments: (assignmentsRes.data || []).map((r) => fromDatabaseRow('assignments', r)),
      exams: (examsRes.data || []).map((r) => fromDatabaseRow('exams', r)),
      availability: (availabilityRes.data || []).map((r) => fromDatabaseRow('availability', r)),
      checkIns: (checkInsRes.data || []).map((r) => fromDatabaseRow('checkIns', r)),
      adaptiveSignals: signalsRes.data ? fromDatabaseRow('adaptiveSignals', signalsRes.data) : null,
      studyPlan: (studyPlanRes.data || []).map((r) => fromDatabaseRow('studyPlan', r)),
      studyInsights: insightsRes.data ? fromDatabaseRow('studyInsights', insightsRes.data) : null,
      studentProfile: profileRes.data ? fromDatabaseRow('studentProfile', profileRes.data) : null,
      timetable: (timetableRes?.data || []).map((r) => fromDatabaseRow('timetable', r)),
    };

    safeSetItem(`${SYNC_LAST_PULL_KEY_PREFIX}${userId}`, new Date().toISOString());
    setSyncStatus(SYNC_STATUS.SYNCED);
    return result;
  } catch (err) {
    console.error('[syncService] Error pulling cloud data:', err);
    setSyncStatus(SYNC_STATUS.ERROR);
    return null;
  }
}

// Global online/offline network listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (isSupabaseConfigured()) {
      setSyncStatus(SYNC_STATUS.SYNCING);
      // Status will transition to SYNCED upon flush completion
    } else {
      setSyncStatus(SYNC_STATUS.LOCAL_ONLY);
    }
  });

  window.addEventListener('offline', () => {
    setSyncStatus(SYNC_STATUS.OFFLINE);
  });
}
