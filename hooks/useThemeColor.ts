import { useColorScheme } from 'react-native';
import Colors, { ColorName } from '@/constants/Colors';

/**
 * Hook to get a single color from the current theme
 */
export function useThemeColor(colorName: ColorName): string {
  const theme = useColorScheme() ?? 'light';
  return Colors[theme][colorName];
}

/**
 * Hook to get multiple colors from the current theme
 * Returns an object with the requested color names as keys
 */
export function useThemeColors<T extends ColorName[]>(
  ...colorNames: T
): { [K in T[number]]: string } {
  const theme = useColorScheme() ?? 'light';
  const result = {} as { [K in T[number]]: string };

  for (const name of colorNames) {
    result[name as T[number]] = Colors[theme][name];
  }

  return result;
}

/**
 * Hook to get all colors from the current theme
 */
export function useColors() {
  const theme = useColorScheme() ?? 'light';
  return Colors[theme];
}

/**
 * Hook to get the current theme name
 */
export function useTheme() {
  return useColorScheme() ?? 'light';
}
