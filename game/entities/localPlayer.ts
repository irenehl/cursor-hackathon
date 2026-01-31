import { Container } from 'pixi.js'
import { Player, PlayerState } from './player'
import { GameMap } from '../world/map'

export interface MovementKeys {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

export class LocalPlayer extends Player {
  private movementKeys: MovementKeys = {
    up: false,
    down: false,
    left: false,
    right: false,
  }
  private velocity: { x: number; y: number } = { x: 0, y: 0 }
  private speed: number = 150 // pixels per second
  private map: GameMap | null = null

  constructor(container: Container, config: { userId: string; displayName: string; avatarId: number }, initialState: PlayerState) {
    super(container, config, initialState)
  }

  setMap(map: GameMap): void {
    this.map = map
  }

  setMovementKey(key: 'up' | 'down' | 'left' | 'right', pressed: boolean): void {
    this.movementKeys[key] = pressed
    this.updateVelocity()
  }

  private updateVelocity(): void {
    this.velocity.x = 0
    this.velocity.y = 0

    if (this.movementKeys.left) {
      this.velocity.x = -1
      this.updateDirection(2) // left
    } else if (this.movementKeys.right) {
      this.velocity.x = 1
      this.updateDirection(0) // right
    }

    if (this.movementKeys.up) {
      this.velocity.y = -1
      if (this.velocity.x === 0) {
        this.updateDirection(3) // up
      }
    } else if (this.movementKeys.down) {
      this.velocity.y = 1
      if (this.velocity.x === 0) {
        this.updateDirection(1) // down
      }
    }

    // Normalize diagonal movement
    if (this.velocity.x !== 0 && this.velocity.y !== 0) {
      const length = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2)
      this.velocity.x /= length
      this.velocity.y /= length
    }
  }

  update(deltaTime: number): PlayerState {
    if (!this.map) {
      return this.getState()
    }

    const state = this.getState()
    const deltaSeconds = deltaTime / 60 // Assuming 60 FPS base
    const moveX = this.velocity.x * this.speed * deltaSeconds
    const moveY = this.velocity.y * this.speed * deltaSeconds

    let newX = state.x + moveX
    let newY = state.y + moveY

    // Clamp to map bounds
    const clamped = this.map.clampPosition(newX, newY, 32, 32)
    newX = clamped.x
    newY = clamped.y

    this.updatePosition(newX, newY)

    return this.getState()
  }

  getVelocity(): { x: number; y: number } {
    return { ...this.velocity }
  }
}
