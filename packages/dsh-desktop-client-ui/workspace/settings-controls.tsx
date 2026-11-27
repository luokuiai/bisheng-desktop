import { forwardRef, useCallback, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/base/buttons/button'
import { CloseButton } from '@/components/base/buttons/close-button'
import { Input } from '@/components/base/input/input'
import { Select, SelectItem } from '@/components/base/select/select'
import { Switch } from '@/components/base/switch/switch'
import { Tab, TabList, TabPanel, Tabs } from '@/components/base/tabs/tabs'

type SettingsSelectProps = {
  label: string
  value?: string | null
  placeholder?: string
  options: readonly { id: string; label: string }[]
  disabled?: boolean
  onChange: (id: string) => void
}

function SettingsSelect({ label, value, placeholder, options, disabled, onChange }: SettingsSelectProps) {
  const [dialog, setDialog] = useState<Element | null>(null)
  const [portal, setPortal] = useState<HTMLDivElement | null>(null)
  const mount = useCallback((node: HTMLDivElement | null) => setDialog(node?.closest('[role="dialog"]') ?? null), [])
  return <div ref={mount} className="dshSettingsControl">
    {dialog && createPortal(<div ref={setPortal} className="dshSettingsControl" />, dialog)}
    <Select aria-label={label} selectedKey={value || null}
      placeholder={placeholder} isDisabled={disabled || !portal} portalContainer={portal ?? undefined}
      onSelectionChange={key => {
        if (typeof key === 'string' && key !== value && options.some(option => option.id === key)) onChange(key)
      }}>
      {options.map(option => <SelectItem key={option.id} id={option.id}>{option.label}</SelectItem>)}
    </Select>
  </div>
}

type SettingsSwitchProps = {
  label: string
  checked: boolean
  disabled?: boolean
  title?: string
  onChange: (checked: boolean) => void
}

function SettingsSwitch({ label, checked, disabled, title, onChange }: SettingsSwitchProps) {
  return <div className="dshSettingsControl" title={title}>
    <Switch aria-label={label} isSelected={checked} isDisabled={disabled} onChange={onChange} />
  </div>
}

function SettingsInput(props: ComponentPropsWithoutRef<typeof Input>) {
  return <div className="dshSettingsControl">
    <Input {...props} />
  </div>
}

const SettingsButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<typeof Button>>(function SettingsButton({
  variant = 'secondary', size = 'small', ...props
}, ref) {
  return <span className="dshSettingsControl">
    <Button {...props} ref={ref} variant={variant} size={size} />
  </span>
})

function SettingsCloseButton(props: Omit<ComponentPropsWithoutRef<typeof CloseButton>, 'aria-label' | 'size'> & {
  'aria-label'?: string
}) {
  return <span className="dshSettingsControl dshSettingsCloseControl">
    <CloseButton {...props} aria-label={props['aria-label'] ?? ''} size="sm" />
  </span>
}

type SettingsTabsProps = {
  label: string
  value: string
  onChange: (id: string) => void
  fill?: boolean
  tabListClassName?: string
  items: readonly {
    id: string
    label: string
    title?: string
    disabled?: boolean
    keepMounted?: boolean
    panelClassName?: string
    render: () => ReactNode
  }[]
  children?: ReactNode
}

function SettingsTabs({ label, value, onChange, items, children, fill, tabListClassName }: SettingsTabsProps) {
  return <div className={`dshSettingsControl min-w-0${fill ? ' flex min-h-0 flex-1' : ''}`}>
    <Tabs className={fill ? 'min-w-0 min-h-0 flex-1' : 'min-w-0'} selectedKey={value} disabledKeys={items.filter(item => item.disabled).map(item => item.id)}
      onSelectionChange={key => { if (typeof key === 'string') onChange(key) }}>
      <div className={`min-w-0 shrink-0 overflow-x-auto${tabListClassName ? ` ${tabListClassName}` : ''}`}>
        <TabList aria-label={label} className="min-w-max">
          {items.map(item => <Tab key={item.id} id={item.id}><span title={item.title}>{item.label}</span></Tab>)}
        </TabList>
      </div>
      {children}
      {items.filter(item => item.id === value || item.keepMounted).map(item =>
        <TabPanel key={item.id} id={item.id} shouldForceMount={item.keepMounted}
          className={item.panelClassName} style={item.id !== value ? { display: 'none' } : undefined}>
          {item.render()}
        </TabPanel>)}
    </Tabs>
  </div>
}

export const settingsControls = {
  Select: SettingsSelect,
  Switch: SettingsSwitch,
  Input: SettingsInput,
  Button: SettingsButton,
  CloseButton: SettingsCloseButton,
  Tabs: SettingsTabs
}
