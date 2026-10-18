// Preparación común de los tests: Testing Library necesita desmontar lo que renderizó al terminar cada test
// (vitest no define afterEach como global, así que no lo hace solo).
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
