import { Container, Graphics, Sprite, Texture } from 'pixi.js'

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
  private mapSprite: Sprite | null = null
  private cornerMarker: Graphics | null = null

  constructor(container: Container, bounds: MapBounds, punishmentCorner: PunishmentCorner) {
    this.container = container
    this.bounds = bounds
    this.punishmentCorner = punishmentCorner
  }

  async loadMap(mapTexturePath?: string): Promise<void> {
    // If map texture is provided, load it
    if (mapTexturePath) {
      const texture = await Texture.fromURL(mapTexturePath)
      this.mapSprite = new Sprite(texture)
      this.mapSprite.width = this.bounds.width
      this.mapSprite.height = this.bounds.height
      this.mapSprite.x = this.bounds.x
      this.mapSprite.y = this.bounds.y
      this.container.addChild(this.mapSprite)
    } else {
      // Create a simple colored background as fallback
      const bg = new Graphics()
      bg.beginFill(0x2a2a2a)
      bg.drawRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height)
      bg.endFill()
      this.container.addChild(bg)
    }

    // Create punishment corner marker
    this.cornerMarker = new Graphics()
    this.cornerMarker.beginFill(0xff0000, 0.3)
    this.cornerMarker.drawRect(
      this.punishmentCorner.x,
      this.punishmentCorner.y,
      this.punishmentCorner.width,
      this.punishmentCorner.height
    )
    this.cornerMarker.endFill()
    this.cornerMarker.lineStyle(2, 0xff0000)
    this.cornerMarker.drawRect(
      this.punishmentCorner.x,
      this.punishmentCorner.y,
      this.punishmentCorner.width,
      this.punishmentCorner.height
    )
    this.container.addChild(this.cornerMarker)
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

  destroy(): void {
    if (this.mapSprite) {
      this.mapSprite.destroy()
      this.mapSprite = null
    }
    if (this.cornerMarker) {
      this.cornerMarker.destroy()
      this.cornerMarker = null
    }
  }
}
