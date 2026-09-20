'use client';

import { useState, type KeyboardEvent } from 'react';
import type { PasswordPolicy } from '@akhra/shared';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Labels } from './auth-parts';
import { CreatePanel } from './create-account-panel';
import { SignInPanel } from './sign-in-panel';
import type { Paths, Tab } from './auth-card-parts';

export function AuthCard({
  labels,
  locale,
  initialTab,
  paths,
  policy,
  social,
}: {
  labels: Labels;
  locale: string;
  initialTab: Tab;
  paths: Paths;
  policy: PasswordPolicy;
  social: string[];
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [inFlow, setInFlow] = useState(false);

  function select(next: Tab) {
    setTab(next);
    window.history.replaceState(null, '', next === 'create' ? paths.signUpPath : paths.signInPath);
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next: Tab = tab === 'signin' ? 'create' : 'signin';
    select(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  return (
    <Card className="p-6 sm:p-10">
      {!inFlow && (
        <>
          <h1 className="text-ink text-3xl font-bold">
            {tab === 'signin' ? labels.welcomeTitle : labels.createTitle}
          </h1>
          <p className="text-subtle mt-2">
            {tab === 'signin' ? labels.welcomeSubtitle : labels.createSubtitle}
          </p>
          <div
            role="tablist"
            aria-label={labels.tabsLabel}
            className="bg-well mt-7 grid grid-cols-2 rounded-xl p-1"
          >
            {(['signin', 'create'] as const).map((name) => (
              <button
                key={name}
                id={`tab-${name}`}
                type="button"
                role="tab"
                aria-selected={tab === name}
                aria-controls={`panel-${name}`}
                tabIndex={tab === name ? 0 : -1}
                onKeyDown={onTabKey}
                onClick={() => select(name)}
                className={cn(
                  'h-12 rounded-lg text-[15px] font-semibold transition-colors',
                  tab === name
                    ? 'border-sal bg-surface text-sal shadow-card border-b-2'
                    : 'text-subtle hover:text-ink',
                )}
              >
                {name === 'signin' ? labels.tabSignIn : labels.tabCreate}
              </button>
            ))}
          </div>
        </>
      )}
      <div
        id={`panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className={cn(!inFlow && 'mt-7')}
      >
        {tab === 'signin' ? (
          <SignInPanel
            labels={labels}
            paths={paths}
            social={social}
            onFlow={setInFlow}
            onSwitch={() => select('create')}
          />
        ) : (
          <CreatePanel
            labels={labels}
            locale={locale}
            paths={paths}
            policy={policy}
            social={social}
            onFlow={setInFlow}
            onSwitch={() => select('signin')}
          />
        )}
      </div>
    </Card>
  );
}
