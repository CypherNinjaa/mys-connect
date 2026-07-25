/**
 * MYS CONNECT — Spacing & Layout System
 * 4px base unit grid system
 * Reference: PRD Section 18 — UI Design System
 */

const BASE = 4;

export const Spacing = {
  // ─── Base Scale (multiples of 4px) ──────
  xxs: BASE,         // 4
  xs: BASE * 2,      // 8
  sm: BASE * 3,      // 12
  md: BASE * 4,      // 16
  lg: BASE * 5,      // 20
  xl: BASE * 6,      // 24
  '2xl': BASE * 8,   // 32
  '3xl': BASE * 10,  // 40
  '4xl': BASE * 12,  // 48
  '5xl': BASE * 16,  // 64

  // ─── Screen Padding ─────────────────────
  screenHorizontal: BASE * 4,   // 16
  screenVertical: BASE * 5,     // 20

  // ─── Card ───────────────────────────────
  cardPadding: BASE * 4,        // 16
  cardGap: BASE * 3,            // 12
  cardRadius: BASE * 3,         // 12

  // ─── Input Fields ───────────────────────
  inputHeight: BASE * 12,       // 48
  inputPaddingH: BASE * 4,      // 16
  inputRadius: BASE * 2,        // 8

  // ─── Buttons ────────────────────────────
  buttonHeight: BASE * 12,      // 48
  buttonHeightSmall: BASE * 9,  // 36
  buttonPaddingH: BASE * 6,     // 24
  buttonRadius: BASE * 2,       // 8

  // ─── Avatar ─────────────────────────────
  avatarSm: BASE * 8,           // 32
  avatarMd: BASE * 10,          // 40
  avatarLg: BASE * 14,          // 56
  avatarXl: BASE * 20,          // 80

  // ─── Tab Bar ────────────────────────────
  tabBarHeight: BASE * 14,      // 56

  // ─── Section ────────────────────────────
  sectionGap: BASE * 6,         // 24
  listItemGap: BASE * 3,        // 12

  // ─── Border Radius ──────────────────────
  radiusSm: BASE,               // 4
  radiusMd: BASE * 2,           // 8
  radiusLg: BASE * 3,           // 12
  radiusXl: BASE * 4,           // 16
  radiusFull: 9999,
} as const;
