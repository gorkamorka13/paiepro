---
name: payslip-extraction
description: Guidelines for AI model selection and payslip data extraction protocols using Gemini 2.5 Flash
---

## What I do

### Model Constraints
- **Gemini 2.5 Flash (gemini-2.5-flash) is the ONLY acceptable model** for this project
- **NEVER use**: Gemini 1.5 (Pro/Flash) or Gemini 2.0 (Flash) - these are strictly obsolete or restricted
- All extraction logic must be designed exclusively for Gemini 2.5 version

### Extraction Standards
- Implement hybrid OCR/AI extraction:
  - **Traditional**: Ultra-fast regex extraction for standard formats (free)
  - **AI (Gemini 2.5 Flash)**: Intelligent multimodal analysis for scans and complex formats
- Validate all extracted data using Zod schemas from `lib/validations.ts`
- Use `ExtractionLogger` for every AI call to track latency, costs, and accuracy

### When to use me
Use this skill when:
- Implementing or modifying payslip extraction logic
- Selecting AI models for document processing
- Working with OCR/traditional extraction methods
- Optimizing extraction performance and accuracy

### Related files
- `lib/ai-service.ts` - Gemini 2.5 Flash service
- `lib/extraction-service.ts` - OCR & regex extraction
- `lib/validations.ts` - Zod validation schemas
