import { FileUp, ShieldCheck } from 'lucide-react'
import { useState, type DragEvent, type FormEvent } from 'react'

import { resumeMaxFileSizeBytes } from '@harap/contracts'

import { Button } from '@/components/ui/button'

interface ResumeUploadPanelProps {
  errorMessage?: string | null
  isUploading: boolean
  onUpload: (file: File) => Promise<void>
  title?: string
}

function validateFile(file: File): string | null {
  if (!file.name.toLocaleLowerCase().endsWith('.pdf')) return 'Choose a PDF file.'
  if (file.type !== '' && file.type !== 'application/pdf') return 'Choose a valid PDF file.'
  if (file.size > resumeMaxFileSizeBytes) return 'PDF resumes must be 5 MiB or smaller.'
  if (file.size === 0) return 'The selected file is empty.'
  return null
}

export function ResumeUploadPanel({
  errorMessage = null,
  isUploading,
  onUpload,
  title = 'Add your resume',
}: ResumeUploadPanelProps) {
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const chooseFile = (nextFile: File | undefined) => {
    if (nextFile === undefined) return
    const validationError = validateFile(nextFile)
    setFile(validationError === null ? nextFile : null)
    setFileError(validationError)
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    chooseFile(event.dataTransfer.files[0])
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (file === null) {
      setFileError('Choose a PDF resume to continue.')
      return
    }
    try {
      await onUpload(file)
    } catch {
      // The mutation error is rendered by the parent with a safe API message.
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/10">
      <div className="border-b border-border bg-muted/30 px-6 py-6 sm:px-8">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <FileUp aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              We’ll extract career evidence for you to review before Harap uses it.
            </p>
          </div>
        </div>
      </div>

      <form className="space-y-5 p-6 sm:p-8" onSubmit={(event) => void submit(event)}>
        <label
          className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/60 px-6 text-center transition-colors hover:border-primary/60 hover:bg-primary/5 focus-within:ring-2 focus-within:ring-ring"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <FileUp aria-hidden="true" className="size-8 text-primary" />
          <span className="mt-4 font-medium">Drop a PDF here or browse</span>
          <span className="mt-2 text-sm text-muted-foreground">PDF only · 5 MiB maximum</span>
          <input
            accept="application/pdf,.pdf"
            aria-label="PDF resume"
            className="sr-only"
            disabled={isUploading}
            onChange={(event) => chooseFile(event.target.files?.[0])}
            type="file"
          />
        </label>

        {file === null ? null : (
          <p className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-sm">
            Selected <span className="font-medium">{file.name}</span>
          </p>
        )}
        {fileError === null && errorMessage === null ? null : (
          <p className="text-sm text-destructive" role="alert">
            {fileError ?? errorMessage}
          </p>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
            Private to your account. The extracted text is not retained.
          </p>
          <Button disabled={isUploading} size="lg" type="submit">
            {isUploading ? 'Uploading and analyzing…' : 'Upload and analyze'}
          </Button>
        </div>
      </form>
    </section>
  )
}
