import Image from "@/host/image";
import { Suspense } from "react";
import { WorkspaceFrame } from "@/components/workspace/chrome";
import { LibraryContent, LibraryHeading } from "@/components/workspace/library-layout";
import { ChartGallery } from "@/components/workspace/charts/chart-gallery";


export default function ChartsPage() {
  return (
    <WorkspaceFrame active="charts">
      <LibraryContent>
        <LibraryHeading title="数据图表" description="打开图表卡片，切换时间段、样式或悬停查看数据点。图表使用示例数据。" />
        <Suspense fallback={
          <p role="status" className="flex items-center gap-2 text-body-regular text-text-secondary">
            <Image src="/desktop-workspace/brand/loading.svg" width={20} height={20} alt="" unoptimized />
            正在加载图表目录…
          </p>
        }>
          <ChartGallery />
        </Suspense>
      </LibraryContent>
    </WorkspaceFrame>
  );
}
