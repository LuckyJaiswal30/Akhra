'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Alert } from '@/components/ui';

/**
 * A decision on a proposal takes it off this page, and with it the line that said the decision was
 * recorded — an officer pressed Approve and the screen went empty. React unmounts that row in the
 * same commit that delivers the action's result, so an effect inside the row cannot be relied on
 * to run at all.
 *
 * The queue watches instead: a form tells it which proposal is being decided, and it confirms once
 * that proposal has left the list. A refusal leaves the row in place, where its own message shows.
 *
 * The rows are still rendered on the server and pass through this boundary as children, so nothing
 * about the proposals reaches the browser that was not already going there.
 */
const Deciding = createContext<(proposalId: string) => void>(() => {});

export function ReviewQueue({
  proposalIds,
  recorded,
  children,
}: {
  proposalIds: string[];
  recorded: string;
  children: ReactNode;
}) {
  const [acting, setActing] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const present = acting !== null && proposalIds.includes(acting);

  useEffect(() => {
    if (acting === null || present) return;
    setDone(true);
    setActing(null);
  }, [acting, present]);

  return (
    <Deciding.Provider value={setActing}>
      <div className="space-y-5">
        {done && <Alert tone="success">{recorded}</Alert>}
        {children}
      </div>
    </Deciding.Provider>
  );
}

/** Tells the surrounding queue which proposal is being decided, as the form is submitted. */
export function useDeciding(proposalId: string): () => void {
  const report = useContext(Deciding);
  return () => report(proposalId);
}
