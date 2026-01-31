/**
 * Event Map Structure
 * Holds the shared/default map structure so all players see the same world.
 * Use getDefaultEventMapStructure() for the canonical map.
 * Use loadStructureFromJson() for dynamic/custom structures (e.g. from server).
 */

import type { TilemapData } from './tilemap'

export interface ObjectPlacement {
  objectId: string
  x: number
  y: number
  /** 0 = house/tent, 1 = adorno (stone, shadow, box, decor) - higher z */
  layer?: number
}

export interface EventMapStructure {
  tilemapData: TilemapData
  objectPlacements: ObjectPlacement[]
  tileSize: number
}

const DEFAULT_SEED = 12345

/** Seeded PRNG (mulberry32) - deterministic for same seed */
function createSeededRandom(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TILE_SIZE = 32
const BLOCK_WIDTH = 14
const BLOCK_HEIGHT = 8

const HOUSES = ['house1', 'house2', 'house3', 'house4', 'tent2', 'tent3'] as const
const DECORATIONS = ['stone6', 'shadow3', 'shadow6', 'box1'] as const
const CORNER_DECOR = 'decor9'

const TILES = {
  center: [1, 11, 20],
  topStart: 36,
  topMiddle: [34, 35],
  topEnd: 8,
  bottomStart: 5,
  bottomMiddle: [2, 3, 4],
  bottomEnd: 28,
  leftSide: 13,
  rightSide: 9,
  margin: 38,
} as const

let cachedDefaultStructure: EventMapStructure | null = null

/**
 * Get the default event map structure. Same for all players.
 * Cached after first call.
 */
export function getDefaultEventMapStructure(
  targetWidth: number = 1200,
  targetHeight: number = 800
): EventMapStructure {
  if (cachedDefaultStructure) {
    return cachedDefaultStructure
  }
  cachedDefaultStructure = generateStructureWithSeed(DEFAULT_SEED, targetWidth, targetHeight)
  return cachedDefaultStructure
}

/**
 * Generate structure with a given seed (deterministic).
 * Use for testing or when you need a specific variant.
 */
export function generateStructureWithSeed(
  seed: number,
  targetWidth: number,
  targetHeight: number
): EventMapStructure {
  const rng = createSeededRandom(seed)

  const pick = <T>(arr: readonly T[]) => arr[Math.floor(rng() * arr.length)]

  // Margen de 10 tiles alrededor de cada 12x6 (no entre centros agrupados)
  const MARGIN = 10
  const CELL_WIDTH = MARGIN * 2 + BLOCK_WIDTH
  const CELL_HEIGHT = MARGIN * 2 + BLOCK_HEIGHT

  const cols = Math.ceil(targetWidth / TILE_SIZE)
  const rows = Math.ceil(targetHeight / TILE_SIZE)
  const blocksX = Math.max(1, Math.floor(cols / CELL_WIDTH))
  const blocksY = Math.max(1, Math.floor(rows / CELL_HEIGHT))

  const totalWidth = blocksX * CELL_WIDTH
  const totalHeight = blocksY * CELL_HEIGHT

  const tiles: number[] = []

  const getBlockTile = (localX: number, localY: number): number => {
    if (localY === 0) {
      if (localX === 0) return TILES.topStart
      if (localX === BLOCK_WIDTH - 1) return TILES.topEnd
      return pick(TILES.topMiddle)
    }
    if (localY === BLOCK_HEIGHT - 1) {
      if (localX === 0) return TILES.bottomStart
      if (localX === BLOCK_WIDTH - 1) return TILES.bottomEnd
      return pick(TILES.bottomMiddle)
    }
    if (localX === 0) return TILES.leftSide
    if (localX === BLOCK_WIDTH - 1) return TILES.rightSide
    return pick(TILES.center)
  }

  for (let y = 0; y < totalHeight; y++) {
    for (let x = 0; x < totalWidth; x++) {
      const cellCol = Math.floor(x / CELL_WIDTH)
      const cellRow = Math.floor(y / CELL_HEIGHT)
      const localX = x - cellCol * CELL_WIDTH
      const localY = y - cellRow * CELL_HEIGHT

      let tileId: number
      if (localX < MARGIN || localX >= MARGIN + BLOCK_WIDTH || localY < MARGIN || localY >= MARGIN + BLOCK_HEIGHT) {
        tileId = TILES.margin
      } else {
        const blockLocalX = localX - MARGIN
        const blockLocalY = localY - MARGIN
        tileId = getBlockTile(blockLocalX, blockLocalY)
      }
      tiles.push(tileId)
    }
  }

  const objectPlacements: ObjectPlacement[] = []

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      const pixelX = (bx * CELL_WIDTH + MARGIN + 1) * TILE_SIZE
      const pixelY = (by * CELL_HEIGHT + MARGIN + 1) * TILE_SIZE
      const pixelWidth = 12 * TILE_SIZE
      const pixelHeight = 6 * TILE_SIZE

      // Siempre 1 casa/carpa por bloque (layer 0 - debajo de adornos)
      const house = pick(HOUSES)
      const jitterX = (rng() - 0.5) * 80
      const jitterY = (rng() - 0.5) * 40
      objectPlacements.push({ objectId: house, x: pixelX + pixelWidth / 2 + jitterX, y: pixelY + pixelHeight + jitterY, layer: 0 })

      const numDecors = Math.floor(rng() * 3) + 1
      for (let i = 0; i < numDecors; i++) {
        const dec = pick(DECORATIONS)
        const px = pixelX + rng() * pixelWidth
        const py = pixelY + rng() * pixelHeight
        objectPlacements.push({ objectId: dec, x: px, y: py + TILE_SIZE, layer: 1 })
      }

      objectPlacements.push({
        objectId: CORNER_DECOR,
        x: pixelX + pixelWidth - TILE_SIZE / 2,
        y: pixelY + pixelHeight,
        layer: 1,
      })
    }
  }

  return {
    tilemapData: { width: totalWidth, height: totalHeight, tiles },
    objectPlacements,
    tileSize: TILE_SIZE,
  }
}

/**
 * Load a custom structure from JSON (e.g. from server/DB).
 * Use for dynamic map modification per event or session.
 */
export function loadStructureFromJson(json: string): EventMapStructure {
  const parsed = JSON.parse(json) as EventMapStructure
  if (!parsed.tilemapData || !parsed.objectPlacements) {
    throw new Error('Invalid event map structure JSON')
  }
  return {
    tilemapData: parsed.tilemapData,
    objectPlacements: parsed.objectPlacements,
    tileSize: parsed.tileSize ?? TILE_SIZE,
  }
}

/**
 * Reset the cached default (e.g. for tests or when structure params change).
 */
export function resetDefaultStructureCache(): void {
  cachedDefaultStructure = null
}
