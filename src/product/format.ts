const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactMoneyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatMoney(cents: number | null): string {
  return cents === null ? 'Não disponível' : moneyFormatter.format(cents / 100);
}

export function formatMoneyCompact(cents: number | null): string {
  return cents === null ? 'Não disponível' : compactMoneyFormatter.format(cents / 100);
}

export function formatDate(value: string | null): string {
  if (!value) return 'Não disponível';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return dateFormatter.format(new Date(`${value}T12:00:00Z`));
}

export function formatAccount(bank: string, agency: string, account: string): string {
  return [bank, agency, account].filter(Boolean).join(' · ');
}

export function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 14) return value;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}
