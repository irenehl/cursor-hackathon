import { Container } from 'pixi.js'
import { LocalPlayer } from './localPlayer'
import { RemotePlayer } from './remotePlayer'
import { PlayerState } from './player'
import { GameMap } from '../world/map'

export class PlayerManager {
  private container: Container
  private localPlayer: LocalPlayer | null = null
  private remotePlayers: Map<string, RemotePlayer> = new Map()
  private map: GameMap | null = null

  constructor(container: Container) {
    this.container = container
  }

  setMap(map: GameMap): void {
    this.map = map
    if (this.localPlayer) {
      this.localPlayer.setMap(map)
    }
  }

  async createLocalPlayer(
    config: { userId: string; displayName: string; avatarId: number },
    initialState: PlayerState,
    avatarPath: string
  ): Promise<LocalPlayer> {
    const playerContainer = new Container()
    this.container.addChild(playerContainer)

    const player = new LocalPlayer(playerContainer, config, initialState)
    await player.loadAvatar(avatarPath)
    
    if (this.map) {
      player.setMap(this.map)
    }

    this.localPlayer = player
    return player
  }

  async createRemotePlayer(
    config: { userId: string; displayName: string; avatarId: number },
    initialState: PlayerState,
    avatarPath: string
  ): Promise<RemotePlayer> {
    const playerContainer = new Container()
    this.container.addChild(playerContainer)

    const player = new RemotePlayer(playerContainer, config, initialState)
    await player.loadAvatar(avatarPath)

    this.remotePlayers.set(config.userId, player)
    return player
  }

  updateRemotePlayer(userId: string, state: PlayerState, deltaTime: number): void {
    const player = this.remotePlayers.get(userId)
    if (player) {
      player.updateState(state, deltaTime)
    }
  }

  removeRemotePlayer(userId: string): void {
    const player = this.remotePlayers.get(userId)
    if (player) {
      player.destroy()
      this.remotePlayers.delete(userId)
    }
  }

  getLocalPlayer(): LocalPlayer | null {
    return this.localPlayer
  }

  getRemotePlayer(userId: string): RemotePlayer | null {
    return this.remotePlayers.get(userId) || null
  }

  getAllRemotePlayers(): RemotePlayer[] {
    return Array.from(this.remotePlayers.values())
  }

  async loadHatOverlayForPlayer(userId: string, hatPath: string): Promise<void> {
    if (userId === this.localPlayer?.getUserId()) {
      await this.localPlayer.loadHatOverlay(hatPath)
    } else {
      const player = this.remotePlayers.get(userId)
      if (player) {
        await player.loadHatOverlay(hatPath)
      }
    }
  }

  setHatVisible(userId: string, visible: boolean): void {
    if (userId === this.localPlayer?.getUserId()) {
      this.localPlayer.setHatVisible(visible)
    } else {
      const player = this.remotePlayers.get(userId)
      if (player) {
        player.setHatVisible(visible)
      }
    }
  }

  setPvpState(userId: string, state: import('./player').PvpState, durationMs?: number): void {
    if (userId === this.localPlayer?.getUserId()) {
      this.localPlayer.setPvpState(state, durationMs)
    } else {
      const player = this.remotePlayers.get(userId)
      if (player) {
        player.setPvpState(state, durationMs)
      }
    }
  }

  update(deltaTime: number): PlayerState | null {
    // Update local player
    if (this.localPlayer) {
      const state = this.localPlayer.update(deltaTime)
      
      // Update all remote players
      for (const player of this.remotePlayers.values()) {
        player.update(deltaTime)
      }

      return state
    }
    return null
  }

  destroy(): void {
    if (this.localPlayer) {
      this.localPlayer.destroy()
      this.localPlayer = null
    }
    for (const player of this.remotePlayers.values()) {
      player.destroy()
    }
    this.remotePlayers.clear()
    this.container.destroy({ children: true })
  }
}
