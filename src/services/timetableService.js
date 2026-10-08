/**
 * Timetable Extraction, Validation & Scheduling Intelligence Service
 * My Academia Buddy — Phase 4
 *
 * Supports:
 * - Parsing university schedules (PDF text, pasted text, structured extracts)
 * - Handling recurring weekly lectures, tutorials/DGD, laboratories, and seminars
 * - Bilingual French & English support (Lundi-Vendredi, DGD, Travaux dirigés, Labo)
 * - Timetable-internal conflict detection
 * - Student availability conflict detection
 * - Transition buffer calculation (10-15 min default buffer)
 * - Pre-lecture preparation and post-lecture consolidation opportunity calculation
 */

import { timeToMinutes, minutesToTime } from './scheduler';

export const ACTIVITY_TYPES = {
  LECTURE: 'lecture',
  LAB: 'lab',
  TUTORIAL: 'tutorial',
  SEMINAR: 'seminar',
};

export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const FRENCH_DAY_MAP = {
  lundi: 'Monday',
  mardi: 'Tuesday',
  mercredi: 'Wednesday',
  jeudi: 'Thursday',
  vendredi: 'Friday',
  samedi: 'Saturday',
  dimanche: 'Sunday',
  lun: 'Monday',
  mar: 'Tuesday',
  mer: 'Wednesday',
  jeu: 'Thursday',
  ven: 'Friday',
  sam: 'Saturday',
  dim: 'Sunday',
};

export const ENGLISH_DAY_MAP = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

/**
 * Standard university course colors
 */
export const TIMETABLE_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

/**
 * Normalize day name from English or French input
 * @param {string} rawDay
 * @returns {string|null} Canonical English day string or null
 */
export function normalizeDayOfWeek(rawDay = '') {
  if (!rawDay) return null;
  const clean = rawDay.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (ENGLISH_DAY_MAP[clean]) return ENGLISH_DAY_MAP[clean];
  if (FRENCH_DAY_MAP[clean]) return FRENCH_DAY_MAP[clean];
  return null;
}

/**
 * Parses time formats such as "10:00", "10h30", "1:30 PM", "14:20" to "HH:MM" 24h
 * @param {string} raw
 * @returns {string|null}
 */
