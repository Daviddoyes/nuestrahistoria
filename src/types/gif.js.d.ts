// gif.js no trae tipos oficiales; declaración mínima para lo que usamos.
declare module 'gif.js' {
  interface GIFOptions {
    workers?: number
    quality?: number
    width?: number
    height?: number
    workerScript?: string
    background?: string
    repeat?: number
  }
  interface FrameOptions {
    delay?: number
    copy?: boolean
  }
  export default class GIF {
    constructor(options?: GIFOptions)
    addFrame(image: CanvasImageSource | CanvasRenderingContext2D, opts?: FrameOptions): void
    on(event: 'finished', cb: (blob: Blob) => void): void
    on(event: 'progress', cb: (progress: number) => void): void
    on(event: 'abort', cb: () => void): void
    render(): void
  }
}
