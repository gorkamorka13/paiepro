---
name: development-standards
description: Code standards including Zod validation, Server Actions, TypeScript, and Windows environment constraints
---

## What I do

### Windows Environment Constraints
**CRITICAL: Host OS is Windows (PowerShell/CMD)**
- **NEVER use chaining operators**: No `&&` or `||` in commands
- **Atomic commands only**: Execute each command in isolation
- **Compatibility first**: Ensure commands work in PowerShell/CMD

### Zod Validation
- **NO data processing without validation** - All user input and AI output must pass through Zod schemas
- Single source of truth: `lib/validations.ts`
- Validate at boundaries: API inputs, form data, AI responses
- Use strict schemas with proper TypeScript inference

### Server Actions Pattern
- **Use ONLY Server Actions** for data mutations
- Location: `app/actions/` directory
- Naming: `action-name.ts` (kebab-case)
- Always handle errors and return typed responses
- Never use direct API routes for mutations when Server Actions available

### TypeScript Standards
- **BAN `any` type completely**
- Use strict interfaces in `types/` directory
- Prefer explicit types over inference for function signatures
- Enable all strict TypeScript compiler options

### Code Organization
```
app/actions/      # Server Actions only
lib/validations.ts # Zod schemas
types/            # TypeScript interfaces
components/       # React components (kebab-case files)
```

### When to use me
Use this skill when:
- Writing new Server Actions or mutations
- Creating TypeScript types and interfaces
- Implementing form validation
- Writing shell commands (remember Windows constraints)
- Reviewing code for type safety

### Related files
- `app/actions/` - Server Actions
- `lib/validations.ts` - Zod schemas
- `types/` - TypeScript interfaces
- `tsconfig.json` - TypeScript configuration
