import { emptyCandidateResumeData, type ResumeStatus } from '@harap/contracts'
import { CheckCircle2, FileText, LoaderCircle, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { LoadingScreen } from '@/components/common/loading-screen'
import { Button } from '@/components/ui/button'

import { CandidateContextForm } from './components/candidate-context-form'
import { RoleAlignmentAdvisory } from './components/role-alignment-advisory'
import { ResumeUploadPanel } from './components/resume-upload-panel'
import {
  useAnalyzeResume,
  useConfirmCandidateData,
  useDeleteResume,
  useResume,
  useUploadAndAnalyzeResume,
} from './resume-queries'

const statusLabels: Record<ResumeStatus, string> = {
  failed: 'Needs attention',
  processing: 'Analyzing',
  ready: 'Ready',
  review_required: 'Review required',
  uploaded: 'Uploaded',
}

function errorMessage(error: unknown): string | null {
  return error instanceof Error ? error.message : null
}

interface DeleteResumeDialogProps {
  error: unknown
  isDeleting: boolean
  onCancel: () => void
  onDelete: () => void
}

function DeleteResumeDialog({ error, isDeleting, onCancel, onDelete }: DeleteResumeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog !== null && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    }
    dialog?.focus()
    return () => {
      if (dialog?.open === true && typeof dialog.close === 'function') dialog.close()
    }
  }, [])

  return (
    <dialog
      aria-labelledby="delete-resume-title"
      className="fixed inset-0 z-50 m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl border border-destructive/35 bg-card p-6 text-foreground shadow-2xl backdrop:bg-black/70"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      ref={dialogRef}
      role="alertdialog"
      tabIndex={-1}
    >
      <h2 className="text-lg font-semibold" id="delete-resume-title">
        Delete this resume and candidate context?
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        This permanently removes the private PDF and the reviewed context derived from it.
      </p>
      <div className="mt-5 flex gap-3">
        <Button disabled={isDeleting} onClick={onDelete}>
          {isDeleting ? 'Deleting…' : 'Delete resume'}
        </Button>
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
      </div>
      {error === null ? null : (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {errorMessage(error)}
        </p>
      )}
    </dialog>
  )
}

