'use client';

import { useEffect, useRef, useState } from 'react';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { SuperAdminGuard } from '@/components/super-admin-guard';
import {
  formatApiError,
  getPaymentConfig,
  testPaymentConfig,
  updatePaymentConfig,
} from '@/lib/api';
import { getSession } from '@/lib/auth';
import { PaymentConfig, PaymentConfigTestResult } from '@/lib/types';

function SecretField({
  label,
  name,
  isConfigured,
  value,
  onChange,
}: {
  label: string;
  name: string;
  isConfigured: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="field">
      <label>
        {label}
        {isConfigured && (
          <span className="muted" style={{ marginLeft: 8, fontSize: '0.85em' }}>
            (valeur enregistrée)
          </span>
        )}
      </label>
      <input
        type="password"
        name={name}
        value={value}
        placeholder={isConfigured ? '●●●●●● laisser vide pour ne pas modifier' : 'Non configuré'}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
      />
    </div>
  );
}

export default function PaymentSettingsPage() {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<PaymentConfigTestResult | null>(null);

  const [waveEnabled, setWaveEnabled] = useState(false);
  const [waveApiKey, setWaveApiKey] = useState('');
  const [waveMerchantId, setWaveMerchantId] = useState('');
  const [omEnabled, setOmEnabled] = useState(false);
  const [omClientId, setOmClientId] = useState('');
  const [omClientSecret, setOmClientSecret] = useState('');
  const [omMerchantKey, setOmMerchantKey] = useState('');
  const [sandbox, setSandbox] = useState(true);

  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const session = getSession();
    if (!session) return;

    getPaymentConfig(session.token)
      .then((cfg) => {
        setConfig(cfg);
        setWaveEnabled(cfg.waveEnabled);
        setOmEnabled(cfg.omEnabled);
        setSandbox(cfg.sandbox);
      })
      .catch((err) => {
        setError(formatApiError(err));
      });
  }, []);

  async function handleSave() {
    const session = getSession();
    if (!session) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    setTestResult(null);

    try {
      const body: Parameters<typeof updatePaymentConfig>[1] = {
        waveEnabled,
        omEnabled,
        sandbox,
      };

      if (waveApiKey.trim()) body.waveApiKey = waveApiKey.trim();
      if (waveMerchantId.trim()) body.waveMerchantId = waveMerchantId.trim();
      if (omClientId.trim()) body.omClientId = omClientId.trim();
      if (omClientSecret.trim()) body.omClientSecret = omClientSecret.trim();
      if (omMerchantKey.trim()) body.omMerchantKey = omMerchantKey.trim();

      const updated = await updatePaymentConfig(session.token, body);
      setConfig(updated);
      setWaveApiKey('');
      setWaveMerchantId('');
      setOmClientId('');
      setOmClientSecret('');
      setOmMerchantKey('');
      setSuccess('Configuration sauvegardée.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    const session = getSession();
    if (!session) return;

    setTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const result = await testPaymentConfig(session.token);
      setTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du test.');
    } finally {
      setTesting(false);
    }
  }

  return (
    <PageShell
      eyebrow="Paramètres"
      title="Configuration paiements"
      description="Clés API Wave et Orange Money — valeurs jamais affichées en clair après sauvegarde."
    >
      <SuperAdminGuard>
        <AdminNav />

        {error && <div className="error">{error}</div>}
        {success && <div className="panel"><strong>{success}</strong></div>}

        {testResult && (
          <div className="panel">
            <strong>Test : {testResult.ok ? '✓ OK' : '✗ Incomplet'}</strong>
            {testResult.mode && <div className="muted">Mode : {testResult.mode}</div>}
            {testResult.wave && <div className="muted">Wave : {testResult.wave}</div>}
            {testResult.om && <div className="muted">Orange Money : {testResult.om}</div>}
            {testResult.message && <div className="muted">{testResult.message}</div>}
          </div>
        )}

        {/* Wave */}
        <section className="panel stack">
          <div className="toolbar">
            <h3>Wave</h3>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={waveEnabled}
                onChange={(e) => setWaveEnabled(e.target.checked)}
              />
              Activer Wave
            </label>
          </div>

          <SecretField
            label="Clé API Wave"
            name="waveApiKey"
            isConfigured={config?.waveApiKey === '***'}
            value={waveApiKey}
            onChange={setWaveApiKey}
          />
          <SecretField
            label="Merchant ID Wave"
            name="waveMerchantId"
            isConfigured={config?.waveMerchantId === '***'}
            value={waveMerchantId}
            onChange={setWaveMerchantId}
          />
        </section>

        {/* Orange Money */}
        <section className="panel stack">
          <div className="toolbar">
            <h3>Orange Money</h3>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={omEnabled}
                onChange={(e) => setOmEnabled(e.target.checked)}
              />
              Activer Orange Money
            </label>
          </div>

          <SecretField
            label="Client ID"
            name="omClientId"
            isConfigured={config?.omClientId === '***'}
            value={omClientId}
            onChange={setOmClientId}
          />
          <SecretField
            label="Client Secret"
            name="omClientSecret"
            isConfigured={config?.omClientSecret === '***'}
            value={omClientSecret}
            onChange={setOmClientSecret}
          />
          <SecretField
            label="Merchant Key"
            name="omMerchantKey"
            isConfigured={config?.omMerchantKey === '***'}
            value={omMerchantKey}
            onChange={setOmMerchantKey}
          />
        </section>

        {/* Mode */}
        <section className="panel stack">
          <h3>Mode d&apos;exécution</h3>
          <div className="field">
            <label>Environnement</label>
            <select value={sandbox ? 'sandbox' : 'production'} onChange={(e) => setSandbox(e.target.value === 'sandbox')}>
              <option value="sandbox">Sandbox (tests)</option>
              <option value="production">Production</option>
            </select>
          </div>
        </section>

        {/* Actions */}
        <div className="panel button-row">
          <button
            className="button button--secondary"
            type="button"
            disabled={testing}
            onClick={handleTest}
          >
            {testing ? 'Test en cours...' : 'Tester la configuration'}
          </button>
          <button
            className="button button--primary"
            type="button"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </SuperAdminGuard>
    </PageShell>
  );
}
