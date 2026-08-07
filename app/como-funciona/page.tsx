import { Navbar } from '@/components/Navbar';
import { HowItWorks } from '@/components/HowItWorks';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Como o Drop Score funciona — Drop Secreto',
  description:
    'O critério, passo a passo, usado pra aprovar ou descartar cada oferta: preço, histórico, avaliação e confiabilidade da loja.',
  alternates: { canonical: '/como-funciona' },
};

export default function ComoFuncionaPage() {
  return (
    <main>
      <Navbar />
      <HowItWorks />
      <Footer />
    </main>
  );
}
