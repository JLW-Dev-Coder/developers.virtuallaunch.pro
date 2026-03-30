'use client';

import { useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import BackgroundEffects from '@/components/BackgroundEffects';
import type { Session } from '@/lib/api';
import styles from './operator.module.css';

import AnalyticsView from './components/AnalyticsView';
import SubmissionsView from './components/SubmissionsView';
import DeveloperDetailView from './components/DeveloperDetailView';
import DevelopersView from './components/DevelopersView';
import JobsView from './components/JobsView';
import PostToDeveloperView from './components/PostToDeveloperView';
import MessagesView from './components/MessagesView';
import TicketsView from './components/TicketsView';
import CannedResponsesView from './components/CannedResponsesView';
import BulkEmailView from './components/BulkEmailView';

type View =
  | 'analytics' | 'submissions' | 'developer-detail' | 'developers'
  | 'jobs' | 'post' | 'messages' | 'tickets' | 'canned-responses' | 'bulk-email';

const NAV_ITEMS: { id: View; label: string }[] = [
  { id: 'analytics',        label: 'Analytics' },
  { id: 'submissions',      label: 'Submissions' },
  { id: 'developers',       label: 'Developers' },
  { id: 'jobs',             label: 'Jobs' },
  { id: 'post',             label: 'Post to Dev' },
  { id: 'messages',         label: 'Messages' },
  { id: 'tickets',          label: 'Tickets' },
  { id: 'canned-responses', label: 'Canned Responses' },
  { id: 'bulk-email',       label: 'Bulk Email' },
];

function Dashboard({ session }: { session: Session }) {
  const [view, setView] = useState<View>('analytics');
  const [selectedRef, setSelectedRef] = useState<string | null>(null);

  function openDeveloper(ref: string) {
    setSelectedRef(ref);
    setView('developer-detail');
  }

  return (
    <div className={styles.app}>
      <BackgroundEffects />
      <div className={styles.layout}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHead}>
            <div className={styles.logoMark}>VLP</div>
            <div>
              <div className={styles.logoName}>Operator</div>
              <div className={styles.logoSub}>{session.email}</div>
            </div>
          </div>
          <nav className={styles.nav}>
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`${styles.navItem} ${view === item.id || (item.id === 'developers' && view === 'developer-detail') ? styles.navActive : ''}`}
                onClick={() => { setView(item.id); if (item.id !== 'developer-detail') setSelectedRef(null); }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className={styles.main}>
          {view === 'analytics'        && <AnalyticsView />}
          {view === 'submissions'      && <SubmissionsView onSelectDev={openDeveloper} />}
          {view === 'developers'       && <DevelopersView onSelectDev={openDeveloper} />}
          {view === 'developer-detail' && selectedRef && <DeveloperDetailView ref_number={selectedRef} onBack={() => setView('developers')} />}
          {view === 'jobs'             && <JobsView />}
          {view === 'post'             && <PostToDeveloperView />}
          {view === 'messages'         && <MessagesView />}
          {view === 'tickets'          && <TicketsView />}
          {view === 'canned-responses' && <CannedResponsesView />}
          {view === 'bulk-email'       && <BulkEmailView />}
        </main>
      </div>
    </div>
  );
}

export default function OperatorDashboard() {
  return (
    <AdminGuard>
      {session => <Dashboard session={session} />}
    </AdminGuard>
  );
}
