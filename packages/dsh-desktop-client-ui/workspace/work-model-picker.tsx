import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { UNSAFE_PortalProvider } from 'react-aria'
import type { ModelSelection } from '@deepseek-ai/dsh-api-session-controller/types'
import type { ModelPickerOwner } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import { MODEL_PROVIDERS, ModelPicker, type ModelProvider } from '@/components/application/composer-panel/model-picker'

type WorkModelPickerProps = Omit<ModelPickerOwner, 'fallback'> & {
  title: string
  searchActionLabel: string
  closeSearchLabel: string
  enterpriseModelsLabel: string
}

const ENTERPRISE_PROVIDER_ROUTE = 'bisheng-enterprise'

function routeId(provider: string, model: string) {
  return JSON.stringify([provider, model])
}

function enterpriseModelDisplayParts(displayName: string) {
  const separator = displayName.indexOf(' / ')
  if (separator > 0) {
    const provider = displayName.slice(0, separator).trim()
    const name = displayName.slice(separator + 3).trim()
    if (provider && name) return { provider, name }
  }
  return { provider: '', name: displayName }
}

export function WorkModelPicker(props: WorkModelPickerProps) {
  const { groups, current, disabled, busy, caption, label, providersLabel, effortLabel, emptyLabel, efforts, currentEffort, select } = props
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [portal, setPortal] = useState<HTMLDivElement | null>(null)
  const submitting = useRef(false)
  const routes = new Map<string, ModelSelection>()
  const providers = new Map<string, ModelProvider>()
  const value = current ? routeId(current.provider, current.model) : ''
  let displayCaption = caption
  for (const group of groups) {
    for (const model of group.models) {
      const id = routeId(group.id, model.id)
      const display = group.id === ENTERPRISE_PROVIDER_ROUTE ? enterpriseModelDisplayParts(model.name) : null
      const providerId = display ? routeId(group.id, display.provider) : group.id
      const providerName = display ? display.provider || props.enterpriseModelsLabel : group.provider.name
      let provider = providers.get(providerId)
      if (!provider) {
        const brandName = providerName.trim().toLowerCase()
        const brandId = brandName === 'chatgpt' ? 'openai' : brandName
        const brand = MODEL_PROVIDERS.find(item =>
          (!display && item.id === group.id) ||
          item.id === brandId || item.name.toLowerCase() === brandName)
        provider = { id: providerId, name: providerName, logo: brand?.logo ?? '/desktop-workspace/composer-panel/models/generic.svg', logoSize: brand?.logoSize, models: [] }
        providers.set(providerId, provider)
      }
      provider.models.push({ id, name: display?.name ?? model.name })
      routes.set(id, { provider: group.id, model: model.id, reasoningEffort: model.reasoning?.defaultEffort })
      if (id === value && display?.provider && caption.startsWith(model.name)) {
        displayCaption = display.name + caption.slice(model.name.length)
      }
    }
  }
  const submit = async (selection: ModelSelection) => {
    if (busy || submitting.current || disabled) return false
    submitting.current = true
    setPending(true)
    setError('')
    try {
      const result = await select(selection)
      if (result?.ok) return true
      setError(props.formatError(result?.error))
      return false
    } catch {
      setError(props.formatError())
      return false
    } finally {
      submitting.current = false
      setPending(false)
    }
  }
  return <div className="dshSettingsControl">
    {createPortal(<div ref={setPortal} className="dshWorkspacePortal" />, document.body)}
    <UNSAFE_PortalProvider getContainer={() => portal}>
      <ModelPicker providers={[...providers.values()]} value={value}
        effort={Math.max(0, efforts.findIndex(option => option.effort === currentEffort))}
        host={{
          title: props.title, caption: displayCaption, triggerLabel: label, providersLabel, effortLabel, emptyLabel,
          searchLabel: props.searchActionLabel, searchPlaceholder: props.searchLabel, closeSearchLabel: props.closeSearchLabel,
          isDisabled: disabled, pending: busy || pending,
          onOpen: () => {
            setError('')
            props.reload()
          },
          onModelSelect: async id => {
            if (id === value) return true
            const selection = routes.get(id)
            return selection ? submit(selection) : false
          },
          effortLevels: efforts.map(option => option.label),
          onEffortSelect: async index => {
            const option = efforts[index]
            if (!option || !current) return false
            if (option.effort === currentEffort) return true
            return submit({ ...current, reasoningEffort: option.effort })
          },
          footer: <>
            {props.catalogWarning && <div className="flex items-start gap-2 px-1.5 pt-2 text-body-2-medium text-text-secondary">
              <span role="status">{props.catalogWarning}</span>
              <button type="button" onClick={props.reload} className="shrink-0 cursor-pointer rounded-lg px-1.5 text-text-primary hover:bg-background-primary-hover">{props.retryLabel}</button>
            </div>}
            {error && <p role="alert" className="px-1.5 pt-2 text-body-2-medium text-text-secondary">{error}</p>}
          </>
        }} />
    </UNSAFE_PortalProvider>
  </div>
}
