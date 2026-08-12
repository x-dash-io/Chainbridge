# Password Reset Setup Guide

This guide explains how to configure the password reset feature to work properly in both local development and production (Vercel) environments.

## Overview

The password reset feature uses Supabase Auth's built-in email functionality. The system automatically detects the environment and generates the correct reset URLs.

## Environment Configuration

### 1. Local Development

The `.env` file should contain:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

This ensures that password reset emails will redirect to `http://localhost:3000/reset-password` during development.

### 2. Production (Vercel)

In the Vercel project settings, add the environment variable:

```env
NEXT_PUBLIC_SITE_URL=https://chainbridge-two.vercel.app
```

This is the production domain for Chainbridge.

## How It Works

The password reset system uses a priority-based URL detection:

1. **Priority 1:** Uses `NEXT_PUBLIC_SITE_URL` environment variable if set
2. **Priority 2:** Auto-detects from request headers:
   - Uses `x-forwarded-proto` header for protocol detection
   - Uses `host` header for domain detection
   - Defaults to `http` for localhost, `https` for production

## Supabase Configuration

### Email Templates

Configure the Supabase email templates in the Supabase dashboard:

1. Go to the Supabase project
2. Navigate to Authentication → Email Templates
3. Configure the "Reset Password" template

**Reset Password Template Example:**

```html
<h2>Reset Your Password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
<p>This link will expire in 1 hour.</p>
```

### Site URL Configuration in Supabase

1. Go to the Supabase project
2. Navigate to Authentication → URL Configuration
3. Add the site URLs:

**For Development:**
- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/reset-password`

**For Production:**
- Site URL: `https://chainbridge-two.vercel.app`
- Redirect URLs: `https://chainbridge-two.vercel.app/reset-password`

## Vercel Deployment Setup

### Step 1: Add Environment Variables

In the Vercel project settings, add:

```
NEXT_PUBLIC_SITE_URL=https://chainbridge-two.vercel.app
```

### Step 2: Update Supabase Redirect URLs

Update the Supabase project to include the production domain:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add `https://chainbridge-two.vercel.app` to the allowed redirect URLs
3. Set the site URL to `https://chainbridge-two.vercel.app`

### Step 3: Test the Flow

1. Deploy to Vercel
2. Navigate to `https://chainbridge-two.vercel.app/forgot-password`
3. Enter the email
4. Check the email for the reset link
5. Click the link and verify it redirects to `https://chainbridge-two.vercel.app/reset-password`

## Testing Locally

### Test Password Reset Flow

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/forgot-password`

3. Enter a test email (use one of the seeded user emails)

4. Check the email for the reset link

5. Click the link and verify it redirects to `http://localhost:3000/reset-password`

6. Enter the new password

7. Verify login works with the new password

### Using Seeded Users

Test with the seeded users from `SEEDED_USER_CREDENTIALS.md`:

```
Email: linda.martinez@chainbridge.co.ke
Password: password123
```

## Troubleshooting

### Issue: Reset link redirects to wrong domain

**Solution:** Check that `NEXT_PUBLIC_SITE_URL=https://chainbridge-two.vercel.app` is set correctly in the Vercel environment variables.

### Issue: Emails not being sent

**Solution:** 
- Verify the Supabase email settings are configured
- Check the Supabase dashboard for email delivery logs
- Ensure the email templates are properly configured

### Issue: "Your reset link has expired or is invalid"

**Solution:** 
- Reset links expire after 1 hour by default
- Request a new reset link
- Check that the redirect URLs are configured correctly in Supabase

### Issue: Rate limiting preventing reset

**Solution:** 
- The system has rate limiting to prevent abuse
- Wait a few minutes before requesting another reset
- Check the rate limit configuration in `lib/rate-limit.ts`

## Security Considerations

1. **Email Enumeration Protection:** The system always returns the same success message, even if the email doesn't exist. This prevents attackers from enumerating valid email addresses.

2. **Rate Limiting:** Password reset requests are rate-limited per email address to prevent abuse.

3. **Link Expiration:** Reset links expire after 1 hour for security.

4. **HTTPS in Production:** The system automatically uses HTTPS for non-localhost domains.

## File Changes Made

The following files were modified/created to support proper password reset:

1. **lib/auth/request-password-reset.ts**
   - Added `getSiteUrl()` function with environment detection
   - Improved logging for debugging
   - Better error handling

2. **.env**
   - Added `NEXT_PUBLIC_SITE_URL=http://localhost:3000`

3. **.env.example**
   - Created example environment file with all required variables

4. **.env.production.example**
   - Created production-specific example with Vercel configuration

## Verification Checklist

Before deploying to production, verify:

- [ ] `NEXT_PUBLIC_SITE_URL=https://chainbridge-two.vercel.app` is set in Vercel environment variables (NOT in local .env)
- [ ] Local .env keeps `NEXT_PUBLIC_SITE_URL=http://localhost:3000` for local development
- [ ] Supabase redirect URLs include `https://chainbridge-two.vercel.app`
- [ ] Email templates are configured in Supabase
- [ ] Password reset works locally with localhost
- [ ] Password reset works in production with `https://chainbridge-two.vercel.app`
- [ ] Rate limiting is functioning properly
- [ ] Email delivery is working in Supabase

## Support

If issues are encountered:

1. Check the browser console for JavaScript errors
2. Check the server logs for authentication errors
3. Verify Supabase email settings and delivery logs
4. Ensure all environment variables are properly set
5. Test with a simple email address first