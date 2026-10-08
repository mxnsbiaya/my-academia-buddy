/**
 * Sample University Syllabi Pack (Bilingual English & French)
 * 
 * Provides pre-configured real-world syllabus documents matching Canadian university
 * standards (e.g. University of Ottawa). Used for one-click instant testing, demonstrations,
 * and automated validation of the Phase 2 Intelligent Syllabus Import pipeline.
 */

export const SAMPLE_SYLLABI_PACK = [
  {
    id: 'sample-csi2110',
    fileName: 'CSI2110_Data_Structures_Algorithms_Syllabus.pdf',
    language: 'en',
    courseCode: 'CSI 2110',
    courseName: 'Data Structures and Algorithms',
    text: `UNIVERSITY OF OTTAWA
FACULTY OF ENGINEERING
SCHOOL OF ELECTRICAL ENGINEERING AND COMPUTER SCIENCE

CSI 2110 — Data Structures and Algorithms
Fall Semester | 3.0 Credits

Course Overview:
This course focuses on the representation and implementation of fundamental data structures,
algorithmic efficiency, asymptotic complexity analysis (Big-O), search trees, heaps, priority
queues, and graph algorithms.

Teaching Team:
Instructor: Dr. Lucia Moura (Email: lmoura@uottawa.ca)
Office: STE 5012 | Office Hours: Tue & Thu 15:00 - 16:30
Lectures: Mon / Wed 10:00 - 11:30 | Location: Marion Hall 150
Lab Sessions: Friday 08:30 - 10:00 | STE 0110

Evaluation Scheme:
Assignments (2): 25%
Midterm Exam: 30%
Final Examination: 40%
Laboratory Participation: 5%

Weekly Lecture Schedule & Required Readings:
Week 1: Algorithmic Complexity, Big-O, Omega, and Theta Notations (Reading: CLRS Ch. 3, Goodrich Ch. 1; Practice: Exercises 1.1-1.8)
Week 2: Stacks, Queues, and Linked Lists (Reading: Goodrich Ch. 6; Practice: Circular Queue Lab Implementations)
Week 3: Binary Heaps & Priority Queues (Reading: Goodrich Ch. 8.1-8.3; Practice: Up-heap bubbling and down-heap sink algorithms)
Week 4: Binary Search Trees & AVL Balance Rotations (Reading: Goodrich Ch. 10.1; Practice: Single and Double Tree Rotations)
Week 5: Splay Trees & 2-4 Multi-way Search Trees (Reading: Goodrich Ch. 10.2; Practice: Bottom-up insertion steps)
Week 6: Hash Tables and Collision Resolution Schemes (Reading: CLRS Ch. 11; Practice: Quadratic probing & double hashing)
Week 7: Graph Representations: Adjacency Matrices & Lists (Reading: Goodrich Ch. 14.1; Practice: BFS and DFS traversals)
Week 8: Shortest Path Algorithms: Dijkstra and Bellman-Ford (Reading: CLRS Ch. 24; Practice: Single source shortest paths)
Week 9: Minimum Spanning Trees: Prim and Kruskal (Reading: CLRS Ch. 23; Practice: Greedy cut property proofs)
Week 10: Dynamic Programming & Memoization Patterns (Reading: CLRS Ch. 15; Practice: Knapsack and LCS problems)

Important Dates & Deliverables:
Assignment 1: Due on October 18, 2026 (Weight: 10%)
Midterm Exam 1: October 28, 2026 (Weight: 30%, Location: Marion Hall 150)
Assignment 2: Due on November 15, 2026 (Weight: 15%)
Final Exam: December 14, 2026 (Weight: 40%, Location: Montpetit Hall A)
`,
  },
  {
    id: 'sample-seg2105',
    fileName: 'SEG2105_Software_Engineering_Syllabus.pdf',
    language: 'en',
    courseCode: 'SEG 2105',
    courseName: 'Introduction to Software Engineering',
    text: `UNIVERSITY OF OTTAWA
FACULTY OF ENGINEERING

SEG 2105 — Introduction to Software Engineering
Fall Term | 3.0 Credits

Course Description:
Principles of software design, agile methodologies, object-oriented modeling with UML,
software architecture, design patterns, testing frameworks, and continuous delivery.

Instructor Contact:
Instructor: Prof. Timothy Lethbridge (Email: tcl@eecs.uottawa.ca)
Office: SITE 5074 | Office Hours: Wednesday 14:00 - 15:30
Lectures: Tue / Thu 11:30 - 13:00 | Location: SITE Hall C

Grading Criteria:
Sprint Project Milestones: 35%
Midterm Exam: 25%
Final Exam: 40%

Weekly Syllabus Topics:
Week 1: Software Lifecycle Models, Agile Scrum, and Requirements Engineering (Reading: Lethbridge Ch. 2, Fowler Ch. 1)
Week 2: Use Case Modeling and Domain Class Diagrams in UML (Reading: Lethbridge Ch. 5; Practice: Domain model for banking app)
Week 3: Software Architecture Patterns: MVC, Layered, and Microservices (Reading: Bass Ch. 3; Practice: MVC decomposition)
Week 4: Gang of Four Design Patterns: Singleton, Factory, and Observer (Reading: Gamma Ch. 1-2; Practice: Observer pattern in Java)
Week 5: Architectural Refactoring and Code Smells (Reading: Fowler Refactoring Ch. 3; Practice: Extract class & method refactorings)
Week 6: Automated Testing: JUnit 5 Unit Tests and Mocking with Mockito (Reading: Beck TDD Ch. 4; Practice: 90% branch coverage suite)
Week 7: Git Branching Strategies and CI/CD GitHub Actions (Reading: Humble Continuous Delivery Ch. 2)
Week 8: Software Security & Defensive Programming Principles (Reading: Howard Ch. 4)

Assignments & Examinations:
Sprint Project 1: Due on October 22, 2026 (Weight: 15%)
Midterm Exam: November 05, 2026 (Weight: 25%, Location: SITE Hall C)
Sprint Project 2: Due on November 26, 2026 (Weight: 20%)
Final Exam: December 18, 2026 (Weight: 40%)
`,
  },
  {
    id: 'sample-mat1748',
    fileName: 'MAT1748_Mathematiques_Discretes_Syllabus.pdf',
    language: 'fr',
    courseCode: 'MAT 1748',
    courseName: "Mathématiques discrètes pour l'informatique",
    text: `UNIVERSITÉ D'OTTAWA
FACULTÉ DES SCIENCES
DÉPARTEMENT DE MATHÉMATIQUES ET DE STATISTIQUE

MAT 1748 — Mathématiques discrètes pour l'informatique
Session d'automne | 3.0 crédits

Description du cours :
Introduction rigoureuse aux concepts fondamentaux des mathématiques discrètes appliquées
à l'informatique : logique mathématique, techniques de preuve, théorie des ensembles,
relations d'équivalence, combinatoire et graphes.

Équipe professorale :
Professeur: Prof. Joseph Khoury (Courriel: jkhoury@uottawa.ca)
Bureau: Montpetit 202 | Disponibilités: Lundi et Mercredi 11h00 - 12h30
Horaire: Mardi et Jeudi 13h00 - 14h30 | Salle: Pavillon Montpetit 202
Laboratoire: Jeudi 16h00 - 17h30 | Salle: Marion 012

Barème d'évaluation :
Devoirs : 20%
Examen intra : 35%
Examen final : 45%

Calendrier hebdomadaire et lectures obligatoires :
Semaine 1: Logique des propositions et tables de vérité (Lectures: Rosen Chapitre 1.1 - 1.3)
Semaine 2: Quantificateurs universels, existentiels et logique des prédicats (Lectures: Rosen Chapitre 1.4)
Semaine 3: Méthodes de preuve directe, contraposée et par contradiction (Lectures: Rosen Chapitre 1.7)
Semaine 4: Induction mathématique et principe du bon ordre (Lectures: Rosen Chapitre 5.1; Exercices: Problèmes 1 à 15)
Semaine 5: Relations d'ordre partiel et relations d'équivalence (Lectures: Rosen Chapitre 9.1; Exercices: Exercices de clôture transitive)
Semaine 6: Principes élémentaires de combinatoire et principe des tiroirs de Dirichlet (Lectures: Rosen Chapitre 6.1)
Semaine 7: Relations de récurrence linéaires à coefficients constants (Lectures: Rosen Chapitre 8.2)
Semaine 8: Théorie des graphes : arbres couvrants et cycles eulériens (Lectures: Rosen Chapitre 10.1)

Évaluations et échéances :
Devoir 1: À remettre le 15 octobre (Pondération: 10%)
Examen intra: 3 novembre (Pondération: 35%, Salle: Montpetit 202)
Devoir 2: À remettre le 20 novembre (Pondération: 10%)
Examen final: 18 décembre (Pondération: 45%, Salle: Gymnase Montpetit)
`,
  },
  {
    id: 'sample-iti1521',
    fileName: 'ITI1521_Introduction_Informatique_II_Syllabus.pdf',
    language: 'fr',
    courseCode: 'ITI 1521',
    courseName: "Introduction à l'informatique II",
    text: `UNIVERSITÉ D'OTTAWA
FACULTÉ DE GÉNIE

ITI 1521 — Introduction à l'informatique II
Session d'automne | 3.0 crédits

Description du cours :
Approfondissement des paradigmes de la programmation orientée objet en Java, structures
de données linéaires abstraites, encapsulation, héritage, polymorphisme, gestion
des exceptions et récursivité.

Corps enseignant :
Professeur: Prof. Guy-Vincent Jourdan (Courriel: gvj@uottawa.ca)
Bureau: SITE 5018 | Heures de bureau: Vendredi 10h00 - 12h00
Horaire: Mercredi et Vendredi 08h30 - 10h00 | Salle: CBY C03
Laboratoires: Mardi 14h30 - 16h00 | STE 2060

Barème d'évaluation :
Devoirs de programmation : 25%
Examen intra : 30%
Examen final : 45%

Plan de cours hebdomadaire :
Semaine 1: Programmation orientée objet avancée, polymorphisme et liaisons dynamiques (Lectures: Sedgewick Ch. 1.2)
Semaine 2: Interfaces Java, classes abstraites et principes SOLID (Lectures: Eck Ch. 5)
Semaine 3: Gestion robuste des exceptions et flux d'entrée/sortie (Lectures: Eck Ch. 8; Exercices: Labs de parsing de fichiers)
Semaine 4: Types génériques en Java et collections du framework (Lectures: Sedgewick Ch. 1.3)
Semaine 5: Récursivité fondamentale et algorithmes de retour sur trace (Lectures: Sedgewick Ch. 2.3)
Semaine 6: Piles, files et listes doublement chaînées (Lectures: Sedgewick Ch. 1.3; Exercices: Implémentation deque)
Semaine 7: Arbres binaires de recherche et parcours préfixe/infixe/postfixe (Lectures: Sedgewick Ch. 3.2)
Semaine 8: Tables de hachage et fonctions de compression (Lectures: Sedgewick Ch. 3.4)

Calendrier des examens et remises :
Devoir 1: À remettre le 12 octobre (Pondération: 10%)
Examen intra: 29 octobre (Pondération: 30%, Salle: CBY C03)
Devoir 2: À remettre le 16 novembre (Pondération: 15%)
Examen final: 12 décembre (Pondération: 45%)
`,
  },
  {
    id: 'sample-ceg3185',
    fileName: 'CEG3185_Data_Communications_Networking_Syllabus.pdf',
    language: 'en',
    courseCode: 'CEG 3185',
    courseName: 'Introduction to Data Communications and Networking',
    text: `UNIVERSITY OF OTTAWA
FACULTY OF ENGINEERING

CEG 3185 — Introduction to Data Communications and Networking
Fall Semester | 3.0 Credits

Course Overview:
Physical, link, and network layers of computer communication networks. Channel coding,
packet switching, flow and error control (ARQ), IP addressing, subnetting, routing protocols,
and socket programming.

Instructor Information:
Instructor: Dr. Amiya Nayak (Email: anayak@uottawa.ca)
Office: CBY A-514 | Office Hours: Thursday 16:00 - 17:30
Lectures: Mon / Thu 14:30 - 16:00 | Location: Colonel By Hall B02
Tutorials: Monday 16:00 - 17:30 | CBY B02

Grading Breakdown:
Laboratory Assignments: 25%
Midterm Exam: 25%
Final Examination: 50%

Weekly Topics:
Week 1: Computer Networks and the OSI 7-Layer Architecture Model (Reading: Kurose & Ross Ch. 1)
Week 2: Physical Layer: Signal Transmission, Modulation, and Nyquist/Shannon Limits (Reading: Forouzan Ch. 3)
Week 3: Data Link Layer: Framing, Bit Stuffing, and CRC Checksums (Reading: Kurose & Ross Ch. 5; Practice: CRC polynomial division)
Week 4: Automatic Repeat Request (ARQ) Protocols: Stop-and-Wait, Go-Back-N, and Selective Repeat (Reading: Tanenbaum Ch. 3)
Week 5: Medium Access Control (MAC): CSMA/CD, Ethernet, and IEEE 802.11 WiFi (Reading: Kurose & Ross Ch. 5.3)
Week 6: Network Layer: IPv4 Addressing, Classless Inter-Domain Routing (CIDR), and Subnet Masks (Reading: Kurose & Ross Ch. 4)
Week 7: Routing Algorithms: Link-State (Dijkstra) and Distance-Vector (Bellman-Ford) (Reading: Kurose & Ross Ch. 4.5)
Week 8: Transport Layer: TCP 3-Way Handshake, Flow Control, and Congestion Control (Reading: Kurose & Ross Ch. 3)

Deliverables & Exam Schedule:
Lab Assignment 1: Due on October 24, 2026 (Weight: 10%)
Midterm Exam: November 10, 2026 (Weight: 25%, Location: Colonel By Hall B02)
Lab Assignment 2: Due on November 21, 2026 (Weight: 15%)
Final Exam: December 19, 2026 (Weight: 50%, Location: Montpetit Gymnasium)
`,
  },
];
