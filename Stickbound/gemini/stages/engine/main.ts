/** Entry of every arena folder's page: runs the Lightning lab in the arena named by the folder in the URL. */
import { startLab } from './lab';
import { ARENA_DEFS } from './registry';
const id = location.pathname.split('/').find((p) => p in ARENA_DEFS) ?? 'lightningarena';
void ARENA_DEFS[id]().then((def) => startLab(def));
