import type { ImgHTMLAttributes } from 'react'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'placeholder'> & {
  src: string
  fill?: boolean
  priority?: boolean
  unoptimized?: boolean
  placeholder?: string
}
/** All images are already packaged at their original dimensions. */
export default function Image({ fill, priority, unoptimized: _unoptimized, placeholder, style, loading, ...props }: Props) {
  return <img {...props} loading={priority ? 'eager' : loading} decoding="async" style={{
    ...(fill ? { position: 'absolute', inset: 0, height: '100%', width: '100%' } : {}),
    ...(placeholder?.startsWith('data:image/') ? { backgroundImage: `url("${placeholder}")`, backgroundSize: 'cover' } : {}),
    ...style,
  }} />
}
