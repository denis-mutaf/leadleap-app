interface ProjectAvatarProps {
  name: string
  logoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: { container: 'h-6 w-6', text: 'text-[9px]', img: 24 },
  md: { container: 'h-9 w-9', text: 'text-sm', img: 36 },
  lg: { container: 'h-12 w-12', text: 'text-base', img: 48 },
}

export function ProjectAvatar({ name, logoUrl, size = 'md' }: ProjectAvatarProps) {
  const s = sizeMap[size]
  const initials = name.slice(0, 2).toUpperCase()

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        width={s.img}
        height={s.img}
        className={`${s.container} rounded-md object-cover shrink-0`}
      />
    )
  }

  return (
    <div
      className={`${s.container} shrink-0 flex items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold ${s.text}`}
    >
      {initials}
    </div>
  )
}

