import {
  candidateResumeContentSchema,
  type CandidateResumeContent,
  type CandidateResumeData,
} from '@harap/contracts'
import { CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface ExperienceFields {
  endDate: string
  highlights: string
  location: string
  organization: string
  role: string
  startDate: string
  technologies: string
}

interface ProjectFields {
  description: string
  highlights: string
  name: string
  technologies: string
}

interface EducationFields {
  credential: string
  endDate: string
  fieldOfStudy: string
  highlights: string
  institution: string
  startDate: string
}

interface CandidateFormValues {
  achievements: string
  education: EducationFields[]
  experience: ExperienceFields[]
  projects: ProjectFields[]
  skills: string
  summary: string
  technologies: string
}

interface CandidateContextFormProps {
  candidateData: CandidateResumeData
  isConfirmed: boolean
  isSaving: boolean
  onSave: (candidateData: CandidateResumeContent) => Promise<void>
}

const inputLabelClass = 'mb-2 block text-sm font-medium'
const sectionClass = 'rounded-xl border border-border bg-background/45 p-5 sm:p-6'

function lines(values: string[]): string {
  return values.join('\n')
}

function splitLines(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function toFormValues(candidate: CandidateResumeData): CandidateFormValues {
  return {
    achievements: lines(candidate.achievements),
    education: candidate.education.map((item) => ({
      credential: item.credential ?? '',
      endDate: item.endDate ?? '',
      fieldOfStudy: item.fieldOfStudy ?? '',
      highlights: lines(item.highlights),
      institution: item.institution,
      startDate: item.startDate ?? '',
    })),
    experience: candidate.experience.map((item) => ({
      endDate: item.endDate ?? '',
      highlights: lines(item.highlights),
      location: item.location ?? '',
      organization: item.organization,
      role: item.role,
      startDate: item.startDate ?? '',
      technologies: lines(item.technologies),
    })),
    projects: candidate.projects.map((item) => ({
      description: item.description ?? '',
      highlights: lines(item.highlights),
      name: item.name,
      technologies: lines(item.technologies),
    })),
    skills: lines(candidate.skills),
    summary: candidate.summary,
    technologies: lines(candidate.technologies),
  }
}

function nullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function toCandidateData(values: CandidateFormValues): unknown {
  return {
    achievements: splitLines(values.achievements),
    education: values.education.map((item) => ({
      credential: nullable(item.credential),
      endDate: nullable(item.endDate),
      fieldOfStudy: nullable(item.fieldOfStudy),
      highlights: splitLines(item.highlights),
      institution: item.institution.trim(),
      startDate: nullable(item.startDate),
    })),
    experience: values.experience.map((item) => ({
      endDate: nullable(item.endDate),
      highlights: splitLines(item.highlights),
      location: nullable(item.location),
      organization: item.organization.trim(),
      role: item.role.trim(),
      startDate: nullable(item.startDate),
      technologies: splitLines(item.technologies),
    })),
    projects: values.projects.map((item) => ({
      description: nullable(item.description),
      highlights: splitLines(item.highlights),
      name: item.name.trim(),
      technologies: splitLines(item.technologies),
    })),
    skills: splitLines(values.skills),
    summary: values.summary.trim(),
    technologies: splitLines(values.technologies),
  }
}

export function CandidateContextForm({
  candidateData,
  isConfirmed,
  isSaving,
  onSave,
}: CandidateContextFormProps) {
  const form = useForm<CandidateFormValues>({ defaultValues: toFormValues(candidateData) })
  const experience = useFieldArray({ control: form.control, name: 'experience' })
  const projects = useFieldArray({ control: form.control, name: 'projects' })
  const education = useFieldArray({ control: form.control, name: 'education' })

  useEffect(() => form.reset(toFormValues(candidateData)), [candidateData, form])

  const submit = form.handleSubmit(async (values) => {
    if (isSaving) return

    form.clearErrors('root')
    const result = candidateResumeContentSchema.safeParse(toCandidateData(values))
    if (!result.success) {
      form.setError('root', { message: 'Review the field lengths and remove empty list items.' })
      return
    }

    try {
      await onSave(result.data)
    } catch (error: unknown) {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Candidate context could not be saved.',
      })
    }
  })

  return (
    <form aria-busy={isSaving} className="space-y-5" onSubmit={(event) => void submit(event)}>
      <section className={sectionClass}>
        <label className={inputLabelClass} htmlFor="candidate-summary">
          Professional summary
        </label>
        <Textarea
          id="candidate-summary"
          maxLength={1000}
          placeholder="A concise, evidence-based summary of your background."
          {...form.register('summary')}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={sectionClass}>
          <label className={inputLabelClass} htmlFor="candidate-skills">
            Skills
          </label>
          <Textarea
            id="candidate-skills"
            placeholder={'Problem solving\nAPI design\nTechnical communication'}
            {...form.register('skills')}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            One item per line or comma-separated.
          </p>
        </section>
        <section className={sectionClass}>
          <label className={inputLabelClass} htmlFor="candidate-technologies">
            Technologies
          </label>
          <Textarea
            id="candidate-technologies"
            placeholder={'TypeScript\nReact\nPostgreSQL'}
            {...form.register('technologies')}
          />
          <p className="mt-2 text-xs text-muted-foreground">Keep only tools you can discuss.</p>
        </section>
      </div>

      <section className={sectionClass}>
        <label className={inputLabelClass} htmlFor="candidate-achievements">
          Achievements
        </label>
        <Textarea
          id="candidate-achievements"
          placeholder="One measurable achievement per line."
          {...form.register('achievements')}
        />
      </section>

      <section className={sectionClass}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Experience</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Roles, impact, and supporting tools.
            </p>
            <p className="mt-1 text-xs text-muted-foreground" id="experience-date-help">
              Dates are optional. Compare them with your PDF and leave unsupported dates blank.
            </p>
          </div>
          <Button
            onClick={() =>
              experience.append({
                endDate: '',
                highlights: '',
                location: '',
                organization: '',
                role: '',
                startDate: '',
                technologies: '',
              })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" className="size-4" /> Add role
          </Button>
        </div>
        <div className="mt-5 space-y-4">
          {experience.fields.map((field, index) => (
            <div className="rounded-lg border border-border bg-card p-4" key={field.id}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Role
                  <Input
                    className="mt-2"
                    maxLength={160}
                    {...form.register(`experience.${index}.role`)}
                  />
                </label>
                <label className="text-sm font-medium">
                  Organization
                  <Input
                    className="mt-2"
                    maxLength={160}
                    {...form.register(`experience.${index}.organization`)}
                  />
                </label>
                <label className="text-sm font-medium">
                  Location
                  <Input
                    className="mt-2"
                    maxLength={160}
                    {...form.register(`experience.${index}.location`)}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm font-medium">
                    Start
                    <Input
                      aria-describedby="experience-date-help"
                      className="mt-2"
                      maxLength={40}
                      {...form.register(`experience.${index}.startDate`)}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    End
                    <Input
                      aria-describedby="experience-date-help"
                      className="mt-2"
                      maxLength={40}
                      {...form.register(`experience.${index}.endDate`)}
                    />
                  </label>
                </div>
              </div>
              <label className="mt-4 block text-sm font-medium">
                Highlights
                <Textarea className="mt-2" {...form.register(`experience.${index}.highlights`)} />
              </label>
              <label className="mt-4 block text-sm font-medium">
                Technologies
                <Input className="mt-2" {...form.register(`experience.${index}.technologies`)} />
              </label>
              <Button
                className="mt-4 text-destructive"
                onClick={() => experience.remove(index)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" className="size-4" /> Remove role
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Projects</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Work that demonstrates your decisions.
            </p>
          </div>
          <Button
            onClick={() =>
              projects.append({ description: '', highlights: '', name: '', technologies: '' })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" className="size-4" /> Add project
          </Button>
        </div>
        <div className="mt-5 space-y-4">
          {projects.fields.map((field, index) => (
            <div className="rounded-lg border border-border bg-card p-4" key={field.id}>
              <label className="text-sm font-medium">
                Project name
                <Input
                  className="mt-2"
                  maxLength={160}
                  {...form.register(`projects.${index}.name`)}
                />
              </label>
              <label className="mt-4 block text-sm font-medium">
                Description
                <Textarea
                  className="mt-2"
                  maxLength={700}
                  {...form.register(`projects.${index}.description`)}
                />
              </label>
              <label className="mt-4 block text-sm font-medium">
                Highlights
                <Textarea className="mt-2" {...form.register(`projects.${index}.highlights`)} />
              </label>
              <label className="mt-4 block text-sm font-medium">
                Technologies
                <Input className="mt-2" {...form.register(`projects.${index}.technologies`)} />
              </label>
              <Button
                className="mt-4 text-destructive"
                onClick={() => projects.remove(index)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" className="size-4" /> Remove project
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Education</h3>
            <p className="mt-1 text-sm text-muted-foreground">Relevant study and credentials.</p>
            <p className="mt-1 text-xs text-muted-foreground" id="education-date-help">
              Dates are optional. Compare them with your PDF and leave unsupported dates blank.
            </p>
          </div>
          <Button
            onClick={() =>
              education.append({
                credential: '',
                endDate: '',
                fieldOfStudy: '',
                highlights: '',
                institution: '',
                startDate: '',
              })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" className="size-4" /> Add education
          </Button>
        </div>
        <div className="mt-5 space-y-4">
          {education.fields.map((field, index) => (
            <div className="rounded-lg border border-border bg-card p-4" key={field.id}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Institution
                  <Input
                    className="mt-2"
                    maxLength={160}
                    {...form.register(`education.${index}.institution`)}
                  />
                </label>
                <label className="text-sm font-medium">
                  Credential
                  <Input
                    className="mt-2"
                    maxLength={160}
                    {...form.register(`education.${index}.credential`)}
                  />
                </label>
                <label className="text-sm font-medium">
                  Field of study
                  <Input
                    className="mt-2"
                    maxLength={160}
                    {...form.register(`education.${index}.fieldOfStudy`)}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm font-medium">
                    Start
                    <Input
                      aria-describedby="education-date-help"
                      className="mt-2"
                      maxLength={40}
                      {...form.register(`education.${index}.startDate`)}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    End
                    <Input
                      aria-describedby="education-date-help"
                      className="mt-2"
                      maxLength={40}
                      {...form.register(`education.${index}.endDate`)}
                    />
                  </label>
                </div>
              </div>
              <label className="mt-4 block text-sm font-medium">
                Highlights
                <Textarea className="mt-2" {...form.register(`education.${index}.highlights`)} />
              </label>
              <Button
                className="mt-4 text-destructive"
                onClick={() => education.remove(index)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" className="size-4" /> Remove education
              </Button>
            </div>
          ))}
        </div>
      </section>

      {form.formState.errors.root?.message === undefined ? null : (
        <p className="text-sm text-destructive" role="alert">
          {form.formState.errors.root.message}
        </p>
      )}

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={
            isConfirmed && !form.formState.isDirty
              ? 'flex items-center gap-2 text-sm text-primary'
              : 'text-sm text-muted-foreground'
          }
          role="status"
        >
          {isSaving ? (
            'Saving candidate context…'
          ) : isConfirmed && form.formState.isDirty ? (
            'You have unsaved changes. Save them to update your confirmed context.'
          ) : isConfirmed ? (
            <>
              <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
              Candidate context confirmed and ready for coaching.
            </>
          ) : (
            'Review required before Harap can use this context for coaching.'
          )}
        </p>
        <Button
          disabled={isSaving || (isConfirmed && !form.formState.isDirty)}
          size="lg"
          type="submit"
        >
          {isSaving
            ? 'Saving context…'
            : isConfirmed && !form.formState.isDirty
              ? 'Candidate context confirmed'
              : isConfirmed
                ? 'Save candidate context'
                : 'Confirm candidate context'}
        </Button>
      </div>
    </form>
  )
}
