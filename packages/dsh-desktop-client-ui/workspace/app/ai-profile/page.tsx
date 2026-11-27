import { AiProfileShell } from "@/components/application/ai-profile/ai-profile-shell";
import { TemplateFrame } from "@/components/workspace/chrome";


export default function ProfilePage() {
  return <TemplateFrame route="profile"><AiProfileShell contained /></TemplateFrame>;
}
