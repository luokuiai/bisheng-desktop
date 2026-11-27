import { DashboardSidebar } from './components/application/dashboard/dashboard-sidebar'
import { starterNav } from './components/application/app-shell/app-shell'
import { WorkspaceProvider, type WorkspaceProps } from './host/context'

const items = starterNav('')

/** The conversation and catalogue pages share the same desktop navigation. */
export function ChatSidebar(props: WorkspaceProps) {
  return (
    <div className="dshWorkspacePages dshWorkspaceChatSidebar">
      <WorkspaceProvider {...props}>
        <DashboardSidebar selected="chat" items={items} showThemeToggle={false} />
      </WorkspaceProvider>
    </div>
  )
}
