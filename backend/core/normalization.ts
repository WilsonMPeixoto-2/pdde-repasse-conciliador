import type { BankAccount } from './schemas';

export function digits(value: string): string {
  return value.replace(/\D/g, '');
}

export function canonicalCnpj(value: string): string {
  return digits(value).padStart(14, '0');
}

export function canonicalProgramCode(value: string): string {
  return value.trim().toUpperCase();
}

function canonicalNumericIdentifier(value: string): string {
  const normalized = value.replace(/[^0-9A-Z]/gi, '').toUpperCase();
  return normalized.replace(/^0+(?=[0-9A-Z])/, '');
}

export function canonicalAccount(account: BankAccount): string {
  const bankDigits = digits(account.bank);
  const bank = bankDigits ? bankDigits.padStart(3, '0') : account.bank.toUpperCase();
  return [
    bank,
    canonicalNumericIdentifier(account.agency),
    canonicalNumericIdentifier(account.number),
  ].join('|');
}

export function sameAccount(left: BankAccount, right: BankAccount): boolean {
  return canonicalAccount(left) === canonicalAccount(right);
}

export function canonicalDocument(value: string): string {
  return value.replace(/[^0-9A-Z]/gi, '').replace(/^0+(?=[0-9A-Z])/, '').toUpperCase();
}

export function canonicalText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^0-9A-Z]+/gi, ' ')
    .trim()
    .toUpperCase();
}
