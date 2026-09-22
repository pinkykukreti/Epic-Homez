# Company email notifications
Recipient: epichomezstore@gmail.com.
The submit-enquiry Supabase function saves validated enquiries, then sends a plain-text notification using Resend. Optional customer email becomes Reply-To. API credentials never enter the browser. The existing CAPTCHA, origin checks, honeypot and rate limits remain in force.

## Activation
1. Configure Supabase and Turnstile using README.md.
2. Verify your own sending domain in Resend and create a sending API key. A Gmail inbox can receive notifications, but is not a verified sending domain.
3. Set RESEND_API_KEY, ENQUIRY_FROM_EMAIL (a verified sender) and ENQUIRY_TO_EMAIL as server-side Supabase secrets. See .env.server.example. Do not paste keys in chat or use VITE_ prefixes.
4. Include the actual website origin in ALLOWED_ORIGINS and configure SITE_URL. For this local preview, use http://127.0.0.1:5174.
5. Deploy submit-enquiry. Submit a controlled test using your own contact details; verify both the saved record and actual inbox delivery before launching.

## Failure behaviour
A provider acceptance is not a guarantee of inbox delivery. Transient provider errors retry once with the same idempotency key. Saved enquiries are never discarded if email fails. Logs include only the reference and notification status; administrators must also check the enquiries dashboard. There is no scheduled retry queue. Review provider delivery logs for bounces.
Without form configuration, the contact form explicitly opens the visitor's email app; the visitor must send that draft. It never reports this as a submitted enquiry.
Reference: https://resend.com/docs/api-reference/emails/send-email
