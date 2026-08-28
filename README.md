# VedaAI — AI Assessment Extraction & Answer Mapping

An AI-powered assessment evaluation system that extracts questions from exam papers, maps handwritten student answers to the correct questions, identifies unanswered and unmatched responses, highlights exact answer regions, and provides AI-assisted grading and feedback.

Built as part of the **VedaAI Full Stack Hiring Assignment**.

## Live Demo

https://vedaai-assessment-plum.vercel.app

## Overview

Teachers often need to manually navigate long handwritten answer sheets, identify which response belongs to which question, find skipped questions, and evaluate student answers.

This application automates that workflow using multimodal AI.

It supports:

- printed question papers
- handwritten answer sheets
- out-of-order answers
- unlabeled answers
- unanswered questions
- unrelated / unmatched handwriting
- multi-page answers
- PDF and image-based documents

---

## Document Workflows

### Separate Files

Upload:

- a question paper
- a handwritten answer sheet

The system analyzes both documents independently and maps student responses from the answer sheet to the appropriate questions.

### Combined Booklet

Upload a single question-cum-answer booklet containing both printed questions and handwritten responses.

This was implemented as an additional workflow beyond the primary separate-files requirement.

---

## Supported File Types

The application supports:

- PDF
- PNG
- JPG
- JPEG

For multi-page documents, PDF is recommended.

Maximum upload size:

- **10 MB per file**

---

## Core Features

- Extracts questions in original printed order
- Preserves question numbering
- Supports question subparts
- Maps handwritten answers to the correct questions
- Handles answers written out of order
- Maps unlabeled answers using semantic content
- Detects unanswered questions
- Detects unrelated or ambiguous handwritten answers
- Separates unmatched answers instead of force-mapping them
- Supports answers spanning multiple PDF pages
- Highlights exact answer regions
- Automatically navigates to the beginning of the mapped answer
- Provides AI-assisted grading
- Generates strengths and areas for improvement
- Generates answer summaries
- Generates teacher-style feedback
- Displays total assessment score
- Allows manual answer-sheet verification
- Supports answer-sheet zooming
- Supports continuous scrolling for multi-page answers
- Supports responsive desktop and mobile layouts
- Closely follows the provided Figma design

---

## Answer Mapping

Answer mapping does not depend only on page order or handwritten question numbers.

The system considers:

- handwritten question labels
- semantic similarity between the answer and question
- answer content
- continuation-page context
- surrounding handwriting

This allows the application to correctly handle answers written in a different order from the question paper.

### Labeled Answers

If the student writes a reliable question number, the response is mapped using that label together with its content.

### Unlabeled Answers

An answer does not need to contain a question number.

If its content clearly corresponds to a question, the system maps it semantically and displays:

**Unlabeled • mapped by content**

This makes semantic answer mapping visible to the teacher.

### Unmatched Answers

If handwritten content cannot be confidently mapped to any question, the application does not force it onto a question.

Instead, it appears under:

**Unmatched Answers**

The exact handwritten region is localized and highlighted in amber.

This provides a clear distinction between:

- **Green highlight** — successfully mapped answer
- **Amber highlight** — detected but unmatched handwriting

---

## Unanswered Questions

If no response can confidently be mapped to a question, the application marks it as:

- Unanswered
- 0 marks
- No answer detected

The teacher can still open the complete answer sheet and manually verify the result.

---

## Answer Region Detection

Answer regions are returned using normalized coordinates from `0–1000`.

Example:

