'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PixiAppManager } from '@/game/engine/pixiApp'
import { GameMap } from '@/game/world/map'
import { PlayerManager } from '@/game/entities/playerManager'
import { LocalPlayer } from '@/game/entities/localPlayer'
import { Container } from 'pixi.js'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string
  const sessionId = params.sessionId as string
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pixiAppRef = useRef<PixiAppManager | null>(null)
  const gameMapRef = useRef<GameMap | null>(null)
  const playerManagerRef = useRef<PlayerManager | null>(null)
  const localPlayerRef = useRef<LocalPlayer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const positionBroadcastIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let mounted = true

    async function initializeGame() {
      if (!canvasRef.current) {
        setError('Canvas element not found')
        return
      }

      try {
        // Get current user and profile
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push('/events')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_id')
          .eq('user_id', user.id)
          .single()

        if (!profile) {
          setError('Profile not found. Please complete your profile first.')
          return
        }

        // Initialize PixiJS
        const pixiApp = new PixiAppManager()
        const app = await pixiApp.initialize(
          {
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x1a1a1a,
            antialias: true,
          },
          canvasRef.current
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
        await gameMap.loadMap() // Load without texture for now (will use fallback)
        gameMapRef.current = gameMap

        // Create player manager
        const playerManager = new PlayerManager(playersContainer)
        playerManager.setMap(gameMap)
        playerManagerRef.current = playerManager

        // Create local player
        const avatarId = profile.avatar_id || 1
        const avatarPath = `/assets/avatars/avatar-${avatarId}.png`
        
        // Start at center of map
        const initialX = mapBounds.width / 2
        const initialY = mapBounds.height / 2

        const localPlayer = await playerManager.createLocalPlayer(
          {
            userId: user.id,
            displayName: profile.display_name || 'Player',
            avatarId,
          },
          {
            userId: user.id,
            displayName: profile.display_name || 'Player',
            avatarId,
            x: initialX,
            y: initialY,
            dir: 0,
          },
          avatarPath
        )

        // Load hat overlay for local player
        await localPlayer.loadHatOverlay('/assets/overlays/punishment-hat.png')

        localPlayerRef.current = localPlayer

        // Set up game loop
        const ticker = pixiApp.getTicker()
        ticker.add(() => {
          if (!mounted) return

          // Update local player - deltaTime is normalized (1 = 60fps)
          const deltaTime = ticker.deltaTime
          const state = playerManager.update(deltaTime)
          
          // Broadcast position updates (10-15 Hz = every 66-100ms)
          // We'll handle this in a separate interval below
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

        // Set up position broadcasting (10-15 Hz)
        positionBroadcastIntervalRef.current = setInterval(() => {
          if (localPlayerRef.current && mounted) {
            const state = localPlayerRef.current.getState()
            // TODO: Broadcast position via Realtime (will be implemented in realtime-presence-broadcast todo)
            // For now, just log it
            console.log('Position update:', state)
          }
        }, 100) // ~10 Hz

        setIsLoading(false)

        // Cleanup function
        return () => {
          mounted = false
          window.removeEventListener('keydown', handleKeyDown)
          window.removeEventListener('keyup', handleKeyUp)
          window.removeEventListener('resize', handleResize)
          if (positionBroadcastIntervalRef.current) {
            clearInterval(positionBroadcastIntervalRef.current)
          }
          if (pixiAppRef.current) {
            pixiAppRef.current.destroy()
          }
        }
      } catch (err: any) {
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
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/events')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="text-white text-xl">Loading game...</div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      <div className="absolute top-4 left-4 text-white bg-black bg-opacity-50 p-2 rounded text-sm">
        <div>Use WASD or Arrow Keys to move</div>
      </div>
    </main>
  )
}
