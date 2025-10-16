import { z } from '../../lib/src/z';

export const userRoleSchema = z.enum(['creator', 'licensee', 'admin']);

export const userRowSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  role: userRoleSchema,
  wallet_address: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
});

export const workStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);

export const workRowSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  metadata: z.unknown().nullable(),
  icc_code: z.string(),
  video_url: z.string().nullable(),
  fingerprint_id: z.string().uuid().nullable(),
  status: workStatusSchema,
  created_at: z.string().datetime({ offset: true }),
});

export const fingerprintRowSchema = z.object({
  id: z.string().uuid(),
  algo: z.string(),
  hash: z.string(),
  work_id: z.string().uuid(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string().datetime({ offset: true }),
});

export const licenseRequestStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export const licenseRequestRowSchema = z.object({
  id: z.string().uuid(),
  work_id: z.string().uuid(),
  requester_id: z.string().uuid(),
  request_data: z.unknown(),
  status: licenseRequestStatusSchema,
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }).nullable(),
});

export const agreementStatusSchema = z.enum(['DRAFT', 'SIGNED', 'FINALIZED']);

export const agreementRowSchema = z.object({
  id: z.string().uuid(),
  work_id: z.string().uuid(),
  creator_id: z.string().uuid(),
  licensee_id: z.string().uuid(),
  terms: z.unknown(),
  status: agreementStatusSchema,
  polygon_tx_hash: z.string().nullable(),
  signed_at: z.string().datetime({ offset: true }).nullable(),
  created_at: z.string().datetime({ offset: true }),
});

export const paymentSourceSchema = z.enum(['stripe', 'test', 'manual']);
export const paymentStatusSchema = z.enum(['RECORDED', 'DISTRIBUTED']);

export const paymentRowSchema = z.object({
  id: z.string().uuid(),
  agreement_id: z.string().uuid(),
  amount: z.coerce.number(),
  currency: z.string(),
  source: paymentSourceSchema,
  status: paymentStatusSchema,
  created_at: z.string().datetime({ offset: true }),
});

export const eventRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  kind: z.string(),
  meta: z.unknown().nullable(),
  created_at: z.string().datetime({ offset: true }),
});

export const kpiDailyRowSchema = z.object({
  day: z.string(),
  signup_users: z.number().int(),
  work_count: z.number().int(),
  license_requests: z.number().int(),
  agreements: z.number().int(),
  api_uptime: z.coerce.number().nullable(),
  ai_precision: z.coerce.number().nullable(),
  updated_at: z.string().datetime({ offset: true }),
});

export type UserRow = z.infer<typeof userRowSchema>;
export type WorkRow = z.infer<typeof workRowSchema>;
export type FingerprintRow = z.infer<typeof fingerprintRowSchema>;
export type LicenseRequestRow = z.infer<typeof licenseRequestRowSchema>;
export type AgreementRow = z.infer<typeof agreementRowSchema>;
export type PaymentRow = z.infer<typeof paymentRowSchema>;
export type EventRow = z.infer<typeof eventRowSchema>;
export type KpiDailyRow = z.infer<typeof kpiDailyRowSchema>;

export const eventInsertSchema = eventRowSchema.pick({
  kind: true,
  meta: true,
}).extend({
  user_id: z.string().uuid().nullable().optional(),
});
