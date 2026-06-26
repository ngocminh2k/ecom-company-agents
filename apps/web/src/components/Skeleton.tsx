type Props = {
  width?: string | number
  height?: string | number
  count?: number
  className?: string
}

export function Skeleton({ width, height = 16, count = 1, className = '' }: Props) {
  const w = typeof width === 'number' ? `${width}px` : width
  const h = typeof height === 'number' ? `${height}px` : height
  const style = { width: w, height: h }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded bg-gray-200 ${className}`}
          style={style}
        />
      ))}
    </>
  )
}
