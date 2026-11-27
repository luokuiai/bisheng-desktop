import { usePageText } from "@/host/context"
import { IntentLink as Link } from "@/components/workspace/intent-link";
import { RiArrowRightLine, RiArrowRightUpLine } from "@remixicon/react";
import { WorkspaceWordmark } from "@/components/workspace/brand";
import { WorkspaceFrame } from "@/components/workspace/chrome";
import { HeroAgents } from "@/components/workspace/hero-agents";
import { workspaceLibrary, workspaceRoutes } from "@/components/workspace/navigation";
import { cx } from "@/utils/cx";

const linkArrowClass = "size-4 text-foreground-icon-tertiary group-hover:text-foreground-icon-primary";

export default function Home() {
  const t = usePageText()
  return (
    <WorkspaceFrame active="home">
      <main className="mx-auto flex w-full max-w-[1336px] flex-col gap-8 px-5 py-7 sm:px-8 lg:px-9 lg:py-9">
        <section aria-labelledby="workspace-title" className="relative isolate flex min-h-[286px] items-center overflow-hidden rounded-3xl bg-accent-950 p-6 text-text-white sm:p-9 lg:p-10">
          <HeroAgents />
          <div className="relative z-10 flex w-full flex-col items-start gap-4 sm:w-[54%]">
            <WorkspaceWordmark inverse className="w-40" />
            <h1 id="workspace-title" className="text-display-4-semibold lg:text-display-3-semibold">{t('welcome')}</h1>
            <p className="max-w-[370px] text-headline-regular text-accent-100">{t('welcomeHelp')}</p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/chat" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent-500 px-4 text-body-semibold text-text-white transition-colors duration-150 hover:bg-accent-600 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent-200">
                {t('startChat')} <RiArrowRightLine aria-hidden="true" className="size-4" />
              </Link>
              <Link href="/components" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-accent-200/30 bg-accent-100/5 px-4 text-body-semibold text-text-white transition-colors duration-150 hover:bg-accent-100/15 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent-200">
                {t('browseComponents')}
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="library-title" className="flex flex-col gap-4">
          <h2 id="library-title" className="text-title-1-semibold">{t('library')}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {workspaceLibrary.map(({ id, href, icon: Icon, tone }) => (
              <Link key={id} href={href} className="group flex flex-col gap-3 rounded-3xl border border-border-button-default bg-background-primary-default p-5 transition-colors hover:border-border-button-hover focus-visible:outline-2 focus-visible:outline-border-focus-ring">
                <div className="flex items-center justify-between">
                  <span className={cx("grid size-9 place-items-center rounded-xl", tone)}><Icon aria-hidden="true" className="size-5" /></span>
                  <RiArrowRightUpLine aria-hidden="true" className={linkArrowClass} />
                </div>
                <div className="grid gap-1">
                  <h3 className="text-title-3-semibold">{t(`entry_${id}_label`)}</h3>
                  <p className="text-body-regular text-text-secondary">{t(`entry_${id}_description`)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="spaces-title" className="flex flex-col gap-4">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="spaces-title" className="text-title-1-semibold">{t('openSpaces')}</h2>
            <span className="text-caption-1-medium text-text-tertiary">{workspaceRoutes.length} {t('destinations')}</span>
          </header>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workspaceRoutes.map(({ id, href, icon: Icon, tone }) => (
              <Link key={id} href={href} className={cx(
                "group flex min-h-[148px] flex-col gap-3 rounded-3xl border border-border-button-default bg-background-primary-default p-5 transition-colors duration-150 hover:border-border-button-hover hover:bg-background-primary-hover focus-visible:outline-2 focus-visible:outline-border-focus-ring",
                id === "lab" && "sm:col-span-full sm:min-h-0",
              )}>
                <div className="flex items-center justify-between gap-2">
                  <span className={cx("grid size-9 place-items-center rounded-xl", tone)}><Icon aria-hidden="true" className="size-[19px]" /></span>
                  <span className="flex items-center gap-2 text-caption-1-medium text-text-tertiary">
                    {t(`entry_${id}_category`)}<RiArrowRightUpLine aria-hidden="true" className={linkArrowClass} />
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-title-3-semibold">{t(`entry_${id}_label`)}</h3>
                  <p className="text-body-regular text-text-secondary">{t(`entry_${id}_description`)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </WorkspaceFrame>
  );
}
