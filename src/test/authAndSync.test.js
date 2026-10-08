import { describe, it, expect, beforeEach } from 'vitest';
import {
  getScopedStorageKey,
  safeGetScopedItem,
  safeSetScopedItem,
  createRecoveryBackup,
  hasGuestData,
  ensureEntityMetadata,
  STORAGE_KEYS,
} from '../services/storage';
import {
  enqueueMutation,
  getPendingQueue,
  toDatabaseRow,
  fromDatabaseRow,
  subscribeSyncStatus,
  SYNC_STATUS,
} from '../services/syncService';
import {
  shouldPromptMigration,
  getGuestInventorySummary,
  executeMigration,
  skipMigration,
} from '../services/migrationService';

describe('Phase 3: Account-Isolated Storage & Partitioning', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('computes isolated scoped storage keys for distinct accounts and guest', () => {
    expect(getScopedStorageKey(STORAGE_KEYS.COURSES, 'user-123')).toBe('mab_user_user-123_courses');
    expect(getScopedStorageKey(STORAGE_KEYS.COURSES, 'user-456')).toBe('mab_user_user-456_courses');
    expect(getScopedStorageKey(STORAGE_KEYS.COURSES, null)).toBe('mab_guest_courses');
  });

  it('strictly isolates academic data between two accounts on the same browser', () => {
    const userACourses = [{ id: 101, name: 'User A Course' }];
    const userBCourses = [{ id: 202, name: 'User B Course' }];
    const guestCourses = [{ id: 303, name: 'Guest Course' }];

    safeSetScopedItem(STORAGE_KEYS.COURSES, userACourses, 'user-a');
    safeSetScopedItem(STORAGE_KEYS.COURSES, userBCourses, 'user-b');
    safeSetScopedItem(STORAGE_KEYS.COURSES, guestCourses, null);

    // User A should only see User A's data
    expect(safeGetScopedItem(STORAGE_KEYS.COURSES, [], 'user-a')).toEqual(userACourses);

    // User B should only see User B's data
    expect(safeGetScopedItem(STORAGE_KEYS.COURSES, [], 'user-b')).toEqual(userBCourses);

    // Guest should only see guest data
    expect(safeGetScopedItem(STORAGE_KEYS.COURSES, [], null)).toEqual(guestCourses);

    // Querying an unknown user returns empty fallback, never another student's data
    expect(safeGetScopedItem(STORAGE_KEYS.COURSES, [], 'unknown-user')).toEqual([]);
  });

  it('falls back to legacy storage keys for existing guest users seamlessly', () => {
    const legacyAssignments = [{ id: 'asg-old', title: 'Legacy Assignment' }];
    // Set under legacy un-prefixed key
    window.localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(legacyAssignments));

    // Guest lookup finds legacy data
    const retrieved = safeGetScopedItem(STORAGE_KEYS.ASSIGNMENTS, [], null);
    expect(retrieved).toEqual(legacyAssignments);
  });
});

describe('Phase 3: Offline Mutation Queue & Sync State', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('enqueues mutations and preserves them in localStorage across reloads', () => {
    const userId = 'student-test-1';
    enqueueMutation(userId, {
      entity: 'courses',
      action: 'upsert',
      clientId: 101,
      data: { id: 101, name: 'SEG2105', version: 1 },
    });

    const queue = getPendingQueue(userId);
    expect(queue).toHaveLength(1);
    expect(queue[0].entity).toBe('courses');
    expect(queue[0].clientId).toBe('101');
    expect(queue[0].action).toBe('upsert');
  });

  it('deduplicates consecutive mutations for the same client_id in the queue', () => {
    const userId = 'student-test-2';
    enqueueMutation(userId, {
      entity: 'assignments',
      action: 'upsert',
      clientId: 'asg-1',
      data: { id: 'asg-1', title: 'Draft Title', version: 1 },
    });

    // Update the same assignment
    enqueueMutation(userId, {
      entity: 'assignments',
      action: 'upsert',
      clientId: 'asg-1',
      data: { id: 'asg-1', title: 'Final Title', version: 2 },
    });

    const queue = getPendingQueue(userId);
    expect(queue).toHaveLength(1);
    expect(queue[0].data.title).toBe('Final Title');
    expect(queue[0].data.version).toBe(2);
  });

  it('reports sync status changes to registered subscribers', () => {
    let observedStatus = null;
    const unsubscribe = subscribeSyncStatus((status) => {
      observedStatus = status;
    });

    expect(observedStatus).toBeDefined();
    expect(Object.values(SYNC_STATUS)).toContain(observedStatus);

    unsubscribe();
  });
});

