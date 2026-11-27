import { WorkspaceFrame } from "@/components/workspace/chrome";
import { LibraryContent, LibraryHeading } from "@/components/workspace/library-layout";
import { IconGallery } from "@/components/workspace/icons/icon-gallery";
import { iconsTotal } from "@/components/workspace/icons/catalog";


export default function IconsPage() {
  return (
    <WorkspaceFrame active="icons">
      <LibraryContent>
        <LibraryHeading title="图标库" description={"浏览 " + iconsTotal + " 个工作台界面图标。点击图标查看不同尺寸，并复制 React 用法。"} />
        <IconGallery />
        <a className="w-fit text-caption-1-medium text-text-secondary underline focus-visible:outline-2 focus-visible:outline-border-focus-ring" href="https://remixicon.com/" target="_blank" rel="noreferrer">来源：Remix Icon</a>
      </LibraryContent>
    </WorkspaceFrame>
  );
}
