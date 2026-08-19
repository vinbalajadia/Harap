import type { RoleAlignment } from '@harap/contracts'
import { TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface RoleAlignmentAdvisoryProps {
  alignment: RoleAlignment
  onContinue: () => void
  onReplace: () => void
}

export function RoleAlignmentAdvisory({
  alignment,
  onContinue,
  onReplace,
}: RoleAlignmentAdvisoryProps) {
  const isLow = alignment.level === 'low'
  const title = isLow
    ? `This resume may offer limited evidence for ${alignment.targetRole}.`
    : `This resume offers some evidence for ${alignment.targetRole}.`

  return (
    <section
      aria-labelledby="role-alignment-title"
      className={
        isLow
          ? 'rounded-xl border border-amber-500/45 bg-amber-500/10 p-5'
          : 'rounded-xl border border-border bg-muted/30 p-5'
      }
    >
      <div className="flex items-start gap-3">
        <TriangleAlert
          aria-hidden="true"
          className={
            isLow ? 'mt-0.5 size-5 shrink-0 text-amber-500' : 'mt-0.5 size-5 shrink-0 text-primary'
          }
        />
        <div>
          <h2 className="font-semibold" id="role-alignment-title">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isLow
              ? 'Harap found little resume evidence it can use to personalize coaching for this target role. This is about the evidence in this PDF—not your potential or qualification to pursue the role.'
              : 'Harap found useful transferable or technical evidence, with some gaps for role-specific coaching. Career-transition experience still counts when the resume supports it.'}
          </p>
        </div>
      </div>

      {alignment.signals.length === 0 && alignment.gaps.length === 0 ? null : (
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          {alignment.signals.length === 0 ? null : (
            <div>
              <h3 className="font-medium">Evidence Harap can use</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                {alignment.signals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>
          )}
          {alignment.gaps.length === 0 ? null : (
            <div>
              <h3 className="font-medium">Evidence that would improve coaching</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                {alignment.gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={onReplace}>{isLow ? 'Upload another resume' : 'Replace resume'}</Button>
        <Button onClick={onContinue} variant="outline">
          {isLow ? 'Continue anyway' : 'Continue with this resume'}
        </Button>
      </div>
    </section>
  )
}
