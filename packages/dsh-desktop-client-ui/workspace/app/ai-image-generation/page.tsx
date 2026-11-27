import { TaskComposer } from "@/host/composer"
import { AiChatShell } from "@/components/application/ai-chat/ai-chat-shell";
import { TemplateFrame } from "@/components/workspace/chrome";


export default function ImageWorkspacePage() {
  return <TemplateFrame route="image"><AiChatShell composer={<TaskComposer name="image" />} contained defaultScenario="image-generation" /></TemplateFrame>;
}
