/**
 * Intelligent Syllabus Parser Engine — My Academia Buddy Phase 2
 * 
 * Modular, rule-based extraction pipeline that parses unstructured university course syllabi.
 * Features:
 * - Bilingual support: English and French (courses, dates, evaluation keywords)
 * - Identifies: Course code/title, schedule, instructor, weekly topics, readings,
 *   assignments, exams, grading weights, and milestones.
 * - Extracts source text snippets and page numbers for auditability.
 * - Detects date ambiguities (e.g., missing year) requiring student confirmation.
 * - Evaluates extraction confidence scores.
 */

// French and English Month Mappings
const MONTHS_MAP = {
  // English
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
  // French
  janv: 0, janvier: 0,
  fevr: 1, févr: 1, fevrier: 1, février: 1,
  mars: 2,
  avr: 3, avril: 3,
  mai: 4,
  juin: 5,
  juil: 6, juillet: 6,
  aout: 7, août: 7,
  septembre: 8,
  octo: 9, octobre: 9,
  nove: 10, novembre: 10,
  dece: 11, déc: 11, decembre: 11, décembre: 11,
};

const VALID_MONTH_NAMES = Object.keys(MONTHS_MAP).sort((a, b) => b.length - a.length);
const MONTH_NAMES_REGEX = VALID_MONTH_NAMES.join('|');

const COURSE_CODE_REGEX = /\b([A-Z]{3,4})\s*[-–]?\s*([0-9]{3,4}[A-Z]?)\b/;

const PRESET_COURSE_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
];

/**
 * Detects whether the syllabus text is predominantly French or English
 * @param {string} text
 * @returns {'fr' | 'en'}
 */
export function detectLanguage(text = '') {
  const lower = text.toLowerCase();
  const frenchKeywords = [
    'cours', 'professeur', 'enseignant', 'devoir', 'examen', 'pondération',
    'semaine', 'horaire', 'évaluation', 'laboratoire', 'séance', 'objectif', 'barème'
  ];
  let frMatches = 0;
  frenchKeywords.forEach((kw) => {
    if (lower.includes(kw)) frMatches++;
  });
  return frMatches >= 3 ? 'fr' : 'en';
}

/**
 * Normalizes a date string from English or French text into YYYY-MM-DD
 * Handles "Oct 15", "15 octobre", "October 18, 2026", "2026-10-15", etc.
 * 
 * @param {string} dateString Raw date text
 * @param {number} [fallbackYear] Year to assume if none explicitly written (default: current year)
 * @returns {{ date: string|null, isYearEstimated: boolean, confidence: 'high'|'medium'|'low' }}
 */
