import { Container, Sprite, Texture } from 'pixi.js'
import { getTexture } from '../assets/assetManifest'

export interface MapObjectConfig {
  objectId: string // e.g., 'house1', 'tent2', 'stone1'
  x: number // world x position
  y: number // world y position
  scale?: number // optional scale (default: 1)
  anchor?: { x: number; y: number } // anchor point (default: 0.5, 0.5 for center)
}

export class MapObject {
  private container: Container
  private sprite: Sprite | null = null
  private config: MapObjectConfig
  private baseY: number // Store Y for depth sorting

  constructor(container: Container, config: MapObjectConfig) {
    this.container = container
    this.config = config
    this.baseY = config.y
  }

  /**
   * Load the object sprite
   */
  async load(): Promise<void> {
    try {
      // Try to get texture from asset manifest
      let texture = getTexture(this.config.objectId)
      
      // If not found, try loading directly from path
      if (!texture) {
        // Construct path from objectId (e.g., 'house1' -> '/assets/2 Objects/7 House/1.png')
        const path = this.getObjectPath(this.config.objectId)
        if (path) {
          texture = await Texture.fromURL(path)
        }
      }

      if (!texture) {
        throw new Error(`Failed to load object texture: ${this.config.objectId}`)
      }

      this.sprite = new Sprite(texture)
      
      // Set anchor (default: center bottom for proper depth sorting)
      const anchor = this.config.anchor || { x: 0.5, y: 1 }
      this.sprite.anchor.set(anchor.x, anchor.y)
      
      // Set scale
      const scale = this.config.scale || 1
      this.sprite.scale.set(scale)
      
      // Set position
      this.sprite.x = this.config.x
      this.sprite.y = this.config.y

      this.container.addChild(this.sprite)
    } catch (error) {
      console.warn(`Failed to load map object ${this.config.objectId}:`, error)
    }
  }

  /**
   * Get the file path for an object ID
   */
  private getObjectPath(objectId: string): string | null {
    // Map object IDs to their paths
    const pathMap: Record<string, string> = {
      // Houses
      house1: '/assets/2 Objects/7 House/1.png',
      house2: '/assets/2 Objects/7 House/2.png',
      house3: '/assets/2 Objects/7 House/3.png',
      house4: '/assets/2 Objects/7 House/4.png',
      // Tents
      tent1: '/assets/2 Objects/6 Tent/1.png',
      tent2: '/assets/2 Objects/6 Tent/2.png',
      tent3: '/assets/2 Objects/6 Tent/3.png',
      tent4: '/assets/2 Objects/6 Tent/4.png',
      // Stones
      stone1: '/assets/2 Objects/2 Stone/1.png',
      stone2: '/assets/2 Objects/2 Stone/2.png',
      stone3: '/assets/2 Objects/2 Stone/3.png',
      stone4: '/assets/2 Objects/2 Stone/4.png',
      stone5: '/assets/2 Objects/2 Stone/5.png',
      stone6: '/assets/2 Objects/2 Stone/6.png',
      // Boxes
      box1: '/assets/2 Objects/4 Box/1.png',
      box2: '/assets/2 Objects/4 Box/2.png',
      box3: '/assets/2 Objects/4 Box/3.png',
      box4: '/assets/2 Objects/4 Box/4.png',
      box5: '/assets/2 Objects/4 Box/5.png',
      // Grass
      grass1: '/assets/2 Objects/5 Grass/1.png',
      grass2: '/assets/2 Objects/5 Grass/2.png',
      grass3: '/assets/2 Objects/5 Grass/3.png',
      grass4: '/assets/2 Objects/5 Grass/4.png',
      grass5: '/assets/2 Objects/5 Grass/5.png',
      grass6: '/assets/2 Objects/5 Grass/6.png',
      // Decor
      decor1: '/assets/2 Objects/3 Decor/1.png',
      decor2: '/assets/2 Objects/3 Decor/2.png',
      decor3: '/assets/2 Objects/3 Decor/3.png',
      decor4: '/assets/2 Objects/3 Decor/4.png',
      decor5: '/assets/2 Objects/3 Decor/5.png',
      decor6: '/assets/2 Objects/3 Decor/6.png',
      decor7: '/assets/2 Objects/3 Decor/7.png',
      decor8: '/assets/2 Objects/3 Decor/8.png',
      decor9: '/assets/2 Objects/3 Decor/9.png',
      decor10: '/assets/2 Objects/3 Decor/10.png',
      decor11: '/assets/2 Objects/3 Decor/11.png',
      decor12: '/assets/2 Objects/3 Decor/12.png',
      decor13: '/assets/2 Objects/3 Decor/13.png',
      decor14: '/assets/2 Objects/3 Decor/14.png',
      decor15: '/assets/2 Objects/3 Decor/15.png',
      decor16: '/assets/2 Objects/3 Decor/16.png',
      decor17: '/assets/2 Objects/3 Decor/17.png',
      // Shadows
      shadow1: '/assets/2 Objects/1 Shadow/1.png',
      shadow2: '/assets/2 Objects/1 Shadow/2.png',
      shadow3: '/assets/2 Objects/1 Shadow/3.png',
      shadow4: '/assets/2 Objects/1 Shadow/4.png',
      shadow5: '/assets/2 Objects/1 Shadow/5.png',
      shadow6: '/assets/2 Objects/1 Shadow/6.png',
      // Special
      towerPlace1: '/assets/2 Objects/PlaceForTower1.png',
      towerPlace2: '/assets/2 Objects/PlaceForTower2.png',
    }

    return pathMap[objectId] || null
  }

  /**
   * Update Z-order based on Y position (objects further down render on top)
   */
  updateDepth(): void {
    if (this.sprite) {
      this.sprite.zIndex = this.baseY
    }
  }

  /**
   * Get the base Y position for depth sorting
   */
  getBaseY(): number {
    return this.baseY
  }

  /**
   * Get the object ID
   */
  getObjectId(): string {
    return this.config.objectId
  }

  /**
   * Get the sprite (for external manipulation)
   */
  getSprite(): Sprite | null {
    return this.sprite
  }

  /**
   * Destroy the object
   */
  destroy(): void {
    if (this.sprite) {
      this.container.removeChild(this.sprite)
      this.sprite.destroy()
      this.sprite = null
    }
  }
}
