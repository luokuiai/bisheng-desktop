import type { Ref } from 'react'
import { useRef } from 'react'
import { RiChatNewLine, RiSearchLine } from '@remixicon/react'
import { Button } from '@/components/base/buttons/button'
import { CloseButton } from '@/components/base/buttons/close-button'
import { InputBase } from '@/components/base/input/input'
import { SegmentedControl, SegmentedControlItem } from '@/components/base/segmented-control/segmented-control'
import { AgentThinking } from '@/components/application/agent-thinking/agent-thinking'
import { ComposerLoader } from '@/components/application/composer-loader/composer-loader'

type ChatMode = 'chat' | 'work'

type ChatNewSessionProps = {
  label: string
  ariaLabel: string
  shortcut?: string
  onClick: () => void
}

export function ChatNewSession({ label, ariaLabel, shortcut, onClick }: ChatNewSessionProps) {
  return <div className="dshSettingsControl">
    <Button type="button" variant="secondary" leadingIcon={RiChatNewLine} className="w-full min-h-11"
      aria-label={ariaLabel} aria-keyshortcuts={shortcut} onClick={onClick}>
      {label}
    </Button>
  </div>
}

type ChatSegmentProps = {
  label: string
  chat: string
  work: string
  mode: ChatMode
  onChange: (mode: ChatMode) => void
}

export function ChatSegment({ label, chat, work, mode, onChange }: ChatSegmentProps) {
  return <div className="dshSettingsControl dshChatSegment">
    <SegmentedControl aria-label={label} selectedKeys={[mode]} onSelectionChange={keys => {
      const [key] = keys
      if (key === 'chat' || key === 'work') onChange(key)
    }}>
      <SegmentedControlItem id="chat" aria-controls="dsh-panel-chat" className="min-h-8 min-w-24 px-5">
        {chat}
      </SegmentedControlItem>
      <SegmentedControlItem id="work" aria-controls="dsh-panel-work" className="min-h-8 min-w-24 px-5">
        {work}
      </SegmentedControlItem>
    </SegmentedControl>
  </div>
}

type ChatSearchProps = {
  caption: string
  label: string
  clearLabel: string
  placeholder: string
  expanded: boolean
  shortcut?: string
  query: string
  maxLength: number
  inputRef: Ref<HTMLInputElement>
  onOpen: () => void
  onClose: () => void
  onChange: (query: string) => void
}

export function ChatSearch({ caption, label, clearLabel, placeholder, expanded, shortcut, query, maxLength, inputRef, onOpen, onClose, onChange }: ChatSearchProps) {
  const restoreFocus = useRef(false)
  const close = () => {
    restoreFocus.current = true
    onClose()
  }
  return <div className="dshSettingsControl dshChatSearch">
    {expanded
      ? <InputBase
          ref={inputRef}
          type="text"
          autoFocus
          aria-label={label}
          placeholder={placeholder}
          value={query}
          maxLength={maxLength}
          onChange={event => onChange(event.target.value)}
          onKeyDown={event => {
            if (event.key !== 'Escape' || event.nativeEvent.isComposing) return
            event.preventDefault()
            event.stopPropagation()
            close()
          }}
          leadingIcon={RiSearchLine}
          trailingAddon={<CloseButton size="2xs" aria-label={clearLabel} onClick={close} />}
          fieldClassName="dshChatSearchPill"
        />
      : <button
          ref={node => {
            if (!node || !restoreFocus.current) return
            restoreFocus.current = false
            node.focus({ preventScroll: true })
          }}
          type="button"
          aria-label={label}
          aria-keyshortcuts={shortcut}
          aria-expanded={false}
          onClick={onOpen}
          className="dshChatSearchPill flex h-9 w-full cursor-pointer items-center gap-2 bg-background-tertiary-default px-2.5 text-start text-body-medium text-text-secondary transition-colors duration-150 hover:bg-background-tertiary-hover/55"
        >
          <RiSearchLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{caption}</span>
        </button>}
  </div>
}

export function ChatThinking({ label, elapsedLabel }: { label: string; elapsedLabel?: string }) {
  return <div className="dshSettingsControl dshWorkThinking">
    <AgentThinking variant="wave" label={label} elapsedLabel={elapsedLabel} showTimer={false} announce={false} />
  </div>
}

export function ChatComposerLoader({ running }: { running: boolean }) {
  return <div className="dshSettingsControl dshWorkComposerLoader" aria-hidden="true">
    <ComposerLoader active={running} surface={false} className="h-full">{null}</ComposerLoader>
  </div>
}
