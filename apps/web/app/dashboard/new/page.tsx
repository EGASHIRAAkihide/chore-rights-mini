/* eslint-disable react/jsx-no-bind */
'use client';

import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

type FormState = {
  title: string;
  description: string;
  tags: string;
  visibility: 'public' | 'private';
  iccCountry: string;
  iccRegistrant: string;
  iccSerial: string;
  videoStorageKey: string;
  exclusivity: 'exclusive' | 'non-exclusive';
  termsAccepted: boolean;
};

type RegisterWorkResponse = {
  id: string;
  icc: string;
  title?: string;
};

const defaultState: FormState = {
  title: '',
  description: '',
  tags: '',
  visibility: 'public',
  iccCountry: 'JP',
  iccRegistrant: 'CRG',
  iccSerial: '000001',
  videoStorageKey: '',
  exclusivity: 'exclusive',
  termsAccepted: true,
};

export default function NewChoreographyPage(): JSX.Element {
  const [form, setForm] = useState<FormState>(defaultState);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successPayload, setSuccessPayload] = useState<RegisterWorkResponse | null>(null);

  const derivedVideoKey = useMemo(() => {
    if (form.videoStorageKey.trim().length > 0) {
      return form.videoStorageKey.trim();
    }
    const serial = form.iccSerial.replace(/\D+/g, '').padStart(6, '0');
    const safeRegistrant = form.iccRegistrant.toUpperCase();
    return `public/works/${form.iccCountry.toUpperCase()}-${safeRegistrant}-${serial}.mp4`;
  }, [form.iccCountry, form.iccRegistrant, form.iccSerial, form.videoStorageKey]);

  const categories = useMemo(() => {
    return form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 5);
  }, [form.tags]);

  const onChange = useCallback(
    <Key extends keyof FormState>(key: Key) =>
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value =
          event.target.type === 'checkbox'
            ? (event.target as HTMLInputElement).checked
            : event.target.value;
        setForm((prev) => ({
          ...prev,
          [key]: value as FormState[Key],
        }));
      },
    [],
  );

  const onRadioChange = useCallback((value: FormState['exclusivity']) => {
    setForm((prev) => ({
      ...prev,
      exclusivity: value,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setForm(defaultState);
    setStatus('idle');
    setErrorMessage(null);
    setSuccessPayload(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (status === 'submitting') {
        return;
      }

      setStatus('submitting');
      setErrorMessage(null);
      setSuccessPayload(null);

      const serial = form.iccSerial.replace(/\D+/g, '').padStart(6, '0');

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        categories: categories.length > 0 ? categories : undefined,
        video: { storageKey: derivedVideoKey },
        icc: {
          country: form.iccCountry.trim().toUpperCase(),
          registrant: form.iccRegistrant.trim().toUpperCase(),
          serial,
        },
        fingerprint: {
          algo: 'pose-v1',
          hash_or_vector: crypto.randomUUID().replace(/-/g, ''),
        },
        delegation: {
          isDelegated: form.exclusivity === 'non-exclusive',
          scope: form.exclusivity === 'non-exclusive' ? ['license_collect'] : [],
        },
        termsAccepted: form.termsAccepted,
      };

      if (!payload.termsAccepted) {
        setErrorMessage('You must accept the terms to register a work.');
        setStatus('error');
        return;
      }

      try {
        const response = await fetch('/api/works/register', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const json = (await response.json().catch(() => null)) as {
            error?: { detail?: string; message?: string };
            detail?: string;
          } | null;
          const detail =
            json?.error?.detail ??
            json?.error?.message ??
            json?.detail ??
            (response.status === 409
              ? 'A choreography with this ICC already exists.'
              : 'Unable to register the choreography right now.');
          setErrorMessage(detail);
          setStatus('error');
          return;
        }

        const data = (await response.json()) as RegisterWorkResponse;
        setSuccessPayload(data);
        setStatus('success');
      } catch (error) {
        console.error('Failed to submit work registration form', error);
        setErrorMessage('Network error while registering work.');
        setStatus('error');
      }
    },
    [status, form, categories, derivedVideoKey],
  );

  return (
    <section className="space-y-8" data-testid="newwork-form">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Register new choreography</h1>
        <p className="text-sm text-slate-600">
          Provide your work details below. Once submitted, the ICC will be locked and can be used to
          license the routine across partners.
        </p>
      </header>

      <form className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-700" htmlFor="newwork-title">
            Title
          </label>
          <input
            id="newwork-title"
            name="title"
            type="text"
            placeholder="Midnight Reverie"
            value={form.title}
            onChange={onChange('title')}
            required
            data-testid="newwork-title"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-700" htmlFor="newwork-description">
            Description
          </label>
          <textarea
            id="newwork-description"
            name="description"
            placeholder="Describe the routine, inspiration, and formation notes..."
            value={form.description}
            onChange={onChange('description')}
            rows={4}
            data-testid="newwork-description"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="newwork-tags">
              Tags
            </label>
            <input
              id="newwork-tags"
              name="tags"
              type="text"
              placeholder="hiphop, tutorial"
              value={form.tags}
              onChange={onChange('tags')}
              data-testid="newwork-tags"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <p className="text-xs text-slate-500">Separate tags with commas (max five).</p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="newwork-visibility">
              Visibility
            </label>
            <select
              id="newwork-visibility"
              name="visibility"
              value={form.visibility}
              onChange={onChange('visibility')}
              data-testid="newwork-visibility"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="public">Public listing</option>
              <option value="private">Private (invite only)</option>
            </select>
          </div>
        </div>

        <fieldset className="grid gap-3 rounded-lg border border-slate-200 p-4">
          <legend className="text-sm font-semibold text-slate-700">ICC details</legend>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor="newwork-icc-country">
                Country
              </label>
              <input
                id="newwork-icc-country"
                name="iccCountry"
                type="text"
                value={form.iccCountry}
                onChange={onChange('iccCountry')}
                data-testid="newwork-icc-country"
                maxLength={2}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor="newwork-icc-registrant">
                Registrant
              </label>
              <input
                id="newwork-icc-registrant"
                name="iccRegistrant"
                type="text"
                value={form.iccRegistrant}
                onChange={onChange('iccRegistrant')}
                data-testid="newwork-icc-registrant"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor="newwork-icc-serial">
                Serial
              </label>
              <input
                id="newwork-icc-serial"
                name="iccSerial"
                type="text"
                value={form.iccSerial}
                onChange={onChange('iccSerial')}
                data-testid="newwork-icc-serial"
                inputMode="numeric"
                maxLength={6}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>
        </fieldset>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-700" htmlFor="newwork-video-storage">
            Video storage key
          </label>
          <input
            id="newwork-video-storage"
            name="videoStorageKey"
            type="text"
            placeholder="public/works/midnight-reverie.mp4"
            value={form.videoStorageKey}
            onChange={onChange('videoStorageKey')}
            data-testid="newwork-video-storage"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <p className="text-xs text-slate-500">
            Provide the Supabase storage key for the performance video. Defaults to an ICC-based key
            if left blank.
          </p>
        </div>

        <fieldset className="grid gap-3 rounded-lg border border-slate-200 p-4">
          <legend className="text-sm font-semibold text-slate-700">License exclusivity</legend>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label
              htmlFor="newwork-exclusivity-exclusive"
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm focus-within:ring-2 focus-within:ring-brand/20 ${
                form.exclusivity === 'exclusive'
                  ? 'border-brand bg-brand-muted text-brand'
                  : 'border-slate-200 text-slate-700'
              }`}
            >
              <input
                id="newwork-exclusivity-exclusive"
                type="radio"
                name="exclusivity"
                value="exclusive"
                checked={form.exclusivity === 'exclusive'}
                onChange={() => onRadioChange('exclusive')}
                aria-label="Exclusive"
                className="h-4 w-4"
              />
              <span className="font-semibold">Exclusive</span>
              <span className="text-xs text-slate-500">
                Single partner license, blocks additional deals.
              </span>
            </label>
            <label
              htmlFor="newwork-exclusivity-nonexclusive"
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm focus-within:ring-2 focus-within:ring-brand/20 ${
                form.exclusivity === 'non-exclusive'
                  ? 'border-brand bg-brand-muted text-brand'
                  : 'border-slate-200 text-slate-700'
              }`}
            >
              <input
                id="newwork-exclusivity-nonexclusive"
                type="radio"
                name="exclusivity"
                value="non-exclusive"
                checked={form.exclusivity === 'non-exclusive'}
                onChange={() => onRadioChange('non-exclusive')}
                aria-label="Non-exclusive"
                className="h-4 w-4"
              />
              <span className="font-semibold">Non-exclusive</span>
              <span className="text-xs text-slate-500">
                Collect royalties from multiple simultaneous deals.
              </span>
            </label>
          </div>
        </fieldset>

        <label className="flex items-start gap-3 text-sm text-slate-700" htmlFor="newwork-terms">
          <input
            id="newwork-terms"
            type="checkbox"
            checked={form.termsAccepted}
            onChange={onChange('termsAccepted')}
            data-testid="newwork-terms"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
          />
          <span>
            I confirm this choreography is original and I agree to the ChoreRights terms of service.
          </span>
        </label>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={status === 'submitting'}
            data-testid="newwork-submit"
            aria-busy={status === 'submitting'}
          >
            {status === 'submitting' ? 'Submitting…' : 'Register choreography'}
          </Button>
          <Button type="button" variant="ghost" onClick={resetForm}>
            Reset form
          </Button>
        </div>

        <div aria-live="polite" className="min-h-[1.25rem] text-sm" data-testid="newwork-feedback">
          {status === 'success' && successPayload ? (
            <span className="text-emerald-600">
              Work registered! ICC <strong>{successPayload.icc}</strong> is now active.
            </span>
          ) : null}
          {status === 'error' && errorMessage ? (
            <span className="text-rose-600">{errorMessage}</span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
