/**
 * Desktop skin, host half. Pure UI plugin: the empty apply exists so the host
 * Loader can discover the package; the browser half ships through
 * exports["./client"] and the package.json `dsh.client` declaration.
 */
export function apply() {}
