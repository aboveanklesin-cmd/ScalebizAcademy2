// ── Supabase client — shared across all pages ──────────────────
const { createClient } = supabase;

const sb = createClient(
  'https://spjfpeomabndzvjcookk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwamZwZW9tYWJuZHp2amNvb2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMjg0MzMsImV4cCI6MjA5NjkwNDQzM30.TUbSu0PZ_40ITX-HV6MOVQIcbCCoPSVcKfP8i8N16Bg'
);
