import { Container, Sprite, Texture, Graphics, Text } from 'pixi.js'

export interface PlayerState {
  userId: string
  displayName: string
  avatarId: number
  x: number
  y: number
  dir: number // direction: 0=right, 1=down, 2=left, 3=up
}

export interface PlayerConfig {
  userId: string
  displayName: string
  avatarId: number
  isLocal?: boolean
}

export class Player {
  private container: Container
  private sprite: Sprite | null = null
  private nameLabel: Text | null = null
  private hatOverlay: Sprite | null = null
  private config: PlayerConfig
  private state: PlayerState
  private avatarTexture: Texture | null = null

  constructor(container: Container, config: PlayerConfig, initialState: PlayerState) {
    this.container = container
    this.config = config
    this.state = initialState
  }

  async loadAvatar(avatarPath: string): Promise<void> {
    try {
      this.avatarTexture = await Texture.fromURL(avatarPath)
    } catch (error) {
      console.warn(`Failed to load avatar from ${avatarPath}, using fallback`, error)
      // Create a simple colored rectangle as fallback
      const fallback = new Graphics()
      fallback.beginFill(0x4a90e2) // Blue color
      fallback.drawRect(0, 0, 32, 32)
      fallback.endFill()
      // Get renderer from parent application
      const renderer = (this.container.parent as any)?.app?.renderer
      if (renderer) {
        this.avatarTexture = renderer.generateTexture(fallback)
      } else {
        // Last resort: create a simple texture using canvas
        const canvas = document.createElement('canvas')
        canvas.width = 32
        canvas.height = 32
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#4a90e2'
        ctx.fillRect(0, 0, 32, 32)
        this.avatarTexture = Texture.from(canvas)
      }
      fallback.destroy()
    }
    
    if (!this.avatarTexture) {
      throw new Error('Failed to create avatar texture')
    }
    this.sprite = new Sprite(this.avatarTexture)
    
    // Set sprite size (adjust as needed)
    this.sprite.width = 32
    this.sprite.height = 32
    this.sprite.anchor.set(0.5, 0.5)
    
    this.container.addChild(this.sprite)

    // Create name label
    this.nameLabel = new Text(this.config.displayName, {
      fontSize: 12,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 2,
      align: 'center',
    })
    this.nameLabel.anchor.set(0.5, 1)
    this.nameLabel.y = -20
    this.container.addChild(this.nameLabel)

    // Update initial position
    this.updatePosition(this.state.x, this.state.y)
  }

  async loadHatOverlay(hatPath: string): Promise<void> {
    try {
      const hatTexture = await Texture.fromURL(hatPath)
      this.hatOverlay = new Sprite(hatTexture)
      this.hatOverlay.width = 32
      this.hatOverlay.height = 32
      this.hatOverlay.anchor.set(0.5, 0.5)
      this.hatOverlay.visible = false
      this.container.addChild(this.hatOverlay)
    } catch (error) {
      console.warn(`Failed to load hat overlay from ${hatPath}, using fallback`, error)
      // Create a simple red rectangle as fallback hat
      const fallbackHat = new Graphics()
      fallbackHat.beginFill(0xff0000)
      fallbackHat.drawRect(-16, -20, 32, 12)
      fallbackHat.endFill()
      // Get renderer from parent application
      const renderer = (this.container.parent as any)?.app?.renderer
      if (renderer) {
        this.hatOverlay = new Sprite(renderer.generateTexture(fallbackHat))
      } else {
        // Last resort: create a simple texture using canvas
        const canvas = document.createElement('canvas')
        canvas.width = 32
        canvas.height = 12
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#ff0000'
        ctx.fillRect(0, 0, 32, 12)
        this.hatOverlay = new Sprite(Texture.from(canvas))
      }
      this.hatOverlay.anchor.set(0.5, 0.5)
      this.hatOverlay.visible = false
      this.container.addChild(this.hatOverlay)
      fallbackHat.destroy()
    }
  }

  updatePosition(x: number, y: number): void {
    this.state.x = x
    this.state.y = y
    this.container.x = x
    this.container.y = y
  }

  updateDirection(dir: number): void {
    this.state.dir = dir
    if (this.sprite) {
      // Flip sprite based on direction (simple implementation)
      if (dir === 2) {
        // Left
        this.sprite.scale.x = -1
      } else {
        this.sprite.scale.x = 1
      }
    }
  }

  setHatVisible(visible: boolean): void {
    if (this.hatOverlay) {
      this.hatOverlay.visible = visible
    }
  }

  getState(): PlayerState {
    return { ...this.state }
  }

  getUserId(): string {
    return this.config.userId
  }

  getContainer(): Container {
    return this.container
  }

  destroy(): void {
    if (this.sprite) {
      this.sprite.destroy()
      this.sprite = null
    }
    if (this.nameLabel) {
      this.nameLabel.destroy()
      this.nameLabel = null
    }
    if (this.hatOverlay) {
      this.hatOverlay.destroy()
      this.hatOverlay = null
    }
    this.container.destroy({ children: true })
  }
}