export function ResumePage() {
  const resumeQuery = useResume()
  const uploadMutation = useUploadAndAnalyzeResume()
  const analyzeMutation = useAnalyzeResume()
  const confirmMutation = useConfirmCandidateData()
  const deleteMutation = useDeleteResume()
  const [showReplacement, setShowReplacement] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dismissedAlignmentKey, setDismissedAlignmentKey] = useState<string | null>(null)

  if (resumeQuery.isPending) return <LoadingScreen label="Loading your resume" />
  if (resumeQuery.isError) {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-destructive/30 bg-card p-8 text-center">
        <h1 className="text-2xl font-semibold">Your resume could not be loaded.</h1>
        <p className="mt-3 text-muted-foreground">The service may be temporarily unavailable.</p>
        <Button className="mt-6" onClick={() => void resumeQuery.refetch()} variant="outline">
          <RefreshCw aria-hidden="true" className="size-4" /> Try again
        </Button>
      </section>
    )
  }

  const resume = resumeQuery.data

  if (resume === null) {
    return (
      <section className="mx-auto max-w-4xl">
        <p className="text-sm font-medium text-primary">Resume intelligence</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          Turn your experience into interview context.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
          Upload one resume, then review exactly what Harap understands about your experience.
        </p>
        <div className="mt-10">
          <ResumeUploadPanel
            errorMessage={errorMessage(uploadMutation.error)}
            isUploading={uploadMutation.isPending}
            onUpload={(file) => uploadMutation.mutateAsync(file).then(() => undefined)}
          />
        </div>
      </section>
    )
  }

  const isProcessing = resume.status === 'processing' || uploadMutation.isPending
  const showEditor =
    resume.status === 'review_required' || resume.status === 'ready' || resume.status === 'failed'
  const candidateData = resume.candidateData ?? emptyCandidateResumeData
  const roleAlignment = candidateData.roleAlignment
  const alignmentKey =
    roleAlignment === null
      ? null
      : `${resume.id}:${resume.lastAnalyzedAt ?? resume.updatedAt}:${roleAlignment.level}`
  const showAlignmentAdvisory =
    roleAlignment !== null &&
    roleAlignment.level !== 'strong' &&
    dismissedAlignmentKey !== alignmentKey

  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Resume intelligence</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            {resume.status === 'ready'
              ? 'Candidate context ready.'
              : 'Review your candidate context.'}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
            Your resume is evidence, not an instruction. Keep only the details you want future
            coaching to use.
          </p>
        </div>
        <span
          aria-live="polite"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
        >
          {isProcessing ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : resume.status === 'ready' ? (
            <CheckCircle2 aria-hidden="true" className="size-4" />
          ) : (
            <FileText aria-hidden="true" className="size-4" />
          )}
          {isProcessing ? 'Analyzing' : statusLabels[resume.status]}
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium">{resume.originalFilename}</p>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="size-4 text-primary" /> Private PDF ·{' '}
            {(resume.fileSizeBytes / 1024).toFixed(0)} KB
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {resume.status === 'uploaded' || resume.status === 'failed' ? (
            <Button
              disabled={analyzeMutation.isPending}
              onClick={() => analyzeMutation.mutate(undefined)}
              size="sm"
              variant="outline"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              {analyzeMutation.isPending ? 'Analyzing…' : 'Analyze again'}
            </Button>
          ) : null}
          <Button onClick={() => setShowReplacement((value) => !value)} size="sm" variant="outline">
            Replace PDF
          </Button>
          <Button
            className="text-destructive"
            onClick={() => setConfirmDelete(true)}
            size="sm"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="size-4" /> Delete
          </Button>
        </div>
      </div>

      {showAlignmentAdvisory ? (
        <div className="mt-5">
          <RoleAlignmentAdvisory
            alignment={roleAlignment}
            onContinue={() => setDismissedAlignmentKey(alignmentKey)}
            onReplace={() => setShowReplacement(true)}
          />
        </div>
      ) : null}

      {showReplacement ? (
        <div className="mt-5">
          <ResumeUploadPanel
            errorMessage={errorMessage(uploadMutation.error)}
            isUploading={uploadMutation.isPending}
            onUpload={(file) =>
              uploadMutation.mutateAsync(file).then(() => setShowReplacement(false))
            }
            title="Replace your resume"
          />
        </div>
      ) : null}

      {confirmDelete ? (
        <DeleteResumeDialog
          error={deleteMutation.error}
          isDeleting={deleteMutation.isPending}
          onCancel={() => setConfirmDelete(false)}
          onDelete={() =>
            deleteMutation.mutate(undefined, { onSuccess: () => setConfirmDelete(false) })
          }
        />
      ) : null}

      {isProcessing ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-10 text-center">
          <LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-primary" />
          <h2 className="mt-5 text-xl font-semibold">Reading your professional experience</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Harap is extracting selectable text and organizing only career-relevant details.
          </p>
        </div>
      ) : null}

      {resume.status === 'failed' ? (
        <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/10 p-5">
          <h2 className="font-semibold">Automatic analysis needs your help.</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The PDF may be image-only, unsupported, or analysis may be unavailable. Retry or enter
            the useful details manually below.
          </p>
          {errorMessage(analyzeMutation.error) === null ? null : (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {errorMessage(analyzeMutation.error)}
            </p>
          )}
        </div>
      ) : null}

      {showEditor && !isProcessing ? (
        <div className="mt-8">
          <CandidateContextForm
            candidateData={candidateData}
            isConfirmed={resume.status === 'ready'}
            isSaving={confirmMutation.isPending}
            onSave={(data) => confirmMutation.mutateAsync(data).then(() => undefined)}
          />
        </div>
      ) : null}
    </section>
  )
}
