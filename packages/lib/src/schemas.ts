import { z } from 'zod';

const mediaEnum = z.enum(['sns', 'web', 'tv', 'livestream', 'in-person']);

export const workFingerprintSchema = z.object({
  algo: z.string().min(1, 'Fingerprint algorithm is required'),
  hash_or_vector: z.string().min(1, 'Fingerprint hash is required'),
});

export const workDelegationSchema = z.object({
  isDelegated: z.boolean(),
  scope: z.array(z.enum(['license_collect', 'license_enforce'])).optional(),
});

export const workVideoSchema = z.object({
  storageKey: z.string().min(1, 'Video storage key is required'),
});

export const workIccSchema = z.object({
  country: z.string().regex(/^[A-Z]{2}$/u, 'Country must be ISO 3166-1 alpha-2'),
  registrant: z
    .string()
    .regex(/^[A-Z0-9]{3,5}$/u, 'Registrant must be 3-5 alphanumeric characters'),
  serial: z.string().regex(/^\d{6}$/u, 'Serial must be 6 digits'),
});

export const createWorkSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  categories: z.array(z.string()).max(5).optional(),
  video: workVideoSchema,
  icc: workIccSchema,
  fingerprint: workFingerprintSchema.optional(),
  delegation: workDelegationSchema.optional(),
  termsAccepted: z.literal(true),
});

export const licenseRequestSchema = z.object({
  workId: z.string().uuid(),
  territories: z.array(z.string().regex(/^[A-Z]{2}$/u)).min(1),
  durationDays: z.number().int().positive().max(365),
  media: z.array(mediaEnum).min(1),
  exclusivity: z.enum(['exclusive', 'non-exclusive']),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Start date must use YYYY-MM-DD')
    .optional(),
  contact: z.object({
    company: z.string().min(1),
    email: z.string().email(),
  }),
});

export const licenseQuoteSchema = licenseRequestSchema.pick({
  workId: true,
  territories: true,
  durationDays: true,
  media: true,
});

export const kpiPeriodSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

type inferSchema<T extends z.ZodTypeAny> = z.infer<T>;

export type CreateWorkPayload = inferSchema<typeof createWorkSchema>;
export type LicenseRequestPayload = inferSchema<typeof licenseRequestSchema>;
export type LicenseQuotePayload = inferSchema<typeof licenseQuoteSchema>;
