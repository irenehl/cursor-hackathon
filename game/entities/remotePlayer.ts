import { Container } from 'pixi.js'
import { Player, PlayerState } from './player'

export class RemotePlayer extends Player {
  private previousState: PlayerState | null = null
  private currentState: PlayerState
  private interpolationTime: number = 0
  private interpolationDuration: number = 0.1 // 100ms interpolation

  constructor(container: Container, config: { userId: string; displayName: string; avatarId: number }, initialState: PlayerState) {
    super(container, config, initialState)
    this.currentState = initialState
  }

  updateState(newState: PlayerState, deltaTime: number): void {
    this.previousState = { ...this.currentState }
    this.currentState = newState
    this.interpolationTime = 0

    // Update direction immediately
    this.updateDirection(newState.dir)
  }

  update(deltaTime: number): void {
    // Update fight animation
    this.updateFightAnimation(deltaTime)

    // Don't interpolate if frozen
    if (this.isFrozen()) {
      return
    }

    if (!this.previousState) {
      // No interpolation data yet, use current state directly
      this.updatePosition(this.currentState.x, this.currentState.y)
      return
    }

    // Interpolate between previous and current state
    this.interpolationTime += deltaTime / 60 // Convert to seconds
    const t = Math.min(1, this.interpolationTime / this.interpolationDuration)

    const x = this.previousState.x + (this.currentState.x - this.previousState.x) * t
    const y = this.previousState.y + (this.currentState.y - this.previousState.y) * t

    this.updatePosition(x, y)

    // If interpolation is complete, clear previous state
    if (t >= 1) {
      this.previousState = null
    }
  }
}
