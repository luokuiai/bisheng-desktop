import { useEffect, useState, type ReactNode } from 'react'
import { useCountUp } from '@/hooks/use-count-up'

export type AiProfileCardProps = {
  name: string
  initials: string
  department?: string
  avatar?: string | null
  contribution?: { label: string; count: number; unit: string; locale: string }
  stats: readonly { label: string; value: string; title?: string }[]
  children: ReactNode
}

export function AiProfileCard({ name, initials, department, avatar, contribution, stats, children }: AiProfileCardProps) {
  const [failedAvatar, setFailedAvatar] = useState<string>()
  const [target, setTarget] = useState(0)
  const contributionCount = contribution?.count ?? 0
  useEffect(() => setTarget(contributionCount), [contributionCount])
  const count = useCountUp(target, 1600)

  return <section data-usage-identity="" className="relative w-full overflow-hidden rounded-3xl border border-border-ai-profile-card bg-background-primary-default">
    <div className="dshUsageCover absolute inset-x-0 top-0 h-[165px] overflow-hidden rounded-t-[23px] bg-background-tertiary-default" aria-hidden="true">
      <img src="/desktop-workspace/templates/ai-profile-cover.png" alt="" className="size-full object-cover object-[50%_45%]" />
    </div>
    <div className="relative flex w-full flex-col gap-[15px] px-4 pt-[124px] pb-4">
      <span className="dshUsageAvatar flex size-20 items-center justify-center overflow-hidden rounded-3xl bg-background-tertiary-default text-[30px] font-medium text-text-secondary">
        {avatar && avatar !== failedAvatar
          ? <img src={avatar} alt="" referrerPolicy="no-referrer" className="size-full object-cover" onError={() => setFailedAvatar(avatar)} />
          : <span aria-hidden="true">{initials}</span>}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p data-usage-display-name="" className="truncate text-title-2-medium text-text-primary">{name}</p>
        {department && <p className="dshUsageHandle truncate text-headline-medium text-text-secondary">@{department}</p>}
      </div>
      {(contribution || stats.length > 0) && <div className="flex flex-col gap-2">
        {contribution && <div data-usage-contribution="" className="flex flex-col gap-0.5">
          <p className="text-body-medium text-text-secondary">{contribution.label}</p>
          <p className="text-title-1-medium text-text-primary tabular-nums">
            {count.toLocaleString(contribution.locale)} {contribution.unit}
          </p>
        </div>}
        {stats.length > 0 && <div data-usage-metrics="" className="grid auto-cols-fr grid-flow-col gap-2">
          {stats.map(({ label, value, title }) =>
            <div key={label} data-usage-metric={label} title={title ?? value} className="flex min-w-0 flex-col items-start rounded-2lg bg-background-secondary-default p-2.5">
              <p className="dshUsageTileValue w-full truncate text-body-medium text-text-primary">{value}</p>
              <p className="w-full text-body-2-medium text-text-secondary">{label}</p>
            </div>)}
        </div>}
      </div>}
      {children}
    </div>
  </section>
}
