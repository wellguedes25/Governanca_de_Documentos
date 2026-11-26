import { redirect } from 'next/navigation';

export default function LegacyUsuariosRedirect() {
  redirect('/configuracoes?tab=usuarios');
}
