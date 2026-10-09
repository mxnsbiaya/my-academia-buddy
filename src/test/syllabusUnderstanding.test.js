import { describe, it, expect } from 'vitest';
import {
  parseSyllabusDate,
  parseTime,
  extractAcademicContext,
  extractAssessmentType,
  extractAssignments,
  extractExams,
  parseSyllabusDocument,
} from '../services/syllabusParser';

describe('Phase 4: Bilingual Syllabus Understanding Engine', () => {
  const mixedSyllabusSample = `
UNIVERSITÉ D'OTTAWA / UNIVERSITY OF OTTAWA
Faculté de génie / Faculty of Engineering
Session d'automne 2026 / Fall 2026

CSI 2510 — Structures de données et algorithmes / Data Structures
Professeur: Dr. Jean-Michel Smith (Courriel: jsmith@uottawa.ca)
Bureau: SITE 4022 | Heures de bureau: Mardi 14h00 - 16h00
Horaire: Lundi 10h00 - 11h30 et Mercredi 10h00 - 11h30 | Salle: STE Hall A

Évaluations et dates limites / Assessments & Deadlines:
1. Devoir 1: Programmation récursive et complexité — À remettre le 12 octobre à 23h59 (Pondération: 8%)
2. Travail pratique 1: Arbres binaires et AVL — À remettre le 28 octobre à 23h59 (Pondération: 12%)
3. Quiz 1: Tables de hachage — 10 novembre à 17h00 (Pondération: 5%)
4. Laboratoire 2: Rapport de mesure de performance — À remettre le 18 novembre (Pondération: 5%)
5. Problem Set 3: Graphes et parcours BFS/DFS — Due on November 25, 2026 at 11:59 PM (Weight: 10%)
6. Projet final: Moteur de recherche vectoriel — À remettre le 10 décembre (Pondération: 15%)
7. Examen intra: 4 novembre de 19:00 - 21:00 (Pondération: 20%, Salle: Montpetit 202)
8. Examen final: 17 décembre (Pondération: 25%)
9. Assignment TBA: Date à déterminer par le département (Pondération: 5%)
`;

  it('extracts university academic context (institution, term, year)', () => {
    const context = extractAcademicContext(mixedSyllabusSample);
    expect(context.institution).toContain("Université d'Ottawa");
    expect(context.term).toBe('Fall');
    expect(context.year).toBe(2026);
  });

  it('accurately parses submission times and time ranges', () => {
    expect(parseTime('À remettre le 12 octobre à 23h59')).toBe('23h59');
    expect(parseTime('Due on November 25 at 11:59 PM')).toBe('11:59 PM');
    expect(parseTime('Examen intra de 19:00 - 21:00')).toBe('19:00 - 21:00');
    expect(parseTime('Horaire: Mardi 14h00 - 16h00')).toBe('14h00 - 16h00');
  });

  it('preserves original French and English assessment titles without generic replacement', () => {
    const assignments = extractAssignments(mixedSyllabusSample, [], 'CSI 2510', 2026);
    const titles = assignments.map((a) => a.title);

    // Verifies original descriptive names are preserved
    expect(titles.some((t) => t.includes('Devoir 1'))).toBe(true);
    expect(titles.some((t) => t.includes('Travail pratique 1'))).toBe(true);
    expect(titles.some((t) => t.includes('Quiz 1'))).toBe(true);
    expect(titles.some((t) => t.includes('Laboratoire 2'))).toBe(true);
    expect(titles.some((t) => t.includes('Problem Set 3'))).toBe(true);
    expect(titles.some((t) => t.includes('Projet final'))).toBe(true);
  });

  it('accurately assigns assessment types (assignment, lab, quiz, project, exam)', () => {
    expect(extractAssessmentType('Devoir 1: Récursion')).toBe('assignment');
    expect(extractAssessmentType('Travail pratique 2')).toBe('assignment');
    expect(extractAssessmentType('Quiz 1: Hachage')).toBe('quiz');
    expect(extractAssessmentType('Laboratoire 2: Rapport')).toBe('lab');
    expect(extractAssessmentType('Projet final: Moteur de recherche')).toBe('project');
    expect(extractAssessmentType('Examen intra')).toBe('exam');
    expect(extractAssessmentType('Midterm 2')).toBe('exam');
  });

  it('flags ambiguous dates or TBA deadlines for student review', () => {
    const tbaDate = parseSyllabusDate('Date à déterminer par le département');
    expect(tbaDate.date).toBeNull();
    expect(tbaDate.needsReview).toBe(true);
    expect(tbaDate.reviewReason).toContain('TBA');

    // Date missing explicit year flags for review with reason
    const omittedYearDate = parseSyllabusDate('12 octobre', 2026);
    expect(omittedYearDate.date).toBe('2026-10-12');
    expect(omittedYearDate.isYearEstimated).toBe(true);
    expect(omittedYearDate.needsReview).toBe(true);
    expect(omittedYearDate.reviewReason).toBeDefined();

    // Explicit date with year does not require review
    const explicitDate = parseSyllabusDate('November 25, 2026');
    expect(explicitDate.date).toBe('2026-11-25');
    expect(explicitDate.isYearEstimated).toBe(false);
    expect(explicitDate.needsReview).toBe(false);
  });

  it('extracts exams with dates, locations, and time ranges', () => {
    const exams = extractExams(mixedSyllabusSample, [], 'CSI 2510', 2026);
    expect(exams.length).toBe(2);

    const midterm = exams.find((e) => e.title.includes('Intra'));
    expect(midterm).toBeDefined();
    expect(midterm.date).toBe('2026-11-04');
    expect(midterm.location).toContain('Montpetit 202');
    expect(midterm.time).toBe('19:00 - 21:00');
    expect(midterm.weightPercent).toBe(20);

    const finalExam = exams.find((e) => e.title.includes('Final'));
    expect(finalExam).toBeDefined();
    expect(finalExam.date).toBe('2026-12-17');
    expect(finalExam.weightPercent).toBe(25);
  });

  it('parses complete mixed document with itemsNeedingReview metadata', () => {
    const parsed = parseSyllabusDocument({
      text: mixedSyllabusSample,
      fileName: 'CSI2510_Structures_Automne2026.pdf',
    });

    expect(parsed.course.code).toBe('CSI 2510');
    expect(parsed.course.term).toBe('Fall');
    expect(parsed.course.year).toBe(2026);
    expect(parsed.assignments.length).toBeGreaterThanOrEqual(5);
    expect(parsed.exams.length).toBe(2);
    expect(parsed.metadata.itemsNeedingReview).toBeGreaterThanOrEqual(1);
  });

  it('strictly suppresses false assignments from general grading policy statements', () => {
    // Problem identified in Phase 4.1 prompt:
    const policyParagraph = `
Grading Policy and Course Breakdown:
Projects account for 42% and assignments account for 39% of the final grade.
Participation and in-class activities make up 19% of the total mark.
Midterm exams are worth 30% of the overall grade.
Les devoirs et examens comptent pour 60% de la note finale.
Evaluation criteria: Homework 25%, Labs 15%, Final 60%.
`;

    const assignments = extractAssignments(policyParagraph, [], 'SEG 3103', 2026);
    const exams = extractExams(policyParagraph, [], 'SEG 3103', 2026);

    // General grading policy lines must NEVER create assignments or exams
    expect(assignments.length).toBe(0);
    expect(exams.length).toBe(0);

    // But extractGradingScheme should capture the category weights accurately
    const parsed = parseSyllabusDocument({ text: policyParagraph });
    expect(parsed.assignments.length).toBe(0);
    expect(parsed.exams.length).toBe(0);
    expect(parsed.gradingScheme.some((g) => g.component.toLowerCase().includes('project'))).toBe(true);
    expect(parsed.gradingScheme.some((g) => g.component.toLowerCase().includes('assignment'))).toBe(true);
  });

  it('distinguishes genuine numbered assignments from category weight totals', () => {
    const syllabusWithCategoriesAndTasks = `
Grading Breakdown:
Assignments: 30%
Projects: 40%
Final Exam: 30%

Schedule of Deliverables:
Assignment 1 — October 15 — 10%
Assignment 2 — November 10 — 20%
Project Phase 1: Due on October 30 (15%)
Project Final: Due on December 2 (25%)
Midterm 2 — November 12 — 25%
`;

    const assignments = extractAssignments(syllabusWithCategoriesAndTasks, [], 'CSI 2110', 2026);
    const exams = extractExams(syllabusWithCategoriesAndTasks, [], 'CSI 2110', 2026);

    // Only the 4 concrete assignments and 1 midterm should be extracted
    expect(assignments.length).toBe(4);
    expect(assignments.map((a) => a.title)).toEqual([
      'Assignment 1',
      'Assignment 2',
      'Project Phase 1',
      'Project Final',
    ]);
    expect(assignments[0].dueDate).toBe('2026-10-15');
    expect(assignments[0].weightPercent).toBe(10);

    expect(exams.length).toBe(1);
    expect(exams[0].title).toBe('Midterm Exam 2');
    expect(exams[0].date).toBe('2026-11-12');
  });
});
