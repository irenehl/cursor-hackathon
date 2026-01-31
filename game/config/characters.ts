export type CharacterType = 'default' | 'pink_monster' | 'owlet_monster' | 'dude_monster'

export interface CharacterConfig {
  name: string
  hasColors: boolean
  spritePath: string | null
}

export const CHARACTERS: Record<CharacterType, CharacterConfig> = {
  default: { 
    name: 'Default', 
    hasColors: true, 
    spritePath: null 
  },
  pink_monster: { 
    name: 'Pink Monster', 
    hasColors: false, 
    spritePath: '/assets/avatars/1 Pink_Monster/' 
  },
  owlet_monster: { 
    name: 'Owlet Monster', 
    hasColors: false, 
    spritePath: '/assets/avatars/2 Owlet_Monster/' 
  },
  dude_monster: { 
    name: 'Dude Monster', 
    hasColors: false, 
    spritePath: '/assets/avatars/3 Dude_Monster/' 
  },
}

/**
 * Animation metadata for premium characters
 */
const PREMIUM_ANIMATIONS = {
  idleFrames: 4,
  walkFrames: 6,
  frameWidth: 32,
  frameHeight: 32,
  idleFrameDuration: 200, // ms per frame
  walkFrameDuration: 150, // ms per frame
} as const

/**
 * Get animation paths for premium characters
 * Returns null for default character
 */
export function getPremiumAnimationPaths(characterType: CharacterType): { idle: string; walk: string } | null {
  if (characterType === 'default') {
    return null
  }
  
  const character = CHARACTERS[characterType]
  const name = character.name.replace(' ', '_')
  
  return {
    idle: `${character.spritePath}${name}_Idle_4.png`,
    walk: `${character.spritePath}${name}_Walk_6.png`,
  }
}

/**
 * Get animation metadata for premium characters
 */
export function getPremiumAnimationMetadata() {
  return PREMIUM_ANIMATIONS
}

/**
 * Get the avatar path for a character type and avatar ID
 * @deprecated Use getPremiumAnimationPaths for premium characters
 */
export function getAvatarPath(characterType: CharacterType, avatarId: number): string {
  const character = CHARACTERS[characterType]
  
  if (characterType === 'default') {
    // Default character doesn't use sprite files, uses pixel-art placeholder
    return ''
  }
  
  // For monsters, use the Idle sprite (4-frame animation)
  // Extract first frame will be handled in player.ts
  return `${character.spritePath}${character.name.replace(' ', '_')}_Idle_4.png`
}
