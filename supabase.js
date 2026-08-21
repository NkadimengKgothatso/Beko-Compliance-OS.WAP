/**
 * Beko ComplianceOS — Supabase initialisation
 */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://fpfffiteungxqspaiych.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZmZmaXRldW5neHFzcGFpeWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyNjIyNjgsImV4cCI6MjEwMjgzODI2OH0.BLzNKN-74rEwwP-y2oQkRr68EWnTdzYBpn-S2zzz4pg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);