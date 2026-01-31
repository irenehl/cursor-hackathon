import { Application, Assets, Ticker } from 'pixi.js'

export interface PixiAppConfig {
  width: number
  height: number
  backgroundColor?: number
  antialias?: boolean
}

export class PixiAppManager {
  private app: Application | null = null
  private ticker: Ticker | null = null

  async initialize(config: PixiAppConfig, canvas: HTMLCanvasElement): Promise<Application> {
    // Create PixiJS application
    this.app = new Application({
      width: config.width,
      height: config.height,
      backgroundColor: config.backgroundColor ?? 0x1a1a1a,
      antialias: config.antialias ?? true,
      resolution: window.devicePixelRatio ?? 1,
      autoDensity: true,
    })

    // Replace the default canvas with the provided one
    if (this.app.view) {
      const parent = this.app.view.parentNode
      if (parent) {
        parent.removeChild(this.app.view)
      }
    }
    // Set the canvas element directly
    ;(this.app.renderer as any).canvas = canvas
    ;(this.app.renderer as any).view = canvas

    // Use the application's ticker
    this.ticker = this.app.ticker

    return this.app
  }

  getApp(): Application {
    if (!this.app) {
      throw new Error('PixiJS application not initialized. Call initialize() first.')
    }
    return this.app
  }

  getTicker(): Ticker {
    if (!this.ticker) {
      throw new Error('Ticker not initialized. Call initialize() first.')
    }
    return this.ticker
  }

  async loadAssets(assetPaths: string[]): Promise<void> {
    if (!this.app) {
      throw new Error('Application not initialized')
    }

    // Load all assets
    await Assets.load(assetPaths)
  }

  resize(width: number, height: number): void {
    if (!this.app) {
      return
    }
    this.app.renderer.resize(width, height)
  }

  destroy(): void {
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true })
      this.app = null
      this.ticker = null
    }
  }
}
