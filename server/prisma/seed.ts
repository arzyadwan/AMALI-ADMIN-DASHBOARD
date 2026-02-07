// Lokasi: server/prisma/seed.ts

import { PrismaClient, CategoryType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Start seeding...');

  // Read seed data from JSON
  const seedDataPath = path.resolve(__dirname, '../../SEED_DATA.json');
  const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));

  // 1. Bersihkan data lama (Strict Order)
  await prisma.installment.deleteMany();
  await prisma.creditContract.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.product.deleteMany();
  await prisma.loanScheme.deleteMany();
  await prisma.customer.deleteMany();

  console.log('🧹 Database cleaned.');

  // 2. Buat Skema Kredit dari JSON
  const schemeData = seedData.loan_schemes;
  const scheme = await prisma.loanScheme.create({
    data: {
      name: schemeData.name,
      interest_rate: schemeData.interest_rate_flat.toString(),
      min_dp_percent: schemeData.min_dp_percent.toString(),
      tenor_options: schemeData.tenor_options,
      penalty_fee_daily: schemeData.penalty_fee_daily.toString(),
      is_active: true,
    },
  });
  console.log(`✅ Scheme created: ${scheme.name}`);

  // 3. Buat Produk dari JSON
  for (const p of seedData.products) {
    await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        base_price: p.base_price,
        stock_qty: p.stock_qty,
        category: p.category as CategoryType,
        sub_category: p.sub_category,
        attributes: p.attributes,
      },
    });
    console.log(`✅ Product created: ${p.sku} - ${p.name}`);
  }

  console.log('🚀 Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });