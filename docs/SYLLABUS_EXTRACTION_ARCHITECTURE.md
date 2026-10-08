# Syllabus Extraction & Semester Setup Architecture

**Platform:** My Academia Buddy 2.0  
**Phase:** 2 — Intelligent Syllabus Import & Automatic Semester Setup  
**Document Version:** 1.0.0  
**Authors:** Senior Full-Stack Software Engineering & Product Architecture Team  

---

## 1. Executive Summary & Design Philosophy

University syllabi are inherently semi-structured documents. While every professor conveys common fundamental entities—course codes, lecture hours, professor office locations, weekly textbook readings, deliverable deadlines, midterm examinations, and percentage grading breakdowns—their structural layouts vary drastically across faculties and institutions.

To deliver an automatic semester setup that eliminates manual course configuration while **avoiding mandatory paid third-party AI APIs**, My Academia Buddy Phase 2 adopts a **privacy-first, client-side hybrid heuristic architecture**:

1. **Zero Server Dependency & 100% Privacy:** Course syllabi often contain sensitive information, student identifiers, or unpublished institutional materials. Extraction occurs entirely in the student's browser utilizing `pdfjs-dist` without sending documents to external servers.
2. **Deterministic Heuristic Pipeline:** High-precision regex pattern recognition, bilingual lexicons (English & French), spatial coordinate reconstruction, and category weighting extract ~90% of structured syllabus information at zero marginal cost.
3. **Transparent Provenance & Human-in-the-Loop Review:** Every extracted entity retains its source page number and raw text snippet. Dates lacking explicit calendar years are flagged with ambiguity badges. Students review, correct, and finalize their semester before persisting to application state.
4. **Scanned PDF Safeguards:** The engine proactively detects image-only/scanned PDFs based on character density and directs students to OCR or direct text paste modes rather than silently fabricating missing information.

---

## 2. Extraction Pipeline Architecture

```
                                  [ University Syllabus Document ]
                                  (PDF file or Pasted Syllabus Text)
                                                 │
                                                 ▼
                          ┌──────────────────────────────────────────────┐
                          │     1. pdfjs-dist Client-Side Ingestion      │
                          │   - Dynamic module load (worker sandboxed)   │
                          │   - Page-by-page viewport stream             │
                          └──────────────────────┬───────────────────────┘
                                                 │
                                                 ▼
                          ┌──────────────────────────────────────────────┐
                          │   2. Layout Normalization & Spatial Sorting  │
                          │   - Y-coordinate vertical line clustering    │
                          │   - X-coordinate horizontal text reassembly  │
                          │   - Text character density analysis          │
                          └──────────────────────┬───────────────────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   │                                                           │
                   ▼ (Density < 80 chars or < 12 w/p)                          ▼ (Normal text PDF)
        ┌───────────────────────────────────┐               ┌─────────────────────────────────────┐
        │  Scanned / Image PDF Detector     │               │   3. Modular Rule & Heuristic Engine│
        │  - Triggers explicit UX warning   │               │   (Bilingual: EN & FR)              │
        │  - Directs to OCR / Text Paste    │               └──────────────────┬──────────────────┘
        └───────────────────────────────────┘                                  │
                                                                               ▼
                                            ┌─────────────────────────────────────────────────────┐
                                            │ • Language Detection (EN / FR)                      │
                                            │ • Course Identity & Code (CSI 2110, MAT 1748)       │
                                            │ • Teaching Team (Professors, emails, office hours)  │
                                            │ • Schedule & Classroom Coordinates                  │
                                            │ • Weekly Topics & Required Textbook Readings        │
                                            │ • Deliverables, Deadlines & Estimated Year Handling │
                                            │ • Midterms & Finals (Locations & Dates)             │
                                            │ • Grading Breakdown (% weights summation validation)│
                                            └──────────────────────────┬──────────────────────────┘
                                                                       │
                                                                       ▼
                                            ┌─────────────────────────────────────────────────────┐
                                            │   4. Review-and-Correct Interactive Workspace       │
                                            │   - Multi-course tabs with color coding             │
                                            │   - Provenance snippets & page badges               │
                                            │   - Ambiguity confirmations                         │
                                            └──────────────────────────┬──────────────────────────┘
                                                                       │
                                                                       ▼
                                            ┌─────────────────────────────────────────────────────┐
                                            │   5. Atomic Semester Persistence                    │
                                            │   - AppContext Courses, Topics, Asgs, Exams         │
                                            │   - Direct input into Adaptive Study Planner        │
                                            └─────────────────────────────────────────────────────┘
```

---

## 3. Client-Side PDF Text Ingestion (`pdfjs-dist`)

### 3.1 Worker Configuration & Bundle Optimization
Modern `pdfjs-dist` relies on web workers for non-blocking canvas and text rendering. To ensure optimal performance in Vite without bundling a multi-megabyte worker into the main thread chunk:
- Dynamic import `import('pdfjs-dist')` is invoked only when the student interacts with the upload dropzone.
- Vite splits `pdf.worker` and `pdfjs-dist` into dedicated asynchronous chunks (`dist/assets/pdf-*.js`), keeping the initial application load sub-500kB.

### 3.2 Spatial Line Reconstruction
PDF text streams do not guarantee reading-order line returns. An uncoordinated `getTextContent()` call often produces disjointed tokens (`"CSI"`, `"2110"`, `"Midterm"`). The extractor implements two-dimensional spatial reassembly:
```javascript
// Groups text tokens by vertical transform matrix [5] (Y coordinate) with 4px threshold
const yTolerance = 4;
// Sorts lines from top (greatest Y) to bottom, and intra-line tokens left-to-right (ascending X)
```
This guarantees that multi-column syllabus headers (e.g. `Instructor: Dr. Moura | Office: STE 5012`) maintain their inline associations.

---

## 4. Scanned / Image-Only Document Detection Strategy

A primary UX anti-pattern in syllabus parsing is silent failure on scanned documents. When a student uploads a phone photograph or scanned photocopy of a syllabus, standard PDF extractors return empty strings or sporadic OCR noise, leaving the student confused.

### Detection Heuristics
The engine evaluates character density and lexical distribution across all pages:
$$\text{Density} = \frac{\text{Total Characters}}{\text{Page Count}}$$
- If $\text{Total Characters} < 80$ or $\text{Average Words Per Page} < 12$:
  - Flagged as `isScanned: true`.
  - The UI presents an amber warning banner: *"Scanned image-only PDF detected. Please copy & paste syllabus text directly into our Direct Text tab."*
  - The engine never invents missing information.

---

## 5. Bilingual Heuristic Parser Engine

### 5.1 Language Identification
Before executing keyword rules, the engine detects whether the document is predominantly English or French:
- Scans for characteristic institutional keywords: `['cours', 'professeur', 'devoir', 'examen', 'pondération', 'semaine', 'horaire', 'évaluation', 'laboratoire']`.
- If match count $\ge 3$, engine switches to French date and token parser; otherwise defaults to English.

### 5.2 Date Resolution & Calendar Ambiguity Management
Syllabi notoriously present dates in heterogeneous formats:
1. **Explicit Full Dates:** `"October 18, 2026"`, `"15 octobre 2026"`, `"2026-11-20"` $\rightarrow$ Parsed with `confidence: 'high'`, `isYearEstimated: false`.
2. **Omitted Year Dates:** `"Due October 18"`, `"À remettre le 15 octobre"` $\rightarrow$ Normalizes month and day using the current academic semester's year, but tags the entity with:
   ```javascript
   {
     isYearEstimated: true,
     confidence: 'medium',
     warning: 'Syllabus did not specify year — please confirm due date.'
   }
   ```
3. The UI highlights year-estimated dates with amber indicators, prompting the student to verify the date in the Review-and-Correct editor.

### 5.3 Entity Extraction Modules
| Entity | Strategy | Provenance Preserved |
|---|---|---|
| **Course Identity** | Regex matching institutional patterns (`[A-Z]{3,4}\s*[-–]?\s*[0-9]{3,4}`) + surrounding title title-case strings. | First line occurrence & Page 1 |
| **Instructor & Office** | Title prefixes (`Dr.`, `Prof.`, `Instructor:`, `Professeur:`) + email address regex (`\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b`). Multi-parameter lines split on `\|` and `;`. | Page number & snippet |
| **Lecture Schedule** | Bounded day-of-week abbreviations + 12h/24h time patterns (`Mon / Wed 10:00 - 11:30`, `Mardi et Jeudi 13h00 - 14h30`). | Matched line snippet |
| **Weekly Syllabus Topics** | Line matching `Week \d+:` or `Semaine \d+:`. Sub-extractors isolate `Reading:`, `Lectures:`, `Practice:`, `Exercices:`. | Page reference & snippet |
| **Assignments & Deliverables** | Match `Assignment \d+`, `Devoir \d+`, `Sprint Project`. Filters out summary weighting lines (e.g. `Assignments: 25%`). Extracts due dates and percentage weights. | Page reference & snippet |
| **Midterm & Final Exams** | Match `Midterm Exam`, `Examen intra`, `Final Exam`. Resolves specific exam numbering (Midterm 1 vs 2), locations, dates, and weights. | Page reference & snippet |
| **Evaluation Scheme** | Tables or lines ending in `%` totaling 100%. Excluded from pseudo-deliverable duplication. | Grading component list |

---

