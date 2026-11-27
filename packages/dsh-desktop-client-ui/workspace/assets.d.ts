declare module '*.module.css' {
  const styles: Readonly<Record<string, string>>
  export default styles
}
declare module '*.png' {
  const source: string
  export default source
}
