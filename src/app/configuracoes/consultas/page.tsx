import { redirect } from 'next/navigation';

export default function LegacyConsultasRedirect() {
  redirect('/configuracoes?tab=v3');
}
