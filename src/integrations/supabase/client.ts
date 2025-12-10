import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxswifcaaumkujdkmjrx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4c3dpZmNhYXVta3VqZGttanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzE4MjUsImV4cCI6MjA4MDYwNzgyNX0.I7z3Ue5dj8TJm7Zb8_5Au9ce1icGjx1YdzpLgp6syxE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
