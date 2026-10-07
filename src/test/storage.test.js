import { describe, it, expect, beforeEach } from 'vitest';
import {
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  migrateStorage,
  exportAllData,
  importAllData,
  clearAllData,
  loadSampleDemoData,
  STORAGE_KEYS,
} from '../services/storage';

describe('Storage Service', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('safely handles missing or malformed JSON without throwing', () => {
    expect(safeGetItem('nonexistent_key', [])).toEqual([]);

    window.localStorage.setItem('corrupted_key', '{ invalid json : true ');
    expect(safeGetItem('corrupted_key', { fallback: true })).toEqual({ fallback: true });
  });

  it('sets and retrieves valid data, and removes keys properly', () => {
    const courses = [{ id: 1, name: 'SEG2105' }];
    expect(safeSetItem(STORAGE_KEYS.COURSES, courses)).toBe(true);
    expect(safeGetItem(STORAGE_KEYS.COURSES, [])).toEqual(courses);

    safeRemoveItem(STORAGE_KEYS.COURSES);
    expect(safeGetItem(STORAGE_KEYS.COURSES, [])).toEqual([]);
  });

  it('migrates legacy v1 schema to v2 schema cleanly', () => {
    // Simulate v1 legacy data
    const legacyCourses = [{ id: 10, name: 'CSI2110' }]; // Missing difficulty
    const legacyAssignments = [{ id: 20, title: 'Lab 1', course: 'CSI2110' }]; // Missing workload
    const legacyExams = [{ id: 30, course: 'CSI2110', date: '2026-10-15' }]; // Missing title, priority

    window.localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(legacyCourses));
    window.localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(legacyAssignments));
    window.localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(legacyExams));
    window.localStorage.setItem('mab_storage_version', '1');

    migrateStorage();

    const migratedCourses = safeGetItem(STORAGE_KEYS.COURSES, []);
    expect(migratedCourses[0].difficulty).toBe('Medium');

    const migratedAssignments = safeGetItem(STORAGE_KEYS.ASSIGNMENTS, []);
    expect(migratedAssignments[0].estimatedWorkload).toBe(3);
    expect(migratedAssignments[0].priority).toBe('Medium');

    const migratedExams = safeGetItem(STORAGE_KEYS.EXAMS, []);
    expect(migratedExams[0].title).toBe('CSI2110 Exam');
    expect(migratedExams[0].priority).toBe('High');
  });

  it('exports and imports backup data accurately', () => {
    loadSampleDemoData();
    const backupJson = exportAllData();
    expect(backupJson).toContain('My Academia Buddy');

    clearAllData();
    expect(safeGetItem(STORAGE_KEYS.COURSES, [])).toHaveLength(0);

    const result = importAllData(backupJson);
    expect(result.success).toBe(true);
    expect(safeGetItem(STORAGE_KEYS.COURSES, []).length).toBeGreaterThan(0);
  });

  it('rejects invalid backup format gracefully', () => {
    const result = importAllData('{ "invalid": true }');
    expect(result.success).toBe(false);
  });
});