export function parseSyllabusDate(dateString = '', fallbackYear = new Date().getFullYear()) {
  if (!dateString) return { date: null, isYearEstimated: false, confidence: 'low' };

  const cleaned = dateString.trim().toLowerCase();

  // 1. ISO format: YYYY-MM-DD
  const isoMatch = cleaned.match(/\b(202[4-9])-([01]?\d)-([0-3]?\d)\b/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(Number(isoMatch[2])).padStart(2, '0');
    const d = String(Number(isoMatch[3])).padStart(2, '0');
    return { date: `${y}-${m}-${d}`, isYearEstimated: false, confidence: 'high' };
  }

  // 2. Format: DD/MM/YYYY or MM/DD/YYYY
  const slashMatch = cleaned.match(/\b([0-3]?\d)\/([01]?\d)\/(202[4-9])\b/);
  if (slashMatch) {
    const p1 = Number(slashMatch[1]);
    const p2 = Number(slashMatch[2]);
    const y = slashMatch[3];
    // Heuristic: if p1 > 12, p1 is day, p2 is month
    const m = p1 > 12 ? p2 : p2 > 12 ? p1 : p2;
    const d = p1 > 12 ? p1 : p2 > 12 ? p2 : p1;
    return {
      date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isYearEstimated: false,
      confidence: 'medium',
    };
  }

  // 3. Named month format: e.g. "October 15, 2026", "15 octobre 2026", "Oct 15", "15 nov."
  // Pattern A: Month Day [Year] e.g. "October 15"
  const monthDayRegex = new RegExp(
    `\\b(${MONTH_NAMES_REGEX})\\.?\\s+([0-3]?\\d)(?:st|nd|rd|th)?(?:\\s*,?\\s*(202[4-9]))?\\b`,
    'i'
  );
  const monthDayMatch = cleaned.match(monthDayRegex);

  // Pattern B: Day Month [Year] e.g. "15 octobre", "15th of October"
  const dayMonthRegex = new RegExp(
    `\\b([0-3]?\\d)(?:st|nd|rd|th|er)?\\s+(?:de\\s+|d'|of\\s+)?(${MONTH_NAMES_REGEX})\\.?(?:\\s*,?\\s*(202[4-9]))?\\b`,
    'i'
  );
  const dayMonthMatch = cleaned.match(dayMonthRegex);

  let monthToken = null;
  let dayNum = null;
  let explicitYear = null;

  if (monthDayMatch && MONTHS_MAP[monthDayMatch[1].replace('.', '')] !== undefined) {
    monthToken = monthDayMatch[1].replace('.', '');
    dayNum = Number(monthDayMatch[2]);
    explicitYear = monthDayMatch[3] ? Number(monthDayMatch[3]) : null;
  } else if (dayMonthMatch && MONTHS_MAP[dayMonthMatch[2].replace('.', '')] !== undefined) {
    monthToken = dayMonthMatch[2].replace('.', '');
    dayNum = Number(dayMonthMatch[1]);
    explicitYear = dayMonthMatch[3] ? Number(dayMonthMatch[3]) : null;
  }

  if (monthToken && dayNum && dayNum >= 1 && dayNum <= 31) {
    const monthIndex = MONTHS_MAP[monthToken];
    const year = explicitYear || fallbackYear;
    const mStr = String(monthIndex + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    return {
      date: `${year}-${mStr}-${dStr}`,
      isYearEstimated: !explicitYear,
      confidence: explicitYear ? 'high' : 'medium',
    };
  }

  return { date: null, isYearEstimated: false, confidence: 'low' };
}

/**
 * Extracts course code, course title, and academic credits from syllabus text
 * 
 * @param {string} fullText
 * @param {Array<{ pageNumber: number, text: string }>} pages
 * @returns {object}
 */
export function extractCourseIdentity(fullText = '', pages = []) {
  const firstPage = pages[0]?.text || fullText.slice(0, 3000);
  const lines = firstPage.split('\n').map((l) => l.trim()).filter(Boolean);

  let courseCode = '';
  let courseTitle = '';
  let credits = '3.0';
  let snippet = '';
  let foundPage = 1;

  // Search first page for course code
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(COURSE_CODE_REGEX);
    if (match) {
      courseCode = `${match[1]} ${match[2]}`.trim();
      snippet = line;
      foundPage = 1;

      // Extract title: often follows code on the same line after delimiter, or on next line
      const afterCode = line.replace(match[0], '').replace(/^[-–:|\s]+/, '').trim();
      if (afterCode.length > 3 && !afterCode.toLowerCase().includes('syllabus')) {
        courseTitle = afterCode;
      } else if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (
          nextLine.length > 3 &&
          nextLine.length < 80 &&
          !nextLine.toLowerCase().includes('syllabus') &&
          !nextLine.toLowerCase().includes('instructor') &&
          !nextLine.toLowerCase().includes('professor')
        ) {
          courseTitle = nextLine.replace(/^[-–:|\s]+/, '').trim();
        }
      }
      break;
    }
  }

  // Credits extraction (e.g. "3.0 credits", "3 credits", "3 crédits")
  const creditsMatch = fullText.match(/\b([1-6](?:\.0|\.5)?)\s*(?:credits?|crédits?|units?|cr)\b/i);
  if (creditsMatch) {
    credits = creditsMatch[1];
    if (!credits.includes('.')) credits = `${credits}.0`;
  }

  // Clean title
  if (courseTitle) {
    courseTitle = courseTitle.replace(/^[-–:|\s]+/, '').replace(/[-–:|\s]+$/, '').trim();
  }

  // Fallback defaults if code missing
  if (!courseCode) {
    courseCode = 'UNIV 1000';
    courseTitle = 'University Course';
  } else if (!courseTitle) {
    courseTitle = `${courseCode} Course`;
  }

  // Difficulty estimation based on code level and department
  let difficulty = 'Medium';
  const levelMatch = courseCode.match(/\b\d(\d{2,3})/);
  if (levelMatch) {
    const levelDigit = parseInt(courseCode.match(/\b(\d)\d{2,3}/)?.[1] || '1', 10);
    if (levelDigit >= 3) difficulty = 'High';
    else if (
      courseCode.toLowerCase().includes('csi') ||
      courseCode.toLowerCase().includes('mat') ||
      courseCode.toLowerCase().includes('seg')
    ) {
      difficulty = 'High';
    } else if (levelDigit === 1) {
      difficulty = 'Medium';
    }
  }

  return {
    code: courseCode,
    name: courseCode,
    fullTitle: `${courseCode} — ${courseTitle}`,
    title: courseTitle,
    credits,
    difficulty,
    sourceSnippet: snippet || courseCode,
    pageNumber: foundPage,
    confidence: courseCode !== 'UNIV 1000' ? 'high' : 'low',
  };
}

