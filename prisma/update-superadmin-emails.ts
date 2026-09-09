import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Script de un solo uso: cambia el email de login de las 3 cuentas
// SUPERADMIN de @control.tara.app a direcciones reales @soytara.com. Se
// borra del repo justo después de ejecutarse.
const RENAMES = [
  { from: "marcribo@control.tara.app", to: "info@soytara.com" },
  { from: "mustass@control.tara.app", to: "contacto@soytara.com" },
  { from: "marky2050@control.tara.app", to: "soporte@soytara.com" }
];

async function main() {
  for (const r of RENAMES) {
    const staff = await prisma.staffUser.findUnique({ where: { email: r.from } });
    if (!staff) {
      console.log(`No encontrado: ${r.from}`);
      continue;
    }
    await prisma.staffUser.update({ where: { id: staff.id }, data: { email: r.to } });
    console.log(`Actualizado: ${r.from} -> ${r.to}`);
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
