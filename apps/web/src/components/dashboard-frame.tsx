import type { ReactNode } from 'react';
import { DashboardNav, type DashboardNavItem } from './dashboard-nav';

/**
 * The shell every signed-in desk sits in: a side rail from 1024px, a scrolling tab strip below it.
 *
 * A rail with one destination is not navigation — it is a label for the page you are already on,
 * charging a twelfth of the width for it. A department officer and a student each have exactly one
 * page, so they get the page.
 */
export function DashboardFrame({
  label,
  nav,
  children,
}: {
  label: string;
  nav: DashboardNavItem[];
  children: ReactNode;
}) {
  if (nav.length < 2) return <>{children}</>;

  return (
    <div className="lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <DashboardNav label={label} items={nav} />
      </aside>
      <div className="mt-6 min-w-0 lg:mt-0">{children}</div>
    </div>
  );
}
