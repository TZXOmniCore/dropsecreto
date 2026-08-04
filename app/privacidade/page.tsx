import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Privacidade e termos de uso — Drop Secreto',
  alternates: { canonical: '/privacidade' },
};

// Cobre privacidade + termos de uso num só lugar. Escrito com cuidado
// pra ser real e específico (não é texto genérico de gerador), mas não
// substitui revisão de um advogado antes de divulgar o site em escala —
// isso aqui é redação de boa-fé, não parecer jurídico.
export default function PrivacidadePage() {
  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-16 text-sm leading-relaxed text-ink-secondary">
        <h1 className="font-display text-2xl font-bold text-ink-primary">
          Privacidade e termos de uso
        </h1>
        <p className="mt-2 text-xs text-ink-faint">Última atualização: agosto de 2026.</p>

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
              pra personalizar o que aparece pra você — isso não sai do seu aparelho, e você
              pode apagar a qualquer momento limpando os dados do site no navegador.
            </p>
            <p className="mt-2">
              Além disso, usamos ferramentas de análise de audiência (que mostram quantas
              pessoas visitam o site e quais páginas são mais acessadas) e de monitoramento
              de erros técnicos, que recebem dados de uso de forma agregada — sem nome, e-mail
              ou qualquer dado que identifique você diretamente. Veja abaixo quais dessas
              ferramentas usam cookie e como você controla isso.
            </p>
          </section>

          <section id="cookies">
            <h2 className="font-display text-base font-semibold text-ink-primary">Cookies</h2>
            <p className="mt-2">
              Usamos duas ferramentas de análise de audiência que usam cookie:{' '}
              <span className="text-ink-primary">Google Analytics</span> e{' '}
              <span className="text-ink-primary">Microsoft Clarity</span> (mapa de calor e
              gravação de sessão). Nenhuma das duas é carregada até você aceitar no aviso que
              aparece na primeira visita — se você recusar, o site funciona normalmente do
              mesmo jeito, só sem elas.
            </p>
            <p className="mt-2">
              Você pode mudar sua escolha a qualquer momento clicando em
              &quot;Cookies&quot; no rodapé do site, o que reabre o aviso de consentimento.
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
            <h2 className="font-display text-base font-semibold text-ink-primary">
              Uso por menores de idade
            </h2>
            <p className="mt-2">
              O Drop Secreto não é direcionado a menores de 18 anos e não coleta,
              intencionalmente, nenhum dado que identifique uma criança ou adolescente. O
              fato de existirem categorias de produtos infantis no catálogo (ex.: brinquedos,
              roupas) não significa que o site seja destinado ao uso por menores — o público
              do site é o responsável que faz a compra.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-primary">
              Isenção de responsabilidade sobre preço e disponibilidade
            </h2>
            <p className="mt-2">
              Os preços, descontos e a disponibilidade dos produtos são definidos
              exclusivamente pelas lojas parceiras e podem mudar a qualquer momento — inclusive
              entre o momento em que a oferta foi verificada aqui e o momento em que você
              clica. O Drop Secreto se esforça pra manter as informações atualizadas, mas não
              garante que o preço exibido será exatamente o cobrado no fechamento da compra.
              Confirme sempre o preço final na página da loja antes de finalizar.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-primary">
              Uso aceitável do site
            </h2>
            <p className="mt-2">
              O conteúdo do Drop Secreto (marca, layout, textos e a lógica do Drop Score) não
              pode ser copiado, redistribuído ou usado para criar um serviço concorrente sem
              autorização. Não é permitido usar robôs, scrapers ou qualquer automação pra
              extrair dados do site em massa, nem tentar burlar, sobrecarregar ou interferir no
              funcionamento normal da plataforma.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-primary">
              Foro
            </h2>
            <p className="mt-2">
              Eventuais disputas relacionadas ao uso deste site serão resolvidas conforme a
              legislação brasileira.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-primary">
              Seus direitos (LGPD)
            </h2>
            <p className="mt-2">
              O tratamento de dados neste site segue a Lei Geral de Proteção de Dados (Lei nº
              13.709/2018 — LGPD). Mesmo os poucos dados descritos acima, você tem o direito
              de:
            </p>
            <ul className="mt-2 list-disc pl-5">
              <li>confirmar se tratamos algum dado seu, e acessá-lo;</li>
              <li>corrigir dado incompleto, inexato ou desatualizado;</li>
              <li>pedir a exclusão de dado salvo localmente no seu aparelho;</li>
              <li>revogar, a qualquer momento, o consentimento dado pra cookies opcionais;</li>
              <li>
                apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD), caso
                entenda que algum desses direitos não foi respeitado.
              </li>
            </ul>
            <p className="mt-2">
              Pra exercer qualquer um desses direitos, use o canal de contato descrito abaixo.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-primary">Contato</h2>
            <p className="mt-2">
              Encontrou uma oferta que não parece correta, ou tem uma sugestão? Use o botão
              de feedback no rodapé do site. Um e-mail de contato formal será divulgado aqui
              assim que estiver disponível.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
