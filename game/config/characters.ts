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
 * Get the avatar path for a character type and avatar ID
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
