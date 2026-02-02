const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const username = "admin";
  const password = "password123";
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { username },
    update: { password: hashedPassword },
    create: {
      username,
      password: hashedPassword,
      name: "Administrateur",
      role: "ADMIN",
    },
  });

  console.log(`User ${user.username} created/updated successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
