# Vercel Deployment Checklist

Before pushing to `main` and deploying to Vercel, ensure:

## ✅ Required Steps

### 1. Environment Variables Are Properly Configured
- [ ] `.env.local` exists locally with real API keys
- [ ] `.env.local` is in `.gitignore` (already done ✓)
- [ ] `.env.example` is committed (shows structure but no secrets)

### 2. Get Your API Keys Ready

**Clerk** (https://dashboard.clerk.com):
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`

**OpenAI** (https://platform.openai.com/api-keys):
- [ ] `OPENAI_API_KEY`

### 3. Local Testing
- [ ] Run `npm install` successfully
- [ ] Run `npm run dev` and test locally at http://localhost:3000
- [ ] Test CV upload and analysis features
- [ ] Test cover letter generation
- [ ] Verify no console errors related to missing env vars

### 4. Vercel Setup

#### In Vercel Dashboard (https://vercel.com/dashboard):

1. **Import Project**
   - Connect your GitHub repository
   - Select the cv-optimizer project

2. **Configure Environment Variables** (Settings → Environment Variables)
   
   Add these **before** first deployment:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-value>
   CLERK_SECRET_KEY=<your-value>
   OPENAI_API_KEY=<your-value>
   ```

3. **Optional: Add Vercel KV**
   - Go to Storage tab
   - Create KV Database
   - Environment variables will be auto-configured

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Test your production URL

### 5. Post-Deployment

- [ ] Visit your production URL
- [ ] Test authentication flow
- [ ] Test CV analysis with OpenAI
- [ ] Check Vercel logs for any errors
- [ ] Update Clerk allowed domains if needed (in Clerk dashboard)

## 🚀 Ready to Deploy

Once all checkboxes above are complete:

```bash
git add .
git commit -m "feat: add environment configuration for Vercel deployment"
git push origin main
```

## 🔧 Troubleshooting

### "Missing OPENAI_API_KEY" error
- Check that you added `OPENAI_API_KEY` in Vercel Environment Variables
- Redeploy the project after adding the variable

### Clerk authentication not working
- Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set
- Check that your production domain is added in Clerk dashboard
- Verify environment variables are set for "Production" environment

### KV/Redis errors (optional feature)
- These are non-blocking - the app will work without KV
- To enable tracking: add Vercel KV storage or set Upstash Redis env vars

## 📚 Documentation

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Clerk Production Setup](https://clerk.com/docs/deployments/overview)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)

