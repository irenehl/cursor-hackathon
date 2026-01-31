import { Application, Assets, Ticker } from 'pixi.js'
import { loadAssetBundles } from '../assets/assetManifest'

export interface PixiAppConfig {
  width: number
  height: number
  backgroundColor?: number
  antialias?: boolean
  preloadAssets?: boolean
}

export class PixiAppManager {
  private app: Application | null = null
  private ticker: Ticker | null = null
  private assetsLoaded: boolean = false

  async initialize(config: PixiAppConfig, container: HTMLElement): Promise<Application> {
    // Create PixiJS application - let PixiJS create its own canvas
    this.app = new Application({
      width: config.width,
      height: config.height,
      backgroundColor: config.backgroundColor ?? 0x1a1a1a,
      antialias: config.antialias ?? true,
      resolution: window.devicePixelRatio ?? 1,
      autoDensity: true,
    })

    // Append the PixiJS-created canvas to the container
    container.appendChild(this.app.view as HTMLCanvasElement)

    // Use the application's ticker
    this.ticker = this.app.ticker

    // Preload assets if requested (default: true)
    if (config.preloadAssets !== false) {
      await this.preloadAssets()
    }

    return this.app
  }

  /**
   * Preload all game assets
   */
  async preloadAssets(): Promise<void> {
    if (this.assetsLoaded) {
      return
    }
    await loadAssetBundles()
    this.assetsLoaded = true
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