export function normalizeTimeString(raw = '') {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\s+/g, ' ');

  // 12-hour am/pm format e.g. "1:30 PM", "11:00 AM"
  const ampmMatch = cleaned.match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const isPm = ampmMatch[3].toLowerCase() === 'pm';
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // French format e.g. "14h30", "10h00", "9h"
  const frenchMatch = cleaned.match(/^(\d{1,2})h(?:(\d{2}))?$/i);
  if (frenchMatch) {
    const hours = parseInt(frenchMatch[1], 10);
    const minutes = frenchMatch[2] ? parseInt(frenchMatch[2], 10) : 0;
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  // 24-hour format e.g. "14:30", "09:00"
  const stdMatch = cleaned.match(/^(\d{1,2})[:.](\d{2})$/);
  if (stdMatch) {
    const hours = parseInt(stdMatch[1], 10);
    const minutes = parseInt(stdMatch[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Detect activity type (lecture, lab, tutorial/DGD, seminar)
 * @param {string} text
 * @returns {string}
 */
export function detectActivityType(text = '') {
  const lower = text.toLowerCase();
  if (/\b(dgd|tut|tutorial|travaux\s*dirig[eé]s?|discussion)\b/i.test(lower)) {
    return ACTIVITY_TYPES.TUTORIAL;
  }
  if (/\b(lab|laboratory|laboratoire|labo)\b/i.test(lower)) {
    return ACTIVITY_TYPES.LAB;
  }
  if (/\b(sem|seminar|s[eé]minaire)\b/i.test(lower)) {
    return ACTIVITY_TYPES.SEMINAR;
  }
  return ACTIVITY_TYPES.LECTURE;
}

/**
 * Extracts course code from string e.g. "CSI 2510", "MAT-1320", "SEG2105"
 * @param {string} text
 * @returns {string|null}
 */
export function extractCourseCode(text = '') {
  const match = text.match(/\b([A-Z]{2,4})\s*[-]?\s*([0-9]{4}[A-Z]?)\b/i);
  if (match) {
    return `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
  }
  return null;
}

/**
 * Parse a raw text document (from PDF extract, copy-paste, or schedule export) into timetable entries
 *
 * @param {string} rawText Raw timetable schedule text
 * @param {object} [options]
 * @param {string} [options.term='Fall 2026']
 * @returns {{ entries: Array, warnings: Array, totalParsed: number }}
 */
const KNOWN_BUILDING_CODES = new Set([
  'SITE', 'STE', 'CRX', 'VNR', 'DMS', 'CBY', 'LPR', 'HMN', 'MNT', 'FTX', 'SMD', 'MRT', 'RGN', 'KED', 'UC', 'TB', 'ME', 'CB', 'MC', 'HALL', 'LEAC'
]);

function findDayInText(text = '') {
  if (!text) return null;
  // Check full/abbr English days first on current line
  for (const [key, val] of Object.entries(ENGLISH_DAY_MAP)) {
    if (new RegExp(`\\b${key}\\b`, 'i').test(text)) return val;
  }
  // Check full/abbr French days on current line
  for (const [key, val] of Object.entries(FRENCH_DAY_MAP)) {
    if (new RegExp(`\\b${key}\\b`, 'i').test(text)) return val;
  }
  return null;
}

export function parseTimetableText(rawText = '', options = {}) {
  const term = options.term || 'Fall 2026';
  const warnings = [];
  const entries = [];

  if (!rawText || !rawText.trim()) {
    return { entries: [], warnings: ['Provided timetable text is empty.'], totalParsed: 0 };
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Helper regex for time range: e.g. "10:00 - 11:20" or "10h00 - 11h20" or "1:00 PM - 2:20 PM"
  const timeRangeRegex = /(\d{1,2}[:.h]\d{2}(?:\s*[ap]m)?|\d{1,2}h)\s*(?:-|–|—|to|à)\s*(\d{1,2}[:.h]\d{2}(?:\s*[ap]m)?|\d{1,2}h)/i;

  let currentCourseCode = null;
  let currentCourseName = null;
  let currentColorIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasTimeRange = timeRangeRegex.test(line);

    // Check if line contains a course code
    const detectedCode = extractCourseCode(line);
    if (detectedCode) {
      const codePrefix = detectedCode.split(' ')[0].toUpperCase();
      const isBuilding = KNOWN_BUILDING_CODES.has(codePrefix);

      // Only update active course if this is not a known building code
      // or if it appears on a line without a time range (i.e. course header line)
      if (!isBuilding || !hasTimeRange) {
        currentCourseCode = detectedCode;
        // Try to extract name following the code
        const afterCode = line.split(new RegExp(detectedCode.replace(' ', '\\s*'), 'i'))[1] || '';
        const namePart = afterCode.split(/[-–—|]/)[1] || afterCode;
        if (namePart && namePart.trim().length > 3) {
          currentCourseName = namePart.trim().replace(/\s+(LEC|LAB|DGD|TUT).*/i, '');
        }
      }
    }

    // Check if line contains a time range
    const timeMatch = line.match(timeRangeRegex);
    if (timeMatch) {
      const rawStart = timeMatch[1];
      const rawEnd = timeMatch[2];
      const startTime = normalizeTimeString(rawStart);
      const endTime = normalizeTimeString(rawEnd);

      if (startTime && endTime) {
        // Detect Day of week: check current line first, then previous line
        let dayOfWeek = findDayInText(line);
        if (!dayOfWeek && i > 0) {
          dayOfWeek = findDayInText(lines[i - 1]);
        }

        // Multi-day pattern e.g. "Mon, Wed" or "Lundi / Mercredi" or "MWF"
        const detectedDays = [];
        DAY_NAMES.forEach((d) => {
          const dReg = new RegExp(`\\b${d.slice(0, 3)}\\b|\\b${d}\\b`, 'i');
          if (dReg.test(line)) {
            detectedDays.push(d);
          }
        });
        if (detectedDays.length === 0 && dayOfWeek) {
          detectedDays.push(dayOfWeek);
        }

        // Location detection (e.g. "SITE 0150", "STE E0130", "DMS 1160", "Room 204")
        let location = '';
        const locMatch = line.match(/\b([A-Z]{2,4}\s+[A-Z0-9]{3,6}|Room\s+\d+|Salle\s+\d+|Online|En ligne|Virtual)\b/i);
        if (locMatch) {
          location = locMatch[1].trim();
        }

        const activityType = detectActivityType(line);
        const courseCode = (!hasTimeRange && detectedCode) ? detectedCode : (currentCourseCode || detectedCode || 'GEN 1000');
        const courseName = currentCourseName || courseCode;

        const effectiveDays = detectedDays.length > 0 ? detectedDays : [dayOfWeek || 'Monday'];

        effectiveDays.forEach((day) => {
          entries.push({
            id: `tt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            courseCode,
            courseName,
            activityType,
            dayOfWeek: day,
            startTime,
            endTime,
            location: location || '',
            instructor: '',
            section: 'A',
            term,
            color: TIMETABLE_COLORS[currentColorIdx % TIMETABLE_COLORS.length],
            version: 1,
          });
        });

        currentColorIdx++;
      }
    }
  }

  // Deduplicate identical parsed slots
  const uniqueEntries = [];
  const seenSet = new Set();
  entries.forEach((e) => {
    const key = `${e.courseCode}-${e.dayOfWeek}-${e.startTime}-${e.endTime}-${e.activityType}`;
    if (!seenSet.has(key)) {
      seenSet.add(key);
      uniqueEntries.push(e);
    }
  });

  if (uniqueEntries.length === 0) {
    warnings.push('Could not automatically identify standard time slots. Please review or use manual entry.');
  }

  return {
    entries: uniqueEntries,
    warnings,
    totalParsed: uniqueEntries.length,
  };
}

