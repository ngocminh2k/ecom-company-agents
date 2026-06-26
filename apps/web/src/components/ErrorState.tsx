type Props = {
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ message, onRetry, className = '' }: Props) {
  return (
    <div className={`rounded-xl border border-[var(--error)]/20 bg-[var(--error-bg)] p-6 text-center ${className}`}>
      <p className="text-[var(--error)] font-medium text-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-sm text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] rounded">
          Retry
        </button>
      )}
    </div>
  )
}
