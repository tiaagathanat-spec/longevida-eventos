// Instância única do Prisma Client (padrão recomendado para Next.js,
// evita múltiplas conexões em dev por causa do hot-reload).
//
// Ainda não é importado por nenhuma página: o runtime atual usa o
// cliente do Supabase. Quando o backend real entrar, importar `prisma`
// daqui em vez de instanciar PrismaClient por arquivo.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