/**
 * Realistic Sample University Timetable (uOttawa Computer Science / Engineering Term)
 */
export const SAMPLE_TIMETABLE_PACK = [
  {
    id: 'tt-sample-1',
    courseCode: 'CSI 2510',
    courseName: 'Data Structures and Algorithms',
    activityType: ACTIVITY_TYPES.LECTURE,
    dayOfWeek: 'Monday',
    startTime: '10:00',
    endTime: '11:20',
    location: 'SITE 0150',
    section: 'LEC A',
    instructor: 'Dr. Lucia Moura',
    term: 'Fall 2026',
    color: '#3b82f6',
  },
  {
    id: 'tt-sample-2',
    courseCode: 'CSI 2510',
    courseName: 'Data Structures and Algorithms',
    activityType: ACTIVITY_TYPES.LECTURE,
    dayOfWeek: 'Wednesday',
    startTime: '10:00',
    endTime: '11:20',
    location: 'SITE 0150',
    section: 'LEC A',
    instructor: 'Dr. Lucia Moura',
    term: 'Fall 2026',
    color: '#3b82f6',
  },
  {
    id: 'tt-sample-3',
    courseCode: 'CSI 2510',
    courseName: 'Data Structures and Algorithms',
    activityType: ACTIVITY_TYPES.LAB,
    dayOfWeek: 'Thursday',
    startTime: '14:30',
    endTime: '17:20',
    location: 'STE 0130',
    section: 'LAB 1',
    instructor: 'Teaching Assistant',
    term: 'Fall 2026',
    color: '#3b82f6',
  },
  {
    id: 'tt-sample-4',
    courseCode: 'SEG 2105',
    courseName: 'Introduction to Software Engineering',
    activityType: ACTIVITY_TYPES.LECTURE,
    dayOfWeek: 'Tuesday',
    startTime: '13:00',
    endTime: '14:20',
    location: 'CRX C040',
    section: 'LEC B',
    instructor: 'Dr. Timothy Lethbridge',
    term: 'Fall 2026',
    color: '#8b5cf6',
  },
  {
    id: 'tt-sample-5',
    courseCode: 'SEG 2105',
    courseName: 'Introduction to Software Engineering',
    activityType: ACTIVITY_TYPES.LECTURE,
    dayOfWeek: 'Thursday',
    startTime: '13:00',
    endTime: '14:20',
    location: 'CRX C040',
    section: 'LEC B',
    instructor: 'Dr. Timothy Lethbridge',
    term: 'Fall 2026',
    color: '#8b5cf6',
  },
  {
    id: 'tt-sample-6',
    courseCode: 'SEG 2105',
    courseName: 'Introduction to Software Engineering',
    activityType: ACTIVITY_TYPES.TUTORIAL,
    dayOfWeek: 'Friday',
    startTime: '10:00',
    endTime: '11:20',
    location: 'VNR 1075',
    section: 'DGD B',
    instructor: 'Teaching Assistant',
    term: 'Fall 2026',
    color: '#8b5cf6',
  },
  {
    id: 'tt-sample-7',
    courseCode: 'MAT 1320',
    courseName: 'Calculus I / Calcul différentiel',
    activityType: ACTIVITY_TYPES.LECTURE,
    dayOfWeek: 'Monday',
    startTime: '11:30',
    endTime: '12:50',
    location: 'DMS 1160',
    section: 'LEC A',
    instructor: 'Prof. Joseph Khoury',
    term: 'Fall 2026',
    color: '#10b981',
  },
  {
    id: 'tt-sample-8',
    courseCode: 'MAT 1320',
    courseName: 'Calculus I / Calcul différentiel',
    activityType: ACTIVITY_TYPES.LECTURE,
    dayOfWeek: 'Wednesday',
    startTime: '11:30',
    endTime: '12:50',
    location: 'DMS 1160',
    section: 'LEC A',
    instructor: 'Prof. Joseph Khoury',
    term: 'Fall 2026',
    color: '#10b981',
  },
  {
    id: 'tt-sample-9',
    courseCode: 'MAT 1320',
    courseName: 'Calculus I / Calcul différentiel',
    activityType: ACTIVITY_TYPES.TUTORIAL,
    dayOfWeek: 'Tuesday',
    startTime: '16:00',
    endTime: '17:20',
    location: 'STE 2060',
    section: 'DGD 1',
    instructor: 'TA Calculus',
    term: 'Fall 2026',
    color: '#10b981',
  },
  {
    id: 'tt-sample-10',
    courseCode: 'CEG 2136',
    courseName: 'Computer Architecture I',
    activityType: ACTIVITY_TYPES.LECTURE,
    dayOfWeek: 'Tuesday',
    startTime: '08:30',
    endTime: '09:50',
    location: 'LPR 285',
    section: 'LEC A',
    instructor: 'Dr. Voicu Groza',
    term: 'Fall 2026',
    color: '#f59e0b',
  },
  {
    id: 'tt-sample-11',
    courseCode: 'CEG 2136',
    courseName: 'Computer Architecture I',
    activityType: ACTIVITY_TYPES.LECTURE,
    dayOfWeek: 'Thursday',
    startTime: '08:30',
    endTime: '09:50',
    location: 'LPR 285',
    section: 'LEC A',
    instructor: 'Dr. Voicu Groza',
    term: 'Fall 2026',
    color: '#f59e0b',
  },
  {
    id: 'tt-sample-12',
    courseCode: 'CEG 2136',
    courseName: 'Computer Architecture I',
    activityType: ACTIVITY_TYPES.LAB,
    dayOfWeek: 'Wednesday',
    startTime: '14:30',
    endTime: '17:20',
    location: 'CBY B202',
    section: 'LAB 1',
    instructor: 'TA Hardware',
    term: 'Fall 2026',
    color: '#f59e0b',
  },
];

