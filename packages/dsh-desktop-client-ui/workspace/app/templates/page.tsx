import { IntentLink as Link } from "@/components/workspace/intent-link";
import {
  RiArrowRightUpLine, RiBankLine, RiBarChartBoxLine, RiChatAiLine, RiDashboardLine,
  RiGroupLine, RiHeartPulseLine, RiImageAiLine, RiKanbanView2, RiMegaphoneLine, RiRobot2Line,
} from "@remixicon/react";
import { WorkspaceFrame } from "@/components/workspace/chrome";
import { LibraryContent, LibraryHeading } from "@/components/workspace/library-layout";
import { templates } from "@/components/workspace/templates/catalog";
import { cx } from "@/utils/cx";

const icons = {
  dashboard: RiDashboardLine, marketing: RiMegaphoneLine, finance: RiBankLine, hr: RiGroupLine,
  "medical-profile": RiHeartPulseLine, "ai-chat": RiChatAiLine, "multi-agent-chat": RiRobot2Line,
  "ai-image-generation": RiImageAiLine, "ai-profile": RiBarChartBoxLine, "project-board": RiKanbanView2,
};

export default function TemplatesPage() {
  return (
    <WorkspaceFrame active="templates">
      <LibraryContent>
        <LibraryHeading title="整页模板" description="选择一个完整页面，试用它的导航、筛选、图表和业务交互。" />
        {["业务运营", "AI 工作空间"].map((group) => (
          <section key={group} aria-label={group} className="grid gap-4">
            <h2 className="text-title-2-semibold">{group}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {templates.filter((template) => template.group === group).map(({ slug, name, href, description, features }) => {
                const Icon = icons[slug];
                return (
                  <Link href={href} key={slug} className="group grid gap-4 rounded-3xl border border-border-button-default bg-background-primary-default p-5 hover:border-border-button-hover focus-visible:outline-2 focus-visible:outline-border-focus-ring">
                    <div className="flex items-center justify-between">
                      <span className={cx("grid size-11 place-items-center rounded-xl", group === "业务运营" ? "bg-chart-4/15 text-chart-4-active" : "bg-accent-500/10 text-accent-600")}><Icon className="size-5" aria-hidden="true" /></span>
                      <RiArrowRightUpLine className="size-5 text-text-tertiary group-hover:text-text-primary" aria-hidden="true" />
                    </div>
                    <div className="grid gap-1"><h3 className="text-title-3-semibold">{name}</h3><p className="text-body-regular text-text-secondary">{description}</p></div>
                    <div className="flex flex-wrap gap-2">
                      {features.map((feature) => <span key={feature} className="rounded-lg bg-background-secondary-default px-2 py-1 text-caption-1-medium text-text-secondary">{feature}</span>)}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </LibraryContent>
    </WorkspaceFrame>
  );
}
