/**
 * Color palette for VoiceNotesAI
 * Supports Light and Dark mode
 */

const Colors = {
  light: {
    // Primary colors
    primary: '#007AFF',
    primaryPressed: '#0056B3',

    // Semantic colors
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',

    // Text colors
    text: '#000000',
    textPrimary: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',

    // Background colors
    background: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceSecondary: '#F8F8F8',
    surfaceTertiary: '#F0F0F0',

    // Border colors
    border: '#E5E5EA',
    borderLight: '#F0F0F0',

    // Component specific
    cardBackground: '#FFFFFF',
    searchBackground: '#E5E5EA',
    placeholder: '#8E8E93',
    icon: '#8E8E93',
    iconActive: '#007AFF',

    // Status colors
    statusPending: '#FF9500',
    statusDone: '#34C759',
    statusError: '#FF3B30',

    // Audio player
    trackActive: '#007AFF',
    trackInactive: '#E0E0E0',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayDark: 'rgba(0, 0, 0, 0.9)',

    // Level meter
    levelNormal: '#4CAF50',
    levelHigh: '#FF9800',

    // Legacy (for compatibility)
    tint: '#007AFF',
    tabIconDefault: '#8E8E93',
    tabIconSelected: '#007AFF',
  },
  dark: {
    // Primary colors
    primary: '#0A84FF',
    primaryPressed: '#409CFF',

    // Semantic colors
    error: '#FF453A',
    success: '#32D74B',
    warning: '#FF9F0A',

    // Text colors
    text: '#FFFFFF',
    textPrimary: '#FFFFFF',
    textSecondary: '#EBEBF5',
    textTertiary: '#8E8E93',

    // Background colors
    background: '#000000',
    surface: '#1C1C1E',
    surfaceSecondary: '#2C2C2E',
    surfaceTertiary: '#3A3A3C',

    // Border colors
    border: '#38383A',
    borderLight: '#2C2C2E',

    // Component specific
    cardBackground: '#1C1C1E',
    searchBackground: '#1C1C1E',
    placeholder: '#8E8E93',
    icon: '#8E8E93',
    iconActive: '#0A84FF',

    // Status colors
    statusPending: '#FF9F0A',
    statusDone: '#32D74B',
    statusError: '#FF453A',

    // Audio player
    trackActive: '#0A84FF',
    trackInactive: '#3A3A3C',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayDark: 'rgba(0, 0, 0, 0.95)',

    // Level meter
    levelNormal: '#32D74B',
    levelHigh: '#FF9F0A',

    // Legacy (for compatibility)
    tint: '#0A84FF',
    tabIconDefault: '#8E8E93',
    tabIconSelected: '#0A84FF',
  },
};

export default Colors;

// Type for color keys
export type ColorName = keyof typeof Colors.light;
