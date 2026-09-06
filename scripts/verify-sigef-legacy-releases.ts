import {
  collectSigefLegacyReleases,
  collectSigefPublicReleases,
} from '../backend/adapters/sigef-public-releases';
import { canonicalAccount } from '../backend/core/normalization';

const input = {
  cnpj: '12.290.969/0001-23',
  programCode: '02',
  fiscalYear: 2026,
};

function fingerprint(release: {
  paymentDate: string;
  orderBank: string;
  amountCents: number;
  destinationAccount: { bank: string; agency: string; number: string };
}): string {
  return [
    release.paymentDate,
    release.orderBank,
    release.amountCents,
    canonicalAccount(release.destinationAccount),
  ].join('|');
}

const [preferred, legacy] = await Promise.all([
  collectSigefPublicReleases(input),
  collectSigefLegacyReleases(input),
]);

if (preferred.entity.cnpj !== '12290969000123' || legacy.entity.cnpj !== '12290969000123') {
  throw new Error('A verificação live de Liberações retornou entidade divergente.');
}
if (preferred.releases.length === 0 || legacy.releases.length === 0) {
  throw new Error('A verificação live de Liberações não retornou registros financeiros.');
}
if (!legacy.source.coverageThrough || legacy.source.coverageThrough < '2026-09-05') {
  throw new Error(`Cobertura temporal legada inesperada: ${legacy.source.coverageThrough ?? 'ausente'}.`);
}

const preferredFingerprints = new Set(preferred.releases.map(fingerprint));
const matched = legacy.releases.filter((release) => preferredFingerprints.has(fingerprint(release)));
if (matched.length === 0) {
  throw new Error('As rotas moderna e legada do SIGEF não compartilharam nenhuma liberação forte para a UEx piloto.');
}

const expected = legacy.releases.find((release) => (
  release.orderBank === '008035'
  && release.amountCents === 214_500
  && release.paymentDate === '2026-04-30'
  && canonicalAccount(release.destinationAccount) === canonicalAccount({
    bank: '001',
    agency: '3101',
    number: '0000024961',
  })
));
if (!expected) {
  throw new Error('A liberação piloto de 30/04/2026 não foi reproduzida pela rota legada do SIGEF.');
}

console.log(JSON.stringify({
  status: 'OK',
  cnpj: legacy.entity.cnpj,
  preferredRoute: preferred.route,
  preferredReleaseCount: preferred.releases.length,
  legacyReleaseCount: legacy.releases.length,
  sharedStrongReleases: matched.length,
  legacyCoverageThrough: legacy.source.coverageThrough,
  pilot: {
    paymentDate: expected.paymentDate,
    orderBank: expected.orderBank,
    amountCents: expected.amountCents,
    account: expected.destinationAccount,
  },
}, null, 2));
