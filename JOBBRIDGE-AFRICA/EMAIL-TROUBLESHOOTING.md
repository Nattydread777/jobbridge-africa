# Email Delivery Troubleshooting

## Contact form delivery

The contact form tries Resend first when `RESEND_API_KEY` is configured. If Resend
fails or is not configured, it falls back to the primary and secondary SMTP
transports. Password-reset emails continue to use SMTP.

Configure these values in Render's environment settings:

```text
RESEND_API_KEY=<Resend API key>
RESEND_FROM=<sender address verified in Resend>
EMAIL_USER=info@jobbridgeafrica.com
EMAIL_PASS=<SMTP app password>
EMAIL_FROM=info@jobbridgeafrica.com
ADMIN_EMAIL=info@jobbridgeafrica.com
```

`RESEND_FROM` defaults to `onboarding@resend.dev` for testing. That sender can be
restricted to Resend's test use; configure a sender on a verified domain before
sending contact form messages to arbitrary visitors in production. Never put API
keys or SMTP passwords in source control.

## Troubleshooting

- Check the Render logs for `Resend error:` and the provider response details.
- `GET /api/contact/health` reports configured delivery settings; it does not send
  a test message or validate the API key with Resend.
- If Resend rejects delivery, confirm `RESEND_API_KEY` is valid and `RESEND_FROM`
  is verified in the same Resend account.
- If SMTP fallback is needed, verify `EMAIL_USER` and `EMAIL_PASS`; try
  `EMAIL_PORT=587` with `EMAIL_SECURE=false` if port 465 is unavailable.
- Check the Resend or SMTP provider's delivery logs and the recipient's spam folder.

## Domain authentication

For production delivery, follow Resend's domain verification instructions and add
the SPF/DKIM records it provides to `jobbridgeafrica.com`. Keep any existing SPF
record consolidated rather than publishing multiple SPF records. A DMARC policy
is also recommended.
