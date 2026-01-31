import { Container, Sprite, Texture, Graphics, Text, Rectangle } from 'pixi.js'
import { CharacterType, getPremiumAnimationPaths, getPremiumAnimationMetadata } from '../config/characters'

export interface PlayerState {
  userId: string
  displayName: string
  avatarId: number
  characterType: CharacterType
  x: number
  y: number
  dir: number // direction: 0=right, 1=down, 2=left, 3=up
}

export interface PlayerConfig {
  userId: string
  displayName: string
  avatarId: number
  characterType: CharacterType
  isLocal?: boolean
}

export type PvpState = 'idle' | 'frozen' | 'fighting' | 'winner' | 'loser'

export class Player {
  private container: Container
  private sprite: Sprite | null = null
  private nameLabel: Text | null = null
  private hatOverlay: Sprite | null = null
  private config: PlayerConfig
  private state: PlayerState
  private avatarTexture: Texture | null = null
  private pvpState: PvpState = 'idle'
  private freezeEndTime: number = 0
  private fightAnimationFrame: number = 0
  private fightAnimationStartTime: number = 0
  
  // Animation state for premium characters
  private idleFrames: Texture[] | null = null
  private walkFrames: Texture[] | null = null
  private animState: 'idle' | 'walk' = 'idle'
  private frameIndex: number = 0
  private frameElapsed: number = 0
  private isPremium: boolean = false

  constructor(container: Container, config: PlayerConfig, initialState: PlayerState) {
    this.container = container
    this.config = config
    this.state = initialState
  }

