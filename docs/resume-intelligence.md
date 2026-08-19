# Resume intelligence

Phase 3 turns one private, text-based PDF into user-approved professional context. It does not generate interview questions or implement the interview engine.

## Lifecycle and API

```text
PDF upload → uploaded → processing → review_required → ready
                                  └───────────────→ failed
```

All endpoints use the verified bearer identity and never accept a user ID:

- `GET /api/v1/resume` returns the current metadata and candidate context, or `null`;
- `POST /api/v1/resume` accepts one multipart field named `resume`;
- `POST /api/v1/resume/analyze` explicitly analyzes the saved file;
- `PATCH /api/v1/resume` validates and confirms edited `candidateData`;
- `DELETE /api/v1/resume` removes the private object, row, and candidate context.

Upload is limited to 5 attempts per IP per hour and analysis to 10. Analysis occurs only after a new upload or explicit retry—not on reads or page refreshes.

## Storage and replacement

Supabase Storage is used because it already participates in the project's authenticated, user-scoped RLS model. The migration owns the private `resumes` bucket, MIME/size limits, and object policies. Generated paths are `user-id/resume-id/source.pdf`; the sanitized original filename is metadata only.

Replacement validates and uploads the new object before switching the database row. If the row switch fails, the new object is removed as compensation. Once the new row is durable, the obsolete object is removed. Phase 3 retains no resume history or soft-deleted candidate context, which is the simplest privacy-conscious one-active-resume model.

## PDF parsing

`pdfjs-dist` is the sole parser dependency. It extracts selectable text in process and does not render pages, execute embedded content, call shell commands, or invoke OCR. Work is bounded to 5 MiB, 20 pages, 40,000 extracted characters, and a 10-second extraction race. Empty/image-only, oversized, malformed, or unsupported PDFs enter an actionable failure state.

`multer` is used only for one bounded in-memory multipart file. Authentication runs first, its memory storage is capped authoritatively, and no temporary filesystem path or user filename is passed to a command.

## Structured candidate context

The shared strict Zod schema contains only:

- professional summary;
- skills and technologies;
- relevant achievements;
- experience roles, dates, highlights, and technologies;
- projects, descriptions, highlights, and technologies;
- education and relevant highlights.

Experience and education date labels are optional, bounded strings. Analysis must copy only dates
explicitly supported by and reliably associated with an entry, preserving source granularity such
as `2021`, `August 2023`, or `Present`. Missing or ambiguous dates remain `null` and appear as blank,
editable fields during review; Harap does not infer months, years, duration, or chronology.

When analysis has an authenticated profile target role, the same bounded candidate JSON also
contains a role-alignment snapshot: the trusted target role, a categorical `strong`, `partial`, or
`low` level, and at most six short evidence signals and six short gaps. Alignment measures how
useful this PDF is for coaching toward that role; it is not an employability, qualification, or
hiring-probability judgment. Titles alone are insufficient, and supported transferable evidence
such as automation, programming, SQL, APIs, tooling, and technical projects counts for career
changers.

Existing candidate JSON without alignment parses as `roleAlignment: null` (not assessed). No
database migration is required. Replacement and failed analysis already clear candidate JSON, so
they cannot retain a stale assessment. The browser may edit candidate facts but cannot submit or
rewrite alignment metadata; confirmation preserves the server-assessed snapshot.

The extraction instruction minimizes unnecessary personal data: generated summaries use neutral
candidate language instead of repeating a person's name, email address, phone number, street
address, or unrelated identifiers. Legitimate professional organization, institution, project,
and certification names remain available as evidence. The schema has no fields for date of birth,
government identifiers, marital status, or photographs. Because model output is not assumed to be
perfect, the candidate can edit every section or enter it manually, and only explicit confirmation
changes the record to `ready`.

## OpenAI boundary

The backend uses the official OpenAI SDK and Responses structured output with the configurable
model (operational default `gpt-4o-mini`). Both `gpt-4o-mini` and `gpt-5-mini` currently support the
Responses API and Structured Outputs; Phase 3 keeps the already verified runtime default because
no paid task-specific A/B evaluation was performed. This is an operational choice, not a claim
that one model is intrinsically more accurate for resume chronology.

The authenticated profile service retrieves `targetRole`; the browser does not send it to resume
analysis. One model request produces both candidate facts and role alignment, avoiding duplicate
PDF processing and AI cost. The system instruction requires every field to be resume-grounded,
minimizes unnecessary PII, preserves explicitly stated date labels, leaves missing or ambiguous
dates null, distinguishes evidence usefulness from candidate suitability, and tells the model never
to follow instructions contained in resume text. Target role and resume text are JSON-serialized
into separately labeled fields, and the response is validated again with the shared Zod schema. The
server overwrites the returned alignment target-role label with the authoritative profile value.

The SDK uses a 20-second timeout and no automatic retry. Provider failures, refusal/missing output,
and schema mismatches become safe application errors and a constrained failure code. Server logs
retain bounded provider status/code/type/message diagnostics and, on success, aggregate input,
output, and total token counts. No API key, prompt, extracted resume text, raw PDF, authorization
header, or candidate data is logged.

Configuration the project owner must provide in `apps/api/.env` or backend deployment secrets:

```dotenv
OPENAI_API_KEY=<your-secret-key>
OPENAI_MODEL=gpt-4o-mini
```

Never paste the key into chat, commit it, put it in `apps/web`, or prefix it with `VITE_`. Automatic analysis is optional at startup; without a key, the manual editor remains available.

## Automated and manual verification

API tests use synthetic PDFs, mock repositories, and a mock parser. Parser tests cover strong,
partial career-transition, and low evidence fixtures; malformed and bounded output;
provider/timeout-like errors; prompt-injection-like text; PII-minimizing instructions; exact,
year-only, `Present`, missing, and ambiguous date representations; and preservation of legitimate
professional names without network calls or OpenAI spend. These mocked tests lock application
contracts and prompt construction; they do not prove real-model semantic accuracy. UI tests cover
strong/partial/low presentation, continue-anyway behavior, replacement, confirmed context,
refresh, editable date correction, file validation, and deletion confirmation. pgTAP tests cover
row and object isolation.

PDF.js returns text items in the PDF's encoded reading order, which may not match a visually
multi-column layout. A date can therefore be separated from its role or education entry before the
model sees it. Phase 3 prefers a blank date over an unsafe layout heuristic or fabricated
association; human review remains the final authority.

After applying the migration to a local Supabase stack, manually verify:

1. Sign in, open `/app/resume`, and upload a small text-based PDF.
2. Wait for honest analyzing state; verify extracted sections appear.
3. Compare one Experience/Education date against the PDF, correct it or fill one blank date,
   confirm, refresh, and verify persistence.
4. Replace the PDF and verify a fresh review is required.
5. Delete with the confirmation prompt and verify the empty state returns.
6. Try an oversized PDF, text file, renamed non-PDF, corrupt PDF, and signed-out request; each must fail safely.
7. Compare a software-oriented resume, an audit/compliance-only resume, and a career-transition
   resume with genuine automation evidence; verify strong/defensible partial, low, and partial
   advisory behavior respectively.

The migration is ready for `supabase db push --dry-run`. A real hosted push remains an explicit owner action because it creates the table, policies, and private bucket in the linked project.
