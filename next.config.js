/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Config de imagens (Supabase Storage) e PWA serão detalhadas na etapa de implementação
  images: {
    remotePatterns: [
      // { protocol: 'https', hostname: '<seu-projeto>.supabase.co' }
    ],
  },
};

module.exports = nextConfig;
