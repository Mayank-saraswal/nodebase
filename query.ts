import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const workflow = await prisma.workflow.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(workflow, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
