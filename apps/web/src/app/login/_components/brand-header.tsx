import Image from 'next/image'

// Cabeçalho do card: logo + título de boas-vindas.
export function BrandHeader({ dark }: { dark: boolean }) {
  return (
    <header>
      <div className="mb-5 flex items-end gap-[9px]">
        <Image
          src="/design-imports/login/bancaflow.png"
          alt="BancaFlow"
          width={38}
          height={38}
          className="h-[38px] w-[38px] object-contain drop-shadow-[0_2px_8px_rgba(0,199,115,0.4)]"
        />
        <span className="text-[20px] font-extrabold leading-none tracking-[-0.03em]">
          <span className={dark ? 'text-[#EDF5F0]' : 'text-[#1B1F1D]'}>Banca</span>
          <span className={dark ? 'text-[#00C773]' : 'text-[#009955]'}>Flow</span>
        </span>
      </div>

      <h2
        className={`mb-1 text-left text-[21px] font-bold tracking-[-0.02em] ${
          dark ? 'text-[#EDF5F0]' : 'text-[#1B1F1D]'
        }`}
      >
        Bem-vindo de volta!
      </h2>
      <p
        className={`mb-5 text-left text-[13px] leading-[1.4] ${
          dark ? 'text-[#4E7060]' : 'text-[#6B7B73]'
        }`}
      >
        Faça login para acessar sua conta.
      </p>
    </header>
  )
}
