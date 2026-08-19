import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  routeKey: string;
}

export function PageTransition({ children, routeKey }: PageTransitionProps) {
  const [displayed, setDisplayed] = useState(children);

  useEffect(() => {
    setDisplayed(children);
  }, [routeKey, children]);

  return (
    <div key={routeKey} className="animate-fade-in-up">
      {displayed}
    </div>
  );
}
