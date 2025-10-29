"use client";

import { useRouter } from 'next/navigation';

import { useState, useTransition } from 'react';

type AdminMarkPaidButtonProps = {
  instructionId: string;
};

export function AdminMarkPaidButton({ instructionId }: AdminMarkPaidButtonProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const disabled = isRefreshing || isSubmitting;

  const handleClick = async () => {
    if (disabled) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/payouts/${instructionId}/mark-paid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const problem = await response.json().catch(() => null);
        const detail =
          typeof problem?.detail === 'string' && problem.detail.length > 0
            ? problem.detail
            : 'Unable to mark payout as paid.';
        setErrorMessage(detail);
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error('Failed to mark payout as paid via admin button', error);
      setErrorMessage('Unable to reach the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-1 text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
        data-testid="admin-mark-paid-button"
        data-instruction-id={instructionId}
      >
        {disabled ? 'Marking...' : 'Mark as paid'}
      </button>
      {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
