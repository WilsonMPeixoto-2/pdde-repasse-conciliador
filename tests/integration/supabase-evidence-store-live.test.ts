import { describe } from 'vitest';
import {
  createSupabaseBackendClient,
  loadSupabaseBackendConfig,
} from '../../backend/adapters/supabase-backend-client';
import { SupabaseEvidenceStore } from '../../backend/adapters/supabase-evidence-store';
import { evidenceStoreContract } from '../support/evidence-store-contract';

const enabled = process.env.SUPABASE_EVIDENCE_LIVE === '1';

describe.runIf(enabled)('SupabaseEvidenceStore — Postgres real opt-in', () => {
  evidenceStoreContract('Supabase/Postgres', async () => (
    new SupabaseEvidenceStore(
      createSupabaseBackendClient(loadSupabaseBackendConfig()),
    )
  ), 30_000);
});
