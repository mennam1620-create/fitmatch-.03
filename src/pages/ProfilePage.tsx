import { useState, useEffect } from 'react';
import { Save, Trash2, Check, Ruler, ShieldAlert } from 'lucide-react';
import type { FitPreference, MeasurementKey, SizingProfile } from '@/types';
import { MEASUREMENT_INFOS, FIT_PREFERENCE_INFOS } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { Spinner } from '@/components/ui/Spinner';

import type { User } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ProfilePageProps {
  profile: SizingProfile;
  onSave: (profile: SizingProfile) => Promise<void>;
  onClear: () => Promise<void>;
  onNavigate: (to: string) => void;
  user: User | null;
}

type FieldErrors = Partial<Record<MeasurementKey | 'heightCm' | 'weightKg', string>>;

function parseNumber(raw: string, max: number, label: string): { error: string | undefined } {
  if (raw === '') return { error: undefined };
  const trimmed = raw.trim();
  if (trimmed === '.' || trimmed === '-' || trimmed === '-.') return { error: undefined };
  const n = Number(trimmed);
  if (Number.isNaN(n)) return { error: `${label} must be a number` };
  if (n > max) return { error: `${label} must be at most ${max}` };
  return { error: undefined };
}

function validateForSave(raw: string, min: number, max: number, label: string): string | undefined {
  if (raw.trim() === '') return undefined;
  const n = Number(raw.trim());
  if (Number.isNaN(n)) return `${label} must be a number`;
  if (n <= 0) return `${label} must be greater than 0`;
  if (n < min) return `${label} must be at least ${min}`;
  if (n > max) return `${label} must be at most ${max}`;
  return undefined;
}

