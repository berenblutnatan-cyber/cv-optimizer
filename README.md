# CV Optimizer

AI-assisted CV analysis and optimization focused on **passing initial screening** (ATS + recruiter).

## Features

- Upload PDF or paste CV text
- Job Title / Job Description / LinkedIn URL inputs
- Screening score + suggestions (no fabricated experience)
- Download optimized CV as PDF

## Tech Stack

- Next.js (App Router) + React + Tailwind CSS
- OpenAI API
- Supabase (optional / for future persistence)

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- OpenAI API key
- SerpAPI API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your local environment file (do **not** commit it):

   ```bash
   cp .env.example .env.local
   ```

4. Fill in the values in `.env.local` (placeholders only; never commit secrets):

   ```
   OPENAI_API_KEY=
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open `http://127.0.0.1:3001` (or whatever port your dev server prints)

## License

MIT
