'use client';

import { useEffect, useRef } from 'react';

export type Tab = 'signin' | 'create';
export type FieldErrors = Partial<
  Record<
    'name' | 'email' | 'phone' | 'districtCode' | 'password' | 'confirmPassword' | 'acceptTerms',
    string
  >
>;

export interface Paths {
  afterAuth: string;
  ssoCallback: string;
  signUpPath: string;
  signInPath: string;
}

export function useFocusOnChange(value: unknown) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    document.querySelector<HTMLElement>('[data-step-heading]')?.focus();
  }, [value]);
}
