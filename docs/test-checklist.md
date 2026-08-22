# Beko ComplianceOS — Manual Test Checklist

**Tester:** ___________________  
**Date:** ___________________  
**Device / Browser:** ___________________  
**Site URL:** https://www.bekocompliance.co.za

---

## 1. Registration & Authentication

> The app uses **email verification codes** (8-digit OTP) instead of verification links. Emails are sent from `bekocompliance9@gmail.com`.

| # | Action | Expected Result | Pass |
|---|--------|-----------------|------|
| 1.1 | Open the site URL | Splash screen appears for ~2.5 seconds, then redirects to login | [ ] |
| 1.2 | Login page shows two tabs: **Sign In** and **Create Account** | Tabs are visible, Sign In is active by default | [ ] |
| 1.3 | Click the **Create Account** tab | Signup form appears with Full Name, Email, Password, Confirm Password fields | [ ] |
| 1.4 | Type different passwords in Password and Confirm Password | Red message says "Passwords do not match" | [ ] |
| 1.5 | Type matching passwords | Green message says "Passwords match" | [ ] |
| 1.6 | Fill in all signup fields with valid data and click **Create Account & Send Code** | Account created, redirects to verify page, 8-digit code auto-sent | [ ] |
| 1.7 | On verify page, enter the 8-digit code from email | "Verified successfully" appears, redirects to onboarding | [ ] |
| 1.8 | Paste an 8-digit code (Ctrl+V) into the first box | All 8 boxes auto-fill and verification starts automatically | [ ] |
| 1.9 | Enter a wrong code | Shows "Invalid code" error, input clears for retry | [ ] |
| 1.10 | Click **Resend code** | A new code is sent to your email | [ ] |
| 1.11 | Click **Sign In** tab on login page | Sign in form shows with Email and Password fields | [ ] |
| 1.12 | Sign in with email and password | Redirects to dashboard (or onboarding) | [ ] |
| 1.13 | Try signing in with an unverified email/password | Shows "Email not verified. Sending code..." and redirects to verify page | [ ] |
| 1.14 | Click **Continue with Google** button | Google OAuth flow starts, after approval you land on dashboard or onboarding | [ ] |
| 1.15 | Click **Forgot password?** and enter email | Password reset email is sent | [ ] |
| 1.16 | Try signing up with an email that already has an account | Supabase shows an error that user already exists | [ ] |

---

## 2. Onboarding Wizard

| # | Action | Expected Result | Pass |
|---|--------|-----------------|------|
| 2.1 | Complete onboarding if redirected after signup | 6-step wizard appears with progress bar | [ ] |
| 2.2 | Fill in Step 1 (Business type, name, registration number) | Can move to Step 2 with **Next** button | [ ] |
| 2.3 | Fill in remaining steps (location, employees, compliance details) | Each step shows relevant fields, Back button works | [ ] |
| 2.4 | Click **Finish** on the last step | Redirects to dashboard | [ ] |

---

## 3. Dashboard

| # | Action | Expected Result | Pass |
|---|--------|-----------------|------|
| 3.1 | View the dashboard after onboarding | Shows compliance score %, business details, alerts, and action count | [ ] |
| 3.2 | Check the sidebar | All navigation links are present: Dashboard, Templates, Education, Tenders, AML, Notifications, Consultation, Compliance, Profile, Admin | [ ] |
| 3.3 | Click **Logout** in the sidebar | Signs out and redirects to login page | [ ] |
| 3.4 | Log back in | Returns to dashboard | [ ] |

---

## 4. Template Library

| # | Action | Expected Result | Pass |
|---|--------|-----------------|------|
| 4.1 | Click **Templates** in the sidebar | Template library page loads with cards in a grid | [ ] |
| 4.2 | Click the **Corporate** category tab | Only corporate templates show (MOI, Board Resolution) | [ ] |
| 4.3 | Click the **Policies** category tab | Policy templates show (Health & Safety, Remote Work, Supplier Code) | [ ] |
| 4.4 | Click **All** tab | All 22 templates are visible | [ ] |
| 4.5 | Type "NDA" in the search box | Only the NDA template card shows | [ ] |
| 4.6 | Click **Download** on any template | A professional PDF downloads with Beko branding, header, footer, and page numbers | [ ] |
| 4.7 | Open the downloaded PDF | Content is formatted correctly with sections, dates, and placeholder fields | [ ] |

