/** The view reads only user-facing model and session metadata from Harness. */
export async function getModelStatus(ctx, signal) {
  signal?.throwIfAborted()
  const result = await ctx.remote.session.modelCatalog()
  signal?.throwIfAborted()
  if (!result.ok) throw new Error(result.error.message)
  const { groups, default: selection, routableProviders } = result.value
  const group = groups.find(item => item.id === selection.provider)
  return {
    configured: routableProviders.includes(selection.provider) && Boolean(group?.models.some(item => item.id === selection.model)),
    model: selection.model,
    providerLabel: group?.name ?? selection.provider
  }
}

export async function listTasks(ctx, signal) {
  signal?.throwIfAborted()
  const result = await ctx.remote.session.list({})
  signal?.throwIfAborted()
  if (!result.ok) throw new Error(result.error.message)
  const live = ctx.sessions.list.getSnapshot().byId
  return result.value.items.filter(row => !row.blank && row.origin !== 'subagent').map(row => ({
    id: row.sessionId,
    title: live[row.sessionId]?.title || row.sessionId,
    updatedAt: row.updatedAt,
    status: row.running ? 'running' : 'idle'
  }))
}
