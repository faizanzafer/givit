const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");
const { now } = require("mongoose");

async function main() {
  const hashPassword = bcrypt.hashSync("Abcd@1234", 10);
  const users_seed = await prisma.users.createMany({});
  // console.log(users_seed);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
