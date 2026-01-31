/**
 * PvP Manager - handles proximity detection, challenges, and duel state
 */

export interface PvpChallenge {
  duelId: string
  fromUserId: string
  toUserId: string
}

export interface PvpDuelState {
  duelId: string
  challengerId: string
  opponentId: string
  status: 'pending' | 'resolved'
  winnerId?: string
  loserId?: string
}

export class PvpManager {
  private proximityRadius: number = 100 // pixels
  private activeChallenge: PvpChallenge | null = null // Challenge received (toUserId matches)
  private pendingChallenge: PvpChallenge | null = null // Challenge sent (fromUserId matches)
  private activeDuel: PvpDuelState | null = null
  private onChallengeReceivedCallback: ((challenge: PvpChallenge) => void) | null = null
  private onChallengeAcceptedCallback: ((duelId: string) => void) | null = null
  private onDuelResolvedCallback: ((duel: PvpDuelState) => void) | null = null

  /**
   * Check if two players are within proximity
   */
  isInProximity(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): boolean {
    const dx = x2 - x1
    const dy = y2 - y1
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance <= this.proximityRadius
  }

  /**
   * Find nearby players from a list of player positions
   */
  findNearbyPlayers<T extends { userId: string; x: number; y: number }>(
    localX: number,
    localY: number,
    players: Array<T>
  ): Array<T & { distance: number }> {
    return players
      .map((player) => {
        const dx = player.x - localX
        const dy = player.y - localY
        const distance = Math.sqrt(dx * dx + dy * dy)
        return { ...player, distance }
      })
      .filter((player) => player.distance <= this.proximityRadius)
      .sort((a, b) => a.distance - b.distance)
  }

  /**
   * Handle incoming challenge broadcast
   */
  handleChallengeReceived(challenge: PvpChallenge, localUserId: string): void {
    if (challenge.toUserId === localUserId) {
      this.activeChallenge = challenge
      if (this.onChallengeReceivedCallback) {
        this.onChallengeReceivedCallback(challenge)
      }
    }
  }

  /**
   * Handle challenge acceptance (local player accepted)
   */
  handleChallengeAccepted(duelId: string): void {
    this.activeChallenge = null
    this.pendingChallenge = null
    if (this.onChallengeAcceptedCallback) {
      this.onChallengeAcceptedCallback(duelId)
    }
  }

  /**
   * Handle duel resolution from server
   */
  handleDuelResolved(duel: PvpDuelState): void {
    this.activeDuel = duel
    this.activeChallenge = null
    this.pendingChallenge = null
    if (this.onDuelResolvedCallback) {
      this.onDuelResolvedCallback(duel)
    }
  }

  /**
   * Set pending challenge (when we send a challenge)
   */
  setPendingChallenge(challenge: PvpChallenge): void {
    this.pendingChallenge = challenge
  }

  /**
   * Clear challenge (if rejected or cancelled)
   */
  clearChallenge(): void {
    this.activeChallenge = null
    this.pendingChallenge = null
  }

  /**
   * Clear duel state
   */
  clearDuel(): void {
    this.activeDuel = null
  }

  /**
   * Get current challenge (if any)
   */
  getActiveChallenge(): PvpChallenge | null {
    return this.activeChallenge
  }

  /**
   * Get pending challenge (challenge we sent)
   */
  getPendingChallenge(): PvpChallenge | null {
    return this.pendingChallenge
  }

  /**
   * Get active duel
   */
  getActiveDuel(): PvpDuelState | null {
    return this.activeDuel
  }

  /**
   * Check if player has an active challenge
   */
  hasActiveChallenge(localUserId: string): boolean {
    return (
      (this.activeChallenge?.toUserId === localUserId) ||
      (this.pendingChallenge?.fromUserId === localUserId)
    )
  }

  /**
   * Set callbacks
   */
  onChallengeReceived(callback: (challenge: PvpChallenge) => void): void {
    this.onChallengeReceivedCallback = callback
  }

  onChallengeAccepted(callback: (duelId: string) => void): void {
    this.onChallengeAcceptedCallback = callback
  }

  onDuelResolved(callback: (duel: PvpDuelState) => void): void {
    this.onDuelResolvedCallback = callback
  }
}
