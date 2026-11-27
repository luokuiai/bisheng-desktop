import { WorkspaceFrame } from "@/components/workspace/chrome";
import { HarnessWorkspace } from "./workspace";


export default function HarnessPage() {
  return (
    <WorkspaceFrame active="harness">
      <HarnessWorkspace />
    </WorkspaceFrame>
  );
}
