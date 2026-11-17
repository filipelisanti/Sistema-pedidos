import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { instalarApiFalsa } from './api-falsa';

// Por defecto, todos los tests hablan con la API falsa (nunca con la red)
beforeEach(() => {
  instalarApiFalsa();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
