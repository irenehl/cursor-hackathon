'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PixiAppManager } from '@/game/engine/pixiApp'
import { GameMap } from '@/game/world/map'
import { PlayerManager } from '@/game/entities/playerManager'
import { LocalPlayer } from '@/game/entities/localPlayer'
import { Container } from 'pixi.js'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { InstanceChannel } from '@/game/net/instanceChannel'
import { PvpManager } from '@/game/entities/pvpManager'
import { createPvpDuel, acceptPvpAndResolve, raiseHand, leaveSession, getSessionHost } from '@/lib/supabase/rpc'
import { PvpUi } from '@/components/game/pvp-ui'
import { HostOverlay } from '@/components/game/host-overlay'
import { EventInfoCard } from '@/components/game/event-info-card'
import { EventStatusBadge } from '@/components/game/event-status-badge'
import { PlayersOnlineList } from '@/components/game/players-online-list'
import { getAvatarPath, CharacterType } from '@/game/config/characters'

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string
  const sessionId = params.sessionId as string
  const containerRef = useRef<HTMLDivElement>(null)
  const pixiAppRef = useRef<PixiAppManager | null>(null)
  const gameMapRef = useRef<GameMap | null>(null)
  const playerManagerRef = useRef<PlayerManager | null>(null)
  const localPlayerRef = useRef<LocalPlayer | null>(null)
  const instanceChannelRef = useRef<InstanceChannel | null>(null)
  const pvpManagerRef = useRef<PvpManager | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nearbyPlayer, setNearbyPlayer] = useState<{ userId: string; displayName: string } | null>(null)
  const [challengeReceived, setChallengeReceived] = useState<{ duelId: string; fromUserId: string; fromDisplayName: string } | null>(null)
  const [handState, setHandState] = useState<'idle' | 'queued' | 'granted'>('idle')
  const [playersOnline, setPlayersOnline] = useState<Array<{ userId: string; displayName: string }>>([])
  const [isHost, setIsHost] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [presenceState, setPresenceState] = useState<Map<string, any>>(new Map())
  const [showFightOverlay, setShowFightOverlay] = useState(false)
  const [pvpWinner, setPvpWinner] = useState<{ winnerName: string } | null>(null)
  const [eventInfo, setEventInfo] = useState<{
    title: string
    capacity: number
    starts_at: string
    duration_minutes: number
  } | null>(null)
  const [sessionHostUserId, setSessionHostUserId] = useState<string | null>(null)
  const positionBroadcastIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const presenceUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const proximityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const playersUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const sessionHostIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // PvP handlers (using useCallback to create stable references)
  const handleChallenge = useCallback(async (opponentId: string) => {
    if (!pvpManagerRef.current || !localPlayerRef.current) return

    try {
      const result = await createPvpDuel(sessionId, opponentId)
      const challenge = {
        duelId: result.duel_id,
        fromUserId: localPlayerRef.current.getUserId(),
        toUserId: opponentId,
      }
      pvpManagerRef.current.setPendingChallenge(challenge)
      setNearbyPlayer(null) // Hide challenge button
    } catch (error: any) {
      // #region agent log
      const msg = error?.message || ''
      if (typeof fetch !== 'undefined') fetch('http://127.0.0.1:7242/ingest/0c79b8cd-d103-4925-a9ae-e8a96ba4f4c7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hypothesisId: 'broadcast_realtime_rpc', location: 'session/page:handleChallenge:catch', message: 'createPvpDuel failed', data: { errMessage: msg, hasBroadcastRealtime: msg.includes('broadcast_realtime') }, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {})
      // #endregion
      toast.error('Error al desafiar: ' + (error.message || 'Error desconocido'))
      console.error('Challenge error:', error)
    }
  }, [sessionId])

  const handleAcceptChallenge = useCallback(async (duelId: string) => {
    if (!pvpManagerRef.current || !localPlayerRef.current) return

    try {
      // Accept and resolve duel (server will broadcast pvp_resolved)
      await acceptPvpAndResolve(duelId)
      
      // Clear challenge UI
      pvpManagerRef.current.handleChallengeAccepted(duelId)
      setChallengeReceived(null)

      // The pvp_resolved handler will handle freeze + animation + winner/loser states
    } catch (error: any) {
      toast.error('Error al aceptar: ' + (error.message || 'Error desconocido'))
      console.error('Accept challenge error:', error)
      setChallengeReceived(null)
      pvpManagerRef.current.clearChallenge()
    }
  }, [])

  const handleRejectChallenge = useCallback(() => {
    if (!pvpManagerRef.current) return
    setChallengeReceived(null)
    pvpManagerRef.current.clearChallenge()
  }, [])

  const handleRaiseHand = useCallback(async () => {
    if (handState !== 'idle') return

    try {
      const result = await raiseHand(eventId)
      if (result.random_ignored) {
        toast.error('No te vieron. Intenta de nuevo.')
      } else {
        setHandState('queued')
        toast.success('Mano levantada - En cola')
      }
    } catch (error: any) {
      toast.error('Error al levantar la mano: ' + (error.message || 'Error desconocido'))
      console.error('Raise hand error:', error)
    }
  }, [eventId, handState])

  useEffect(() => {
    let mounted = true

    async function initializeGame() {
      if (!containerRef.current) {
        setError('Container element not found')
        return
      }

      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0c79b8cd-d103-4925-a9ae-e8a96ba4f4c7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hypothesisId: 'H5', location: 'session/page:init:start', message: 'session init start', data: {}, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {})
        // #endregion
        // Get current user and profile
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push('/events')
          return
        }

        setCurrentUserId(user.id)

        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_id, character_type')
          .eq('user_id', user.id)
          .single()

        if (!profile) {
          setError('Profile not found. Please complete your profile first.')
          return
        }

        // Fetch event and verify access for private events
        const { data: eventData } = await supabase
          .from('events')
          .select('visibility, title, capacity, starts_at, duration_minutes')
          .eq('id', eventId)
          .single()

        if (!eventData) {
          setError('Event not found')
          return
        }

        setEventInfo({
          title: eventData.title,
          capacity: eventData.capacity,
          starts_at: eventData.starts_at,
          duration_minutes: eventData.duration_minutes,
        })

        // Session host = event host if in session, else first player by join time (will be set by poll)
        const sessionHost = await getSessionHost(eventId, sessionId)
        setSessionHostUserId(sessionHost.host_user_id)
        setIsHost(sessionHost.host_user_id === user.id)

        // For private events, verify user has access (host or ticket holder)
        if (eventData.visibility === 'private' && !isHost) {
          // Check if user has an assigned ticket for this event
          const { data: ticketData } = await supabase
            .from('tickets')
            .select('code')
            .eq('event_id', eventId)
            .eq('assigned_user_id', user.id)
            .limit(1)
            .single()

          if (!ticketData) {
            // User doesn't have access, redirect to ticket page
            router.push(`/events/${eventId}/ticket`)
            return
          }
        }

        // Initialize PixiJS with the container element
        const pixiApp = new PixiAppManager()
        const app = await pixiApp.initialize(
          {
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x1a1a1a,
            antialias: true,
          },
          containerRef.current
        )

        if (!mounted) {
          pixiApp.destroy()
          return
        }

        pixiAppRef.current = pixiApp

        // Create game containers
        const worldContainer = new Container()
        const playersContainer = new Container()
        app.stage.addChild(worldContainer)
        app.stage.addChild(playersContainer)

        // Create map (simple auditorium layout)
        const mapBounds = {
          x: 0,
          y: 0,
          width: 1200,
          height: 800,
        }
        const punishmentCorner = {
          x: 50,
          y: 50,
          width: 100,
          height: 100,
        }

        const gameMap = new GameMap(worldContainer, mapBounds, punishmentCorner)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0c79b8cd-d103-4925-a9ae-e8a96ba4f4c7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hypothesisId: 'H3', location: 'session/page:before loadMap', message: 'before gameMap.loadMap', data: {}, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {})
        // #endregion
        
        // Generate tilemap data and load with tilemap system
        const tilemapData = gameMap.generateDefaultTilemap()
        await gameMap.loadMap(undefined, tilemapData)
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0c79b8cd-d103-4925-a9ae-e8a96ba4f4c7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hypothesisId: 'H3', location: 'session/page:after loadMap', message: 'after gameMap.loadMap', data: {}, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {})
        // #endregion
        
        // Add some decorative objects to make the map more interesting
        // Place a few houses and tents randomly
        const objectPositions = [
          { id: 'house1', x: 200, y: 150 },
          { id: 'house2', x: 400, y: 200 },
          { id: 'tent1', x: 600, y: 300 },
          { id: 'tent2', x: 800, y: 250 },
          { id: 'stone1', x: 300, y: 500 },
          { id: 'stone2', x: 700, y: 600 },
          { id: 'grass1', x: 150, y: 400 },
          { id: 'grass2', x: 500, y: 450 },
          { id: 'grass3', x: 900, y: 500 },
        ]
        
        for (const obj of objectPositions) {
          await gameMap.placeObject({
            objectId: obj.id,
            x: obj.x,
            y: obj.y,
          })
        }
        
        gameMapRef.current = gameMap

        // Create player manager
        const playerManager = new PlayerManager(playersContainer)
        playerManager.setMap(gameMap)
        playerManagerRef.current = playerManager

        // Create local player
        const avatarId = profile.avatar_id || 1
        const characterType = (profile.character_type || 'default') as CharacterType
        const avatarPath = getAvatarPath(characterType, avatarId)
        
        // Start at center of map
        const initialX = mapBounds.width / 2
        const initialY = mapBounds.height / 2

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0c79b8cd-d103-4925-a9ae-e8a96ba4f4c7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hypothesisId: 'H3', location: 'session/page:before createLocalPlayer', message: 'before createLocalPlayer', data: { avatarPath, characterType }, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {})
        // #endregion
        const localPlayer = await playerManager.createLocalPlayer(
          {
            userId: user.id,
            displayName: profile.display_name || 'Player',
            avatarId,
            characterType,
          },
          {
            userId: user.id,
            displayName: profile.display_name || 'Player',
            avatarId,
            characterType,
            x: initialX,
            y: initialY,
            dir: 0,
          },
          avatarPath
        )
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0c79b8cd-d103-4925-a9ae-e8a96ba4f4c7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hypothesisId: 'H3', location: 'session/page:after createLocalPlayer', message: 'after createLocalPlayer', data: {}, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {})
        // #endregion

        // Load hat overlay for local player
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0c79b8cd-d103-4925-a9ae-e8a96ba4f4c7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hypothesisId: 'H3', location: 'session/page:before loadHatOverlay', message: 'before loadHatOverlay', data: { path: '/assets/overlays/punishment-hat.png' }, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {})
        // #endregion
        await localPlayer.loadHatOverlay('/assets/overlays/punishment-hat.png')
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0c79b8cd-d103-4925-a9ae-e8a96ba4f4c7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hypothesisId: 'H3', location: 'session/page:after loadHatOverlay', message: 'after loadHatOverlay', data: {}, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {})
        // #endregion
        localPlayerRef.current = localPlayer

        // Set up Realtime channel for presence and broadcasts
        const instanceChannel = new InstanceChannel(
          eventId,
          sessionId,
          user.id,
          profile.display_name || 'Player',
          avatarId,
          characterType
        )

        // Create PvP manager
        const pvpManager = new PvpManager()
        pvpManagerRef.current = pvpManager

        // Handle PvP challenge received
        pvpManager.onChallengeReceived((challenge) => {
          // Get challenger display name from presence
          const presenceState = instanceChannel.getPresenceState()
          const challengerPresence = presenceState.get(challenge.fromUserId)
          const challengerDisplayName = challengerPresence?.displayName || 'Unknown'
          
          setChallengeReceived({
            duelId: challenge.duelId,
            fromUserId: challenge.fromUserId,
            fromDisplayName: challengerDisplayName,
          })
        })

        // Handle challenge accepted (local player accepted)
        pvpManager.onChallengeAccepted((duelId) => {
          // Freeze both players and start fight animation
          if (localPlayerRef.current) {
            localPlayerRef.current.setPvpState('fighting')
          }
          // Remote player will be frozen when they receive pvp_resolved
        })

        // Handle duel resolved
        pvpManager.onDuelResolved((duel) => {
          const isWinner = duel.winnerId === user.id
          const isLoser = duel.loserId === user.id

          if (isWinner || isLoser) {
            // Freeze for 1-2 seconds, then show fight animation
            if (localPlayerRef.current) {
              localPlayerRef.current.setPvpState('frozen', 1500) // Freeze for 1.5 seconds
            }

            // After freeze, show fight animation, then winner/loser state
            setTimeout(() => {
              if (!mounted || !localPlayerRef.current) return

              // Start fight animation
              localPlayerRef.current.setPvpState('fighting')

              // After fight animation (~600ms), show winner/loser state
              setTimeout(() => {
                if (!mounted || !localPlayerRef.current) return

                if (isWinner) {
                  localPlayerRef.current.setPvpState('winner')
                  toast.success('¡Ganaste el duelo!')
                  // Reset after 3 seconds
                  setTimeout(() => {
                    if (localPlayerRef.current) {
                      localPlayerRef.current.setPvpState('idle')
                    }
                    pvpManager.clearDuel()
                  }, 3000)
                } else if (isLoser) {
                  localPlayerRef.current.setPvpState('loser')
                  toast.error('Perdiste el duelo')
                  // Reset after 3 seconds
                  setTimeout(() => {
                    if (localPlayerRef.current) {
                      localPlayerRef.current.setPvpState('idle')
                    }
                    pvpManager.clearDuel()
                  }, 3000)
                }
              }, 600) // Fight animation duration
            }, 1500) // After freeze
          }
        })

        // Handle server broadcasts (penalty, hand_granted, pvp events)
        instanceChannel.onServerBroadcast((event, payload) => {
          if (event === 'penalty') {
            handlePenalty(payload, user.id)
          } else if (event === 'hand_granted') {
            // Handle hand granted broadcast
            if (payload.userId === user.id) {
              setHandState('granted')
              toast.success('Turno otorgado')
              // Reset after 5 seconds
              setTimeout(() => {
                if (mounted) {
                  setHandState('idle')
                }
              }, 5000)
            }
          } else if (event === 'pvp_challenge') {
            // Handle incoming challenge
            const challenge = {
              duelId: payload.duelId,
              fromUserId: payload.fromUserId,
              toUserId: payload.toUserId,
            }
            pvpManager.handleChallengeReceived(challenge, user.id)
          } else if (event === 'pvp_resolved') {
            // Handle duel resolution
            // Get challenger/opponent from active duel or challenge
            const activeDuel = pvpManager.getActiveDuel()
            const activeChallenge = pvpManager.getActiveChallenge()
            const pendingChallenge = pvpManager.getPendingChallenge()
            
            // Determine challenger/opponent IDs
            let challengerId = user.id
            let opponentId = user.id
            if (activeChallenge) {
              challengerId = activeChallenge.fromUserId
              opponentId = activeChallenge.toUserId
            } else if (pendingChallenge) {
              challengerId = pendingChallenge.fromUserId
              opponentId = pendingChallenge.toUserId
            }
            
            const duel = {
              duelId: payload.duelId,
              challengerId,
              opponentId,
              status: 'resolved' as const,
              winnerId: payload.winnerId,
              loserId: payload.loserId,
            }
            pvpManager.handleDuelResolved(duel)
            // Show fight brawl overlay + KO winner
            const winnerId = payload.winnerId
            const winnerPresence = instanceChannel.getPresenceState().get(winnerId)
            const winnerName = winnerPresence?.displayName || 'Ganador'
            if (mounted) {
              setShowFightOverlay(true)
              setPvpWinner({ winnerName })
            }
            setTimeout(() => {
              if (mounted) setShowFightOverlay(false)
            }, 3200)
            setTimeout(() => {
              if (mounted) setPvpWinner(null)
            }, 4000)
            
            // Also update remote player states
            if (playerManagerRef.current) {
              if (payload.winnerId && payload.winnerId !== user.id) {
                playerManagerRef.current.setPvpState(payload.winnerId, 'winner')
                setTimeout(() => {
                  if (playerManagerRef.current) {
                    playerManagerRef.current.setPvpState(payload.winnerId, 'idle')
                  }
                }, 3000)
              }
              if (payload.loserId && payload.loserId !== user.id) {
                playerManagerRef.current.setPvpState(payload.loserId, 'loser')
                setTimeout(() => {
                  if (playerManagerRef.current) {
                    playerManagerRef.current.setPvpState(payload.loserId, 'idle')
                  }
                }, 3000)
              }
            }
          }
        })

        // Subscribe to channel
        await instanceChannel.subscribe()
        instanceChannelRef.current = instanceChannel

        // Start position broadcasting
        instanceChannel.startPositionBroadcast()

        // Update position in channel when player moves
        const positionUpdateInterval = setInterval(() => {
          if (localPlayerRef.current && mounted) {
            const state = localPlayerRef.current.getState()
            instanceChannel.updatePosition(state.x, state.y, state.dir)
          }
        }, 100) // ~10 Hz

        // Also update presence occasionally (less frequently than position updates)
        presenceUpdateIntervalRef.current = setInterval(async () => {
          if (localPlayerRef.current && mounted && instanceChannelRef.current) {
            const state = localPlayerRef.current.getState()
            await instanceChannelRef.current.trackPresence(state.x, state.y, state.dir)
          }
        }, 1000) // ~1 Hz for presence updates

        positionBroadcastIntervalRef.current = positionUpdateInterval

        // Set up proximity checking
        proximityCheckIntervalRef.current = setInterval(async () => {
          if (!mounted || !localPlayerRef.current || !instanceChannelRef.current || !pvpManagerRef.current) {
            return
          }

          const localState = localPlayerRef.current.getState()
          const remotePlayers = instanceChannelRef.current.getRemotePlayers()
          
          // Convert remote players to array for proximity check
          const playerPositions = Array.from(remotePlayers.values()).map((rp) => ({
            userId: rp.userId,
            displayName: rp.displayName,
            x: rp.currentX,
            y: rp.currentY,
          }))

          // Find nearby players
          const nearby = pvpManagerRef.current.findNearbyPlayers(
            localState.x,
            localState.y,
            playerPositions
          )

          // Set nearest player (if any)
          if (nearby.length > 0 && !challengeReceived) {
            const nearest = nearby[0]
            setNearbyPlayer({
              userId: nearest.userId,
              displayName: nearest.displayName,
            })
          } else {
            setNearbyPlayer(null)
          }

          // Update remote players in player manager
          for (const [userId, remoteState] of remotePlayers.entries()) {
            const existingPlayer = playerManagerRef.current?.getRemotePlayer(userId)
            if (!existingPlayer) {
              // Create remote player if doesn't exist
              const presenceState = instanceChannelRef.current.getRemotePlayers()
              const presence = presenceState.get(userId)
              if (presence) {
                const remoteCharacterType = (presence.characterType || 'default') as CharacterType
                const avatarPath = getAvatarPath(remoteCharacterType, presence.avatarId)
                await playerManagerRef.current?.createRemotePlayer(
                  {
                    userId: presence.userId,
                    displayName: presence.displayName,
                    avatarId: presence.avatarId,
                    characterType: remoteCharacterType,
                  },
                  {
                    userId: presence.userId,
                    displayName: presence.displayName,
                    avatarId: presence.avatarId,
                    characterType: remoteCharacterType,
                    x: presence.currentX,
                    y: presence.currentY,
                    dir: presence.currentDir,
                  },
                  avatarPath
                )
              }
            } else {
              // Update existing remote player
              playerManagerRef.current?.updateRemotePlayer(
                userId,
                {
                  userId: remoteState.userId,
                  displayName: remoteState.displayName,
                  avatarId: remoteState.avatarId,
                  characterType: (remoteState.characterType || 'default') as CharacterType,
                  x: remoteState.currentX,
                  y: remoteState.currentY,
                  dir: remoteState.currentDir,
                },
                0 // deltaTime not needed for position updates
              )
            }
          }
        }, 100) // Check proximity every 100ms

        // Update players online list from presence
        playersUpdateIntervalRef.current = setInterval(() => {
          if (!mounted || !instanceChannelRef.current) return

          const currentPresenceState = instanceChannelRef.current.getPresenceState()
          setPresenceState(new Map(currentPresenceState))
          const players = Array.from(currentPresenceState.values()).map((p) => ({
            userId: p.userId,
            displayName: p.displayName,
          }))
          setPlayersOnline(players)
        }, 1000) // Update every second

        // Poll session host (host = event host if in session, else first player by join time)
        sessionHostIntervalRef.current = setInterval(async () => {
          if (!mounted) return
          try {
            const sessionHost = await getSessionHost(eventId, sessionId)
            if (sessionHost.host_user_id) {
              setSessionHostUserId(sessionHost.host_user_id)
              setIsHost(sessionHost.host_user_id === user.id)
            }
          } catch {
            // ignore
          }
        }, 3000) // Every 3 seconds

        // Set up game loop
        const ticker = pixiApp.getTicker()
        ticker.add(() => {
          if (!mounted) return

          // Update remote player interpolation
          if (instanceChannelRef.current) {
            instanceChannelRef.current.updateRemoteInterpolation(ticker.deltaTime)
          }

          // Update local player - deltaTime is normalized (1 = 60fps)
          const deltaTime = ticker.deltaTime
          const state = playerManager.update(deltaTime)
        })

        // Set up keyboard controls
        const keys: { [key: string]: boolean } = {}
        const handleKeyDown = (e: KeyboardEvent) => {
          keys[e.key.toLowerCase()] = true
          updateMovement()
        }
        const handleKeyUp = (e: KeyboardEvent) => {
          keys[e.key.toLowerCase()] = false
          updateMovement()
        }

        const updateMovement = () => {
          if (!localPlayerRef.current) return

          localPlayerRef.current.setMovementKey('up', keys['w'] || keys['arrowup'])
          localPlayerRef.current.setMovementKey('down', keys['s'] || keys['arrowdown'])
          localPlayerRef.current.setMovementKey('left', keys['a'] || keys['arrowleft'])
          localPlayerRef.current.setMovementKey('right', keys['d'] || keys['arrowright'])
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        // Handle window resize
        const handleResize = () => {
          if (pixiAppRef.current) {
            pixiAppRef.current.resize(window.innerWidth, window.innerHeight)
          }
        }
        window.addEventListener('resize', handleResize)

        setIsLoading(false)

        // Handle penalty events (kick/ban)
        function handlePenalty(payload: any, currentUserId: string) {
          if (!mounted || !localPlayerRef.current || !gameMapRef.current) return

          const { userId, type, until } = payload

          // Only handle penalties for the current user
          if (userId !== currentUserId) {
            return
          }

          const localPlayer = localPlayerRef.current
          const gameMap = gameMapRef.current

          if (type === 'kick') {
            // Teleport to punishment corner
            localPlayer.teleportToCorner()

            // Show hat overlay
            localPlayer.setHatVisible(true)

            // Calculate freeze duration (until timestamp - now)
            const untilDate = new Date(until)
            const now = new Date()
            const durationMs = Math.max(0, untilDate.getTime() - now.getTime())

            // Freeze player
            localPlayer.freeze(durationMs)

            toast.error('Has sido expulsado temporalmente', {
              description: `Puedes volver en ${Math.ceil(durationMs / 1000)} segundos`,
            })

            // Remove hat and unfreeze when duration expires
            setTimeout(() => {
              if (localPlayerRef.current) {
                localPlayerRef.current.setHatVisible(false)
              }
            }, durationMs)
          } else if (type === 'ban') {
            // Teleport to punishment corner
            localPlayer.teleportToCorner()

            // Show hat overlay
            localPlayer.setHatVisible(true)

            // Play short animation (visual feedback)
            // For now, we'll just show a toast and then disconnect
            toast.error('Has sido baneado de este evento', {
              description: 'Serás desconectado...',
            })

            // Short delay for animation, then disconnect
            setTimeout(() => {
              if (!mounted) return

              // Unsubscribe from channel
              if (instanceChannelRef.current) {
                instanceChannelRef.current.unsubscribe()
              }

              // Route away from session
              router.push('/events')
            }, 2000) // 2 second animation delay
          }
        }


        // Cleanup function
        return () => {
          mounted = false
          leaveSession(sessionId).catch(() => {})
          window.removeEventListener('keydown', handleKeyDown)
          window.removeEventListener('keyup', handleKeyUp)
          window.removeEventListener('resize', handleResize)
          if (positionBroadcastIntervalRef.current) {
            clearInterval(positionBroadcastIntervalRef.current)
          }
          if (presenceUpdateIntervalRef.current) {
            clearInterval(presenceUpdateIntervalRef.current)
          }
          if (proximityCheckIntervalRef.current) {
            clearInterval(proximityCheckIntervalRef.current)
          }
          if (playersUpdateIntervalRef.current) {
            clearInterval(playersUpdateIntervalRef.current)
          }
          if (sessionHostIntervalRef.current) {
            clearInterval(sessionHostIntervalRef.current)
          }
          if (instanceChannelRef.current) {
            instanceChannelRef.current.unsubscribe()
          }
          if (pixiAppRef.current) {
            pixiAppRef.current.destroy()
          }
        }
      } catch (err: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0c79b8cd-d103-4925-a9ae-e8a96ba4f4c7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hypothesisId: 'H3', location: 'session/page:catch', message: 'session init catch', data: { errMessage: err?.message, errName: err?.name }, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {})
        // #endregion
        console.error('Error initializing game:', err)
        setError(err.message || 'Failed to initialize game')
        setIsLoading(false)
      }
    }

    initializeGame()

    return () => {
      mounted = false
    }
  }, [eventId, sessionId, router])

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
        <div className="max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4 text-accent">Error</h1>
          <p className="text-text-muted mb-4">{error}</p>
          <button
            onClick={() => router.push('/events')}
            className="px-4 py-2 bg-accent text-text-inverse rounded-lg hover:bg-accent-hover transition-colors"
          >
            Back to Events
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="relative w-full h-screen overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-midnight/90 z-10 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-text-inverse text-2xl mb-4 animate-pulse">🎮</div>
            <div className="text-text-inverse text-xl font-mono">Loading your 2D destiny...</div>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      {/* Controls Hint - Retro Game Tutorial Style */}
      <div 
        className="absolute top-4 left-4 text-text-inverse bg-midnight/90 border-2 border-teal p-3 rounded-lg text-sm space-y-2 shadow-xl"
        style={{
          fontFamily: 'monospace',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="text-cream font-semibold">CONTROLS:</div>
        <div className="text-xs text-cream/90">WASD / Arrow Keys</div>
        <button
          onClick={() => router.push('/events')}
          className="text-xs text-cream hover:text-accent-muted underline hover:no-underline transition-colors mt-2 block"
        >
          ← Leave Session
        </button>
      </div>

      {/* Event Status + Players - Top Right */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {eventInfo && (
          <EventStatusBadge
            eventTitle={eventInfo.title}
            countdown={null}
            usersCount={playersOnline.length}
            capacity={eventInfo.capacity}
            inline
          />
        )}
        <PlayersOnlineList
          players={playersOnline}
          statusMap={new Map()}
          hostUserId={sessionHostUserId ?? undefined}
          inline
        />
      </div>

      {/* Event Info + Raise Hand - Bottom Left */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-3">
        {eventInfo && (
          <EventInfoCard
            eventTitle={eventInfo.title}
            status="EN VIVO"
            usersCount={playersOnline.length}
            capacity={eventInfo.capacity}
            inline
          />
        )}
        <div>
        <button
          onClick={handleRaiseHand}
          disabled={handState !== 'idle'}
          className={`px-6 py-3 rounded-lg font-bold transition-all duration-150 border-2 ${
            handState === 'idle'
              ? 'bg-accent hover:bg-accent-hover text-text-inverse border-accent/50 active:scale-95'
              : handState === 'queued'
              ? 'bg-accent-muted text-midnight cursor-not-allowed border-accent-muted/50'
              : 'bg-teal text-text-inverse cursor-not-allowed border-teal/50'
          }`}
          style={{
            textShadow: handState === 'idle' ? '1px 1px 0px rgba(0, 0, 0, 0.3)' : 'none',
            boxShadow: handState === 'idle' ? '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)' : 'none',
          }}
        >
          {handState === 'idle' && '✋ Raise Hand'}
          {handState === 'queued' && '⏳ In Queue...'}
          {handState === 'granted' && '✅ Turn Granted!'}
        </button>
        </div>
      </div>

      {isHost && (
        <HostOverlay
          eventId={eventId}
          currentUserId={currentUserId}
          participants={presenceState}
        />
      )}

      <PvpUi
        nearbyPlayer={nearbyPlayer}
        onChallenge={handleChallenge}
        challengeReceived={challengeReceived}
        onAcceptChallenge={handleAcceptChallenge}
        onRejectChallenge={handleRejectChallenge}
        pvpWinner={pvpWinner}
      />

      {/* Fight brawl overlay when PvP duel resolves */}
      {showFightOverlay && (
        <div className="fight-overlay" aria-hidden>
          <img
            src="/assets/overlays/fight-brawl.png"
            alt=""
            className="fight-overlay__img"
          />
        </div>
      )}
    </main>
  )
}
