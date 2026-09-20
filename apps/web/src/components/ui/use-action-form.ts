'use client';

import { startTransition, useEffect, useRef, type FormEvent } from 'react';
import type { ActionState } from '@akhra/shared';

export function useActionForm(
  dispatch: (payload: FormData) => void,
  state: ActionState<unknown>,
  /**
   * Called as the form is submitted, before the action runs. Lists whose rows disappear on success
   * use it to note what was acted on: React unmounts the row in the same commit that delivers the
   * result, so an effect inside the row cannot be relied on to run.
   *
   * It is a parameter rather than an `onSubmit` prop on the form, because spreading the returned
   * props and then adding `onSubmit` silently replaces the handler below and the form stops
   * submitting at all.
   */
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
