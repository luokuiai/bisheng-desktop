import { TaskComposer } from "@/host/composer"
import { AiChatShell } from "@/components/application/ai-chat/ai-chat-shell";
import { TemplateFrame } from "@/components/workspace/chrome";


export default function CodeWorkspacePage() {
  return <TemplateFrame route="code"><AiChatShell composer={<TaskComposer name="code" />} contained /></TemplateFrame>;
}
