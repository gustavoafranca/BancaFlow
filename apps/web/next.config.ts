import type { NextConfig } from 'next';

// URL interna do backend (dev/Docker). Em produção real (mesmo host,
// `https://<banca>.bancaflow.com.br/api`) este rewrite não é necessário —
// mas mantê-lo é inofensivo, pois `/api/:path*` já resolveria via DNS/reverse
// proxy antes de chegar aqui. Ver decisão 9 do design.md
// (openspec/changes/harden-identity-authentication-mvp/design.md).
const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  // Confirmado em `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/rewrites.md`
  // (Next.js 16): a sintaxe de `rewrites()` — array de objetos
  // `{ source, destination }` com `:path*` — não mudou em relação a versões
  // anteriores.
  //
  // Preservação de `Host`: rewrites do Next.js fazem um proxy HTTP interno
  // (server-to-server) para `destination`; por padrão o Next.js NÃO reescreve
  // nem remove o cabeçalho `Host`/`X-Forwarded-Host` da requisição recebida do
  // navegador (`localhost:3000` em dev) — ele é repassado como veio, sem
  // necessidade de `basePath`, `skipTrailingSlashRedirect` ou headers manuais
  // adicionais. Isso é o que permite ao backend resolver `codigoBanca` via
  // `X-Forwarded-Host` (sob `TRUST_PROXY_HOST=true`, allowlist de proxy —
  // fora do escopo deste arquivo, ver decisão 11 do design.md).
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_INTERNAL_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
