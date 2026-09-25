'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Alert } from '@/components/ui';

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

export function useDeciding(proposalId: string): () => void {
  const report = useContext(Deciding);
  return () => report(proposalId);
}
