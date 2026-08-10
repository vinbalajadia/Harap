import type { VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'

import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, size, type = 'button', variant, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ className, size, variant }))}
      data-slot="button"
      type={type}
      {...props}
    />
  )
}
