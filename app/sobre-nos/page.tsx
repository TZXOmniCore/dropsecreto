import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Sobre nós — Drop Secreto',
};

// Só a estrutura da página por enquanto — o conteúdo entra depois.
export default function SobreNosPage() {
  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-2xl font-bold text-ink-primary">Sobre nós</h1>
        <p className="mt-4 text-sm text-ink-secondary">Em breve.</p>
      </div>
      <Footer />
    </main>
  );
}
