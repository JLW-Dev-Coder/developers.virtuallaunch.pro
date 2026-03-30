'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, type Session } from '@/lib/api';

interface Props {
  children: (session: Session) => React.ReactNode;
}

export default function AdminGuard({ children }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getSession().then(s => {
      if (!s) {
        router.replace('/sign-in?redirect=/operator');
      } else if (s.role !== 'admin') {
        router.replace('/');
      } else {
        setSession(s);
      }
      setChecking(false);
    });
  }, [router]);

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#020617' }}>
        <div className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    );
  }

  if (!session) return null;

  return <>{children(session)}</>;
}