  async loadAvatar(characterType: CharacterType, avatarPath?: string): Promise<void> {
    if (characterType === 'default') {
      // Use pixel-art placeholder for default character
      this.avatarTexture = this.createPixelArtPlaceholder()
      this.isPremium = false
    } else {
      // Premium character - load both idle and walk animations
      const animationPaths = getPremiumAnimationPaths(characterType)
      if (animationPaths) {
        try {
          this.isPremium = true
          const metadata = getPremiumAnimationMetadata()
          
          // Load both spritesheets
          const [idleTexture, walkTexture] = await Promise.all([
            Texture.fromURL(animationPaths.idle),
            Texture.fromURL(animationPaths.walk),
          ])
          
          // Slice idle spritesheet into frames
          this.idleFrames = []
          for (let i = 0; i < metadata.idleFrames; i++) {
            const frame = new Rectangle(i * metadata.frameWidth, 0, metadata.frameWidth, metadata.frameHeight)
            this.idleFrames.push(new Texture(idleTexture.baseTexture, frame))
          }
          
          // Slice walk spritesheet into frames
          this.walkFrames = []
          for (let i = 0; i < metadata.walkFrames; i++) {
            const frame = new Rectangle(i * metadata.frameWidth, 0, metadata.frameWidth, metadata.frameHeight)
            this.walkFrames.push(new Texture(walkTexture.baseTexture, frame))
          }
          
          // Initialize animation state
          this.animState = 'idle'
          this.frameIndex = 0
          this.frameElapsed = 0
          
          // Set initial sprite to first idle frame
          this.avatarTexture = this.idleFrames[0]
        } catch (error: any) {
          console.warn(`Failed to load premium character animations, using pixel-art placeholder`, error)
          // Fallback to pixel-art placeholder
          this.avatarTexture = this.createPixelArtPlaceholder()
          this.isPremium = false
          this.idleFrames = null
          this.walkFrames = null
        }
      } else {
        // Fallback for non-premium non-default (shouldn't happen, but handle gracefully)
        this.avatarTexture = this.createPixelArtPlaceholder()
        this.isPremium = false
      }
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0c79b8cd-d103-4925-a9ae-e8a96ba4f4c7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hypothesisId: 'H3', location: 'player.ts:loadHatOverlay:entry', message: 'loadHatOverlay start', data: { hatPath }, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {})
    // #endregion
    try {
      const hatTexture = await Texture.fromURL(hatPath)
      this.hatOverlay = new Sprite(hatTexture)
      this.hatOverlay.width = 32
      this.hatOverlay.height = 32
      this.hatOverlay.anchor.set(0.5, 0.5)
      this.hatOverlay.visible = false
      this.container.addChild(this.hatOverlay)
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0c79b8cd-d103-4925-a9ae-e8a96ba4f4c7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hypothesisId: 'H3', location: 'player.ts:loadHatOverlay:catch', message: 'loadHatOverlay failed', data: { hatPath, errMessage: error?.message }, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {})
      // #endregion
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

  /**
   * Set PvP state (frozen, fighting, winner, loser)
   */
  setPvpState(state: PvpState, durationMs?: number): void {
    this.pvpState = state
    
    if (state === 'frozen' && durationMs) {
      this.freezeEndTime = Date.now() + durationMs
    } else if (state === 'fighting') {
      this.fightAnimationStartTime = Date.now()
      this.fightAnimationFrame = 0
    } else {
      this.freezeEndTime = 0
      this.fightAnimationFrame = 0
    }
  }

  /**
   * Get current PvP state
   */
  getPvpState(): PvpState {
    return this.pvpState
  }

  /**
   * Check if player is frozen
   */
  isFrozen(): boolean {
    if (this.pvpState === 'frozen') {
      if (Date.now() >= this.freezeEndTime) {
        this.pvpState = 'idle'
        return false
      }
      return true
    }
    return false
  }

  /**
   * Set whether the player is moving (for animation state)
   */
  setMoving(moving: boolean): void {
    if (!this.isPremium || !this.idleFrames || !this.walkFrames) {
      return // No-op for default character
    }
    
    const newState = moving ? 'walk' : 'idle'
    if (newState !== this.animState) {
      this.animState = newState
      // Reset animation for clean transition
      this.frameIndex = 0
      this.frameElapsed = 0
    }
  }

  /**
   * Update animation frames (call from game loop)
   */
  updateAnimation(deltaTime: number): void {
    if (!this.isPremium || !this.idleFrames || !this.walkFrames || !this.sprite) {
      return // No-op for default character
    }
    
    const metadata = getPremiumAnimationMetadata()
    const frameDuration = this.animState === 'walk' 
      ? metadata.walkFrameDuration 
      : metadata.idleFrameDuration
    const maxFrames = this.animState === 'walk' 
      ? metadata.walkFrames 
      : metadata.idleFrames
    
    // Convert deltaTime to milliseconds (assuming deltaTime is normalized to 60fps)
    const deltaMs = deltaTime * (1000 / 60)
    this.frameElapsed += deltaMs
    
    // Advance frame when duration exceeded
    while (this.frameElapsed >= frameDuration) {
      this.frameElapsed -= frameDuration
      this.frameIndex = (this.frameIndex + 1) % maxFrames
    }
    
    // Update sprite texture to current frame
    const frames = this.animState === 'walk' ? this.walkFrames : this.idleFrames
    if (frames && frames[this.frameIndex]) {
      this.sprite.texture = frames[this.frameIndex]
    }
  }

  /**
   * Update fight animation (call from game loop)
   */
  updateFightAnimation(deltaTime: number): void {
    if (this.pvpState === 'fighting') {
      const elapsed = Date.now() - this.fightAnimationStartTime
      const frameDuration = 200 // 200ms per frame (2-4 frames = 400-800ms)
      this.fightAnimationFrame = Math.floor(elapsed / frameDuration)
      
      // Animate sprite scale for fight effect
      if (this.sprite) {
        const pulse = Math.sin((elapsed / 100) * Math.PI) * 0.1
        this.sprite.scale.set(1 + pulse, 1 + pulse)
      }

      // End fight animation after ~600ms (3 frames)
      if (elapsed >= 600) {
        this.fightAnimationFrame = 0
        if (this.sprite) {
          this.sprite.scale.set(1, 1)
        }
      }
    } else if (this.pvpState === 'winner') {
      // Winner pose: slight scale up and rotation
      if (this.sprite) {
        this.sprite.scale.set(1.2, 1.2)
        this.sprite.rotation = Math.sin(Date.now() / 200) * 0.1
      }
    } else if (this.pvpState === 'loser') {
      // Loser stun: scale down and slight rotation
      if (this.sprite) {
        this.sprite.scale.set(0.8, 0.8)
        this.sprite.rotation = Math.sin(Date.now() / 300) * 0.2
        // Tint red for stun effect
        this.sprite.tint = 0xff6666
      }
    } else {
      // Reset to normal
      if (this.sprite) {
        this.sprite.scale.set(1, 1)
        this.sprite.rotation = 0
        this.sprite.tint = 0xffffff
      }
    }
  }

  /**
   * Create a pixel-art style placeholder sprite
   */
  private createPixelArtPlaceholder(): Texture {
    // Color palette based on avatarId for variety
    const colors = [
      { body: 0x4a90e2, head: 0xffdbac, outline: 0x000000 }, // Blue body
      { body: 0xe24a4a, head: 0xffdbac, outline: 0x000000 }, // Red body
      { body: 0x4ae24a, head: 0xffdbac, outline: 0x000000 }, // Green body
      { body: 0xe2e24a, head: 0xffdbac, outline: 0x000000 }, // Yellow body
      { body: 0xe24ae2, head: 0xffdbac, outline: 0x000000 }, // Purple body
      { body: 0x4ae2e2, head: 0xffdbac, outline: 0x000000 }, // Cyan body
    ]
    
    const colorSet = colors[this.config.avatarId % colors.length]
    
    // Use canvas for pixel-perfect rendering
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    
    // Enable pixel-perfect rendering
    ctx.imageSmoothingEnabled = false
    
    // Draw outline (black)
    ctx.fillStyle = `#${colorSet.outline.toString(16).padStart(6, '0')}`
    
    // Head (circle, centered top)
    ctx.beginPath()
    ctx.arc(16, 10, 7, 0, Math.PI * 2)
    ctx.fill()
    
    // Body (rounded rectangle)
    ctx.fillRect(10, 16, 12, 14)
    
    // Fill head
    ctx.fillStyle = `#${colorSet.head.toString(16).padStart(6, '0')}`
    ctx.beginPath()
    ctx.arc(16, 10, 6, 0, Math.PI * 2)
    ctx.fill()
    
    // Fill body
    ctx.fillStyle = `#${colorSet.body.toString(16).padStart(6, '0')}`
    ctx.fillRect(11, 17, 10, 12)
    
    // Draw eyes (2x2 pixels each)
    ctx.fillStyle = `#${colorSet.outline.toString(16).padStart(6, '0')}`
    ctx.fillRect(13, 8, 2, 2) // Left eye
    ctx.fillRect(17, 8, 2, 2) // Right eye
    
    // Draw simple mouth (2 pixels wide)
    ctx.fillRect(15, 11, 2, 1)
    
    return Texture.from(canvas)
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
    // Clean up animation frames (they share baseTexture, so just clear references)
    this.idleFrames = null
    this.walkFrames = null
    this.container.destroy({ children: true })
  }
}
