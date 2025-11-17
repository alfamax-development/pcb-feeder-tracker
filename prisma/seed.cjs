const bcrypt = require("bcryptjs");
const { PrismaClient, Role } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedUsers() {
  const users = [
    { username: "admin", password: "admin123", role: Role.ADMIN },
    { username: "op", password: "operator123", role: Role.OPERATOR },
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: { password: passwordHash, role: user.role },
      create: { username: user.username, password: passwordHash, role: user.role },
    });
  }
}

async function seedFeederTypes() {
  const feederTypes = [
    { code: "SME8", displayName: "SME8 8mm Elektrikli", description: "8mm elektrikli besleyici" },
    { code: "SM8", displayName: "SM8 8mm Pnömatik", description: "8mm pnömatik besleyici" },
    { code: "SM12", displayName: "SM12 12mm Pnömatik", description: "12mm pnömatik besleyici" },
    { code: "SM16", displayName: "SM16 16mm Pnömatik", description: "16mm pnömatik besleyici" },
    { code: "SM24", displayName: "SM24 24mm Pnömatik", description: "24mm pnömatik besleyici" },
  ];

  for (const ft of feederTypes) {
    await prisma.feederType.upsert({
      where: { code: ft.code },
      update: ft,
      create: ft,
    });
  }
}

async function seedMachines() {
  const machines = [{ name: "Hanwha DecanS1" }, { name: "Hanwha SM471+" }];

  for (const machine of machines) {
    await prisma.machine.upsert({
      where: { name: machine.name },
      update: machine,
      create: machine,
    });
  }
}

async function seedFeeders() {
  const stockPlan = {
    SME8: 19,
    SM8: 90,
    SM12: 15,
    SM16: 14,
    SM24: 4,
  };

  for (const [code, count] of Object.entries(stockPlan)) {
    const feederType = await prisma.feederType.findUnique({ where: { code } });
    if (!feederType) continue;

    const existingCount = await prisma.feeder.count({
      where: { feederTypeId: feederType.id },
    });

    const toCreate = count - existingCount;
    if (toCreate <= 0) continue;

    const feeders = Array.from({ length: toCreate }).map((_, idx) => ({
      label: `${code}-${existingCount + idx + 1}`,
      feederTypeId: feederType.id,
    }));

    await prisma.feeder.createMany({ data: feeders });
  }
}

async function main() {
  await seedUsers();
  await seedFeederTypes();
  await seedMachines();
  await seedFeeders();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
