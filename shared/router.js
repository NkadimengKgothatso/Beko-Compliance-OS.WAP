/**
 * Beko ComplianceOS — Auth router (Supabase version)
 */
import { supabase } from "/supabase.js";

export const TEST_MODE = true;

/**
 * Get the destination URL for a signed-in user.
 */
export async function getDestination(user) {
  // 1. Email verification (skip in test mode)
  if (!TEST_MODE && !user.email_confirmed_at) {
    return "/verify/verify-email.html";
  }

  // 2. Check profile in database (maybeSingle avoids errors when row missing)
  const { data, error: profileErr } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    console.error("Router: failed to load profile:", profileErr);
  }

  // 3. Check company profile
  if (data?.onboarding_complete) {
    const { data: company, error: companyErr } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (companyErr) {
      console.error("Router: failed to load company:", companyErr);
    }

    if (company) return "/dashboard/dashboard.html";

    // Company missing — reset flag so user completes onboarding again
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ onboarding_complete: false })
      .eq("id", user.id);

    if (updateErr) console.error("Router: failed to reset onboarding flag:", updateErr);
  }

  return "/onboarding/onboarding.html";
}

/**
 * Route user and navigate if needed.
 */
export async function routeUser(currentPage) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) console.error("Router: getUser error:", userErr);
  if (!user) {
    window.location.href = "/login/login.html";
    return;
  }
  const dest = await getDestination(user);
  if (dest !== currentPage) {
    window.location.href = dest;
  }
}
