import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Script de un solo uso: corrige la asignación de emails de login de las
// 3 cuentas SUPERADMIN. Como el email es único, primero se pasa cada una
// por un valor temporal para evitar colisiones al rotar entre ellas, y
// luego se fija el valor final. Se borra del repo justo después de
// ejecutarse.
const FINAL = [
  { id: "cmtu9123y00018hglgiz8ezv9", name: "MarcRibo", email: "contacto@soytara.com" },
  { id: "cmtu9125700038hgl025yt6vk", name: "MustaSS", email: "soporte@soytara.com" },
  { id: "cmtu9125l00058hgla1190j1d", name: "Marky2050", email: "info@soytara.com" }
];

async function main() {
  for (const p of FINAL) {
    await prisma.staffUser.update({ where: { id: p.id }, data: { email: `tmp-${p.id}@placeholder.local` } });
  }
  for (const p of FINAL) {
    await prisma.staffUser.update({ where: { id: p.id }, data: { email: p.email } });
    console.log(`${p.name} -> ${p.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
