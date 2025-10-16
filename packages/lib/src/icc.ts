const SERIAL_LENGTH = 6;

export type ICCParts = {
  country: string;
  registrant: string;
  serial: string;
};

const serialFormatter = new Intl.NumberFormat('en', {
  minimumIntegerDigits: SERIAL_LENGTH,
  useGrouping: false,
});

export function generateSerial(seed?: number): string {
  if (typeof seed === 'number' && seed >= 0) {
    return serialFormatter.format(Math.floor(seed % Math.pow(10, SERIAL_LENGTH)));
  }

  const randomValue = Math.floor(Math.random() * Math.pow(10, SERIAL_LENGTH));
  return serialFormatter.format(randomValue);
}

export function formatICC(parts: ICCParts): string {
  return `${parts.country}-${parts.registrant}-${parts.serial}`.toUpperCase();
}

export function generateICC(country: string, registrant: string, seed?: number): string {
  const serial = generateSerial(seed);
  return formatICC({ country, registrant, serial });
}

export function isValidICC(value: string): boolean {
  return /^([A-Z]{2})-([A-Z0-9]{3,5})-(\d{6})$/.test(value);
}
