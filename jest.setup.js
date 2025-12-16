// Jest setup file
// Add any global test setup here

// Define __DEV__ for react-native
global.__DEV__ = true;

// Mock expo module to prevent winter runtime from loading
jest.mock('expo', () => ({}));

// Mock expo-modules-core for native module tests
jest.mock('expo-modules-core', () => ({
  requireNativeModule: jest.fn(() => ({})),
  EventEmitter: jest.fn(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  Paths: {
    document: { uri: 'file://documents/' },
    cache: { uri: 'file://cache/' },
  },
  File: jest.fn().mockImplementation((uri) => ({
    uri,
    exists: true,
    base64: jest.fn(() => 'base64string'),
    move: jest.fn(),
    delete: jest.fn(),
  })),
  Directory: jest.fn().mockImplementation((path) => ({
    uri: path,
    exists: true,
    create: jest.fn(),
  })),
}));

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
  }),
}));

// Silence console warnings in tests
const originalConsole = { ...console };
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: originalConsole.log,
};
