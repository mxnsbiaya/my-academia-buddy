import { describe, it, expect } from 'vitest';
import { isScannedPdf } from '../services/pdfExtractor';
import { SAMPLE_SYLLABI_PACK } from '../data/sampleSyllabi';
import { parseSyllabusDocument } from '../services/syllabusParser';

describe('Intelligent Syllabus Import Suite', () => {
  describe('isScannedPdf detection', () => {
    it('detects scanned or image-only PDFs with low character density', () => {
      const scannedDoc = {
        pageCount: 3,
        totalCharacters: 60,
        text: 'Scanned document cover page\nOnly title visible',
        pages: [{ pageNumber: 1, text: 'Only title' }],
      };
      expect(isScannedPdf(scannedDoc)).toBe(true);
    });

    it('identifies standard text-based syllabus PDFs as non-scanned', () => {
      const normalDoc = {
        pageCount: 2,
        totalCharacters: 4500,
        text: 'CSI 2110 syllabus text with full course descriptions and schedules...',
        pages: [{ pageNumber: 1, text: 'Full page text' }],
      };
      expect(isScannedPdf(normalDoc)).toBe(false);
    });
  });

  describe('Bilingual Sample Syllabi Pack (5 Courses)', () => {
    it('successfully parses all 5 sample syllabi in the pack', () => {
      expect(SAMPLE_SYLLABI_PACK.length).toBe(5);

      SAMPLE_SYLLABI_PACK.forEach((sample, idx) => {
        const parsed = parseSyllabusDocument({
          text: sample.text,
          fileName: sample.fileName,
          colorIndex: idx,
          fallbackYear: 2026,
        });

        // 1. Course identity
        expect(parsed.course.name).toBe(sample.courseCode);
        expect(parsed.course.instructor).toBeTruthy();
        expect(parsed.metadata.language).toBe(sample.language);

        // 2. Weekly topics
        expect(parsed.topics.length).toBeGreaterThanOrEqual(4);
        expect(parsed.topics[0].weekNumber).toBe(1);

        // 3. Deliverables and exams
        expect(parsed.assignments.length).toBeGreaterThanOrEqual(1);
        expect(parsed.exams.length).toBeGreaterThanOrEqual(1);

        // 4. Traceability (sourceSnippet)
        expect(parsed.topics[0].sourceSnippet).toBeTruthy();
        expect(parsed.assignments[0].sourceSnippet).toBeTruthy();
      });
    });

    it('correctly extracts French course MAT 1748 with midterm and final', () => {
      const matSample = SAMPLE_SYLLABI_PACK.find((s) => s.courseCode === 'MAT 1748');
      const parsed = parseSyllabusDocument({
        text: matSample.text,
        fileName: matSample.fileName,
        fallbackYear: 2026,
      });

      expect(parsed.metadata.language).toBe('fr');
      expect(parsed.course.name).toBe('MAT 1748');
      expect(parsed.exams.some((e) => e.title.includes('Intra'))).toBe(true);
      expect(parsed.exams.some((e) => e.title.includes('Final'))).toBe(true);
      expect(parsed.assignments.length).toBe(2);
      expect(parsed.gradingScheme.length).toBe(3);
    });

    it('correctly extracts English course CSI 2110 with grading breakdown', () => {
      const csiSample = SAMPLE_SYLLABI_PACK.find((s) => s.courseCode === 'CSI 2110');
      const parsed = parseSyllabusDocument({
        text: csiSample.text,
        fileName: csiSample.fileName,
        fallbackYear: 2026,
      });

      expect(parsed.metadata.language).toBe('en');
      expect(parsed.course.name).toBe('CSI 2110');
      expect(parsed.course.instructor).toContain('Lucia Moura');
      expect(parsed.topics.length).toBe(10);
      expect(parsed.assignments.length).toBe(2);
      expect(parsed.exams.length).toBe(2);
    });
  });
});