/**
 * Extracts instructor and teaching team contact info
 * 
 * @param {string} fullText
 * @param {Array<{ pageNumber: number, text: string }>} pages
 * @returns {object}
 */
export function extractInstructorInfo(fullText = '', pages = []) {
  const firstPage = pages[0]?.text || fullText.slice(0, 4000);
  const lines = firstPage.split('\n').map((l) => l.trim()).filter(Boolean);

  let instructorName = '';
  let email = '';
  let office = '';
  let officeHours = '';
  let snippet = '';

  // Email regex
  const emailMatch = fullText.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
  if (emailMatch) {
    email = emailMatch[1];
  }

  // Instructor regex patterns (English & French)
  const instructorRegex = /(?:Instructor|Professor|Prof\.|Teacher|Lecturer|Professeur|Enseignant|Chargé de cours)[:\s]+([^\n,;(]+)/i;

  for (const line of lines) {
    const match = line.match(instructorRegex);
    if (match) {
      instructorName = match[1].trim();
      snippet = line;
      break;
    } else if (line.match(/^Dr\.\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/)) {
      instructorName = line.match(/^Dr\.\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/)[0];
      snippet = line;
      break;
    }
  }

  // Office hours
  const officeHoursMatch = fullText.match(
    /(?:Office\s*Hours|Heures\s*de\s*bureau|Disponibilités)[:\s]+([^\n;]+)/i
  );
  if (officeHoursMatch) {
    officeHours = officeHoursMatch[1].trim();
  }

  // Office location (stop before pipe, comma, or office hours delimiter)
  const officeMatch = fullText.match(/(?:Office|Bureau)[:\s]+([^|\n;,]+)/i);
  if (officeMatch) {
    const cand = officeMatch[1].trim();
    if (!cand.toLowerCase().includes('hour') && !cand.toLowerCase().includes('disponib')) {
      office = cand;
    }
  }

  return {
    instructor: instructorName || '',
    email: email || '',
    office: office || '',
    officeHours: officeHours || '',
    sourceSnippet: snippet || instructorName || email || 'Not specified in syllabus',
    pageNumber: 1,
    confidence: instructorName ? 'high' : 'low',
  };
}

/**
 * Extracts class schedule and lecture times
 * 
 * @param {string} fullText
 * @returns {object}
 */
export function extractScheduleInfo(fullText = '') {
  // Matches days like Mon / Wed 10:00 - 11:30 or Mardi 13h00 - 14h30
  const schedulePatterns = [
    // Pattern: Mon / Wed 10:00 - 11:30 or Mon/Wed 10:00-11:30
    /\b((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:\s*[/&,]\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))*)\s*(?:at|@|:)?\s*([0-2]?\d(?::\d{2})?\s*(?:am|pm)?\s*[-–]\s*[0-2]?\d(?::\d{2})?\s*(?:am|pm)?)/i,
    // French: Lundi / Mercredi 10h00 - 11h30
    /\b((?:Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche|Lun|Mar|Mer|Jeu|Ven)(?:\s*[/&,]\s*(?:Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche|Lun|Mar|Mer|Jeu|Ven))*)\s*(?:de)?\s*([0-2]?\d[h:]\d{0,2}\s*[-–]\s*[0-2]?\d[h:]\d{0,2})/i,
  ];

  for (const pattern of schedulePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      const scheduleString = `${match[1]} ${match[2]}`.trim();
      return {
        schedule: scheduleString,
        sourceSnippet: match[0],
        confidence: 'high',
      };
    }
  }

  return {
    schedule: 'Schedule to be confirmed',
    sourceSnippet: 'Not specified',
    confidence: 'low',
  };
}

