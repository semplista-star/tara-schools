import { PrismaClient, ConsentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Datos de ejemplo para probar el Bloque 1 (esquema + autenticación con
// roles). Las contraseñas son provisionales: cámbialas antes de usar esto
// en un entorno real. Ningún alumno tiene aquí datos de conversación: solo
// un alias y su estado de consentimiento parental.
const SCHOOL_NAME = "IES Exemple";

const STAFF = [
  { name: "Directora", email: "admin@iesexemple.edu", password: "Canvia123!", role: "ADMIN" as const },
  { name: "Tutor 1r ESO A", email: "tutor@iesexemple.edu", password: "Canvia123!", role: "TUTOR" as const },
  {
    name: "Referente de Bienestar",
    email: "referente@iesexemple.edu",
    password: "Canvia123!",
    role: "WELLBEING_REFERENT" as const
  }
];

const GROUPS = [
  {
    name: "1r ESO A",
    students: [
      { alias: "Alumno-A1", consentStatus: ConsentStatus.GRANTED },
      { alias: "Alumno-A2", consentStatus: ConsentStatus.GRANTED },
      { alias: "Alumno-A3", consentStatus: ConsentStatus.PENDING },
      { alias: "Alumno-A4", consentStatus: ConsentStatus.GRANTED },
      { alias: "Alumno-A5", consentStatus: ConsentStatus.GRANTED },
      { alias: "Alumno-A6", consentStatus: ConsentStatus.DENIED }
    ]
  },
  {
    name: "2n ESO B",
    students: [
      { alias: "Alumno-B1", consentStatus: ConsentStatus.GRANTED },
      { alias: "Alumno-B2", consentStatus: ConsentStatus.GRANTED },
      { alias: "Alumno-B3", consentStatus: ConsentStatus.GRANTED }
    ]
  }
];

async function main() {
  const school = await prisma.school.upsert({
    where: { id: "seed-school-1" },
    update: {},
    create: { id: "seed-school-1", name: SCHOOL_NAME }
  });

  const groupsByName: Record<string, string> = {};
  for (const g of GROUPS) {
    const group = await prisma.group.upsert({
      where: { schoolId_name: { schoolId: school.id, name: g.name } },
      update: {},
      create: { name: g.name, schoolId: school.id }
    });
    groupsByName[g.name] = group.id;

    for (const s of g.students) {
      const existing = await prisma.student.findFirst({
        where: { schoolId: school.id, alias: s.alias }
      });
      if (!existing) {
        await prisma.student.create({
          data: {
            alias: s.alias,
            schoolId: school.id,
            groupId: group.id,
            consentStatus: s.consentStatus
          }
        });
      }
    }
  }

  // Nota: este seed solo crea la estructura (centro, grupos, alumnado con
  // alias, cuentas de personal) para poder probar el login y el aislamiento
  // por rol. NO se generan aquí resúmenes de uso ni eventos de puente
  // humano de ejemplo: esos datos son reales y llegarán de la integración
  // con la app Tara original. Hasta entonces, los paneles deben mostrar
  // correctamente el estado "todavía sin datos".

  for (const staff of STAFF) {
    const passwordHash = await bcrypt.hash(staff.password, 10);
    const created = await prisma.staffUser.upsert({
      where: { email: staff.email },
      update: {},
      create: {
        name: staff.name,
        email: staff.email,
        passwordHash,
        role: staff.role,
        schoolId: school.id
      }
    });

    if (staff.role === "TUTOR") {
      await prisma.group.update({
        where: { id: groupsByName["1r ESO A"] },
        data: { tutors: { connect: { id: created.id } } }
      });
    }

    console.log(`Cuenta creada: ${staff.email} (${staff.role})`);
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