/**
 * Detect overlapping classes within timetable entries
 * @param {Array} entries
 * @returns {Array} List of conflict reports
 */
export function detectTimetableConflicts(entries = []) {
  const conflicts = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (a.dayOfWeek !== b.dayOfWeek) continue;

      const aStart = timeToMinutes(a.startTime);
      const aEnd = timeToMinutes(a.endTime);
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);

      if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
        conflicts.push({
          type: 'class_overlap',
          dayOfWeek: a.dayOfWeek,
          entryA: a,
          entryB: b,
          overlapMinutes: Math.min(aEnd, bEnd) - Math.max(aStart, bStart),
          message: `Class conflict on ${a.dayOfWeek}: "${a.courseCode}" (${a.startTime}-${a.endTime}) overlaps with "${b.courseCode}" (${b.startTime}-${b.endTime}).`,
        });
      }
    }
  }
  return conflicts;
}

/**
 * Detect conflicts between student study availability and scheduled classes
 *
 * @param {Array} timetableEntries
 * @param {Array} availabilitySlots
 * @param {number} [bufferMinutes=15]
 * @returns {Array} List of conflict reports with guidance
 */
export function detectAvailabilityConflicts(
  timetableEntries = [],
  availabilitySlots = [],
  bufferMinutes = 15
) {
  const conflicts = [];

  timetableEntries.forEach((entry) => {
    const classStart = timeToMinutes(entry.startTime);
    const classEnd = timeToMinutes(entry.endTime);

    availabilitySlots.forEach((slot) => {
      if (slot.day !== entry.dayOfWeek) return;

      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = timeToMinutes(slot.endTime);

      // Check overlap between study availability window and scheduled class
      const overlapStart = Math.max(classStart, slotStart);
      const overlapEnd = Math.min(classEnd, slotEnd);

      if (overlapStart < overlapEnd) {
        conflicts.push({
          type: 'availability_class_collision',
          dayOfWeek: entry.dayOfWeek,
          classEntry: entry,
          availabilitySlot: slot,
          overlapMinutes: overlapEnd - overlapStart,
          collisionStart: minutesToTime(overlapStart),
          collisionEnd: minutesToTime(overlapEnd),
          suggestedResolution: `Your study window (${slot.startTime}-${slot.endTime}) collides with your scheduled ${entry.activityType} for "${entry.courseCode}" (${entry.startTime}-${entry.endTime}). Study Planner will carve out study sessions around this class with a ${bufferMinutes}m transition buffer.`,
        });
      }
    });
  });

  return conflicts;
}