/**
 * Extracts weekly syllabus topics, descriptions, and required readings
 * 
 * @param {string} fullText
 * @param {Array<{ pageNumber: number, text: string }>} pages
 * @param {string} courseName
 * @returns {Array<object>}
 */
export function extractWeeklyTopics(fullText = '', pages = [], courseName = '') {
  const topics = [];
  const linesWithPages = [];

  // Flatten lines with their respective page numbers
  if (pages && pages.length > 0) {
    pages.forEach((p) => {
      p.text.split('\n').forEach((line) => {
        linesWithPages.push({ line: line.trim(), pageNumber: p.pageNumber });
      });
    });
  } else {
    fullText.split('\n').forEach((line) => {
      linesWithPages.push({ line: line.trim(), pageNumber: 1 });
    });
  }

  // Regex to match "Week 1", "W1", "Semaine 1", "Module 2", "Session 3"
  const weekRegex = /^(?:Week|Module|Semaine|Séance|Session|W)\s*(\d+)[:\s.-]+(.*)/i;
  let lastWeekNum = 0;

  for (let i = 0; i < linesWithPages.length; i++) {
    const { line, pageNumber } = linesWithPages[i];
    if (!line) continue;

    const match = line.match(weekRegex);
    if (match) {
      const weekNum = parseInt(match[1], 10);
      if (weekNum > 0 && weekNum <= 16 && weekNum !== lastWeekNum) {
        lastWeekNum = weekNum;
        const rest = match[2].trim();

        // Extract reading if in parentheses or with "Reading:" / "Lectures:"
        const readingMatch = rest.match(/(?:Reading|Readings|Lectures|Ch\.|Chapter|Chapitre|Livre)[:\s]+([^;()]+)/i);
        const practiceMatch = rest.match(/(?:Practice|Exercises|Exercices|Problem Set|Problèmes)[:\s]+([^;()]+)/i);

        let title = rest;
        if (readingMatch) {
          title = title.replace(readingMatch[0], '');
        }
        if (practiceMatch) {
          title = title.replace(practiceMatch[0], '');
        }
        title = title.replace(/[()[\]{}–-]+$/, '').replace(/^[:–-]+/, '').trim();

        // If title is too brief, inspect subsequent line
        let description = '';
        if (i + 1 < linesWithPages.length) {
          const nextLine = linesWithPages[i + 1].line;
          if (
            nextLine.length > 10 &&
            !nextLine.match(weekRegex) &&
            !nextLine.match(/^(?:Assignment|Devoir|Exam|Examen)/i)
          ) {
            description = nextLine;
          }
        }

        const requiredReadings = readingMatch ? readingMatch[1].trim() : '';
        const practiceProblems = practiceMatch ? practiceMatch[1].trim() : '';

        topics.push({
          id: `topic-${Date.now()}-${weekNum}-${Math.random().toString(36).substring(2, 6)}`,
          weekNumber: weekNum,
          week: weekNum,
          courseName,
          title: title || `Week ${weekNum} Core Topic`,
          description: description || `Weekly core lecture topics and learning objectives for week ${weekNum}.`,
          requiredReadings,
          requiredReading: requiredReadings,
          practiceProblems,
          estimatedHours: 3.0,
          status: 'not_started',
          confidence: 3,
          pageNumber,
          sourceSnippet: line,
          extractionConfidence: title ? 'high' : 'medium',
        });
      }
    }
  }

  // If no explicit "Week X" lines were found, inspect tabular or numbered lists
  if (topics.length === 0) {
    const numberedTopicRegex = /^(\d{1,2})\.\s+([A-Z][^\n]{6,80})/;
    for (const item of linesWithPages) {
      const match = item.line.match(numberedTopicRegex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= 1 && num <= 14) {
          topics.push({
            id: `topic-${Date.now()}-${num}-${Math.random().toString(36).substring(2, 6)}`,
            weekNumber: num,
            week: num,
            courseName,
            title: match[2].trim(),
            description: `Topic ${num} curriculum milestone.`,
            requiredReadings: '',
            requiredReading: '',
            practiceProblems: '',
            estimatedHours: 3.0,
            status: 'not_started',
            confidence: 3,
            pageNumber: item.pageNumber,
            sourceSnippet: item.line,
            extractionConfidence: 'medium',
          });
        }
      }
    }
  }

  return topics;
}

