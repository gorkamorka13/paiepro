---
name: code-internationalization
description: Language guidelines for French UI elements and English code/logic
---

## What I do

### Language Separation Rules

**FRENCH (User-facing content):**
- UI text and labels
- Error messages displayed to users
- Toast notifications
- Form placeholders and hints
- Button labels
- Dashboard headers and descriptions

**ENGLISH (Code & internal logic):**
- Variable names
- Function names
- Technical comments
- Internal prompts for AI
- API endpoint names
- Database field names
- File and folder names

### Examples

✅ **Correct:**
```typescript
// English: Function and variable names
const calculateMonthlyRevenue = (bulletinPaie: Payslip) => {
  const totalRevenu = bulletinPaie.revenuBrut;
  return totalRevenu;
};

// French: User-facing error message
throw new Error("Impossible de calculer le revenu mensuel");
```

❌ **Incorrect:**
```typescript
// Mixed language
const calculerRevenuMensuel = (bulletinPaie: BulletinPaie) => {
  const revenuTotal = bulletinPaie.revenu_brut;
  return revenuTotal;
};

throw new Error("Cannot calculate monthly revenue"); // Wrong language
```

### Consistency Checklist
- [ ] All UI strings in French
- [ ] All code identifiers in English
- [ ] Comments in English
- [ ] AI prompts in English
- [ ] File names in English (kebab-case)

### When to use me
Use this skill when:
- Writing error messages
- Naming variables and functions
- Creating UI labels and text
- Writing code comments
- Defining TypeScript types

### Related files
- `app/` - Next.js app directory (pages in French context)
- `components/` - React components with French UI text
- `lib/validations.ts` - Validation error messages in French
