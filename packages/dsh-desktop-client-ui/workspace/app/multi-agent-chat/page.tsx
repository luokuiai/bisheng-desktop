import { MultiAgentChat } from "@/components/application/multi-agent-chat/multi-agent-chat";
import { TemplateFrame } from "@/components/workspace/chrome";


export default function AgentsPage() {
  return <TemplateFrame route="agents"><MultiAgentChat /></TemplateFrame>;
}
