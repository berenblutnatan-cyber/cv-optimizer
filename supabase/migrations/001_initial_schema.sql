-- Interview Prep AI - Initial Database Schema
-- Run this in your Supabase SQL Editor

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  normalized_name TEXT NOT NULL,
  industry TEXT,
  headquarters TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on normalized name for fast lookups
CREATE INDEX IF NOT EXISTS idx_companies_normalized_name ON companies(normalized_name);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  category TEXT CHECK (category IN ('engineering', 'product', 'data', 'design', 'marketing', 'sales', 'operations', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on normalized title
CREATE INDEX IF NOT EXISTS idx_roles_normalized_title ON roles(normalized_title);

-- Interview experiences (user-submitted, anonymized)
CREATE TABLE IF NOT EXISTS interview_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  interview_stage TEXT CHECK (interview_stage IN ('phone_screen', 'technical', 'behavioral', 'onsite', 'final', 'other')),
  difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
  outcome TEXT CHECK (outcome IN ('offer', 'rejected', 'pending', 'declined', 'withdrawn')),
  questions_summary TEXT NOT NULL,
  tips TEXT,
  experience_date DATE,
  geography TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  embedding VECTOR(1536) -- OpenAI text-embedding-3-small dimension
);

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_interview_experiences_company ON interview_experiences(company_id);
CREATE INDEX IF NOT EXISTS idx_interview_experiences_role ON interview_experiences(role_id);
CREATE INDEX IF NOT EXISTS idx_interview_experiences_stage ON interview_experiences(interview_stage);

-- Create vector similarity search index (IVFFlat for approximate nearest neighbor)
-- Note: IVFFlat requires at least 100 vectors to be effective. 
-- For small datasets, consider using exact search or HNSW instead.
CREATE INDEX IF NOT EXISTS idx_interview_experiences_embedding 
ON interview_experiences 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Glassdoor cache (stores summarized data, not raw content)
CREATE TABLE IF NOT EXISTS glassdoor_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role_query TEXT NOT NULL,
  difficulty_avg DECIMAL(2,1),
  process_summary TEXT,
  common_themes JSONB DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- Create index for cache lookups
CREATE INDEX IF NOT EXISTS idx_glassdoor_cache_lookup 
ON glassdoor_cache(company_id, role_query);

CREATE INDEX IF NOT EXISTS idx_glassdoor_cache_expires 
ON glassdoor_cache(expires_at);

-- Function to match interview experiences by embedding similarity
CREATE OR REPLACE FUNCTION match_interview_experiences(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_company_id UUID DEFAULT NULL,
  filter_role_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  role_id UUID,
  interview_stage TEXT,
  difficulty_rating INTEGER,
  outcome TEXT,
  questions_summary TEXT,
  tips TEXT,
  experience_date DATE,
  geography TEXT,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ie.id,
    ie.company_id,
    ie.role_id,
    ie.interview_stage,
    ie.difficulty_rating,
    ie.outcome,
    ie.questions_summary,
    ie.tips,
    ie.experience_date,
    ie.geography,
    ie.created_at,
    1 - (ie.embedding <=> query_embedding) AS similarity
  FROM interview_experiences ie
  WHERE 
    ie.embedding IS NOT NULL
    AND (filter_company_id IS NULL OR ie.company_id = filter_company_id)
    AND (filter_role_id IS NULL OR ie.role_id = filter_role_id)
    AND 1 - (ie.embedding <=> query_embedding) > match_threshold
  ORDER BY ie.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get or create a company
CREATE OR REPLACE FUNCTION get_or_create_company(
  p_name TEXT,
  p_industry TEXT DEFAULT NULL,
  p_headquarters TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_normalized_name TEXT;
  v_company_id UUID;
BEGIN
  -- Normalize the name (lowercase, trim, replace multiple spaces)
  v_normalized_name := LOWER(TRIM(REGEXP_REPLACE(p_name, '\s+', ' ', 'g')));
  
  -- Try to find existing company
  SELECT id INTO v_company_id
  FROM companies
  WHERE normalized_name = v_normalized_name;
  
  -- If not found, create new
  IF v_company_id IS NULL THEN
    INSERT INTO companies (name, normalized_name, industry, headquarters)
    VALUES (p_name, v_normalized_name, p_industry, p_headquarters)
    RETURNING id INTO v_company_id;
  END IF;
  
  RETURN v_company_id;
END;
$$;

-- Function to get or create a role
CREATE OR REPLACE FUNCTION get_or_create_role(
  p_title TEXT,
  p_category TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_normalized_title TEXT;
  v_role_id UUID;
BEGIN
  -- Normalize the title
  v_normalized_title := LOWER(TRIM(REGEXP_REPLACE(p_title, '\s+', ' ', 'g')));
  
  -- Try to find existing role
  SELECT id INTO v_role_id
  FROM roles
  WHERE normalized_title = v_normalized_title;
  
  -- If not found, create new
  IF v_role_id IS NULL THEN
    INSERT INTO roles (title, normalized_title, category)
    VALUES (p_title, v_normalized_title, p_category)
    RETURNING id INTO v_role_id;
  END IF;
  
  RETURN v_role_id;
END;
$$;

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE glassdoor_cache ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Public read access for companies" ON companies
  FOR SELECT USING (true);

CREATE POLICY "Public read access for roles" ON roles
  FOR SELECT USING (true);

CREATE POLICY "Public read access for interview_experiences" ON interview_experiences
  FOR SELECT USING (true);

CREATE POLICY "Public read access for glassdoor_cache" ON glassdoor_cache
  FOR SELECT USING (true);

-- Allow inserts with service role (server-side only)
CREATE POLICY "Service role insert for companies" ON companies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role insert for roles" ON roles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role insert for interview_experiences" ON interview_experiences
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role insert for glassdoor_cache" ON glassdoor_cache
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role update for glassdoor_cache" ON glassdoor_cache
  FOR UPDATE USING (true);
