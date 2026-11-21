// Chapter bundle for the Phase 1 test area. Loaded lazily (dynamic import), like every chapter will be.

import { maps } from './maps';
import { scripts } from './scripts';

export const chapter = {
  id: 'ch0',
  startMap: 'study',
  startSpawn: 'start',
  maps,
  scripts,
};

export type Chapter = typeof chapter;
