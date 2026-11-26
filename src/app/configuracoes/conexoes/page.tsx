import { redirect } from 'next/navigation';

export default function LegacyConexoesRedirect() {
  redirect('/configuracoes?tab=conexoes');
}
