import { usePageText, useWorkspace } from "@/host/context"
import { RiArrowRightLine, RiChat3Line, RiBarChartBoxLine } from "@remixicon/react";
import { WorkspaceWordmark } from "@/components/workspace/brand";
import { WorkspaceFrame } from "@/components/workspace/chrome";
import { HeroAgents } from "@/components/workspace/hero-agents";
import { IntentLink } from "@/components/workspace/intent-link";

const SIDEBAR_ONLY_ENTRIES = new Set(['panel:plugins', 'panel:schedules'])

export default function Home() {
  const t = usePageText()
  const { host, navigate, entries = [] } = useWorkspace()
  const spaces = [
    { id: 'ai-chat', label: t('aiChat'), description: t('aiChatDescription'), glyph: <RiChat3Line />, open: () => navigate('/chat') },
    { id: 'ai-profile', label: t('aiProfile'), description: t('aiProfileDescription'), glyph: <RiBarChartBoxLine />, open: () => host.openCapability('usage') },
    ...entries.filter(entry => !SIDEBAR_ONLY_ENTRIES.has(entry.id)),
  ]
  return (
    <WorkspaceFrame active="home">
      <main className="mx-auto flex w-full max-w-[1336px] flex-col gap-8 px-5 py-7 sm:px-8 lg:px-9 lg:py-9">
        <section aria-labelledby="workspace-title" className="relative isolate flex min-h-[286px] items-center overflow-hidden rounded-3xl bg-accent-950 p-6 text-text-white sm:p-9 lg:p-10">
          <HeroAgents />
          <div className="relative z-10 flex w-full flex-col items-start gap-4 sm:w-[54%]">
            <WorkspaceWordmark inverse className="w-40" />
            <h1 id="workspace-title" className="text-display-4-semibold lg:text-display-3-semibold">{t('welcome')}</h1>
            <p className="max-w-[370px] text-headline-regular text-accent-100">{t('welcomeHelp')}</p>
            <div className="pt-2">
              <IntentLink href="/chat" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent-500 px-4 text-body-semibold text-text-white transition-colors duration-150 hover:bg-accent-600 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent-200 motion-reduce:transition-none">
                {t('startChat')} <RiArrowRightLine aria-hidden="true" className="size-4" />
              </IntentLink>
            </div>
          </div>
        </section>
        <section aria-labelledby="spaces-title" className="flex flex-col gap-4">
          <h2 id="spaces-title" className="text-title-1-semibold">{t('openSpaces')}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {spaces.map(({ id, label, description, glyph, open }) => (
              <button key={id} type="button" data-workspace-card={id} onClick={open}
                aria-haspopup={id === 'ai-profile' ? 'dialog' : undefined}
                className="flex min-h-[136px] cursor-pointer flex-col items-start gap-3 rounded-3xl border border-border-button-default bg-background-primary-default p-5 text-start transition-colors duration-150 hover:border-border-button-hover hover:bg-background-primary-hover focus-visible:outline-2 focus-visible:outline-border-focus-ring motion-reduce:transition-none">
                <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-accent-50 text-accent-600 [&_svg]:size-[19px]">{glyph}</span>
                <span className="flex flex-col gap-1">
                  <span className="text-title-3-semibold">{label}</span>
                  {description && <span className="text-body-regular text-text-secondary">{description}</span>}
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </WorkspaceFrame>
  );
}
