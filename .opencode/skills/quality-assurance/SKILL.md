---
name: quality-assurance
description: Testing, auditing, and database quality standards for production-ready code
---

## What I do

### AI Extraction Auditing
- **Use `ExtractionLogger`** for EVERY AI call
- Track metrics:
  - Latency (response time)
  - Costs (token usage)
  - Accuracy (extraction success rate)
- Location: `lib/extraction-service.ts` or dedicated logger
- Review logs regularly for optimization opportunities

### Database Workflows

**Development Phase:**
- Use `npx prisma db push` for rapid schema changes
- Iterate quickly without migration files
- Suitable for feature development

**Production Phase:**
- Document ALL schema changes in migrations
- Use `npx prisma migrate dev` for versioned changes
- Never use `db push` in production
- Always backup before migrations

### Testing Standards

**Unit Tests (Vitest):**
- Location: `tests/` or `*.test.ts` alongside source
- Focus on business logic
- Mock external dependencies (AI services, database)
- Run: `npm run test`

**E2E Tests (Playwright):**
- Location: `tests/e2e/` or `*.spec.ts`
- Cover critical user flows:
  - Authentication
  - Payslip upload
  - Dashboard interactions
  - Data export
- Run: `npm run test:e2e`

**Coverage:**
- Minimum threshold: 70% for business logic
- Run: `npm run test:coverage`

### Quality Checklist
- [ ] ExtractionLogger implemented for AI calls
- [ ] Unit tests for complex logic
- [ ] E2E tests for critical paths
- [ ] Database migrations documented (production)
- [ ] Error handling tested
- [ ] Edge cases covered

### When to use me
Use this skill when:
- Implementing AI extraction features
- Writing database queries or migrations
- Creating test cases
- Setting up logging/monitoring
- Preparing for production deployment

### Related files
- `tests/` - Test files
- `lib/extraction-service.ts` - Logging implementation
- `prisma/schema.prisma` - Database schema
- `scripts/` - Maintenance utilities
