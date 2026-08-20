# Beko ComplianceOS — Email Setup Guide

> **Goal:** Send branded verification and password-reset emails from  
> `noreply@yourdomain.co.za` instead of the default Firebase sender  
> (which lands in spam because it comes from `@firebasestorage.app`).

---

## Table of Contents

1. [Why Emails Go to Spam](#why-emails-go-to-spam)
2. [Step 1 — Create a Beko Email Address](#step-1--create-a-beko-email-address)
3. [Step 2 — Set Up DNS Records (SPF / DKIM / DMARC)](#step-2--set-up-dns-records-spf--dkim--dmarc)
4. [Step 3 — Configure Firebase Custom SMTP](#step-3--configure-firebase-custom-smtp)
5. [Step 4 — Update Firebase Email Templates](#step-4--update-firebase-email-templates)
6. [Step 5 — Set Up Custom Email Action Handler](#step-5--set-up-custom-email-action-handler)
7. [Email Templates](#email-templates)
8. [Testing](#testing)

---

## Why Emails Go to Spam

Firebase Auth's default sender uses `noreply@beko-compliance-os.firebaseapp.com`.  
Email providers flag this because:

| Problem | Fix |
|---|---|
| Sending domain (`@firebasestorage.app`) is shared and untrusted | Use your own domain as sender |
| No SPF record authorising the sender | Add SPF DNS record |
| No DKIM signature | Add DKIM via your SMTP provider |
| No DMARC policy | Add DMARC DNS record |
| Generic template with no branding | Use branded HTML templates |

---

## Step 1 — Create a Beko Email Address

Create a dedicated email on your domain for sending transactional emails:

```
noreply@yourdomain.co.za
```

**Where to create it:**
- If your domain uses **cPanel** (most SA hosting): cPanel → Email Accounts → Create
- If you use **Google Workspace**: Admin → Users → Add `noreply@`
- If you use **Zoho Mail**: Add a mailbox alias

> You don't need to log into this inbox — it's a sending-only address.  
> Create a `support@yourdomain.co.za` inbox for receiving user replies.

---

## Step 2 — Set Up DNS Records (SPF / DKIM / DMARC)

Add these DNS records to your domain's DNS settings (where your domain is managed — Afrihost, Hetzner, GoDaddy, etc.):

### SPF Record
Allows your SMTP provider to send email on behalf of your domain.

```
Type:  TXT
Host:  @  (or yourdomain.co.za)
Value: v=spf1 include:_spf.google.com include:sendgrid.net ~all
```

> Adjust the `include:` values based on your SMTP provider:
> - **SendGrid:** `include:sendgrid.net`
> - **Mailgun:** `include:mailgun.org`
> - **Google Workspace:** `include:_spf.google.com`
> - **SMTP2GO:** `include:smtp2go.com`

### DKIM Record
Your SMTP provider will give you a DKIM key to add:

```
Type:  TXT
Host:  s1._domainkey  (varies by provider)
Value: v=DKIM1; k=rsa; p=MIIBIjANBg...  (from your provider)
```

### DMARC Record
Tells receiving servers what to do with unauthenticated emails:

```
Type:  TXT
Host:  _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:support@yourdomain.co.za
```

> Start with `p=none` for monitoring, then upgrade to `p=quarantine` once confirmed working.

---

## Step 3 — Configure Firebase Custom SMTP

Firebase allows you to use your own SMTP server for Auth emails.

### Option A: SendGrid (Recommended — Free Tier 100/day)

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Verify your domain in SendGrid (adds SPF + DKIM automatically)
3. Create an API key with "Mail Send" permissions
4. In Firebase Console:
   - Go to **Authentication → Settings → SMTP**
   - Enable "Custom SMTP server"
   - Fill in:
     ```
     Sender email:  noreply@yourdomain.co.za
     Sender name:   Beko ComplianceOS
     SMTP host:     smtp.sendgrid.net
     SMTP port:     587
     Username:      apikey
     Password:      <your SendGrid API key>
     ```

### Option B: SMTP2GO (SA-friendly, free tier 1000/month)

1. Sign up at [smtp2go.com](https://smtp2go.com)
2. Verify your domain
3. In Firebase Console → Authentication → Settings → SMTP:
   ```
   Sender email:  noreply@yourdomain.co.za
   Sender name:   Beko ComplianceOS
   SMTP host:     mail.smtp2go.com
   SMTP port:     2525
   Username:      <your SMTP2GO username>
   Password:      <your SMTP2GO password>
   ```

### Option C: Google Workspace SMTP

```
SMTP host:     smtp-relay.gmail.com
SMTP port:     587
Username:      noreply@yourdomain.co.za
Password:      <app password>
```

---

## Step 4 — Update Firebase Email Templates

In Firebase Console → **Authentication → Templates**:

### Email Verification Template

Replace the default template with the branded version from `emails/verify-email.html`.

Key settings:
- **Subject line:** `Verify your email — Beko ComplianceOS`
- **Action URL:** Keep as default (Firebase generates this)
- **App name:** `Beko ComplianceOS`

### Password Reset Template

Replace with `emails/password-reset.html`.

Key settings:
- **Subject line:** `Reset your password — Beko ComplianceOS`
- **Action URL:** Keep as default
- **App name:** `Beko ComplianceOS`

---

## Step 5 — Set Up Custom Email Action Handler

For full control over the email action URLs (the links users click), create a custom handler page on your domain.

### In Firebase Console:
1. Go to **Authentication → Settings → Email templates**
2. Click "Customize action URL"
3. Set it to: `https://yourdomain.co.za/emails/action-handler.html`

This page will handle:
- Email verification (`mode=verifyEmail`)
- Password reset (`mode=resetPassword`)
- Email recovery (`mode=recoverEmail`)

The handler is already built in `emails/action-handler.html` — just deploy it to your hosting.

---

## Email Templates

Three branded templates are in the `emails/` folder:

| File | Purpose | Placeholders |
|---|---|---|
| `verify-email.html` | Email verification | `{{ACTION_URL}}`, `{{DISPLAY_NAME}}`, `{{APP_DOMAIN}}` |
| `password-reset.html` | Password reset | `{{ACTION_URL}}`, `{{DISPLAY_NAME}}`, `{{APP_DOMAIN}}` |
| `welcome.html` | Welcome after onboarding | `{{DISPLAY_NAME}}`, `{{COMPANY_NAME}}`, `{{COMPLIANCE_SCORE}}`, `{{APP_DOMAIN}}` |

### Design Specs
- **Brand gradient header:** Navy → teal with logo
- **CTA button:** Navy for verify, green for reset
- **Fonts:** Segoe UI (matches the app)
- **Layout:** Single-column, 560px max width, table-based (email-safe)
- **Responsive:** Works on mobile email clients

---

## Testing

### 1. Check deliverability
After setting up SMTP + DNS records:
```bash
# Send a test email to yourself and check:
# - Does it arrive in inbox (not spam)?
# - Does it show yourdomain.co.za as sender?
# - Is the HTML rendering correctly?
```

### 2. Use email testing tools
- [mail-tester.com](https://www.mail-tester.com) — sends a test email and scores it
- [MX Toolbox](https://mxtoolbox.com) — checks SPF, DKIM, DMARC records
- [Litmus](https://litmus.com) — previews in 90+ email clients

### 3. Verify DNS propagation
```bash
# Check SPF
nslookup -type=TXT yourdomain.co.za

# Check DMARC
nslookup -type=TXT _dmarc.yourdomain.co.za
```

### 4. Common spam triggers to avoid
- ❌ Don't use `@gmail.com` or `@firebasestorage.app` as sender
- ❌ Don't send from an IP with no reverse DNS
- ❌ Don't have broken images in the email
- ❌ Don't use URL shorteners
- ✅ Do include a plain-text fallback
- ✅ Do include an unsubscribe mechanism (for marketing emails)
- ✅ Do warm up your sending domain gradually

---

## Quick Reference — DNS Records Summary

| Record | Type | Host | Value |
|---|---|---|---|
| SPF | TXT | `@` | `v=spf1 include:sendgrid.net ~all` |
| DKIM | TXT | `s1._domainkey` | *(from SMTP provider)* |
| DMARC | TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:support@yourdomain.co.za` |

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Emails still in spam | Check SPF/DKIM are correct; use mail-tester.com |
| "SMTP connection failed" in Firebase | Verify port is not blocked; try port 2525 |
| Logo not showing in email | Logo URL must be publicly accessible (not localhost) |
| Firebase says "Invalid SMTP credentials" | Regenerate API key / password |
| Emails sent but blank | Check template syntax; Firebase uses `%{variable}%` not `{{variable}}` |

> **Note:** Firebase Console email templates use `%{DISPLAY_NAME}%` syntax,  
> not `{{DISPLAY_NAME}}`. Replace placeholders accordingly when pasting into Firebase.
