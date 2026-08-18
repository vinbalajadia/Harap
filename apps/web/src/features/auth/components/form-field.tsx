import type { PropsWithChildren } from 'react'

interface FormFieldProps extends PropsWithChildren {
  error?: string | undefined
  htmlFor: string
  label: string
}

export function FormField({ children, error, htmlFor, label }: FormFieldProps) {
  const errorId = `${htmlFor}-error`

  return (
    <div>
      <label className="mb-2 block text-sm font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error === undefined ? null : (
        <p className="mt-1.5 text-sm text-destructive" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
