import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kayıt ol',
  description: 'LrDocument için bireysel, öğrenci veya kurumsal kayıt talebi oluşturun; öğrencilere indirim.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
