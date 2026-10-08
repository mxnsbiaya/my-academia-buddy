import { describe, it, expect } from 'vitest';
import {
  detectLanguage,
  parseSyllabusDate,
  extractCourseIdentity,
  extractInstructorInfo,
  extractWeeklyTopics,
  extractAssignments,
  extractExams,
  extractGradingScheme,
  parseSyllabusDocument,
} from '../services/syllabusParser';

describe('Intelligent Syllabus Parser Service', () => {
  const englishSyllabusText = `
CSI 2110 — Data Structures and Algorithms
University of Ottawa | Faculty of Engineering | 3.0 credits
Instructor: Dr. Lucia Moura (Email: lmoura@uottawa.ca)
Office: STE 5012 | Office Hours: Tue & Thu 15:00 - 16:30
Lectures: Mon / Wed 10:00 - 11:30 | Location: Marion Hall 150

Course Evaluation & Grading Scheme:
Assignments: 25%
Midterm Exam: 30%
Final Exam: 40%
Lab Participation: 5%

Weekly Lecture Schedule:
Week 1: Algorithmic Complexity & Big-O Notation (Reading: CLRS Ch. 3, Goodrich Ch. 1; Practice: Exercises 1.1-1.8)
Week 2: Stacks, Queues, and Linked Lists (Reading: Goodrich Ch. 6; Practice: Circular Queue Lab)
Week 3: Binary Heaps & Priority Queues (Reading: Goodrich Ch. 8.1-8.3; Practice: Up-heap bubbling)
Week 4: Binary Search Trees & AVL Balance Rotations (Reading: Goodrich Ch. 10.1; Practice: Single and Double Rotations)

Deliverables & Exams:
Assignment 1: Due on October 18, 2026 (Weight: 10%)
Assignment 2: Due on November 15, 2026 (Weight: 15%)
Midterm Exam 1: October 28, 2026 (Weight: 30%, Location: Marion Hall 150)
Final Exam: December 14, 2026 (Weight: 40%)
`;

  const frenchSyllabusText = `
MAT 1748 — Mathématiques discrètes pour l'informatique
Faculté des sciences | 3.0 crédits
Professeur: Prof. Joseph Khoury
Courriel: jkhoury@uottawa.ca
Bureau: Montpetit 202
Horaire: Mardi et Jeudi 13h00 - 14h30

Barème d'évaluation :
Devoirs : 20%
Examen intra : 35%
Examen final : 45%

Programme hebdomadaire :
Semaine 1: Logique des propositions et tables de vérité (Lectures: Rosen Chapitre 1.1 - 1.3)
Semaine 2: Quantificateurs et logique des prédicats (Lectures: Rosen Chapitre 1.4)
Semaine 3: Méthodes de preuve directe et par contradiction (Lectures: Rosen Chapitre 1.7)
Semaine 4: Induction mathématique et bon ordre (Lectures: Rosen Chapitre 5.1; Exercices: Problèmes 1 à 15)

Évaluations et examens :
Devoir 1: À remettre le 15 octobre (Pondération: 10%)
Devoir 2: À remettre le 20 novembre (Pondération: 10%)
Examen intra: 3 novembre (Pondération: 35%, Salle: Montpetit 202)
Examen final: 18 décembre (Pondération: 45%)
`;

  describe('detectLanguage', () => {
    it('accurately identifies English and French syllabi', () => {
      expect(detectLanguage(englishSyllabusText)).toBe('en');
      expect(detectLanguage(frenchSyllabusText)).toBe('fr');
    });
  });

  describe('parseSyllabusDate', () => {
    it('parses English named dates with explicit year', () => {
      const res = parseSyllabusDate('Due on October 18, 2026');
      expect(res.date).toBe('2026-10-18');
      expect(res.isYearEstimated).toBe(false);
      expect(res.confidence).toBe('high');
    });

    it('parses French dates and marks year as estimated when omitted', () => {
      const res = parseSyllabusDate('À remettre le 15 octobre', 2026);
      expect(res.date).toBe('2026-10-15');
      expect(res.isYearEstimated).toBe(true);
      expect(res.confidence).toBe('medium');
    });

    it('parses ISO date format accurately', () => {
      const res = parseSyllabusDate('Deadline: 2026-11-20');
      expect(res.date).toBe('2026-11-20');
      expect(res.isYearEstimated).toBe(false);
    });
  });

  describe('extractCourseIdentity', () => {
    it('extracts course code, title, and credits from English syllabus', () => {
      const id = extractCourseIdentity(englishSyllabusText);
      expect(id.code).toBe('CSI 2110');
      expect(id.title).toContain('Data Structures and Algorithms');
      expect(id.credits).toBe('3.0');
      expect(id.difficulty).toBe('High');
      expect(id.confidence).toBe('high');
    });

    it('extracts French course code and title correctly', () => {
      const id = extractCourseIdentity(frenchSyllabusText);
      expect(id.code).toBe('MAT 1748');
      expect(id.title).toContain('Mathématiques discrètes');
      expect(id.credits).toBe('3.0');
    });
  });

  describe('extractInstructorInfo', () => {
    it('extracts professor name, email, office and office hours', () => {
      const info = extractInstructorInfo(englishSyllabusText);
      expect(info.instructor).toContain('Dr. Lucia Moura');
      expect(info.email).toBe('lmoura@uottawa.ca');
      expect(info.office).toContain('STE 5012');
    });

    it('extracts French instructor info and email', () => {
      const info = extractInstructorInfo(frenchSyllabusText);
      expect(info.instructor).toContain('Prof. Joseph Khoury');
      expect(info.email).toBe('jkhoury@uottawa.ca');
    });
  });

  describe('extractWeeklyTopics', () => {
    it('extracts weekly topics with readings and practice problems for English syllabus', () => {
      const topics = extractWeeklyTopics(englishSyllabusText, [], 'CSI 2110');
      expect(topics.length).toBe(4);
      expect(topics[0].weekNumber).toBe(1);
      expect(topics[0].title).toContain('Algorithmic Complexity');
      expect(topics[0].requiredReadings).toContain('CLRS Ch. 3');
      expect(topics[0].practiceProblems).toContain('Exercises 1.1-1.8');
    });

    it('extracts French weekly topics (Semaine 1-4) with readings and exercises', () => {
      const topics = extractWeeklyTopics(frenchSyllabusText, [], 'MAT 1748');
      expect(topics.length).toBe(4);
      expect(topics[0].weekNumber).toBe(1);
      expect(topics[0].title).toContain('Logique des propositions');
      expect(topics[0].requiredReadings).toContain('Rosen Chapitre 1.1');
      expect(topics[3].weekNumber).toBe(4);
      expect(topics[3].practiceProblems).toContain('Problèmes 1 à 15');
    });
  });

  describe('extractAssignments', () => {
    it('extracts deliverables, deadlines, and percentage weights', () => {
      const assignments = extractAssignments(englishSyllabusText, [], 'CSI 2110', 2026);
      expect(assignments.length).toBe(2);
      expect(assignments[0].title).toContain('Assignment 1');
      expect(assignments[0].dueDate).toBe('2026-10-18');
      expect(assignments[0].weightPercent).toBe(10);
      expect(assignments[1].title).toContain('Assignment 2');
      expect(assignments[1].dueDate).toBe('2026-11-15');
      expect(assignments[1].weightPercent).toBe(15);
    });

    it('extracts French assignments (Devoir 1 and 2)', () => {
      const assignments = extractAssignments(frenchSyllabusText, [], 'MAT 1748', 2026);
      expect(assignments.length).toBe(2);
      expect(assignments[0].title).toContain('Devoir 1');
      expect(assignments[0].dueDate).toBe('2026-10-15');
      expect(assignments[0].weightPercent).toBe(10);
      expect(assignments[0].isYearEstimated).toBe(true);
    });
  });

  describe('extractExams', () => {
    it('extracts midterm and final exams with dates and locations', () => {
      const exams = extractExams(englishSyllabusText, [], 'CSI 2110', 2026);
      expect(exams.length).toBe(2);
      expect(exams[0].title).toContain('Midterm Exam 1');
      expect(exams[0].date).toBe('2026-10-28');
      expect(exams[0].location).toContain('Marion Hall 150');
      expect(exams[1].title).toContain('Final Exam');
      expect(exams[1].date).toBe('2026-12-14');
    });

    it('extracts French exams (Examen intra and Examen final)', () => {
      const exams = extractExams(frenchSyllabusText, [], 'MAT 1748', 2026);
      expect(exams.length).toBe(2);
      expect(exams[0].title).toContain('Examen Intra');
      expect(exams[0].date).toBe('2026-11-03');
      expect(exams[1].title).toContain('Final Exam');
      expect(exams[1].date).toBe('2026-12-18');
    });
  });

  describe('extractGradingScheme', () => {
    it('extracts evaluation components with weights totaling ~100%', () => {
      const scheme = extractGradingScheme(englishSyllabusText);
      expect(scheme.length).toBe(4);
      const total = scheme.reduce((sum, item) => sum + item.weightPercent, 0);
      expect(total).toBe(100);
    });
  });

  describe('parseSyllabusDocument (Full Pipeline)', () => {
    it('transforms raw syllabus text into structured course and semester entities', () => {
      const result = parseSyllabusDocument({
        text: englishSyllabusText,
        fileName: 'CSI2110_Syllabus_Fall2026.pdf',
        colorIndex: 1,
        fallbackYear: 2026,
      });

      expect(result.course.name).toBe('CSI 2110');
      expect(result.course.instructor).toContain('Dr. Lucia Moura');
      expect(result.topics.length).toBe(4);
      expect(result.assignments.length).toBe(2);
      expect(result.exams.length).toBe(2);
      expect(result.metadata.extractionQuality).toBe('High');
      expect(result.metadata.language).toBe('en');
    });
  });
});
