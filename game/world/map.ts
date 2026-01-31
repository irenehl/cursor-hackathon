import { Container, Graphics, Sprite, Texture } from 'pixi.js'
import { Tilemap, TilemapData } from './tilemap'
import { MapObject, MapObjectConfig } from './mapObject'
import { getDefaultEventMapStructure, type EventMapStructure } from './eventMapStructure'

export interface MapBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface PunishmentCorner {
  x: number
  y: number
  width: number
  height: number
}

export class GameMap {
  private container: Container
  private bounds: MapBounds
  private punishmentCorner: PunishmentCorner
  private tilemap: Tilemap | null = null
  private cornerMarker: Graphics | null = null
  private objects: MapObject[] = []
  private objectsContainer: Container

  constructor(container: Container, bounds: MapBounds, punishmentCorner: PunishmentCorner) {
    this.container = container
    this.bounds = bounds
    this.punishmentCorner = punishmentCorner

    // Create container for map objects (above tiles, below player)
    this.objectsContainer = new Container()
    this.objectsContainer.x = bounds.x
    this.objectsContainer.y = bounds.y
    this.container.addChild(this.objectsContainer) // after tilemap (index 0), so objects render on top of tiles
  }

  async loadMap(mapTexturePath?: string, tilemapData?: TilemapData): Promise<void> {
    // Use tilemap if tilemapData is provided, otherwise fallback to old method
    if (tilemapData) {
      // Create tilemap container - add at index 0 so field tiles are at bottom of Z
      const tilemapContainer = new Container()
      tilemapContainer.x = this.bounds.x
      tilemapContainer.y = this.bounds.y
      this.container.addChildAt(tilemapContainer, 0)

      // Initialize and load tilemap
      this.tilemap = new Tilemap(tilemapContainer, 'fieldsTileset', 32, 32)
      await this.tilemap.initialize()
      this.tilemap.loadMapData(tilemapData)
    } else if (mapTexturePath) {
      // Legacy: single texture map
      const texture = await Texture.fromURL(mapTexturePath)
      const mapSprite = new Sprite(texture)
      mapSprite.width = this.bounds.width
      mapSprite.height = this.bounds.height
      mapSprite.x = this.bounds.x
      mapSprite.y = this.bounds.y
      this.container.addChild(mapSprite)
    } else {
      // Fallback: simple colored background
      const bg = new Graphics()
      bg.beginFill(0x2a2a2a)
      bg.drawRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height)
      bg.endFill()
      this.container.addChild(bg)
    }

    // Create punishment corner marker (as overlay sprite)
    const cornerSprite = new Graphics()
    cornerSprite.beginFill(0xff0000, 0.3)
    cornerSprite.drawRect(
      this.punishmentCorner.x - this.bounds.x,
      this.punishmentCorner.y - this.bounds.y,
      this.punishmentCorner.width,
      this.punishmentCorner.height
    )
    cornerSprite.endFill()
    cornerSprite.lineStyle(2, 0xff0000)
    cornerSprite.drawRect(
      this.punishmentCorner.x - this.bounds.x,
      this.punishmentCorner.y - this.bounds.y,
      this.punishmentCorner.width,
      this.punishmentCorner.height
    )
    cornerSprite.x = this.bounds.x
    cornerSprite.y = this.bounds.y
    this.container.addChild(cornerSprite)
    this.cornerMarker = cornerSprite
  }

  /**
   * Generate a simple tilemap data for the map bounds
   * Fills with random grass/field tiles (legacy)
   */
  generateDefaultTilemap(): TilemapData {
    const tileWidth = 32
    const tileHeight = 32
    const width = Math.ceil(this.bounds.width / tileWidth)
    const height = Math.ceil(this.bounds.height / tileHeight)
    const tiles: number[] = []

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileId = (x + y) % 3 === 0 ? Math.floor(Math.random() * 20) + 1 : Math.floor(Math.random() * 10) + 1
        tiles.push(tileId)
      }
    }

    return { width, height, tiles }
  }

  /**
   * Get the shared event map structure (same for all players).
   * Uses default structure; can be extended to accept custom structure for dynamic maps.
   */
  getEventMapStructure(customStructure?: EventMapStructure): EventMapStructure {
    if (customStructure) {
      return customStructure
    }
    return getDefaultEventMapStructure(this.bounds.width, this.bounds.height)
  }

  /**
   * Place a decorative object on the map
   */
  async placeObject(config: MapObjectConfig): Promise<MapObject> {
    const mapObject = new MapObject(this.objectsContainer, {
      ...config,
      x: config.x - this.bounds.x, // Convert to container-relative coordinates
      y: config.y - this.bounds.y,
    })
    
    await mapObject.load()
    this.objects.push(mapObject)
    
    // Sort objects by Y position for proper depth
    this.sortObjectsByDepth()
    
    return mapObject
  }

  /**
   * Sort objects: tiles < houses < decorations < player
   * Layer 0 = houses, Layer 1 = adornos (decorations). Lower layer first, then by Y.
   */
  private sortObjectsByDepth(): void {
    this.objects.sort((a, b) => {
      const layerA = a.getLayer()
      const layerB = b.getLayer()
      if (layerA !== layerB) return layerA - layerB
      return a.getBaseY() - b.getBaseY()
    })
    
    // Update container children order
    for (let i = 0; i < this.objects.length; i++) {
      const obj = this.objects[i]
      const sprite = obj.getSprite()
      if (sprite) {
        this.objectsContainer.setChildIndex(sprite, i)
      }
    }
  }

  /**
   * Remove an object from the map
   */
  removeObject(objectId: string): void {
    const index = this.objects.findIndex((obj) => obj.getObjectId() === objectId)
    if (index !== -1) {
      const obj = this.objects[index]
      obj.destroy()
      this.objects.splice(index, 1)
    }
  }

  /**
   * Get all objects
   */
  getObjects(): MapObject[] {
    return [...this.objects]
  }

  getBounds(): MapBounds {
    return { ...this.bounds }
  }

  getPunishmentCorner(): PunishmentCorner {
    return { ...this.punishmentCorner }
  }

  clampPosition(x: number, y: number, width: number, height: number): { x: number; y: number } {
    const minX = this.bounds.x
    const maxX = this.bounds.x + this.bounds.width - width
    const minY = this.bounds.y
    const maxY = this.bounds.y + this.bounds.height - height

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    }
  }

  isInBounds(x: number, y: number, width: number, height: number): boolean {
    return (
      x >= this.bounds.x &&
      x + width <= this.bounds.x + this.bounds.width &&
      y >= this.bounds.y &&
      y + height <= this.bounds.y + this.bounds.height
    )
  }

  getTilemap(): Tilemap | null {
    return this.tilemap
  }

  destroy(): void {
    // Destroy all objects
    for (const obj of this.objects) {
      obj.destroy()
    }
    this.objects = []
    
    if (this.objectsContainer) {
      this.container.removeChild(this.objectsContainer)
      this.objectsContainer.destroy({ children: true })
    }
    
    if (this.tilemap) {
      this.tilemap.destroy()
      this.tilemap = null
    }
    if (this.cornerMarker) {
      this.cornerMarker.destroy()
      this.cornerMarker = null
    }
  }
}
