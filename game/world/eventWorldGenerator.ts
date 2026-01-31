/**
 * Event World Generator (optional / random mode)
 * For the shared map, use eventMapStructure.getDefaultEventMapStructure() instead.
 * This module is for one-off random generation if needed.
 */

import type { TilemapData } from './tilemap'

const TILE_SIZE = 32
const BLOCK_WIDTH = 14
const BLOCK_HEIGHT = 8

const HOUSES = ['house1', 'house2', 'house3', 'house4', 'tent2', 'tent3'] as const
const DECORATIONS = ['stone6', 'shadow3', 'shadow6', 'box1'] as const
const CORNER_DECOR = 'decor9'

/** Tile IDs (1-indexed, match FieldsTile_XX.png in 8x8 spritesheet) */
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

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export interface EventBlockInfo {
  /** Top-left tile coords of the 12x6 center area */
  centerX: number
  centerY: number
  centerWidth: number
  centerHeight: number
  /** Pixel bounds for object placement */
  pixelX: number
  pixelY: number
  pixelWidth: number
  pixelHeight: number
}

export interface ObjectPlacement {
  objectId: string
  x: number
  y: number
}

export interface GeneratedWorld {
  tilemapData: TilemapData
  eventBlocks: EventBlockInfo[]
  objectPlacements: ObjectPlacement[]
  tileSize: number
}

/**
 * Generate the event world matrix with:
 * - Center 12x6 field (tiles 1, 11, 20 random)
 * - Top border: 36, (34|35)x12, 08
 * - Bottom border: 05, (02|03|04)x12, 28
 * - Left side: 13 (6 rows)
 * - Right side: 09 (6 rows)
 * - Margin: 38 (5-10 tiles random)
 * - Duplicated pattern to fill
 */
export function generateEventWorld(
  targetWidth: number,
  targetHeight: number,
  marginMin: number = 5,
  marginMax: number = 10
): GeneratedWorld {
  const cols = Math.ceil(targetWidth / TILE_SIZE)
  const rows = Math.ceil(targetHeight / TILE_SIZE)

  // One event block: 14 cols (1+12+1) x 8 rows (1+6+1)
  const marginLeft = randomInt(marginMin, marginMax)
  const marginRight = randomInt(marginMin, marginMax)
  const marginTop = randomInt(marginMin, marginMax)
  const marginBottom = randomInt(marginMin, marginMax)

  const innerWidth = cols - marginLeft - marginRight
  const innerHeight = rows - marginTop - marginBottom

  const blocksX = Math.max(1, Math.ceil(innerWidth / BLOCK_WIDTH))
  const blocksY = Math.max(1, Math.ceil(innerHeight / BLOCK_HEIGHT))

  const totalWidth = marginLeft + blocksX * BLOCK_WIDTH + marginRight
  const totalHeight = marginTop + blocksY * BLOCK_HEIGHT + marginBottom

  const tiles: number[] = []
  const eventBlocks: EventBlockInfo[] = []

  for (let y = 0; y < totalHeight; y++) {
    for (let x = 0; x < totalWidth; x++) {
      let tileId = 0

      if (y < marginTop || y >= totalHeight - marginBottom || x < marginLeft || x >= totalWidth - marginRight) {
        tileId = TILES.margin
      } else {
        const innerX = x - marginLeft
        const innerY = y - marginTop
        const blockCol = Math.floor(innerX / BLOCK_WIDTH)
        const blockRow = Math.floor(innerY / BLOCK_HEIGHT)
        const localX = innerX % BLOCK_WIDTH
        const localY = innerY % BLOCK_HEIGHT

        if (blockCol >= blocksX || blockRow >= blocksY) {
          tileId = TILES.margin
        } else {
          tileId = getBlockTile(localX, localY)
        }
      }

      tiles.push(tileId)
    }
  }

  const objectPlacements: ObjectPlacement[] = []

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      const block = {
        centerX: marginLeft + bx * BLOCK_WIDTH + 1,
        centerY: marginTop + by * BLOCK_HEIGHT + 1,
        centerWidth: 12,
        centerHeight: 6,
        pixelX: (marginLeft + bx * BLOCK_WIDTH + 1) * TILE_SIZE,
        pixelY: (marginTop + by * BLOCK_HEIGHT + 1) * TILE_SIZE,
        pixelWidth: 12 * TILE_SIZE,
        pixelHeight: 6 * TILE_SIZE,
      }
      eventBlocks.push(block)

      const centerPxX = block.pixelX + block.pixelWidth / 2
      const centerPxY = block.pixelY + block.pixelHeight / 2

      if (Math.random() < 0.45) {
        const house = pick(HOUSES)
        const jitterX = (Math.random() - 0.5) * 80
        const jitterY = (Math.random() - 0.5) * 40
        objectPlacements.push({ objectId: house, x: centerPxX + jitterX, y: block.pixelY + block.pixelHeight + jitterY })
      }

      const numDecors = Math.floor(Math.random() * 3) + 1
      for (let i = 0; i < numDecors; i++) {
        const dec = pick(DECORATIONS)
        const px = block.pixelX + Math.random() * block.pixelWidth
        const py = block.pixelY + Math.random() * block.pixelHeight
        objectPlacements.push({ objectId: dec, x: px, y: py + TILE_SIZE })
      }

      const cornerX = block.pixelX + block.pixelWidth - TILE_SIZE / 2
      const cornerY = block.pixelY + block.pixelHeight
      objectPlacements.push({ objectId: CORNER_DECOR, x: cornerX, y: cornerY })
    }
  }

  return {
    tilemapData: { width: totalWidth, height: totalHeight, tiles },
    eventBlocks,
    objectPlacements,
    tileSize: TILE_SIZE,
  }
}

function getBlockTile(localX: number, localY: number): number {
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
