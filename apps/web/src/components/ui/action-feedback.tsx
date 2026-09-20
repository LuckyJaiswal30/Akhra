import type { ActionState } from '@akhra/shared';
import { Alert } from './alert';

export function ActionFeedback({ state }: { state: ActionState<unknown> }) {
  if (!state) return null;
  if (state.ok) return state.message ? <Alert tone="success">{state.message}</Alert> : null;
  return <Alert tone="error">{state.error.message}</Alert>;
}

export function fieldError(state: ActionState<unknown>, field: string): string | undefined {
  return state && !state.ok ? state.error.details?.fields?.[field] : undefined;
}