/**
 * Carves out realistic study blocks from availability by subtracting timetable commitments
 * and enforcing travel/transition buffers.
 *
 * @param {Array} availabilitySlots
 * @param {Array} timetableEntries
 * @param {number} [bufferMinutes=15] Configurable 10-15 minute transition buffer
 * @returns {Array} Free study windows available for scheduling
 */
export function carveAvailableStudyWindows(
  availabilitySlots = [],
  timetableEntries = [],
  bufferMinutes = 15
) {
  const freeWindows = [];

  // Group timetable entries by day of week
  const entriesByDay = {};
  timetableEntries.forEach((e) => {
    if (!entriesByDay[e.dayOfWeek]) entriesByDay[e.dayOfWeek] = [];
    entriesByDay[e.dayOfWeek].push({
      start: Math.max(0, timeToMinutes(e.startTime) - bufferMinutes),
      end: timeToMinutes(e.endTime) + bufferMinutes,
      courseCode: e.courseCode,
      activityType: e.activityType,
    });
  });

  // Sort busy intervals for each day
  Object.keys(entriesByDay).forEach((day) => {
    entriesByDay[day].sort((a, b) => a.start - b.start);
  });

  availabilitySlots.forEach((slot) => {
    let currentIntervals = [
      {
        start: timeToMinutes(slot.startTime),
        end: timeToMinutes(slot.endTime),
      },
    ];

    const busyList = entriesByDay[slot.day] || [];

    busyList.forEach((busy) => {
      const nextIntervals = [];
      currentIntervals.forEach((interval) => {
        // No overlap
        if (interval.end <= busy.start || interval.start >= busy.end) {
          nextIntervals.push(interval);
          return;
        }

        // Left chunk before busy interval
        if (interval.start < busy.start) {
          nextIntervals.push({
            start: interval.start,
            end: busy.start,
          });
        }

        // Right chunk after busy interval
        if (interval.end > busy.end) {
          nextIntervals.push({
            start: busy.end,
            end: interval.end,
          });
        }
      });
      currentIntervals = nextIntervals;
    });

    // Filter windows shorter than minimum useful session (e.g. 30 min)
    currentIntervals.forEach((inv, idx) => {
      if (inv.end - inv.start >= 30) {
        freeWindows.push({
          id: `${slot.id || 'slot'}-carved-${idx}`,
          day: slot.day,
          startTime: minutesToTime(inv.start),
          endTime: minutesToTime(inv.end),
          durationMinutes: inv.end - inv.start,
        });
      }
    });
  });

  return freeWindows;
}
