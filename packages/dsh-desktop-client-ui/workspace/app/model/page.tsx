import { usePageText } from "@/host/context"
import Link from "@/host/link";
import { RiArrowRightLine } from "@remixicon/react";
import { WorkspaceFrame } from "@/components/workspace/chrome";
import { ModelStatusPanel } from "@/host/model-status"


export default function ModelPage() {
  const t = usePageText()
  return (
    <WorkspaceFrame active="model">
      <main className="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-5 py-8 sm:px-8">
        <h1 className="text-display-4-semibold">{t('modelConnection')}</h1>
        <ModelStatusPanel />
        <Link href="/chat" className="flex w-fit items-center gap-2 text-body-medium text-accent-600 hover:underline">{t('openChat')} <RiArrowRightLine className="size-4" aria-hidden="true" /></Link>
      </main>
    </WorkspaceFrame>
  );
}