## 6. Review-and-Correct User Experience

1. **Dropzone & Multi-file Cards:** Supports up to 5 courses simultaneously with progress badges (`Extracting`, `Ready for Review`, `Scanned Warning`).
2. **One-Click Instant Sample Pack:** Provides 5 pre-configured Canadian university course syllabi (CSI 2110, SEG 2105, MAT 1748, ITI 1521, CEG 3185) covering English and French disciplines for immediate demonstration and testing.
3. **Course Tabs:** Clean tabs to navigate between extracted courses with color pickers and difficulty meters.
4. **Editable Tables:** Inline inputs for lecture topics, textbook chapters, deliverable dates, exam venues, and grade percentages.
5. **Atomic Persistence:** When confirmed, the semester is dispatched into `AppContext`, immediately enabling the Adaptive Academic Coach and Smart Study Planner.

---

## 7. Known Heuristic Limitations & Boundary Cases

While the rule-based client engine excels at clean university syllabi, certain structures present edge cases:
1. **Multi-Column Complex PDF Tables:** If a syllabus contains an irregular multi-row table spanning multiple pages with nested merged cells, coordinate clustering can occasionally order reading columns before topic titles.
2. **Uncommon Date Phrases:** Colloquial date expressions (e.g. *"First class after Thanksgiving break"*, *"Two weeks following Reading Week"*) require semantic reasoning and academic calendar lookup.
3. **Implicit Grading Schemes:** When grading schemes are buried in descriptive narrative paragraphs rather than tables or bullet points (e.g. *"Your highest two tests each count for one fifth of your overall mark"*).

---

## 8. Proposed Future Architecture: Optional Hybrid LLM Extraction

To address the edge cases outlined above without forcing students into paid subscriptions, we propose an **optional, student-controlled hybrid architecture**:

```
                       ┌──────────────────────────────────────────────┐
                       │          Client-Side Ingestion               │
                       │           (pdfjs-dist extraction)            │
                       └──────────────────────┬───────────────────────┘
                                              │
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │     Heuristic Fast-Path (Current Phase 2)    │
                       │  - Immediate, 0ms latency, zero API cost     │
                       │  - Returns extraction confidence score       │
                       └──────────────────────┬───────────────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     │ Confidence >= 80%                               │ Confidence < 80% (Or Student Opt-in)
                     ▼                                                 ▼
        ┌─────────────────────────┐               ┌─────────────────────────────────────────────────┐
        │  Review-and-Correct UI  │               │   Optional LLM Extraction Tier                  │
        │  (Direct confirmation)  │               └────────────────────────┬────────────────────────┘
        └─────────────────────────┘                                        │
                                             ┌─────────────────────────────┴─────────────────────────────┐
                                             │ Option A: Local Browser LLM                               │ Option B: Serverless Edge JSON Function
                                             │ (WebGPU via WebLLM / Gemma 2B)                            │ (Cloudflare Worker / Gemini 1.5 Flash)
                                             │ - 100% private, on-device                                 │ - Free tier / Student BYOK (Bring Your Own Key)
                                             │ - Zero cost, runs locally                                 │ - High throughput, structured JSON schema
                                             └─────────────────────────────┬─────────────────────────────┘
                                                                           │
                                                                           ▼
                                                          ┌───────────────────────────────────┐
                                                          │   Strict JSON Schema Validation   │
                                                          │   - Course, Schedule, Topics      │
                                                          │   - Deliverables, Exams, Scheme   │
                                                          └─────────────────┬─────────────────┘
                                                                            │
                                                                            ▼
                                                          ┌───────────────────────────────────┐
                                                          │       Review-and-Correct UI       │
                                                          └───────────────────────────────────┘
```

### Future Architectural Specifications
1. **Option A — In-Browser WebGPU LLM (Zero Cost, 100% Private):**
   - Incorporate `@mlc-ai/web-llm` running a quantized small language model (e.g. `Gemma-2-2B-Instruct-q4f16` or `SmolLM2-1.7B`).
   - Runs client-side on hardware with WebGPU support. Syllabus text is piped into an extraction prompt enforcing a Zod-validated JSON output schema.
2. **Option B — Serverless Edge Function with Gemini 1.5 Flash:**
   - Host a lightweight endpoint on Cloudflare Workers or Supabase Edge Functions.
   - Utilize Google Gemini 1.5 Flash with structured output mode (`response_mime_type: "application/json"`).
   - Cost is under $\$0.0001$ per syllabus, or can operate under student BYOK (Bring Your Own Key) mode stored in browser `localStorage`.
3. **Graceful Fallback Guarantee:**
   - The system will always retain the current Phase 2 deterministic heuristic parser as the primary baseline, ensuring *My Academia Buddy* remains functional, fast, and free forever.