---

## 5. Education Hub

| # | Action | Expected Result | Pass |
|---|--------|-----------------|------|
| 5.1 | Click **Education Hub** in the sidebar | Article cards appear in a grid | [ ] |
| 5.2 | Type "POPIA" in the search box | POPIA article card shows | [ ] |
| 5.3 | Click on any article card | A modal opens with the full article content | [ ] |
| 5.4 | Click **Download slides (PDF)** button in the modal | A landscape PDF downloads with title slide and bullet-point slides | [ ] |
| 5.5 | Close the modal by clicking the **×** button | Modal closes | [ ] |
| 5.6 | Click outside the modal content area | Modal closes | [ ] |

---

## 6. Tenders

| # | Action | Expected Result | Pass |
|---|--------|-----------------|------|
| 6.1 | Click **Tenders** in the sidebar | Tender listings appear with search and filter options | [ ] |
| 6.2 | Search for "ICT" in the search box | ICT-related tenders are filtered | [ ] |
| 6.3 | Click **Track** on a tender | Tender is added to your tracked list | [ ] |
| 6.4 | Click **Untrack** on the same tender | Tender is removed from tracked list | [ ] |
| 6.5 | Create a tender alert with keywords | Alert is saved successfully | [ ] |
| 6.6 | Delete a tender alert | Alert is removed | [ ] |

---

## 7. AML Screener

| # | Action | Expected Result | Pass |
|---|--------|-----------------|------|
| 7.1 | Click **AML Screener** in the sidebar | Questionnaire page loads | [ ] |
| 7.2 | Answer all the risk questions | Score ring appears showing your risk level (Low / Medium / High) | [ ] |
| 7.3 | View the screening history | Previous screenings are listed below | [ ] |
| 7.4 | Take a second screening | New result is saved and appears in history | [ ] |

---

## 8. Notifications

| # | Action | Expected Result | Pass |
|---|--------|-----------------|------|
| 8.1 | Click **Notifications** in the sidebar | Notification list loads | [ ] |
| 8.2 | Click on an unread notification | It marks as read (bold → normal) | [ ] |
| 8.3 | Click **Mark all read** | All notifications become read | [ ] |

---

## 9. Consultation Booking

| # | Action | Expected Result | Pass |
|---|--------|-----------------|------|
| 9.1 | Click **Consultation** in the sidebar | Consultation booking form appears | [ ] |
| 9.2 | Fill in consultation type, preferred date, and message | Form accepts input | [ ] |
| 9.3 | Click **Submit** | Request is saved and appears in consultation history below | [ ] |

---

## 10. Compliance Centre

| # | Action | Expected Result | Pass |
|---|--------|-----------------|------|
| 10.1 | Click **Compliance** in the sidebar | Compliance centre loads with POPIA Checklist tab active | [ ] |
| **POPIA Checklist** | | | |
| 10.2 | Check a few items in the checklist | Items are saved, progress bar updates | [ ] |
| 10.3 | Uncheck an item | Progress bar decreases | [ ] |
| 10.4 | Check all items | Progress bar reaches 100% | [ ] |
| **SARS Tax Calendar** | | | |
| 10.5 | Click the **SARS Tax Calendar** tab | Deadline table loads with PAYE/UIF, VAT, and other deadlines | [ ] |
| 10.6 | Filter by **VAT** category | Only VAT deadlines show | [ ] |
| 10.7 | Check status badges | Deadlines show as Overdue (red), Due soon (orange), or Upcoming (teal) | [ ] |
| **CIPC Reminder** | | | |
| 10.8 | Click the **CIPC Reminder** tab | Reminder form appears | [ ] |
| 10.9 | Enter a registration date and click **Save reminder** | Reminder is saved, next due date is calculated and displayed | [ ] |
| **Document Vault** | | | |
| 10.10 | Click the **Document Vault** tab | Upload area appears | [ ] |
| 10.11 | Upload a file (PDF or image) | File uploads, appears in the document list | [ ] |
| 10.12 | Click **Download** on a file | File opens/downloads correctly | [ ] |
| 10.13 | Click **Delete** on a file and confirm | File is removed from the list | [ ] |

