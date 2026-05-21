import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function Verify() {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-[70vh] place-items-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t('verify.title')}</div>
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {t('verify.subtitle')}
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="primary" onClick={() => (window.location.href = '/login')}>
            {t('dashboard.goToLogin')}
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            {t('verify.home')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
