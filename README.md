# VedaAI — AI Assessment Extraction & Answer Mapping

An AI-powered assessment evaluation system that extracts questions from exam papers, maps handwritten student answers to the correct questions, identifies unanswered responses, highlights exact answer regions, and provides AI-assisted grading and feedback.

Built as part of the VedaAI Full Stack Hiring Assignment.

## Live Demo

https://vedaai-assessment-plum.vercel.app

## Overview

Teachers often need to manually navigate long handwritten answer sheets, match answers with questions, identify skipped questions, and evaluate responses.

This application automates that workflow using multimodal AI.

The system supports two document workflows:

### Separate Files

Upload:

- a printed question paper
- a handwritten answer sheet

The system independently analyzes both documents and maps handwritten responses to the appropriate questions.

### Combined Booklet

Upload a single question-cum-answer booklet containing both printed questions and handwritten responses.

This mode was added as an additional workflow beyond the core assignment requirement.

## Core Features

- Extracts questions in original printed order
- Preserves question numbering
- Supports question subparts
- Maps handwritten answers to questions
- Handles answers written out of order
- Detects unanswered questions
- Detects unmatched handwritten answers
- Supports answers spanning multiple pages
- Highlights exact handwritten answer regions in the PDF
- Provides AI-assisted grading
- Generates strengths, improvements, and teacher-style feedback
- Displays overall assessment score
- Allows manual answer-sheet verification
- Supports full answer-sheet browsing
- Supports PDF zooming and continuous page scrolling

## Answer Mapping

Answer mapping does not rely only on page order.

The system considers:

- handwritten question numbers
- semantic similarity between the question and answer
- continuation-page context
- surrounding handwritten content

This allows the application to correctly handle answer sheets where students answer questions in a different order.

## Unanswered Questions

If no handwritten response can confidently be mapped to a question, the application marks it as:

- Unanswered
- 0 marks
- No answer detected

Teachers can still open the full answer sheet to manually verify the result.

## Multi-page Answers

If an answer spans multiple pages, all mapped pages are displayed vertically.

Only the relevant answer pages are shown by default, with the detected handwritten region highlighted.

Teachers can optionally inspect the full answer sheet.

## AI Evaluation

Each mapped response receives:

- Awarded marks
- Grading confidence
- Strengths
- Areas for improvement
- Answer summary
- Teacher-style feedback

The model evaluates responses using factors such as:

- relevance
- factual accuracy
- coverage
- analysis
- structure
- clarity
- supporting examples
- diagrams where applicable

AI grading is intended as an assistive evaluation layer rather than a replacement for teacher judgment.

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Lucide React
- React-PDF
- PDF.js

### AI

- Google Gemini
- `@google/genai`
- Gemini 3.6 Flash

### Deployment

- Vercel

## Repository Structure

```text
vedaai-assessment/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── api/
│       │   │   ├── analyze/
│       │   │   └── test-gemini/
│       │   ├── components/
│       │   │   └── PdfViewer.tsx
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── public/
│       ├── .env.example
│       ├── package.json
│       ├── next.config.ts
│       └── tsconfig.json
│
├── .gitignore
├── package.json
├── package-lock.json
└── README.md

The project uses npm workspaces, with the Next.js application located inside apps/web.

Architecture
User uploads documents
        │
        ▼
Next.js frontend
        │
        ▼
POST /api/analyze
        │
        ▼
Google Gemini multimodal analysis
        │
        ├── Question extraction
        ├── Answer detection
        ├── Answer mapping
        ├── Region detection
        ├── Grading
        └── Feedback generation
        │
        ▼
Structured JSON result
        │
        ▼
Assessment Results UI
        ├── Question list
        ├── Scores
        ├── AI feedback
        └── Highlighted PDF answer regions
Environment Variables

Create:

apps/web/.env.local

Add:

GEMINI_API_KEY=your_gemini_api_key

A safe example file is included:

apps/web/.env.example

The real .env.local file is ignored by Git.

Local Setup

Clone the repository:

git clone https://github.com/karthikeshwarvaddepally/vedaai-assessment.git
cd vedaai-assessment

Install dependencies from the monorepo root:

npm install

Create the environment file:

apps/web/.env.local

Add your Gemini API key.

Start the application:

npm run dev:web

Open:

http://localhost:3000
Production Build

From the repository root:

npm run build:web
Deployment

The application is deployed on Vercel.

Vercel configuration:

Root Directory: apps/web
Framework: Next.js

Required Vercel environment variable:

GEMINI_API_KEY
Design Decisions
Why a shared result schema?

Both Separate Files and Combined Booklet modes return the same normalized question structure.

This keeps the frontend independent of document input format and allows both workflows to share the same results UI.

Why normalized bounding boxes?

Answer regions use coordinates normalized from 0–1000.

This makes region rendering independent of the displayed PDF dimensions and allows highlight boxes to scale correctly when zooming.

Why show mapped pages by default?

The main purpose of the application is to remove the need for teachers to manually search through answer sheets.

Therefore, mapped pages are shown directly.

Manual full-answer-sheet browsing remains available for verification.

Why preserve human verification?

AI mapping and grading can be uncertain, especially with unclear handwriting.

The UI therefore exposes grading confidence and allows the teacher to inspect the original answer sheet.

Current Limitations
AI grading can vary between model runs
Very unclear handwriting may reduce mapping confidence
Bounding boxes are approximate logical answer regions rather than word-level OCR boxes
Large documents may take additional processing time
AI evaluation should be treated as assistive rather than authoritative
Possible Future Improvements
Persistent assessment history
Teacher-adjustable grades
Manual answer remapping
Background processing for very large documents
Detailed grading rubrics
Exportable assessment reports
Authentication and teacher workspaces
Security

API keys are stored only through environment variables.

The repository intentionally excludes:

.env.local

and provides only:

.env.example

No Gemini API credentials are committed to the repository.