---

## 11. Profile

| # | Action | Expected Result | Pass |
|---|--------|-----------------|------|
| 11.1 | Click **Profile** in the sidebar | Profile page loads with business details | [ ] |
| 11.2 | Edit your full name and save | Name updates successfully | [ ] |

---

## 12. Admin Panel (admin user only)

> This section requires an admin account. Ask the site owner to grant admin access.

| # | Action | Expected Result | Pass |
|---|--------|-----------------|------|
| 12.1 | Click **Admin** in the sidebar | Admin panel loads with Tenders, Notifications, Consultations tabs | [ ] |
| 12.2 | Click **Add tender** and fill in details | Tender is created and appears in the list | [ ] |
| 12.3 | Edit an existing tender | Changes are saved | [ ] |
| 12.4 | Delete a tender | Tender is removed from the list | [ ] |
| 12.5 | Click **Send notification**, enter a user email and message | Notification is sent to that user | [ ] |
| 12.6 | Send a notification with "all" in the email field | Notification is sent to all users | [ ] |
| 12.7 | Change a consultation status from the dropdown | Status updates and a success toast appears | [ ] |
| 12.8 | Log in as a non-admin user and go to Admin page | Shows "Access denied" message | [ ] |

---

## 13. Mobile & PWA

| # | Action | Expected Result | Pass |
|---|--------|-----------------|------|
| 13.1 | Open the site on a mobile browser (Chrome Android recommended) | Page loads and looks good on small screen | [ ] |
| 13.2 | Tap the hamburger menu (☰) | Mobile navigation drawer opens | [ ] |
| 13.3 | Tap a link in the mobile menu | Navigates to the selected page, menu closes | [ ] |
| 13.4 | Check for **Add to Home Screen** prompt on Chrome Android | Browser offers to install the app | [ ] |
| 13.5 | Install the app to home screen | App icon appears on home screen | [ ] |
| 13.6 | Open the app from the home screen icon | App opens in standalone mode (no browser address bar) | [ ] |
| 13.7 | Go offline (turn on airplane mode) and open the app | Cached pages load, API-dependent features show errors gracefully | [ ] |
| 13.8 | Go back online and use the app | Features work normally again | [ ] |

---

## 14. Responsive Design (Tablet & Desktop)

| # | Action | Expected Result | Pass |
|---|--------|-----------------|------|
| 14.1 | Resize the browser window to a narrow width (< 1024px) | Sidebar disappears, content fills the screen | [ ] |
| 14.2 | Widen the browser window (> 1024px) | Sidebar reappears | [ ] |
| 14.3 | Open the site on a tablet | Layout adapts between mobile and desktop views | [ ] |

---

## 15. Cross-Browser

| # | Action | Expected Result | Pass |
|---|--------|-----------------|------|
| 15.1 | Open the site in **Chrome** | Everything works | [ ] |
| 15.2 | Open the site in **Firefox** | Everything works | [ ] |
| 15.3 | Open the site in **Safari** (iOS or macOS) | Everything works | [ ] |
| 15.4 | Open the site in **Edge** | Everything works | [ ] |

---

## Issues Found

| # | Page / Feature | Description of Issue | Severity (Low/Med/High) |
|---|---------------|---------------------|------------------------|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

---

**Overall Assessment:** [ ] Pass   [ ] Pass with minor issues   [ ] Fail

**Tester Signature:** ___________________  
**Date:** ___________________
