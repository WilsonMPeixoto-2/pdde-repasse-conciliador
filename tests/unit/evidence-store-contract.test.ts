import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonlEvidenceStore } from '../../backend/adapters/jsonl-evidence-store';
import { evidenceStoreContract } from '../support/evidence-store-contract';

evidenceStoreContract('JSONL', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pdde-evidence-contract-'));
  return new JsonlEvidenceStore(join(directory, 'events.jsonl'));
});
