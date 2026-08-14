#!/usr/bin/env node
import { resolve } from 'node:path';
import { loadMasterSchools } from '../backend/application/school-catalog';
import { main as monitorLive } from './monitor-live-2026';

const schools = await loadMasterSchools();
const ineps = schools.map((school) => school.inep).join(',');

await monitorLive([
  '--year', '2026',
  '--ineps', ineps,
  '--workspace', resolve('.tmp/monitor-all-163'),
  '--output', resolve('artifacts/monitor-all-163-2026.json'),
]);
