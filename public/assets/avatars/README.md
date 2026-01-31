# Player Character Sprite Requirements

This document outlines the requirements for player character sprites to match the existing pixel art tileset style.

## Style Guidelines

- **Art Style**: Pixel art, matching the field tileset aesthetic
- **Color Palette**: Earth tones, muted colors (similar to the field tiles)
- **Consistency**: Should blend seamlessly with the game's visual style

## Technical Specifications

### Size
- **Recommended**: 32x32 pixels per frame (standard tile size)
- **Alternative**: 32x48 pixels for taller characters (if you want more detail)
- **Format**: PNG with transparency (alpha channel)

### Animation Requirements

Each character sprite should include the following animations:

#### Idle Animation
- **Frames**: 2-4 frames
- **Duration**: ~400-800ms total (100-200ms per frame)
- **Purpose**: Standing still animation (subtle breathing/bobbing)

#### Walk Animations (4 directions)
- **Walk Down**: 4 frames (facing camera)
- **Walk Up**: 4 frames (facing away)
- **Walk Left**: 4 frames (or can flip right sprite)
- **Walk Right**: 4 frames
- **Frame Duration**: ~100-150ms per frame (400-600ms total cycle)

### Spritesheet Layout

Two common layouts are supported:

#### Option 1: Horizontal Strip
```
[Idle1][Idle2][Idle3][WalkDown1][WalkDown2][WalkDown3][WalkDown4][WalkUp1]...
```
- All frames in a single row
- Easy to implement, good for simple animations

#### Option 2: Grid Layout
```
Row 1: [Idle frames]
Row 2: [Walk Down frames]
Row 3: [Walk Up frames]
Row 4: [Walk Left frames]
Row 5: [Walk Right frames]
```
- Organized by animation type
- Better for complex characters with many frames

### File Naming Convention

- **Format**: `character_XX.png` or `avatar_XX.png`
- **Examples**: 
  - `character_01.png`
  - `character_02.png`
  - `avatar_01.png`

### Implementation Notes

When implementing sprite loading:

1. **Spritesheet Parsing**: Use PixiJS `Spritesheet` class to parse frames
2. **Animation State Machine**: Switch between idle/walk animations based on movement
3. **Direction Handling**: Flip left sprite horizontally for right-facing (or provide separate frames)
4. **Frame Timing**: Use the game ticker to advance animation frames

## Example Asset Structure

```
public/assets/avatars/
├── character_01.png  (32x32 or spritesheet)
├── character_02.png
├── character_03.png
└── ...
```

## Integration

Once sprites are added:

1. Add sprite paths to `game/assets/assetManifest.ts` in the `avatars` bundle
2. Update `game/entities/player.ts` to load and animate sprites
3. Replace the placeholder pixel-art character with actual sprite frames

## Current Placeholder

The game currently uses a simple pixel-art placeholder:
- 32x32 pixel character
- Circular head with eyes and mouth
- Colored body (varies by avatarId)
- Simple outline for definition

This placeholder will be automatically replaced when actual sprite files are provided.
