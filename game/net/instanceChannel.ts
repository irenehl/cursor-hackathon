import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export interface PlayerState {
  userId: string
  displayName: string
  avatarId: number
  characterType: string
  x: number
  y: number
  dir: number // direction: 0-360 degrees or -1 to 1 for x/y
}

export interface PositionUpdate {
  userId: string
  x: number
  y: number
  dir: number
  timestamp: number
}

export interface RemotePlayerState {
  userId: string
  displayName: string
  avatarId: number
  characterType: string
  // For interpolation: keep last two states
  states: [PositionUpdate | null, PositionUpdate | null]
  currentX: number
  currentY: number
  currentDir: number
}

export type PresenceCallback = (players: Map<string, PlayerState>) => void
export type PositionUpdateCallback = (update: PositionUpdate) => void
export type ServerBroadcastCallback = (
  event: string,
  payload: any
) => void

export class InstanceChannel {
  private channel: RealtimeChannel | null = null
  private topic: string
  private userId: string
  private displayName: string
  private avatarId: number
  private characterType: string
  private isUnsubscribing = false // Flag to prevent errors during intentional cleanup

  // Presence tracking
  private presenceCallback: PresenceCallback | null = null
  private presenceState = new Map<string, PlayerState>()

  // Position broadcast
  private positionUpdateCallback: PositionUpdateCallback | null = null
  private broadcastInterval: NodeJS.Timeout | null = null
  private lastPosition: { x: number; y: number; dir: number } | null = null
  private broadcastRate = 12 // Hz (between 10-15Hz)

  // Server broadcasts (hand_granted, pvp_challenge, pvp_resolved, penalty)
  private serverBroadcastCallback: ServerBroadcastCallback | null = null

  // Remote players with interpolation
  private remotePlayers = new Map<string, RemotePlayerState>()

  constructor(
    eventId: string,
    sessionId: string,
    userId: string,
    displayName: string,
    avatarId: number,
    characterType: string
  ) {
    this.topic = `event:${eventId}:session:${sessionId}`
    this.userId = userId
    this.displayName = displayName
    this.avatarId = avatarId
    this.characterType = characterType
  }

