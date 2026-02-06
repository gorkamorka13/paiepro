---
name: security-privacy
description: Security protocols for handling sensitive data, API keys, and environment variables
---

## What I do

### Environment Variables Protection
- **NEVER display, log, or transmit** the full content of `.env` files
- Keep `.env` files out of version control (already in `.gitignore`)
- Use `.env.example` as a template without real values

### API Keys & Secrets
- Handle all API keys (Gemini, Vercel Blob) with maximum discretion
- Never hardcode `AUTH_SECRET` or any authentication secrets
- Always use environment variables validated by Zod schemas
- Rotate compromised keys immediately

### Sensitive Data Prevention
- Never hardcode credentials or personal information in code
- Be vigilant when creating debug reports or logs
- Exclude sensitive data fragments from error messages
- Use `lib/validations.ts` for all environment variable validation

### Data Protection Checklist
- [ ] No secrets in code files
- [ ] No full `.env` content in logs
- [ ] Error messages sanitized
- [ ] API keys stored only in environment variables
- [ ] Database URLs protected

### When to use me
Use this skill when:
- Working with environment variables or configuration files
- Handling API keys or authentication secrets
- Creating logs or debug reports
- Setting up new services or integrations
- Reviewing code for security vulnerabilities

### Related files
- `.env` - Environment variables (NEVER commit)
- `.env.example` - Environment template
- `lib/validations.ts` - Environment validation schemas
