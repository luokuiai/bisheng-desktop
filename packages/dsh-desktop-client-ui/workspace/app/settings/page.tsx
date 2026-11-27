import { usePageText } from "@/host/context"
import { RiArrowRightUpLine } from '@remixicon/react'
import Link from '@/host/link'
import { CapabilityButton } from '@/host/capability'
import { WorkspaceFrame } from '@/components/workspace/chrome'

const sections = [
  ['settings', 'general', 'generalDescription', 'generalAction'],
  ['profile', 'account', 'accountDescription', 'accountAction'],
  ['tools', 'tools', 'toolsDescription', 'toolsAction'],
  ['storage', 'storage', 'storageDescription', 'storageAction'],
] as const

export default function SettingsPage() {
  const t = usePageText()
  return <WorkspaceFrame active="settings">
    <main className="mx-auto flex w-full max-w-[960px] flex-col gap-5 px-5 py-8 sm:px-8">
      <h1 className="text-display-4-semibold">{t('settings')}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map(([id, label, description, action]) => <article key={id} className="flex flex-col items-start gap-3 rounded-3xl border border-border-button-default p-5">
          <h2 className="text-title-3-semibold">{t(label)}</h2>
          <p className="text-body-regular text-text-secondary">{t(description)}</p>
          <CapabilityButton name={id}>{t(action)}</CapabilityButton>
        </article>)}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <CapabilityButton name="desktop">{t('openDesktop')}</CapabilityButton>
        <Link href="/model" className="inline-flex w-fit items-center gap-2 text-body-medium text-accent-600 hover:underline">{t('viewModel')} <RiArrowRightUpLine className="size-4" aria-hidden /></Link>
      </div>
    </main>
  </WorkspaceFrame>
}
