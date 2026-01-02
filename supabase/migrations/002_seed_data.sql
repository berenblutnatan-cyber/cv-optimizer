-- Optional: Seed data for testing
-- This creates some common companies and roles to get started

-- Insert common tech companies
INSERT INTO companies (name, normalized_name, industry, headquarters) VALUES
  ('Google', 'google', 'Technology', 'Mountain View, CA'),
  ('Meta', 'meta', 'Technology', 'Menlo Park, CA'),
  ('Amazon', 'amazon', 'Technology/E-commerce', 'Seattle, WA'),
  ('Apple', 'apple', 'Technology', 'Cupertino, CA'),
  ('Microsoft', 'microsoft', 'Technology', 'Redmond, WA'),
  ('Netflix', 'netflix', 'Technology/Entertainment', 'Los Gatos, CA'),
  ('Stripe', 'stripe', 'Fintech', 'San Francisco, CA'),
  ('Airbnb', 'airbnb', 'Technology/Travel', 'San Francisco, CA'),
  ('Uber', 'uber', 'Technology/Transportation', 'San Francisco, CA'),
  ('Taboola', 'taboola', 'Technology/Advertising', 'New York, NY'),
  ('LinkedIn', 'linkedin', 'Technology/Social', 'Sunnyvale, CA'),
  ('Salesforce', 'salesforce', 'Technology/CRM', 'San Francisco, CA'),
  ('Adobe', 'adobe', 'Technology/Software', 'San Jose, CA'),
  ('Twitter', 'twitter', 'Technology/Social', 'San Francisco, CA'),
  ('Spotify', 'spotify', 'Technology/Entertainment', 'Stockholm, Sweden')
ON CONFLICT (name) DO NOTHING;

-- Insert common roles
INSERT INTO roles (title, normalized_title, category) VALUES
  ('Software Engineer', 'software engineer', 'engineering'),
  ('Senior Software Engineer', 'senior software engineer', 'engineering'),
  ('Staff Software Engineer', 'staff software engineer', 'engineering'),
  ('Frontend Engineer', 'frontend engineer', 'engineering'),
  ('Backend Engineer', 'backend engineer', 'engineering'),
  ('Full Stack Engineer', 'full stack engineer', 'engineering'),
  ('Data Engineer', 'data engineer', 'data'),
  ('Data Scientist', 'data scientist', 'data'),
  ('Machine Learning Engineer', 'machine learning engineer', 'engineering'),
  ('Product Manager', 'product manager', 'product'),
  ('Senior Product Manager', 'senior product manager', 'product'),
  ('Product Analyst', 'product analyst', 'product'),
  ('Data Analyst', 'data analyst', 'data'),
  ('Business Analyst', 'business analyst', 'data'),
  ('UX Designer', 'ux designer', 'design'),
  ('Product Designer', 'product designer', 'design'),
  ('Engineering Manager', 'engineering manager', 'engineering'),
  ('Technical Program Manager', 'technical program manager', 'product'),
  ('DevOps Engineer', 'devops engineer', 'engineering'),
  ('Site Reliability Engineer', 'site reliability engineer', 'engineering')
ON CONFLICT DO NOTHING;
