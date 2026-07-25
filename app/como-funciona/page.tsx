import { Navbar } from '@/components/Navbar';
import { HowItWorks } from '@/components/HowItWorks';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Como o Drop Score funciona — Drop Secreto',
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
