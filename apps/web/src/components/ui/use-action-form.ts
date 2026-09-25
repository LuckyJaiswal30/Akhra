'use client';

import { startTransition, useEffect, useRef, type FormEvent } from 'react';
import type { ActionState } from '@akhra/shared';

export function useActionForm(
  dispatch: (payload: FormData) => void,
  state: ActionState<unknown>,
  onSubmitted?: () => void,
) {
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const payload = new FormData(event.currentTarget, submitter);
    onSubmitted?.();
    startTransition(() => dispatch(payload));
  }

  return { ref, onSubmit };
}