  /**
   * Subscribe to the Realtime channel and set up presence + broadcasts
   */
  async subscribe(): Promise<void> {
    if (this.channel) {
      console.warn('Channel already subscribed')
      return
    }

    this.channel = supabase.channel(this.topic, {
      config: {
        presence: {
          key: this.userId,
        },
      },
    })

    // Set up presence tracking
    this.channel
      .on('presence', { event: 'sync' }, () => {
        this.handlePresenceSync()
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        this.handlePresenceJoin(key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        this.handlePresenceLeave(key, leftPresences)
      })

    // Set up broadcast listeners
    this.channel.on(
      'broadcast',
      { event: 'pos_update' },
      ({ payload }) => {
        if (payload.userId !== this.userId) {
          this.handlePositionUpdate(payload as PositionUpdate)
        }
      }
    )

    // Set up server broadcast listeners (from realtime.send)
    this.channel.on(
      'broadcast',
      { event: 'hand_granted' },
      ({ payload }) => {
        this.handleServerBroadcast('hand_granted', payload)
      }
    )
    this.channel.on(
      'broadcast',
      { event: 'pvp_challenge' },
      ({ payload }) => {
        this.handleServerBroadcast('pvp_challenge', payload)
      }
    )
    this.channel.on(
      'broadcast',
      { event: 'pvp_resolved' },
      ({ payload }) => {
        this.handleServerBroadcast('pvp_resolved', payload)
      }
    )
    this.channel.on(
      'broadcast',
      { event: 'penalty' },
      ({ payload }) => {
        this.handleServerBroadcast('penalty', payload)
      }
    )

    // Subscribe to the channel with proper Promise handling
    return new Promise<void>((resolve, reject) => {
      // Add timeout for subscription
      const timeout = setTimeout(() => {
        if (!this.isUnsubscribing) {
          reject(new Error('Channel subscription timed out after 10 seconds'))
        }
      }, 10000)

      this.channel!.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout)
          try {
            // Track initial presence
            await this.trackPresence(0, 0, 0)
            resolve()
          } catch (err) {
            reject(err)
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(timeout)
          // Only reject if we're not intentionally unsubscribing
          if (!this.isUnsubscribing) {
            reject(new Error(`Failed to subscribe to channel: ${status}`))
          }
        }
        // Ignore other intermediate statuses like 'SUBSCRIBING'
      })
    })
  }

  /**
   * Track local player presence with position
   */
  async trackPresence(x: number, y: number, dir: number): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not subscribed')
    }

    const state: PlayerState = {
      userId: this.userId,
      displayName: this.displayName,
      avatarId: this.avatarId,
      characterType: this.characterType,
      x,
      y,
      dir,
    }

    await this.channel.track(state)
    this.lastPosition = { x, y, dir }
  }

  /**
   * Start broadcasting position updates at 10-15Hz
   */
  startPositionBroadcast(): void {
    if (this.broadcastInterval) {
      return
    }

    const intervalMs = 1000 / this.broadcastRate

    this.broadcastInterval = setInterval(() => {
      if (!this.channel || !this.lastPosition) {
        return
      }

      const update: PositionUpdate = {
        userId: this.userId,
        x: this.lastPosition.x,
        y: this.lastPosition.y,
        dir: this.lastPosition.dir,
        timestamp: Date.now(),
      }

      this.channel.send({
        type: 'broadcast',
        event: 'pos_update',
        payload: update,
      })
    }, intervalMs)
  }

  /**
   * Stop broadcasting position updates
   */
  stopPositionBroadcast(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval)
      this.broadcastInterval = null
    }
  }

  /**
   * Update local position (called from game loop)
   */
  updatePosition(x: number, y: number, dir: number): void {
    this.lastPosition = { x, y, dir }
    // Presence is updated less frequently (Supabase handles throttling)
    // Position updates are sent via broadcast at 10-15Hz
  }

  /**
   * Handle presence sync event
   */
  private handlePresenceSync(): void {
    if (!this.channel) return

    const presence = this.channel.presenceState()
    this.presenceState.clear()

    for (const [userId, presences] of Object.entries(presence)) {
      if (Array.isArray(presences) && presences.length > 0) {
        const presenceData = presences[0] as any
        // Extract PlayerState, excluding presence_ref
        const { presence_ref, ...state } = presenceData
        if (state.userId && state.displayName !== undefined) {
          this.presenceState.set(userId, state as PlayerState)
        }
      }
    }

    if (this.presenceCallback) {
      this.presenceCallback(this.presenceState)
    }
  }

  /**
   * Handle presence join event
   */
  private handlePresenceJoin(
    key: string,
    newPresences: Array<{ [key: string]: any }>
  ): void {
    for (const presence of newPresences) {
      // Extract PlayerState, excluding presence_ref
      const { presence_ref, ...state } = presence
      if (state.userId && state.displayName !== undefined) {
        this.presenceState.set(key, state as PlayerState)

        // Initialize remote player state for interpolation
        if (key !== this.userId) {
          this.remotePlayers.set(key, {
            userId: key,
            displayName: state.displayName,
            avatarId: state.avatarId,
            characterType: state.characterType || 'default',
            states: [null, null],
            currentX: state.x,
            currentY: state.y,
            currentDir: state.dir,
          })
        }
      }
    }

    if (this.presenceCallback) {
      this.presenceCallback(this.presenceState)
    }
  }

  /**
   * Handle presence leave event
   */
  private handlePresenceLeave(
    key: string,
    leftPresences: Array<{ [key: string]: any }>
  ): void {
    this.presenceState.delete(key)
    this.remotePlayers.delete(key)

    if (this.presenceCallback) {
      this.presenceCallback(this.presenceState)
    }
  }

  /**
   * Handle position update broadcast from remote player
   */
  private handlePositionUpdate(update: PositionUpdate): void {
    const remotePlayer = this.remotePlayers.get(update.userId)
    if (!remotePlayer) {
      // Initialize if not present
      const presenceState = this.presenceState.get(update.userId)
      if (presenceState) {
        this.remotePlayers.set(update.userId, {
          userId: update.userId,
          displayName: presenceState.displayName,
          avatarId: presenceState.avatarId,
          characterType: presenceState.characterType || 'default',
          states: [null, null],
          currentX: update.x,
          currentY: update.y,
          currentDir: update.dir,
        })
      } else {
        return
      }
    }

    const player = this.remotePlayers.get(update.userId)!
    // Shift states: move current to old, add new
    player.states[0] = player.states[1]
    player.states[1] = update

    // If we have two states, we can interpolate
    // Otherwise, just set current position
    if (player.states[0] && player.states[1]) {
      // Initial position for interpolation (will be updated in game loop)
      player.currentX = player.states[0].x
      player.currentY = player.states[0].y
      player.currentDir = player.states[0].dir
    } else {
      player.currentX = update.x
      player.currentY = update.y
      player.currentDir = update.dir
    }

    if (this.positionUpdateCallback) {
      this.positionUpdateCallback(update)
    }
  }

  /**
   * Handle server broadcast events
   */
  private handleServerBroadcast(event: string, payload: any): void {
    if (this.serverBroadcastCallback) {
      this.serverBroadcastCallback(event, payload)
    }
  }

  /**
   * Get remote players for rendering (with interpolation support)
   */
  getRemotePlayers(): Map<string, RemotePlayerState> {
    return this.remotePlayers
  }

  /**
   * Get presence state (for getting display names, etc.)
   */
  getPresenceState(): Map<string, PlayerState> {
    return this.presenceState
  }

  /**
   * Update remote player interpolation (call from game loop)
   * @param deltaTime Time since last frame in seconds
   */
  updateRemoteInterpolation(deltaTime: number): void {
    const interpolationSpeed = 0.2 // Lerp factor (adjust for smoothness)

    for (const [userId, player] of this.remotePlayers.entries()) {
      const [oldState, newState] = player.states

      if (oldState && newState) {
        // Calculate interpolation progress based on time
        const timeDiff = newState.timestamp - oldState.timestamp
        const elapsed = Date.now() - oldState.timestamp
        const progress = Math.min(elapsed / Math.max(timeDiff, 1), 1)

        // Lerp position
        player.currentX = oldState.x + (newState.x - oldState.x) * progress
        player.currentY = oldState.y + (newState.y - oldState.y) * progress

        // Lerp direction (handle wrapping)
        let dirDiff = newState.dir - oldState.dir
        if (Math.abs(dirDiff) > 180) {
          dirDiff = dirDiff > 0 ? dirDiff - 360 : dirDiff + 360
        }
        player.currentDir = oldState.dir + dirDiff * progress

        // If we've caught up, shift states
        if (progress >= 1 && Date.now() - newState.timestamp > 100) {
          // Keep newState, clear oldState
          player.states[0] = null
        }
      } else if (newState) {
        // Only new state available, use it directly
        player.currentX = newState.x
        player.currentY = newState.y
        player.currentDir = newState.dir
      }
    }
  }

  /**
   * Set callbacks
   */
  onPresenceChange(callback: PresenceCallback): void {
    this.presenceCallback = callback
  }

  onPositionUpdate(callback: PositionUpdateCallback): void {
    this.positionUpdateCallback = callback
  }

  onServerBroadcast(callback: ServerBroadcastCallback): void {
    this.serverBroadcastCallback = callback
  }

  /**
   * Unsubscribe and cleanup
   */
  async unsubscribe(): Promise<void> {
    // Set flag first to prevent subscribe rejection during cleanup
    this.isUnsubscribing = true
    
    this.stopPositionBroadcast()

    if (this.channel) {
      try {
        await this.channel.unsubscribe()
      } catch (err) {
        // Ignore errors during unsubscribe (channel might already be closed)
        console.warn('Error during channel unsubscribe:', err)
      }
      this.channel = null
    }

    this.presenceState.clear()
    this.remotePlayers.clear()
    this.presenceCallback = null
    this.positionUpdateCallback = null
    this.serverBroadcastCallback = null
  }
}
