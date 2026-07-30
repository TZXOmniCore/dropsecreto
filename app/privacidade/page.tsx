import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Privacidade e termos de uso — Drop Secreto',
};

// Versão mínima pro lançamento: cobre o essencial (o que é coletado, o
// papel de afiliado, onde a compra acontece). Revisar com atenção antes
// de divulgar em escala — isto não substitui orientação jurídica.
export default function PrivacidadePage() {
  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-16 text-sm leading-relaxed text-ink-secondary">
        <h1 className="font-display text-2xl font-bold text-ink-primary">
          Privacidade e termos de uso
        </h1>
        <p className="mt-2 text-xs text-ink-faint">Última atualização: julho de 2026.</p>

        <div className="mt-8 flex flex-col gap-6">
          <section>
            <h2 className="font-display text-base font-semibold text-ink-primary">
              O que é o Drop Secreto
            </h2>
            <p className="mt-2">
              O Drop Secreto é um radar de ofertas: analisamos produtos de lojas parceiras
              (preço, avaliação, vendas e histórico) e publicamos aqui só as ofertas que
              passam nesse filtro automático, o Drop Score.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-primary">
              Onde a compra acontece
            </h2>
            <p className="mt-2">
              O Drop Secreto não vende nada diretamente. Ao clicar numa oferta, você é
              levado à loja parceira (ex.: Shopee) e a compra, o pagamento e a entrega
              acontecem por lá — inclusive qualquer dúvida sobre pedido, troca ou entrega
              deve ser resolvida diretamente com a loja.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-primary">
              Links de afiliado
            </h2>
            <p className="mt-2">
              Como afiliados, podemos receber uma comissão da loja parceira quando você
              compra através de um link daqui — sem nenhum custo adicional pra você. Essa
              comissão não influencia quais produtos aparecem no site: todo produto passa
              pelo mesmo filtro automático antes de ser aprovado, independente do valor da
              comissão.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-primary">
              Dados que guardamos
            </h2>
            <p className="mt-2">
              Não é necessário criar conta nem fazer login pra usar o site. Algumas
              preferências (categorias que você mais clica, favoritos, forma de visualizar
              os produtos) ficam salvas só no seu próprio aparelho, no navegador, e servem
              pra personalizar o que aparece pra você. Esses dados não são enviados pra
              nenhum servidor nem compartilhados com terceiros, e você pode apagá-los a
              qualquer momento limpando os dados do site no navegador.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-primary">
              Alertas de preço
            </h2>
            <p className="mt-2">
              Se você ativar um alerta de preço pra algum produto, guardamos essa
              informação só pra te avisar quando o preço mudar. Você pode remover um
              alerta a qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-primary">Contato</h2>
            <p className="mt-2">
              Dúvidas sobre esta página ou sobre como o site funciona: [e-mail de contato a
              definir].
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