describe('Phase 3: Bidirectional Database Mappings & Data Normalization', () => {
  const userId = '00000000-0000-0000-0000-000000000001';

  it('correctly maps courses to database row and back', () => {
    const course = {
      id: 101,
      name: 'CSI2110',
      instructor: 'Dr. Moura',
      schedule: 'Tue/Thu',
      credits: '3.0',
      difficulty: 'High',
      color: '#8b5cf6',
      gradingScheme: [{ item: 'Midterm', weight: 30 }],
      version: 2,
    };

    const row = toDatabaseRow('courses', course, userId);
    expect(row.user_id).toBe(userId);
    expect(row.client_id).toBe('101');
    expect(row.name).toBe('CSI2110');
    expect(row.grading_scheme).toEqual([{ item: 'Midterm', weight: 30 }]);
    expect(row.version).toBe(2);

    const reconstructed = fromDatabaseRow('courses', row);
    expect(reconstructed.id).toBe(101);
    expect(reconstructed.name).toBe('CSI2110');
    expect(reconstructed.difficulty).toBe('High');
  });

  it('correctly maps syllabus topics with composite course_client_id scoping', () => {
    const topic = {
      id: 'top-101-1',
      courseId: 101,
      courseName: 'CSI2110',
      weekNumber: 1,
      title: 'Algorithm Analysis',
      status: 'reading_completed',
      confidence: 4,
      version: 1,
    };

    const row = toDatabaseRow('syllabusTopics', topic, userId);
    expect(row.user_id).toBe(userId);
    expect(row.client_id).toBe('top-101-1');
    expect(row.course_client_id).toBe('101');
    expect(row.title).toBe('Algorithm Analysis');

    const reconstructed = fromDatabaseRow('syllabusTopics', row);
    expect(reconstructed.id).toBe('top-101-1');
    expect(reconstructed.courseId).toBe(101);
    expect(reconstructed.confidence).toBe(4);
  });

  it('enforces version and timestamp metadata with ensureEntityMetadata', () => {
    const rawItem = { id: 1, title: 'Item without metadata' };
    const withMeta = ensureEntityMetadata(rawItem);

    expect(withMeta.version).toBe(1);
    expect(withMeta.client_updated_at).toBeDefined();
    expect(new Date(withMeta.client_updated_at).getTime()).not.toBeNaN();
  });
});

describe('Phase 3: Secure Local Data Migration', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('detects guest data and prompts migration appropriately', () => {
    const userId = 'student-mig-1';

    // No guest data: should not prompt
    expect(shouldPromptMigration(userId)).toBe(false);

    // Populate guest courses
    safeSetScopedItem(STORAGE_KEYS.COURSES, [{ id: 101, name: 'CSI2110' }], null);
    expect(hasGuestData()).toBe(true);
    expect(shouldPromptMigration(userId)).toBe(true);

    // Once marked skipped or migrated, should not prompt again
    skipMigration(userId);
    expect(shouldPromptMigration(userId)).toBe(false);
  });

  it('generates an accurate guest inventory summary', () => {
    safeSetScopedItem(STORAGE_KEYS.COURSES, [{ id: 1, name: 'Course 1' }, { id: 2, name: 'Course 2' }], null);
    safeSetScopedItem(STORAGE_KEYS.ASSIGNMENTS, [{ id: 10, title: 'HW 1' }], null);
    safeSetScopedItem(STORAGE_KEYS.EXAMS, [{ id: 20, title: 'Exam 1' }], null);

    const summary = getGuestInventorySummary();
    expect(summary.coursesCount).toBe(2);
    expect(summary.assignmentsCount).toBe(1);
    expect(summary.examsCount).toBe(1);
    expect(summary.hasData).toBe(true);
  });

  it('creates an immutable recovery backup before migration and copies data safely', async () => {
    const userId = 'student-mig-2';
    safeSetScopedItem(STORAGE_KEYS.COURSES, [{ id: 101, name: 'SEG2105' }], null);

    const backupKey = createRecoveryBackup('test_pre_mig');
    expect(window.localStorage.getItem(backupKey)).not.toBeNull();

    const result = await executeMigration(userId);
    expect(result.success).toBe(true);
    expect(result.backupKey).toBeDefined();

    // Data is now available in user's scoped storage
    const userCourses = safeGetScopedItem(STORAGE_KEYS.COURSES, [], userId);
    expect(userCourses).toHaveLength(1);
    expect(userCourses[0].name).toBe('SEG2105');

    // Migration prompt is now cleared for this user
    expect(shouldPromptMigration(userId)).toBe(false);
  });
});
