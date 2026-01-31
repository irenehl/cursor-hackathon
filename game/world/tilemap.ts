import { Container, Sprite, Texture, Spritesheet } from 'pixi.js'
import { TILE_CONFIG, getTexture } from '../assets/assetManifest'

export interface TilemapData {
  width: number // tiles wide
  height: number // tiles tall
  tiles: number[] // 1D array of tile IDs (0 = empty/transparent)
}

export class Tilemap {
  private container: Container
  private tileWidth: number
  private tileHeight: number
  private sprites: Sprite[][] = []
  private tilesetName: string
  private spritesheet: Spritesheet | null = null
  private mapData: TilemapData | null = null

  constructor(
    container: Container,
    tilesetName: string = 'fieldsTileset',
    tileWidth: number = 32,
    tileHeight: number = 32
  ) {
    this.container = container
    this.tilesetName = tilesetName
    this.tileWidth = tileWidth
    this.tileHeight = tileHeight
  }

  /**
   * Initialize the tilemap with a tileset
   */
  async initialize(): Promise<void> {
    const config = TILE_CONFIG[this.tilesetName]
    if (!config) {
      throw new Error(`Tileset ${this.tilesetName} not found in TILE_CONFIG`)
    }

    // Load the tileset texture - try alias first, then path
    let tilesetTexture = getTexture('fieldsTileset') || getTexture('tileset2')
    if (!tilesetTexture) {
      tilesetTexture = getTexture(config.tilesetPath)
    }
    if (!tilesetTexture) {
      // Fallback: load directly
      const { Texture } = await import('pixi.js')
      tilesetTexture = await Texture.fromURL(config.tilesetPath)
    }
    if (!tilesetTexture) {
      throw new Error(`Failed to load tileset texture: ${config.tilesetPath}`)
    }

    // Create spritesheet data
    const spritesheetData = {
      meta: {
        scale: '1',
      },
      frames: {} as Record<string, any>,
    }

    // Generate frame data for each tile in the tileset
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.columns; col++) {
        const tileId = row * config.columns + col
        const frameName = `tile_${tileId}`
        spritesheetData.frames[frameName] = {
          frame: {
            x: col * config.tileWidth,
            y: row * config.tileHeight,
            w: config.tileWidth,
            h: config.tileHeight,
          },
          sourceSize: {
            w: config.tileWidth,
            h: config.tileHeight,
          },
          spriteSourceSize: {
            x: 0,
            y: 0,
            w: config.tileWidth,
            h: config.tileHeight,
          },
        }
      }
    }

    // Create spritesheet
    this.spritesheet = new Spritesheet(tilesetTexture, spritesheetData)
    await this.spritesheet.parse()
  }

  /**
   * Load map data and render tiles
   */
  loadMapData(mapData: TilemapData): void {
    this.mapData = mapData
    this.clear()

    if (!this.spritesheet) {
      throw new Error('Tilemap not initialized. Call initialize() first.')
    }

    // Initialize sprite grid
    this.sprites = []
    for (let y = 0; y < mapData.height; y++) {
      this.sprites[y] = []
      for (let x = 0; x < mapData.width; x++) {
        this.sprites[y][x] = null as any
      }
    }

    // Create sprites for each tile
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        const tileIndex = y * mapData.width + x
        const tileId = mapData.tiles[tileIndex]

        // Skip empty tiles (0)
        if (tileId === 0 || tileId === undefined) {
          continue
        }

        // Get tile texture from spritesheet
        const frameName = `tile_${tileId - 1}` // tileId is 1-indexed, frames are 0-indexed
        const texture = this.spritesheet.textures[frameName]

        if (texture) {
          const sprite = new Sprite(texture)
          sprite.x = x * this.tileWidth
          sprite.y = y * this.tileHeight
          sprite.width = this.tileWidth
          sprite.height = this.tileHeight

          this.container.addChild(sprite)
          this.sprites[y][x] = sprite
        }
      }
    }
  }

  /**
   * Set a tile at a specific position
   */
  setTile(x: number, y: number, tileId: number): void {
    if (!this.spritesheet || !this.mapData) {
      throw new Error('Tilemap not initialized or no map data loaded')
    }

    if (x < 0 || x >= this.mapData.width || y < 0 || y >= this.mapData.height) {
      return
    }

    // Remove existing sprite
    if (this.sprites[y] && this.sprites[y][x]) {
      this.container.removeChild(this.sprites[y][x])
      this.sprites[y][x].destroy()
      this.sprites[y][x] = null as any
    }

    // Update map data
    const tileIndex = y * this.mapData.width + x
    this.mapData.tiles[tileIndex] = tileId

    // Add new sprite if tileId is not 0
    if (tileId !== 0) {
      const frameName = `tile_${tileId - 1}`
      const texture = this.spritesheet.textures[frameName]

      if (texture) {
        const sprite = new Sprite(texture)
        sprite.x = x * this.tileWidth
        sprite.y = y * this.tileHeight
        sprite.width = this.tileWidth
        sprite.height = this.tileHeight

        this.container.addChild(sprite)
        this.sprites[y][x] = sprite
      }
    }
  }

  /**
   * Get tile ID at position
   */
  getTile(x: number, y: number): number {
    if (!this.mapData) {
      return 0
    }

    if (x < 0 || x >= this.mapData.width || y < 0 || y >= this.mapData.height) {
      return 0
    }

    const tileIndex = y * this.mapData.width + x
    return this.mapData.tiles[tileIndex] || 0
  }

  /**
   * Clear all tiles
   */
  clear(): void {
    for (let y = 0; y < this.sprites.length; y++) {
      for (let x = 0; x < this.sprites[y].length; x++) {
        if (this.sprites[y][x]) {
          this.container.removeChild(this.sprites[y][x])
          this.sprites[y][x].destroy()
        }
      }
    }
    this.sprites = []
  }

  /**
   * Get map data
   */
  getMapData(): TilemapData | null {
    return this.mapData
  }

  /**
   * Destroy the tilemap
   */
  destroy(): void {
    this.clear()
    if (this.spritesheet) {
      this.spritesheet.destroy(true)
      this.spritesheet = null
    }
  }
}