```json
{
  "page": 2,
  "box": {
    "ymin": 120,
    "xmin": 100,
    "ymax": 760,
    "xmax": 920
  }
}

Normalized coordinates allow the highlight to scale correctly when the document is resized or zoomed.

The regions represent logical handwritten answer areas rather than individual OCR word boxes.

Multi-page Answers

When an answer spans multiple PDF pages:

every mapped page is preserved
pages are displayed vertically
corresponding regions are highlighted
the teacher can scroll naturally through the complete answer

Selecting a question automatically moves the viewer to the beginning of its first detected answer region.

AI Evaluation

Each mapped response can receive:

awarded marks
grading confidence
strengths
areas for improvement
answer summary
teacher-style feedback

Evaluation considers factors such as:

relevance
factual accuracy
coverage
analysis
structure
clarity
supporting examples
diagrams where applicable

AI grading is intended as an assistive evaluation layer, not a replacement for teacher judgment.

Responsive Design

The application was implemented for both desktop and mobile layouts based on the supplied Figma reference.

Desktop

The desktop results interface presents:

extracted questions on the left
mapped answer sheet on the right
collapsible question cards
AI feedback
document zoom controls
highlighted answer regions
Mobile

The mobile results experience uses two views:

Questions
Answer Sheet

This avoids forcing the desktop split-screen interface onto a smaller display while preserving the same functionality.

Tech Stack
Frontend
Next.js 16
React 19
TypeScript
Tailwind CSS
Lucide React
React-PDF
PDF.js
AI
Google Gemini
@google/genai
Gemini 3.6 Flash
Deployment
Vercel
Repository Structure
vedaai-assessment/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── api/
│       │   │   ├── analyze/
│       │   │   │   └── route.ts
│       │   │   └── test-gemini/
│       │   │       └── route.ts
│       │   ├── components/
│       │   │   └── PdfViewer.tsx
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── public/
│       │   ├── teacher-toolkit.png
│       │   └── loading-sparkles.png
│       ├── .env.example
│       ├── package.json
│       ├── next.config.ts
│       └── tsconfig.json
│
├── .gitignore
├── package.json
├── package-lock.json
└── README.md

The repository uses npm workspaces, with the Next.js application located inside apps/web.

Architecture
User uploads assessment documents
                │
                ▼
          Next.js frontend
                │
                ▼
          POST /api/analyze
                │
                ▼
     Google Gemini multimodal AI
                │
        ┌───────┼────────┐
        │       │        │
        ▼       ▼        ▼
    Question  Answer   Region
   Extraction Mapping Detection
        │       │        │
        └───────┼────────┘
                │
                ├── Unanswered detection
                ├── Unmatched-answer detection
                ├── Semantic unlabeled mapping
                ├── Grading
                └── Feedback generation
                │
                ▼
        Structured JSON result
                │
                ▼
        Assessment Results UI
                │
      ┌─────────┴──────────┐
      ▼                    ▼
 Question cards       Answer viewer
 Scores               Region highlights
 AI feedback          PDF / image rendering
Environment Variables

Create:

apps/web/.env.local

Add:

GEMINI_API_KEY=your_gemini_api_key

A safe example environment file is included at:

apps/web/.env.example

The real .env.local file is ignored by Git and is never committed to the repository.

Local Setup

Clone the repository:

git clone https://github.com/karthikeshwarvaddepally/vedaai-assessment.git
cd vedaai-assessment

Install dependencies from the monorepo root:

npm install

Create:

apps/web/.env.local

Add your Gemini API key:

GEMINI_API_KEY=your_gemini_api_key

Start the application:

npm run dev:web

Open:

http://localhost:3000
Production Build

From the repository root:

npm run build:web
Deployment

The application is deployed on Vercel.

Production URL:

https://vedaai-assessment-plum.vercel.app

Vercel configuration:

Root Directory: apps/web
Framework: Next.js

Required environment variable:

GEMINI_API_KEY
Key Design Decisions
Shared Result Schema

Separate Files and Combined Booklet workflows return the same normalized analysis structure.

This keeps the results interface independent of the input workflow.

Semantic Mapping Instead of Label-only Mapping

Students may:

omit question numbers
answer questions out of order
write incomplete labels

For that reason, answer mapping also considers semantic content rather than relying exclusively on handwritten numbering.

Do Not Force Ambiguous Matches

If handwriting cannot be mapped confidently, it is preserved as an unmatched answer instead of being incorrectly assigned to a question.

Normalized Bounding Boxes

Answer regions use 0–1000 normalized coordinates.

This keeps highlighting independent of the displayed document dimensions.

Human Verification

AI mapping and grading can be uncertain, especially with difficult handwriting.

The interface therefore keeps the original answer sheet visible and allows teachers to manually inspect the full document.

Continuous Multi-page Viewing

Mapped pages are displayed vertically rather than forcing the teacher to navigate one page at a time.

This makes long answers easier to review.

Current Limitations
AI grading can vary between model runs
Very unclear handwriting can reduce mapping confidence
Bounding boxes represent logical answer regions rather than word-level OCR boundaries
Processing time increases for larger documents
A single PNG/JPG represents one image page; PDF is recommended for multi-page documents
AI evaluation should be treated as assistive rather than authoritative
Gemini API quota and availability can affect processing
Possible Future Improvements
Multiple-image upload for multi-page answer sheets
Persistent assessment history
Teacher-adjustable grades
Manual answer remapping
Background processing for large documents
Custom grading rubrics
Exportable assessment reports
Authentication
Teacher workspaces
Assessment history and analytics
Security

Gemini API credentials are stored only through environment variables.

The repository intentionally excludes:

.env.local

and provides only:

.env.example

No Gemini API credentials are committed to the repository.