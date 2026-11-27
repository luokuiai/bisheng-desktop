import { ProjectBoardShell } from "@/components/application/project-board/project-board-shell";
import { TemplateFrame } from "@/components/workspace/chrome";


export default function ProjectBoardPage() {
  return <TemplateFrame route="project-board"><ProjectBoardShell contained /></TemplateFrame>;
}