/**
 * Extracts assignments, homeworks, and problem sets with deadlines and grading weights
 * 
 * @param {string} fullText
 * @param {Array<{ pageNumber: number, text: string }>} pages
 * @param {string} courseName
 * @param {number} [fallbackYear]
 * @returns {Array<object>}
 */
export function extractAssignments(fullText = '', pages = [], courseName = '', fallbackYear = new Date().getFullYear()) {
  const assignments = [];
  const linesWithPages = [];

  if (pages && pages.length > 0) {
    pages.forEach((p) => {
      p.text.split('\n').forEach((line) => {
        linesWithPages.push({ line: line.trim(), pageNumber: p.pageNumber });
      });
    });
  } else {
    fullText.split('\n').forEach((line) => {
      linesWithPages.push({ line: line.trim(), pageNumber: 1 });
    });
  }

  // Keywords indicating an assignment or homework deliverable
  const assignmentRegex = /\b(?:Assignment|Devoir|Problem\s*Set|Homework|Lab\s*Report|Project\s*Milestone|Projet\s*Étape|TP)\s*(\d+|[A-Z])?\b/i;

  linesWithPages.forEach(({ line, pageNumber }) => {
    if (!line) return;

    if (assignmentRegex.test(line)) {
      // Exclude exam lines (e.g. "Exam Assignment")
      if (line.toLowerCase().includes('exam') || line.toLowerCase().includes('intra')) return;

      // Extract due date
      const dateResult = parseSyllabusDate(line, fallbackYear);

      // Skip generic summary category lines that lack a specific number or date e.g. "Assignments: 25%" or "Assignments (2): 25%"
      const isCategorySummaryOnly =
        !dateResult.date &&
        /^(?:Assignments?|Devoirs?|Homework|Problem\s*Sets?)(?:\s*\(\d+\))?\s*[:–-]?\s*\d{1,2}\s*%/i.test(line);
      if (isCategorySummaryOnly) return;

      // Extract weight percentage if mentioned e.g. "15%" or "10 %"
      const weightMatch = line.match(/(\d{1,2}(?:\.\d+)?)\s*%/);
      const weight = weightMatch ? Number(weightMatch[1]) : null;

      // Clean title
      const title = line.split(/[:–-]/)[0].trim() || 'Course Assignment';

      // Avoid duplicates
      const isDuplicate = assignments.some((a) => a.title.toLowerCase() === title.toLowerCase());
      if (!isDuplicate && title.length < 60) {
        assignments.push({
          id: `asg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title,
          course: courseName,
          dueDate: dateResult.date || '',
          isYearEstimated: dateResult.isYearEstimated,
          priority: weight && weight >= 15 ? 'High' : 'Medium',
          estimatedWorkload: weight && weight >= 15 ? 6 : 4,
          weightPercent: weight,
          completed: false,
          pageNumber,
          sourceSnippet: line,
          confidence: dateResult.date ? 'high' : 'medium',
        });
      }
    }
  });

  return assignments;
}

/**
 * Extracts exams, midterms, and finals with dates, locations, and weights
 * 
 * @param {string} fullText
 * @param {Array<{ pageNumber: number, text: string }>} pages
 * @param {string} courseName
 * @param {number} [fallbackYear]
 * @returns {Array<object>}
 */
export function extractExams(fullText = '', pages = [], courseName = '', fallbackYear = new Date().getFullYear()) {
  const exams = [];
  const linesWithPages = [];

  if (pages && pages.length > 0) {
    pages.forEach((p) => {
      p.text.split('\n').forEach((line) => {
        linesWithPages.push({ line: line.trim(), pageNumber: p.pageNumber });
      });
    });
  } else {
    fullText.split('\n').forEach((line) => {
      linesWithPages.push({ line: line.trim(), pageNumber: 1 });
    });
  }

  // Keywords indicating exams
  const examKeywordsRegex = /\b(?:Midterm|Mid-Term|Final\s*Exam|Examen\s*intra|Examen\s*de\s*mi-session|Examen\s*final|Examen\s*sommatif)\s*(\d+|[A-Z])?\b/i;

  linesWithPages.forEach(({ line, pageNumber }) => {
    if (!line) return;

    if (examKeywordsRegex.test(line)) {
      const weightMatch = line.match(/(\d{1,2}(?:\.\d+)?)\s*%/);
      const weight = weightMatch ? Number(weightMatch[1]) : null;

      const dateResult = parseSyllabusDate(line, fallbackYear);

      // Determine exam title
      let title = 'Midterm Exam';
      if (line.toLowerCase().includes('final')) {
        title = 'Final Exam';
      } else if (/\b(?:intra|midterm(?:\s*exam)?)\s*2\b/i.test(line)) {
        title = 'Midterm Exam 2';
      } else if (/\b(?:intra|midterm(?:\s*exam)?)\s*1\b/i.test(line)) {
        title = 'Midterm Exam 1';
      } else if (line.toLowerCase().includes('intra') || line.toLowerCase().includes('mi-session')) {
        title = 'Examen Intra';
      }

      // Location match e.g. "Hall 150", "Montpetit 202"
      const locMatch = line.match(/(?:Location|Room|Salle|Pavillon)[:\s]+([^,;\n)]+)/i);
      const location = locMatch ? locMatch[1].trim() : '';

      // Skip generic category summary lines (e.g. "Midterm Exam: 30%") if it has no date
      const isExamCategorySummaryOnly =
        !dateResult.date &&
        /^(?:Midterm(?:\s*Exam)?|Final(?:\s*Exam)?|Examen\s*(?:intra|final|de\s*mi-session))\s*[:–-]?\s*\d{1,2}\s*%/i.test(line);

      // Check if this exam (or its generic counterpart) was already recorded
      const existing = exams.find((e) => {
        const eTitle = e.title.toLowerCase();
        const curTitle = title.toLowerCase();
        return (
          eTitle === curTitle ||
          (eTitle.includes('midterm') && curTitle.includes('midterm')) ||
          (eTitle.includes('intra') && curTitle.includes('intra')) ||
          (eTitle.includes('final') && curTitle.includes('final'))
        );
      });

      if (existing) {
        // If the new one has a date, upgrade the existing one
        if (dateResult.date && !existing.date) {
          existing.title = title;
          existing.date = dateResult.date;
          existing.isYearEstimated = dateResult.isYearEstimated;
          if (location) existing.location = location;
          if (weight) existing.weightPercent = weight;
          existing.sourceSnippet = line;
          existing.confidence = 'high';
        }
      } else if (!isExamCategorySummaryOnly) {
        exams.push({
          id: `exam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title,
          course: courseName,
          date: dateResult.date || '',
          isYearEstimated: dateResult.isYearEstimated,
          location,
          notes: weight ? `Grading weight: ${weight}% of final grade` : '',
          priority: 'High',
          estimatedWorkload: title.toLowerCase().includes('final') ? 10 : 8,
          weightPercent: weight,
          pageNumber,
          sourceSnippet: line,
          confidence: dateResult.date ? 'high' : 'medium',
        });
      }
    }
  });

  return exams;
}

