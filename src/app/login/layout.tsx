import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Giriş yap',
  description: 'LrDocument hesabınıza e-posta ve şifreyle ya da kurumsal kodunuzla giriş yapın.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
