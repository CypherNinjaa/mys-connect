/**
 * MYS CONNECT — Color Palette
 * Derived from the brand identity (maroon/cream wireframe theme)
 * Reference: PRD Section 18 — UI Design System
 */
export const Colors = {
  // ─── Brand ──────────────────────────────
  primary: {
    50: '#FBE9EC',
    100: '#F4C7CE',
    200: '#E89DA9',
    300: '#DC7384',
    400: '#D04F65',
    500: '#6B1D2A',  // ← Primary brand maroon
    600: '#5C1924',
    700: '#4D151E',
    800: '#3E1118',
    900: '#2F0D12',
  },

  // ─── Secondary (Gold/Saffron) ───────────
  secondary: {
    50: '#FFF8E1',
    100: '#FFECB3',
    200: '#FFE082',
    300: '#FFD54F',
    400: '#FFCA28',
    500: '#D4A041',  // ← Gold accent
    600: '#C49238',
    700: '#B4842F',
    800: '#A47626',
    900: '#94681D',
  },

  // ─── Neutral ────────────────────────────
  neutral: {
    0: '#FFFFFF',
    50: '#F8F8F8',
    100: '#F0F0F0',
    200: '#E4E4E4',
    300: '#D1D1D1',
    400: '#A0A0A0',
    500: '#717171',
    600: '#4A4A4A',
    700: '#333333',
    800: '#1F1F1F',
    900: '#111111',
  },

  // ─── Semantic ───────────────────────────
  success: {
    light: '#E8F5E9',
    main: '#4CAF50',
    dark: '#2E7D32',
  },
  warning: {
    light: '#FFF3E0',
    main: '#FF9800',
    dark: '#E65100',
  },
  error: {
    light: '#FFEBEE',
    main: '#F44336',
    dark: '#C62828',
  },
  info: {
    light: '#E3F2FD',
    main: '#2196F3',
    dark: '#1565C0',
  },

  // ─── Background ─────────────────────────
  background: {
    primary: '#FFFFFF',
    secondary: '#F8F8F8',
    tertiary: '#F0F0F0',
    card: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // ─── Text ───────────────────────────────
  text: {
    primary: '#1F1F1F',
    secondary: '#4A4A4A',
    tertiary: '#717171',
    inverse: '#FFFFFF',
    link: '#6B1D2A',
    disabled: '#A0A0A0',
  },

  // ─── Borders ────────────────────────────
  border: {
    light: '#E4E4E4',
    default: '#D1D1D1',
    dark: '#A0A0A0',
    focus: '#6B1D2A',
  },
} as const;

export type ColorKey = keyof typeof Colors;
