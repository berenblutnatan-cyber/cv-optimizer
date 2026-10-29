-- Hired v2, M2: imported CVs keep their parsed original as version 1.
-- Apply after 2026-10-30-v2-resume-document.sql. Idempotent.
ALTER TABLE "ResumeVersion" DROP CONSTRAINT IF EXISTS "ResumeVersion_createdBy_chk";
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_createdBy_chk"
  CHECK ("createdBy" IN ('user', 'chat', 'intake_agent', 'tailor', 'migration', 'import'));
