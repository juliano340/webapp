import bcrypt from "bcrypt";
import { CrmRuleType, PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: hashedPassword,
      role: Role.ADMIN,
    },
    create: {
      email: adminEmail,
      name: "Super Admin",
      passwordHash: hashedPassword,
      role: Role.ADMIN,
    },
  });

  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      confirmFarFutureAppointmentEnabled: true,
      openingTime: "09:00",
      closingTime: "20:00",
    },
  });

  await prisma.crmAutomationRule.upsert({
    where: { type: CrmRuleType.POST_SERVICE },
    update: {
      enabled: true,
      daysAfterService: 14,
      template:
        "Oi {nome}, tudo bem? Ja faz {dias} dias do seu {servico} com {barbeiro}. Estamos a disposicao para manutencao na {barbearia}.",
    },
    create: {
      type: CrmRuleType.POST_SERVICE,
      enabled: true,
      daysAfterService: 14,
      template:
        "Oi {nome}, tudo bem? Ja faz {dias} dias do seu {servico} com {barbeiro}. Estamos a disposicao para manutencao na {barbearia}.",
    },
  });

  await prisma.crmAutomationRule.upsert({
    where: { type: CrmRuleType.BIRTHDAY },
    update: {
      enabled: true,
      daysAfterService: null,
      template:
        "Feliz aniversario, {nome}! A equipe da {barbearia} te deseja um dia incrivel. Conte com a gente para seu proximo atendimento.",
    },
    create: {
      type: CrmRuleType.BIRTHDAY,
      enabled: true,
      daysAfterService: null,
      template:
        "Feliz aniversario, {nome}! A equipe da {barbearia} te deseja um dia incrivel. Conte com a gente para seu proximo atendimento.",
    },
  });

  console.log("Super admin ready:", adminEmail);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
