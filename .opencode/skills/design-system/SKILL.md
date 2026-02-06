---
name: design-system
description: UI/UX standards for premium interface design using glassmorphism, lucide-react, and sonner
---

## What I do

### Premium Aesthetic Standards
Implement modern design principles:
- **Glassmorphism**: Semi-transparent backgrounds with backdrop blur
- **Subtle shadows**: Soft, layered shadows for depth
- **Micro-animations**: Smooth transitions (200-300ms duration)
- **Consistent spacing**: Follow Tailwind spacing scale

### Icon System
- **Use ONLY lucide-react** for all icons
- Import: `import { IconName } from 'lucide-react'`
- Consistent sizing (default 24px, adjust with className)
- No mixing with other icon libraries

### Feedback & Notifications
- **Use sonner** for all toast notifications
- Import: `import { toast } from 'sonner'`
- Critical actions must include visual feedback via toast
- Toast types: success, error, loading, custom

### UI Components Guidelines
- Maintain visual hierarchy with proper contrast
- Use Tailwind CSS utility classes consistently
- Ensure responsive design across breakpoints
- Follow shadcn/ui patterns where applicable

### Animation Standards
- Duration: 200-300ms for micro-interactions
- Easing: `ease-in-out` or `cubic-bezier(0.4, 0, 0.2, 1)`
- Purpose: Guide attention, provide feedback, indicate state changes

### When to use me
Use this skill when:
- Creating new UI components or pages
- Adding user feedback mechanisms
- Implementing animations or transitions
- Selecting icons for the interface
- Reviewing UI for design consistency

### Related files
- `app/globals.css` - Global styles and Tailwind config
- `components/` - Reusable UI components
- `tailwind.config.ts` - Tailwind customization
