import Image from 'next/image'

// Painel de marca (lado esquerdo). Sempre em tema escuro, conforme o design.
// Refinado a partir de design-import/extracted/login.html.

type Feature = {
  title: string
  body: string
  icon: React.ReactNode
}

const FEATURES: Feature[] = [
  {
    title: 'Gestão Inteligente',
    body: 'Acompanhe créditos, débitos e resultados em tempo real.',
    icon: (
      <>
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </>
    ),
  },
  {
    title: 'Controle de Cambistas',
    body: 'Cadastre, gerencie e acompanhe o desempenho da sua equipe.',
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    title: 'Lançamentos Simplificados',
    body: 'Registre vendas, envios e observações de forma rápida e prática.',
    icon: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </>
    ),
  },
  {
    title: 'Segurança e Confiabilidade',
    body: 'Seus dados protegidos com tecnologia de ponta e controle de acesso.',
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
]

export function AuthIllustration() {
  return (
    <aside className="relative hidden overflow-hidden lg:flex lg:w-[58%]">
      {/* Background image — ancorado à direita, cobrindo o painel */}
      <Image
        src="/design-imports/login/fundo.png"
        alt=""
        fill
        priority
        sizes="58vw"
        className="object-cover object-right"
      />
      {/* Máscara: escuro sólido à esquerda → transparente à direita */}
      <div className="absolute inset-0 bg-[linear-gradient(100deg,#050F09_0%,#071A10_38%,rgba(6,20,14,0.88)_58%,rgba(6,20,14,0.40)_100%)]" />
      {/* Glow inferior esquerdo */}
      <div className="pointer-events-none absolute -bottom-[100px] -left-[60px] h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(0,255,140,0.11)_0%,transparent_65%)]" />

      {/* Conteúdo */}
      <div className="relative z-10 flex h-full w-full flex-col justify-between overflow-y-auto px-11 pb-6 pt-7">
        {/* Logo */}
        <div className="bf-slide-left flex shrink-0 items-end gap-[11px]">
          <Image
            src="/design-imports/login/bancaflow.png"
            alt="BancaFlow"
            width={42}
            height={42}
            className="h-[42px] w-[42px] object-contain drop-shadow-[0_2px_10px_rgba(0,199,115,0.4)]"
          />
          <span className="text-[22px] font-extrabold leading-none tracking-[-0.03em]">
            <span className="text-white">Banca</span>
            <span className="text-[#00C773]">Flow</span>
          </span>
        </div>

        {/* Headline */}
        <div className="shrink-0">
          <h1 className="bf-slide-left text-[30px] font-extrabold leading-[1.1] tracking-[-0.025em] text-[#F0F5F2]">
            Controle total.
          </h1>
          <div className="bf-shimmer-text bf-slide-left text-[30px] font-extrabold leading-[1.1] tracking-[-0.025em]">
            Resultados reais.
          </div>
          <div className="bf-grow-x my-[10px] h-[3px] w-10 rounded-[2px] bg-[#00C773]" />
          <p className="bf-slide-up max-w-[310px] text-[13px] leading-[1.5] text-[#7A9E8E]">
            A plataforma completa para gestão financeira da sua banca.
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-col gap-[13px]">
          {FEATURES.map((feat) => (
            <div key={feat.title} className="bf-fade-feat flex items-start gap-[14px]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[rgba(0,199,115,0.18)] bg-[rgba(0,199,115,0.10)]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00C773"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {feat.icon}
                </svg>
              </div>
              <div className="flex flex-col gap-[2px]">
                <div className="text-[13.5px] font-bold text-[#EDF5F0]">{feat.title}</div>
                <div className="text-[12px] leading-[1.5] text-[#527060]">{feat.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tagline */}
        <div className="bf-slide-up mt-[14px] flex shrink-0 items-start gap-[12px] border-t border-[rgba(0,199,115,0.10)] pt-[14px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-[rgba(0,199,115,0.18)] bg-[rgba(0,199,115,0.10)]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00C773"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
          <div className="flex flex-col gap-[2px]">
            <div className="text-[12.5px] font-bold text-[#D0ECE0]">
              Mais controle. Mais clareza. Mais resultados.
            </div>
            <div className="text-[11.5px] leading-[1.45] text-[#4E6A5A]">
              BancaFlow é o fluxo certo para o crescimento da sua banca.
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
