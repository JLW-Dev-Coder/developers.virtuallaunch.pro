import type { Metadata } from 'next';
import OperatorDashboard from './OperatorDashboard';

export const metadata: Metadata = {
  title: 'Operator Dashboard — Virtual Launch Pro',
};

export default function OperatorPage() {
  return <OperatorDashboard />;
}