/**
 * Extracts grading breakdown schemes (% weights totaling 100%)
 * 
 * @param {string} fullText
 * @param {Array<{ pageNumber: number, text: string }>} pages
 * @returns {Array<{ component: string, weightPercent: number, sourceSnippet: string }>}
 */
export function extractGradingScheme(fullText = '') {
  const breakdown = [];
  const lines = fullText.split('\n').map((l) => l.trim()).filter(Boolean);

  // Look for percentage lines e.g. "Assignments: 25%" or "Examen final ... 40%"
  const gradeItemRegex = /^([A-Za-zÀ-ÿ\s/&–-]+)[:\s.]+([0-9]{1,2}(?:\.[0-9]+)?)\s*%/;

  lines.forEach((line) => {
    const match = line.match(gradeItemRegex);
    if (match) {
      const comp = match[1].trim();
      const pct = parseFloat(match[2]);
      if (
        comp.length > 2 &&
        comp.length < 40 &&
        pct > 0 &&
        pct <= 100 &&
        !comp.toLowerCase().includes('minimum')
      ) {
        breakdown.push({
          component: comp,
          weightPercent: pct,
          sourceSnippet: line,
        });
      }
    }
  });

  return breakdown;
}

/**
 * Master modular pipeline: parses a complete university syllabus document
 * 
 * @param {object} params
 * @param {string} params.text Plain text content
 * @param {Array<{ pageNumber: number, text: string }>} [params.pages] Page text items
 * @param {string} [params.fileName] Original filename
 * @param {number} [params.colorIndex] Index for assigning distinct palette colors
 * @param {number} [params.fallbackYear] Year to assume when year is omitted
 * @returns {object} Extracted structured course and semester deliverables
 */
