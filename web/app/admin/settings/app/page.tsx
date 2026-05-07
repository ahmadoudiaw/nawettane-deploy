'use client';

import { useEffect, useState } from 'react';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { SuperAdminGuard } from '@/components/super-admin-guard';
import { useToast } from '@/components/ToastProvider';
import { ApiError, formatApiError, getAppSettings, updateAppSettings } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { AppSettings } from '@/lib/types';

export default function AppSettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [applicationTitle, setApplicationTitle] = useState('');
  const [contactLabel, setContactLabel] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [developerName, setDeveloperName] = useState('');
  const [developerWebsite, setDeveloperWebsite] = useState('');
  const [appDownloadAndroidUrl, setAppDownloadAndroidUrl] = useState('');
  const [appDownloadIosUrl, setAppDownloadIosUrl] = useState('');
  const [appDownloadHelpText, setAppDownloadHelpText] = useState('');

  useEffect(() => {
    const s = getSession();
    if (!s) return;
    getAppSettings(s.token)
      .then((data) => {
        setSettings(data);
        setApplicationTitle(data.applicationTitle);
        setContactLabel(data.contactLabel);
        setContactPhone(data.contactPhone);
        setDeveloperName(data.developerName);
        setDeveloperWebsite(data.developerWebsite);
        setAppDownloadAndroidUrl(data.appDownloadAndroidUrl ?? '');
        setAppDownloadIosUrl(data.appDownloadIosUrl ?? '');
        setAppDownloadHelpText(data.appDownloadHelpText ?? '');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setError(formatApiError(err));
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const s = getSession();
    if (!s) return;
    setLoading(true);
    try {
      const updated = await updateAppSettings(s.token, {
        applicationTitle: applicationTitle.trim(),
        contactLabel: contactLabel.trim(),
        contactPhone: contactPhone.trim(),
        developerName: developerName.trim(),
        developerWebsite: developerWebsite.trim(),
        appDownloadAndroidUrl: appDownloadAndroidUrl.trim(),
        appDownloadIosUrl: appDownloadIosUrl.trim(),
        appDownloadHelpText: appDownloadHelpText.trim(),
      });
      setSettings(updated);
      toast.success('Paramètres application enregistrés.');
    } catch (err) {
      if (err instanceof ApiError && err.globallyHandled) return;
      toast.error('Erreur', formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    if (!settings) return;
    setApplicationTitle(settings.applicationTitle);
    setContactLabel(settings.contactLabel);
    setContactPhone(settings.contactPhone);
    setDeveloperName(settings.developerName);
    setDeveloperWebsite(settings.developerWebsite);
    setAppDownloadAndroidUrl(settings.appDownloadAndroidUrl ?? '');
    setAppDownloadIosUrl(settings.appDownloadIosUrl ?? '');
    setAppDownloadHelpText(settings.appDownloadHelpText ?? '');
  }

  function handleTestLink(url: string, label: string) {
    if (!url.trim()) {
      toast.error('Lien vide', `Le lien ${label} n'est pas renseigné.`);
      return;
    }
    window.open(url.trim(), '_blank', 'noopener,noreferrer');
  }

  return (
    <PageShell
      eyebrow="Administration · Paramètres"
      title="Application mobile"
      description="Textes et liens de téléchargement affichés dans les applications et sur le Web Buyer."
    >
      <SuperAdminGuard>
        <AdminNav />

        <section className="panel stack">
          <div className="toolbar">
            <div>
              <h3>Paramètres de l&apos;application</h3>
              <p className="muted">Ces informations sont affichées dans l&apos;écran Contact des apps mobiles.</p>
            </div>
          </div>

          {error && <div className="error">{error}</div>}
          {!settings && !error && <div className="muted">Chargement…</div>}

          {settings && (
            <form className="form" onSubmit={handleSubmit}>
              <div className="form__grid">
                <div className="field">
                  <label htmlFor="applicationTitle">Titre de l&apos;application</label>
                  <input
                    id="applicationTitle"
                    type="text"
                    value={applicationTitle}
                    onChange={(e) => setApplicationTitle(e.target.value)}
                    placeholder="Nawettane : Système de Billetterie digitale"
                    maxLength={120}
                  />
                </div>

                <div className="field">
                  <label htmlFor="contactLabel">Contact (nom ou service)</label>
                  <input
                    id="contactLabel"
                    type="text"
                    value={contactLabel}
                    onChange={(e) => setContactLabel(e.target.value)}
                    placeholder="Ex. Direction Nawettane"
                    maxLength={120}
                  />
                </div>

                <div className="field">
                  <label htmlFor="contactPhone">Téléphone</label>
                  <input
                    id="contactPhone"
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Ex. +221 77 000 00 00"
                    maxLength={50}
                  />
                </div>

                <div className="field">
                  <label htmlFor="developerName">Nom du développeur</label>
                  <input
                    id="developerName"
                    type="text"
                    value={developerName}
                    onChange={(e) => setDeveloperName(e.target.value)}
                    placeholder="Ex. DICOTECH"
                    maxLength={120}
                  />
                </div>

                <div className="field">
                  <label htmlFor="developerWebsite">Site web du développeur</label>
                  <input
                    id="developerWebsite"
                    type="text"
                    value={developerWebsite}
                    onChange={(e) => setDeveloperWebsite(e.target.value)}
                    placeholder="Ex. www.dicotech.sn"
                    maxLength={200}
                  />
                </div>
              </div>

              {/* ── Liens de téléchargement ── */}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 24, marginTop: 8 }}>
                <h4 style={{ margin: '0 0 4px' }}>Liens de téléchargement</h4>
                <p className="muted" style={{ margin: '0 0 20px', fontSize: '0.9rem' }}>
                  Ces liens alimentent la modale &ldquo;Télécharger l&apos;application&rdquo; sur le Web Buyer.
                  Laissez vide si l&apos;application n&apos;est pas encore publiée.
                </p>

                <div className="form__grid">
                  <div className="field">
                    <label htmlFor="appDownloadAndroidUrl">Lien Android (Google Drive / Play Store)</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        id="appDownloadAndroidUrl"
                        type="url"
                        value={appDownloadAndroidUrl}
                        onChange={(e) => setAppDownloadAndroidUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        maxLength={500}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => handleTestLink(appDownloadAndroidUrl, 'Android')}
                        title="Tester le lien Android"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Tester ↗
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="appDownloadIosUrl">Lien iPhone (App Store / TestFlight)</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        id="appDownloadIosUrl"
                        type="url"
                        value={appDownloadIosUrl}
                        onChange={(e) => setAppDownloadIosUrl(e.target.value)}
                        placeholder="https://apps.apple.com/..."
                        maxLength={500}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => handleTestLink(appDownloadIosUrl, 'iPhone')}
                        title="Tester le lien iPhone"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Tester ↗
                      </button>
                    </div>
                  </div>

                  <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="appDownloadHelpText">Texte d&apos;aide (optionnel)</label>
                    <input
                      id="appDownloadHelpText"
                      type="text"
                      value={appDownloadHelpText}
                      onChange={(e) => setAppDownloadHelpText(e.target.value)}
                      placeholder="Ex. Disponible sur Android, iOS bientôt disponible."
                      maxLength={300}
                    />
                  </div>
                </div>
              </div>

              <div className="button-row" style={{ marginTop: 16 }}>
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                >
                  Réinitialiser
                </button>
              </div>
            </form>
          )}
        </section>
      </SuperAdminGuard>
    </PageShell>
  );
}
