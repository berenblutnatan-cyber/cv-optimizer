# CV Optimizer

AI-assisted CV analysis and optimization focused on **passing initial screening** (ATS + recruiter).

## Features

- Upload PDF or paste CV text
- Job Title / Job Description / LinkedIn URL inputs
- Screening score + suggestions (no fabricated experience)
- Download optimized CV as PDF
- AI-powered cover letter generation
- Interactive CV builder with multiple templates

## Tech Stack

- Next.js 16 (App Router) + React + Tailwind CSS
- OpenAI API (GPT-4o)
- Clerk Authentication
- Vercel KV (optional - for analytics)
- PDF generation with pdf-lib

## Getting Started

### Prerequisites

- Node.js 20+
- [Clerk account](https://dashboard.clerk.com) (for authentication)
- [OpenAI API key](https://platform.openai.com/api-keys)
- (Optional) [Vercel KV](https://vercel.com/docs/storage/vercel-kv) or [Upstash Redis](https://console.upstash.com) for analytics

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd cv-optimizer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

4. **Configure `.env.local`** with your actual keys:

   **Required:**
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Get from [Clerk Dashboard](https://dashboard.clerk.com)
   - `CLERK_SECRET_KEY` - Get from [Clerk Dashboard](https://dashboard.clerk.com)
   - `OPENAI_API_KEY` - Get from [OpenAI Platform](https://platform.openai.com/api-keys)

   **Optional:**
   - `KV_REST_API_URL` and `KV_REST_API_TOKEN` - For tracking CV optimization count
   - Clerk URL configurations (use defaults or customize)

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:3000`

## Deployment to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/cv-optimizer)

### Manual Deployment

1. **Push your code to GitHub** (make sure `.env.local` is NOT committed)

2. **Import project in Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Import your GitHub repository

3. **Configure Environment Variables** in Vercel dashboard:
   
   Go to Settings → Environment Variables and add:
   
   **Required:**
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `OPENAI_API_KEY`
   
   **Optional:**
   - `KV_REST_API_URL` (auto-configured if you add Vercel KV)
   - `KV_REST_API_TOKEN` (auto-configured if you add Vercel KV)

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your app

### Adding Vercel KV (Optional)

For analytics tracking:

1. In your Vercel project, go to the "Storage" tab
2. Click "Create Database" → "KV"
3. The environment variables will be automatically added to your project

### Important Notes for Production

- ✅ `.env.local` is already in `.gitignore` - never commit secrets
- ✅ All sensitive environment variables must be set in Vercel dashboard
- ✅ Clerk authentication is configured for production URLs automatically
- ✅ OpenAI API key is required for the app to function
- ⚠️ Make sure to set up proper Clerk webhook URLs in production if needed

## Environment Variables Reference

See `.env.example` for a complete list of environment variables with descriptions.

## License

MIT