export function ProfilePage({ profile, onSave, onClear, onNavigate, user }: ProfilePageProps) {
  const [name, setName] = useState(profile.name);
  const [measurements, setMeasurements] = useState<Partial<Record<MeasurementKey, string>>>(() => {
    const init: Partial<Record<MeasurementKey, string>> = {};
    (Object.keys(profile.measurements) as MeasurementKey[]).forEach((k) => {
      const v = profile.measurements[k];
      if (typeof v === 'number') init[k] = String(v);
    });
    return init;
  });
  const [heightCm, setHeightCm] = useState<string>(profile.heightCm != null ? String(profile.heightCm) : '');
  const [weightKg, setWeightKg] = useState<string>(profile.weightKg != null ? String(profile.weightKg) : '');
  const [notes, setNotes] = useState(profile.notes ?? '');
  const [fitPreference, setFitPreference] = useState<FitPreference>(profile.fitPreference ?? 'true-to-size');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Admin Request State
  const [adminRequestState, setAdminRequestState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [adminRequestErrorStr, setAdminRequestErrorStr] = useState('');

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'admin_requests', user.uid))
        .then(d => {
          if (d.exists()) {
            setAdminRequestState('success');
          }
        })
        .catch(err => {
          console.error("Failed to check admin request status", err);
        });
    } else {
      setAdminRequestState('idle');
    }
  }, [user]);

  const setFieldError = (key: keyof FieldErrors, error: string | undefined) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (error) next[key] = error;
      else delete next[key];
      return next;
    });
  };

  const updateMeasurement = (key: MeasurementKey, raw: string) => {
    setSaved(false);
    setSaveError(null);
    setMeasurements((prev) => ({ ...prev, [key]: raw }));
    const info = MEASUREMENT_INFOS.find((i) => i.key === key)!;
    setFieldError(key, parseNumber(raw, info.max, info.label).error);
  };

  const updateFitPreference = (pref: FitPreference) => {
    setSaved(false);
    setSaveError(null);
    setFitPreference(pref);
  };

  const updateHeight = (raw: string) => {
    setSaved(false);
    setSaveError(null);
    setHeightCm(raw);
    setFieldError('heightCm', parseNumber(raw, 230, 'Height').error);
  };

  const updateWeight = (raw: string) => {
    setSaved(false);
    setSaveError(null);
    setWeightKg(raw);
    setFieldError('weightKg', parseNumber(raw, 200, 'Weight').error);
  };

  const measurementNumbers: Partial<Record<MeasurementKey, number>> = {};
  (Object.keys(measurements) as MeasurementKey[]).forEach((k) => {
    const raw = measurements[k];
    if (raw != null && raw.trim() !== '') {
      const n = Number(raw);
      if (!Number.isNaN(n)) measurementNumbers[k] = n;
    }
  });

  const hasMeasurementValues = Object.keys(measurementNumbers).length > 0;
  const hasErrors = Object.keys(errors).length > 0;

  const handleSave = async () => {
    setSaveError(null);
    setSaved(false);
    // Strict validation at save time
    const saveErrors: FieldErrors = {};
    (Object.keys(measurements) as MeasurementKey[]).forEach((k) => {
      const raw = measurements[k] ?? '';
      const info = MEASUREMENT_INFOS.find((i) => i.key === k)!;
      const err = validateForSave(raw, info.min, info.max, info.label);
      if (err) saveErrors[k] = err;
    });
    if (heightCm.trim()) {
      const err = validateForSave(heightCm, 120, 230, 'Height');
      if (err) saveErrors.heightCm = err;
    }
    if (weightKg.trim()) {
      const err = validateForSave(weightKg, 30, 200, 'Weight');
      if (err) saveErrors.weightKg = err;
    }
    if (Object.keys(saveErrors).length > 0 || !hasMeasurementValues) {
      setErrors(saveErrors);
      return;
    }

    const heightNum = heightCm.trim() !== '' ? Number(heightCm) : undefined;
    const weightNum = weightKg.trim() !== '' ? Number(weightKg) : undefined;
    
    try {
      await onSave({
        name: name.trim(),
        measurements: measurementNumbers,
        heightCm: typeof heightNum === 'number' && !Number.isNaN(heightNum) ? heightNum : undefined,
        weightKg: typeof weightNum === 'number' && !Number.isNaN(weightNum) ? weightNum : undefined,
        notes: notes.trim() || undefined,
        fitPreference,
        updatedAt: new Date().toISOString(), // this is overwritten by useProfile with serverTimestamp
      });
      setSaved(true);
      setErrors({});
    } catch (error) {
      let msg = error instanceof Error ? error.message : String(error);
      try {
        const parsed = JSON.parse(msg);
        msg = parsed.error || msg;
      } catch {
        // ignore JSON parse error
      }
      setSaveError(msg);
    }
  };

  const handleClear = async () => {
    try {
      await onClear();
      setName('');
      setMeasurements({});
      setHeightCm('');
      setWeightKg('');
      setNotes('');
      setFitPreference('true-to-size');
      setErrors({});
      setSaved(false);
      setSaveError(null);
      setShowClearConfirm(false);
    } catch (error) {
      let msg = error instanceof Error ? error.message : String(error);
      try {
        const parsed = JSON.parse(msg);
        msg = parsed.error || msg;
      } catch {
        // ignore
      }
      setSaveError(msg);
      setShowClearConfirm(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="My Sizing Profile"
        subtitle="Your measurements are saved securely in the cloud. They power every size recommendation across the catalog."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'My Profile' }]}
        onNavigate={onNavigate}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <Card padding="lg">
          {/* Name + body basics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <TextField
              label="Name (optional)"
              value={name}
              onChange={(v) => { setName(v); setSaved(false); }}
              placeholder="e.g. Alex"
            />
            <TextField
              label="Height (cm)"
              type="text"
              inputMode="decimal"
              value={heightCm}
              onChange={updateHeight}
              placeholder="120–230"
              suffix="cm"
              error={errors.heightCm}
            />
            <TextField
              label="Weight (kg)"
              type="text"
              inputMode="decimal"
              value={weightKg}
              onChange={updateWeight}
              placeholder="30–200"
              suffix="kg"
              error={errors.weightKg}
            />
          </div>

          {/* Body measurements */}
          <div className="space-y-5">
            {MEASUREMENT_INFOS.map((info) => (
              <div key={info.key} className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3 sm:gap-6 sm:items-center">
                <div>
                  <label className="block text-sm font-medium text-neutral-900">{info.label}</label>
                  <p className="mt-0.5 text-xs text-neutral-500 leading-relaxed">{info.description}</p>
                </div>
                <TextField
                  label={info.label}
                  type="text"
                  inputMode="decimal"
                  value={measurements[info.key] ?? ''}
                  onChange={(v) => updateMeasurement(info.key, v)}
                  placeholder={`${info.min}–${info.max}`}
                  suffix={info.unit}
                  error={errors[info.key]}
                  className="sm:[&>label]:sr-only"
                />
              </div>
            ))}
          </div>

          {/* Fit preference */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-neutral-900 mb-2">Fit preference</label>
            <p className="text-xs text-neutral-500 leading-relaxed mb-3">Tell us how you like your clothes to fit. We'll adjust recommendations accordingly.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {FIT_PREFERENCE_INFOS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateFitPreference(opt.value)}
                  className={`text-left rounded-lg border p-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
                    fitPreference === opt.value
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
                  }`}
                >
                  <span className="block text-sm font-medium">{opt.label}</span>
                  <span className={`block text-xs mt-0.5 leading-relaxed ${fitPreference === opt.value ? 'text-neutral-300' : 'text-neutral-500'}`}>{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6">
            <label htmlFor="field-fit-notes" className="block text-xs font-medium text-neutral-600 mb-1.5">
              Fit notes (optional)
            </label>
            <textarea
              id="field-fit-notes"
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
              rows={2}
              placeholder="e.g. I prefer a looser fit through the hips; long torso."
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none"
            />
          </div>

          {/* Save / Clear */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {!user ? (
              <div className="w-full flex items-center bg-blue-50 text-blue-800 text-sm px-4 py-3 rounded-lg border border-blue-100">
                Please sign in from the top menu to save your measurements.
              </div>
            ) : (
              <>
                <Button onClick={handleSave} disabled={!hasMeasurementValues || hasErrors} icon={<Save size={16} />}>
                  Save profile
                </Button>
                <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setShowClearConfirm(true)}>
                  Clear
                </Button>
                {saved && (
                  <span className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium self-center animate-fade-in">
                    <Check size={14} /> Saved.
                  </span>
                )}
              </>
            )}
          </div>
          {saveError && (
            <div className="mt-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm" role="alert">
              <strong>Error saving profile:</strong> {saveError}
            </div>
          )}
          {hasErrors && !saveError && (
            <p className="mt-3 text-xs text-rose-600" role="alert">Please fix the highlighted fields before saving.</p>
          )}
        </Card>

        {hasMeasurementValues && !hasErrors && (
          <div className="mt-6 bg-neutral-50 rounded-xl border border-neutral-200 p-5 text-center animate-fade-in">
            <p className="text-sm text-neutral-600">Profile ready.</p>
            <button
              onClick={() => onNavigate('/find-my-size')}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-600 transition-colors"
            >
              <Ruler size={14} /> Find your FitMatch size →
            </button>
          </div>
        )}
        
        {/* Admin Request Section */}
        {user && (
          <div className="mt-8 border-t border-neutral-200 pt-8 text-center max-w-md mx-auto">
            <h3 className="text-sm font-medium text-neutral-900 mb-2">Developer Preview</h3>
            <p className="text-xs text-neutral-500 mb-4">
              The admin dashboard is currently restricted. You can submit a request to view the admin controls.
            </p>
            
            {adminRequestState === 'success' ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-lg flex items-center justify-center gap-2">
                <Check size={16} /> Admin request submitted successfully.
              </div>
            ) : (
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  disabled={adminRequestState === 'loading'}
                  onClick={async () => {
                    setAdminRequestState('loading');
                    try {
                      await setDoc(doc(db, 'admin_requests', user.uid), { 
                        userId: user.uid,
                        email: user.email || 'unknown',
                        status: 'pending',
                        createdAt: new Date().toISOString() 
                      });
                      setAdminRequestState('success');
                    } catch (e: any) {
                      setAdminRequestState('error');
                      setAdminRequestErrorStr(e.message);
                    }
                  }}
                  icon={adminRequestState === 'loading' ? <Spinner size="sm" /> : <ShieldAlert size={16} />}
                >
                  {adminRequestState === 'loading' ? 'Submitting...' : 'Request Admin Access'}
                </Button>
                
                {adminRequestState === 'error' && (
                  <p className="text-xs text-rose-600">Failed to submit request: {adminRequestErrorStr}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label="Confirm clear">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full animate-scale-in p-6">
            <h2 className="font-serif text-lg text-neutral-900">Clear profile?</h2>
            <p className="mt-2 text-sm text-neutral-500">This will erase all your saved measurements from this device. This cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
              <Button variant="primary" className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800" onClick={handleClear}>
                Yes, clear it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
