import { WorkspaceFrame } from "@/components/workspace/chrome";
import { ComponentLab } from "@/components/workspace/lab";


export default function LabPage() {
  return <WorkspaceFrame active="lab"><ComponentLab /></WorkspaceFrame>;
}
