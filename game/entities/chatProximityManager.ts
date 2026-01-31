/**
 * Chat Proximity Manager - handles proximity detection for chat, chat room state, and debouncing
 */

export interface ChatMessage {
  id: string
  userId: string
  content: string
  createdAt: string
}

export interface ChatRoom {
  chatId: string
  members: string[]
  messages: ChatMessage[]
}

export class ChatProximityManager {
  private proximityRadius: number = 150 // pixels (slightly larger than PvP's 100px)
  private leaveRadius: number = 200 // pixels (hysteresis: leave at larger distance)
  private currentChat: ChatRoom | null = null
  private leaveDebounceTimer: NodeJS.Timeout | null = null
  private leaveDebounceDelay: number = 2000 // 2 seconds
  private onChatJoinedCallback: ((chatId: string) => void) | null = null
  private onChatLeftCallback: (() => void) | null = null
  private onMessageReceivedCallback: ((message: ChatMessage) => void) | null = null

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
   * Check if two players are within leave radius (hysteresis)
   */
  isWithinLeaveRadius(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): boolean {
    const dx = x2 - x1
    const dy = y2 - y1
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance <= this.leaveRadius
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
   * Check if any nearby players are within leave radius (for leaving chat)
   */
  findPlayersWithinLeaveRadius<T extends { userId: string; x: number; y: number }>(
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
      .filter((player) => player.distance <= this.leaveRadius)
      .sort((a, b) => a.distance - b.distance)
  }

  /**
   * Set current chat room
   */
  setCurrentChat(chat: ChatRoom | null): void {
    this.currentChat = chat
    if (chat) {
      this.clearLeaveDebounce()
      if (this.onChatJoinedCallback) {
        this.onChatJoinedCallback(chat.chatId)
      }
    } else {
      if (this.onChatLeftCallback) {
        this.onChatLeftCallback()
      }
    }
  }

  /**
   * Get current chat room
   */
  getCurrentChat(): ChatRoom | null {
    return this.currentChat
  }

  /**
   * Add message to current chat
   */
  addMessage(message: ChatMessage): void {
    if (this.currentChat) {
      this.currentChat.messages.push(message)
      // Keep only last 100 messages in memory
      if (this.currentChat.messages.length > 100) {
        this.currentChat.messages.shift()
      }
      if (this.onMessageReceivedCallback) {
        this.onMessageReceivedCallback(message)
      }
    }
  }

  /**
   * Update chat members list
   */
  updateMembers(members: string[]): void {
    if (this.currentChat) {
      this.currentChat.members = members
    }
  }

  /**
   * Start debounced leave timer
   */
  startLeaveDebounce(callback: () => void): void {
    this.clearLeaveDebounce()
    this.leaveDebounceTimer = setTimeout(() => {
      callback()
      this.leaveDebounceTimer = null
    }, this.leaveDebounceDelay)
  }

  /**
   * Clear leave debounce timer
   */
  clearLeaveDebounce(): void {
    if (this.leaveDebounceTimer) {
      clearTimeout(this.leaveDebounceTimer)
      this.leaveDebounceTimer = null
    }
  }

  /**
   * Check if player should join a chat (2+ players nearby, not already in chat)
   */
  shouldJoinChat(
    localX: number,
    localY: number,
    nearbyPlayers: Array<{ userId: string; x: number; y: number }>
  ): boolean {
    // Need at least 2 players (including self) to start chat
    if (nearbyPlayers.length < 1) {
      return false
    }

    // Don't join if already in a chat
    if (this.currentChat !== null) {
      return false
    }

    return true
  }

  /**
   * Check if player should leave chat (no members within leave radius)
   */
  shouldLeaveChat(
    localX: number,
    localY: number,
    chatMembers: Array<{ userId: string; x: number; y: number }>
  ): boolean {
    if (this.currentChat === null) {
      return false
    }

    // Check if any chat members are within leave radius
    const membersInRange = chatMembers.filter((member) =>
      this.isWithinLeaveRadius(localX, localY, member.x, member.y)
    )

    // Leave if no members in range
    return membersInRange.length === 0
  }

  /**
   * Set callbacks
   */
  onChatJoined(callback: (chatId: string) => void): void {
    this.onChatJoinedCallback = callback
  }

  onChatLeft(callback: () => void): void {
    this.onChatLeftCallback = callback
  }

  onMessageReceived(callback: (message: ChatMessage) => void): void {
    this.onMessageReceivedCallback = callback
  }

  /**
   * Get proximity radius
   */
  getProximityRadius(): number {
    return this.proximityRadius
  }

  /**
   * Set proximity radius
   */
  setProximityRadius(radius: number): void {
    this.proximityRadius = radius
  }
}
