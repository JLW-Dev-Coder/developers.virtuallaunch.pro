'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, type Session } from '@/lib/api';

interface Props {
  children: (session: Session) => React.ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({ children, redirectTo = '/sign-in' }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getSession().then(s => {
      if (!s) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        router.replace(`${redirectTo}?redirect=${redirect}`);
      } else {
        setSession(s);
      }
      setChecking(false);
    });
  }, [router, redirectTo]);

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    );
  }

  if (!session) return null;

  return <>{children(session)}</>;
}
