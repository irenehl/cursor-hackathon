import { Assets } from 'pixi.js'

/**
 * Asset manifest for game sprites and textures
 * Defines all asset bundles and their paths
 */
export interface AssetBundle {
  name: string
  assets: Record<string, string>
}

export interface TileData {
  tilesetPath: string
  tileWidth: number
  tileHeight: number
  columns: number
  rows: number
}

export interface AnimationData {
  frames: number
  frameDuration: number // milliseconds per frame
}

/**
 * Asset bundles for organized loading
 */
export const ASSET_BUNDLES: AssetBundle[] = [
  {
    name: 'tiles',
    assets: {
      fieldsTileset: '/assets/1 Tiles/FieldsTileset.png',
      tileset2: '/assets/1.1 Tiles/Tileset2.png',
    },
  },
  {
    name: 'objects',
    assets: {
      // Houses
      house1: '/assets/2 Objects/7 House/1.png',
      house2: '/assets/2 Objects/7 House/2.png',
      house3: '/assets/2 Objects/7 House/3.png',
      house4: '/assets/2 Objects/7 House/4.png',
      // Tents
      tent1: '/assets/2 Objects/6 Tent/1.png',
      tent2: '/assets/2 Objects/6 Tent/2.png',
      tent3: '/assets/2 Objects/6 Tent/3.png',
      tent4: '/assets/2 Objects/6 Tent/4.png',
      // Stones
      stone1: '/assets/2 Objects/2 Stone/1.png',
      stone2: '/assets/2 Objects/2 Stone/2.png',
      stone3: '/assets/2 Objects/2 Stone/3.png',
      stone4: '/assets/2 Objects/2 Stone/4.png',
      stone5: '/assets/2 Objects/2 Stone/5.png',
      stone6: '/assets/2 Objects/2 Stone/6.png',
      // Boxes
      box1: '/assets/2 Objects/4 Box/1.png',
      box2: '/assets/2 Objects/4 Box/2.png',
      box3: '/assets/2 Objects/4 Box/3.png',
      box4: '/assets/2 Objects/4 Box/4.png',
      box5: '/assets/2 Objects/4 Box/5.png',
      // Grass decorations
      grass1: '/assets/2 Objects/5 Grass/1.png',
      grass2: '/assets/2 Objects/5 Grass/2.png',
      grass3: '/assets/2 Objects/5 Grass/3.png',
      grass4: '/assets/2 Objects/5 Grass/4.png',
      grass5: '/assets/2 Objects/5 Grass/5.png',
      grass6: '/assets/2 Objects/5 Grass/6.png',
      // Decor
      decor1: '/assets/2 Objects/3 Decor/1.png',
      decor2: '/assets/2 Objects/3 Decor/2.png',
      decor3: '/assets/2 Objects/3 Decor/3.png',
      decor4: '/assets/2 Objects/3 Decor/4.png',
      decor5: '/assets/2 Objects/3 Decor/5.png',
      decor6: '/assets/2 Objects/3 Decor/6.png',
      decor7: '/assets/2 Objects/3 Decor/7.png',
      decor8: '/assets/2 Objects/3 Decor/8.png',
      decor9: '/assets/2 Objects/3 Decor/9.png',
      decor10: '/assets/2 Objects/3 Decor/10.png',
      decor11: '/assets/2 Objects/3 Decor/11.png',
      decor12: '/assets/2 Objects/3 Decor/12.png',
      decor13: '/assets/2 Objects/3 Decor/13.png',
      decor14: '/assets/2 Objects/3 Decor/14.png',
      decor15: '/assets/2 Objects/3 Decor/15.png',
      decor16: '/assets/2 Objects/3 Decor/16.png',
      decor17: '/assets/2 Objects/3 Decor/17.png',
      // Shadows
      shadow1: '/assets/2 Objects/1 Shadow/1.png',
      shadow2: '/assets/2 Objects/1 Shadow/2.png',
      shadow3: '/assets/2 Objects/1 Shadow/3.png',
      shadow4: '/assets/2 Objects/1 Shadow/4.png',
      shadow5: '/assets/2 Objects/1 Shadow/5.png',
      shadow6: '/assets/2 Objects/1 Shadow/6.png',
      // Special
      towerPlace1: '/assets/2 Objects/PlaceForTower1.png',
      towerPlace2: '/assets/2 Objects/PlaceForTower2.png',
    },
  },
  {
    name: 'animated',
    assets: {
      door1: '/assets/3 Animated Objects/Door1.png',
      door2: '/assets/3 Animated Objects/Door2.png',
      doubleDoor1: '/assets/3 Animated Objects/DoubleDoor1.png',
      doubleDoor2: '/assets/3 Animated Objects/DoubleDoor2.png',
    },
  },
]

/**
 * Tile configuration for tilesets
 */
export const TILE_CONFIG: Record<string, TileData> = {
  fieldsTileset: {
    tilesetPath: '/assets/1 Tiles/FieldsTileset.png',
    tileWidth: 32,
    tileHeight: 32,
    columns: 8,
    rows: 8,
  },
  tileset2: {
    tilesetPath: '/assets/1.1 Tiles/Tileset2.png',
    tileWidth: 32,
    tileHeight: 32,
    columns: 8,
    rows: 8,
  },
}

/**
 * Animation data for animated sprites
 */
export const ANIMATION_DATA: Record<string, AnimationData> = {
  door1: {
    frames: 5,
    frameDuration: 200,
  },
  door2: {
    frames: 5,
    frameDuration: 200,
  },
  doubleDoor1: {
    frames: 5,
    frameDuration: 200,
  },
  doubleDoor2: {
    frames: 5,
    frameDuration: 200,
  },
}

/**
 * Load all asset bundles
 */
export async function loadAssetBundles(): Promise<void> {
  // Register all assets first, then load them
  const allAssets: Array<{ alias: string; src: string }> = []
  
  for (const bundle of ASSET_BUNDLES) {
    for (const [alias, src] of Object.entries(bundle.assets)) {
      allAssets.push({ alias, src })
      // Register each asset with its alias
      Assets.add(alias, src)
    }
  }
  
  // Load all assets by their aliases
  const aliases = allAssets.map((a) => a.alias)
  await Assets.load(aliases)
}

/**
 * Get texture by alias from loaded bundles
 */
export function getTexture(alias: string): any {
  return Assets.get(alias)
}

/**
 * Get all textures from a bundle
 */
export function getBundleTextures(bundleName: string): Record<string, any> {
  const bundle = ASSET_BUNDLES.find((b) => b.name === bundleName)
  if (!bundle) {
    throw new Error(`Bundle ${bundleName} not found`)
  }
  
  const textures: Record<string, any> = {}
  for (const [alias, path] of Object.entries(bundle.assets)) {
    textures[alias] = Assets.get(alias)
  }
  return textures
}
