import { PrismaClient } from "@prisma/client";
import { CENTRAL_SCHOOL_ID } from "../src/lib/central";

const prisma = new PrismaClient();

// Cuentas SUPERADMIN reales del centro de control (/control). Solo el hash
// bcrypt de la contraseña vive aquí, nunca la contraseña en texto plano.
// Script de un solo uso: se ejecuta una vez desde el build de Vercel (única
// forma de llegar a la base de datos real desde este entorno) y se borra
// del repo justo después.
const HASH = "$2a$10$BnRpX3cw2vLuvuDZKj4Nqu/vB60UJPZvzWYDaYzTyXC/CFpg5APfq";

const SUPERADMINS = [
  { name: "MarcRibo", email: "marcribo@control.tara.app" },
  { name: "MustaSS", email: "mustass@control.tara.app" },
  { name: "Marky2050", email: "marky2050@control.tara.app" }
];

async function main() {
  await prisma.school.upsert({
    where: { id: CENTRAL_SCHOOL_ID },
    update: {},
    create: { id: CENTRAL_SCHOOL_ID, name: "Tara — Panel central" }
  });

  for (const person of SUPERADMINS) {
    await prisma.staffUser.upsert({
      where: { email: person.email },
      update: {},
      create: {
        name: person.name,
        email: person.email,
        passwordHash: HASH,
        role: "SUPERADMIN",
        schoolId: CENTRAL_SCHOOL_ID
      }
    });
    console.log(`Cuenta SUPERADMIN creada: ${person.email}`);
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
