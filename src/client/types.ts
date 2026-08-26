export interface SlotOptions {
  name: string
  id?: string
  order?: number
}

export interface SlotsLike {
  inject(name: string, register: () => unknown): void
  register(options: SlotOptions, component: unknown): unknown
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    slots: SlotsLike
  }
}