export function parseSyllabusDocument({
  text = '',
  pages = [],
  fileName = '',
  colorIndex = 0,
  fallbackYear = new Date().getFullYear(),
} = {}) {
  const fullText = text || pages.map((p) => p.text).join('\n\n');
  const language = detectLanguage(fullText);

  // 1. Identity & Course code
  const identity = extractCourseIdentity(fullText, pages);

  // If filename has a recognizable course code e.g. "CSI2110_Syllabus.pdf", use as fallback/verifier
  if (fileName && identity.code === 'UNIV 1000') {
    const fileMatch = fileName.match(COURSE_CODE_REGEX);
    if (fileMatch) {
      identity.code = `${fileMatch[1]} ${fileMatch[2]}`.trim();
      identity.name = identity.code;
      identity.fullTitle = `${identity.code} Course`;
    }
  }

  // 2. Instructor & Contact
  const instructorInfo = extractInstructorInfo(fullText, pages);

  // 3. Schedule
  const scheduleInfo = extractScheduleInfo(fullText);

  // 4. Weekly Topics
  const topics = extractWeeklyTopics(fullText, pages, identity.name);

  // 5. Assignments
  const assignments = extractAssignments(fullText, pages, identity.name, fallbackYear);

  // 6. Exams
  const exams = extractExams(fullText, pages, identity.name, fallbackYear);

  // 7. Grading Scheme
  const gradingScheme = extractGradingScheme(fullText, pages);

  // Course Color assignment
  const color = PRESET_COURSE_COLORS[colorIndex % PRESET_COURSE_COLORS.length];

  // Extraction quality metrics
  const totalExtractedItems = topics.length + assignments.length + exams.length;
  const extractionQuality =
    totalExtractedItems >= 8 ? 'High' : totalExtractedItems >= 3 ? 'Medium' : 'Needs Review';

  return {
    course: {
      id: `course-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: identity.name,
      code: identity.code,
      title: identity.title,
      fullTitle: identity.fullTitle,
      instructor: instructorInfo.instructor,
      email: instructorInfo.email,
      office: instructorInfo.office,
      officeHours: instructorInfo.officeHours,
      schedule: scheduleInfo.schedule,
      credits: identity.credits,
      difficulty: identity.difficulty,
      color,
      createdAt: new Date().toISOString(),
    },
    topics,
    assignments,
    exams,
    gradingScheme,
    metadata: {
      fileName,
      language,
      extractionQuality,
      totalTopicsExtracted: topics.length,
      totalAssignmentsExtracted: assignments.length,
      totalExamsExtracted: exams.length,
      parsedAt: new Date().toISOString(),
    },
  };
}
