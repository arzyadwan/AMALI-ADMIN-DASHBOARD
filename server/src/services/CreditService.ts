// CreditService: Core financial logic for credit calculations
// Uses decimal.js for precise financial calculations

import { Decimal } from 'decimal.js';
import { prisma } from '../lib/prisma.js';
import type { LoanScheme, Product } from '@prisma/client';

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ============================================================================
// TYPES
// ============================================================================

export interface SimulationInput {
  price: number;
  dp: number;
  schemeId: number;
  tenorMonths: number;
}

export interface SimulationResult {
  // String values for display (2 decimal places)
  display: {
    price: string;
    dp: string;
    principal: string;
    interestRate: string;
    interestAmount: string;
    totalLoan: string;
    monthlyInstallment: string;
    tenorMonths: number;
  };
  // Raw Decimal objects for further calculations
  raw: {
    price: Decimal;
    dp: Decimal;
    principal: Decimal;
    interestRate: Decimal;
    interestAmount: Decimal;
    totalLoan: Decimal;
    monthlyInstallment: Decimal;
    tenorMonths: number;
  };
  scheme: LoanScheme;
}

export interface CreateTransactionInput {
  productId: number;
  customerId: number;
  price: number;
  dp: number;
  schemeId: number;
  tenorMonths: number;
  dueDateDay: number; // Day of month for installment due dates (1-28)
}

// ============================================================================
// CREDIT SERVICE CLASS
// ============================================================================

export class CreditService {
  
  // --------------------------------------------------------------------------
  // A. Calculate Simulation
  // --------------------------------------------------------------------------
  async calculateSimulation(input: SimulationInput): Promise<SimulationResult> {
    const { price, dp, schemeId, tenorMonths } = input;

    // 1. Fetch the loan scheme from DB
    const scheme = await prisma.loanScheme.findUnique({
      where: { id: schemeId },
    });

    if (!scheme) {
      throw new Error(`Loan scheme with ID ${schemeId} not found`);
    }

    if (!scheme.is_active) {
      throw new Error(`Loan scheme "${scheme.name}" is not active`);
    }

    // 2. Validate tenor is allowed
    const allowedTenors = scheme.tenor_options as number[];
    if (!allowedTenors.includes(tenorMonths)) {
      throw new Error(
        `Tenor ${tenorMonths} bulan tidak tersedia. Pilihan: ${allowedTenors.join(', ')} bulan`
      );
    }

    // 3. Validate minimum DP percentage
    const priceDecimal = new Decimal(price);
    const dpDecimal = new Decimal(dp);
    const minDpPercent = new Decimal(scheme.min_dp_percent.toString());
    const minDpAmount = priceDecimal.mul(minDpPercent).div(100);

    if (dpDecimal.lt(minDpAmount)) {
      throw new Error(
        `DP minimal ${minDpPercent}% dari harga (Rp ${minDpAmount.toFixed(0)}). ` +
        `DP yang dimasukkan: Rp ${dpDecimal.toFixed(0)}`
      );
    }

    // 4. Calculate financial values
    // Principal = Price - DP
    const principal = priceDecimal.minus(dpDecimal);

    // Interest Rate (from DB, stored as percentage per month, e.g., 2.5)
    const interestRate = new Decimal(scheme.interest_rate.toString());

    // Interest Amount = Principal * (Rate / 100) * TenorMonths
    // This is FLAT interest calculation
    const interestAmount = principal
      .mul(interestRate)
      .div(100)
      .mul(tenorMonths);

    // Total Loan = Principal + Interest Amount
    const totalLoan = principal.plus(interestAmount);

    // Monthly Installment = Total Loan / TenorMonths
    // Using CEILING to ensure we don't undercollect
    const monthlyInstallment = totalLoan
      .div(tenorMonths)
      .toDecimalPlaces(0, Decimal.ROUND_CEIL);

    // 5. Return structured result
    return {
      display: {
        price: priceDecimal.toFixed(2),
        dp: dpDecimal.toFixed(2),
        principal: principal.toFixed(2),
        interestRate: interestRate.toFixed(2),
        interestAmount: interestAmount.toFixed(2),
        totalLoan: totalLoan.toFixed(2),
        monthlyInstallment: monthlyInstallment.toFixed(2),
        tenorMonths,
      },
      raw: {
        price: priceDecimal,
        dp: dpDecimal,
        principal,
        interestRate,
        interestAmount,
        totalLoan,
        monthlyInstallment,
        tenorMonths,
      },
      scheme,
    };
  }

  // --------------------------------------------------------------------------
  // B. Create Transaction (with Prisma Transaction)
  // --------------------------------------------------------------------------
  async createTransaction(input: CreateTransactionInput) {
    const {
      productId,
      customerId,
      price,
      dp,
      schemeId,
      tenorMonths,
      dueDateDay,
    } = input;

    // Validate dueDateDay (1-28 to avoid month-end issues)
    if (dueDateDay < 1 || dueDateDay > 28) {
      throw new Error('Tanggal jatuh tempo harus antara 1-28');
    }

    // Use Prisma interactive transaction for atomicity
    return await prisma.$transaction(async (tx) => {
      // ----------------------------------------------------------------------
      // Step 1: Validate Product Stock & Customer
      // ----------------------------------------------------------------------
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error(`Produk dengan ID ${productId} tidak ditemukan`);
      }

      if (!product.is_active) {
        throw new Error(`Produk "${product.name}" tidak aktif`);
      }

      if (product.stock_qty <= 0) {
        throw new Error(`Stok produk "${product.name}" habis`);
      }

      const customer = await tx.customer.findUnique({
        where: { id: customerId }
      });

      if (!customer) {
        throw new Error(`Customer dengan ID ${customerId} tidak ditemukan`);
      }

      // ----------------------------------------------------------------------
      // Step 2: Server-side recalculation (never trust client)
      // ----------------------------------------------------------------------
      const simulation = await this.calculateSimulationWithTx(tx, {
        price,
        dp,
        schemeId,
        tenorMonths,
      });

      // ----------------------------------------------------------------------
      // Step 3: Create Transaction record with scheme_snapshot
      // ----------------------------------------------------------------------
      const transaction = await tx.transaction.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_ktp: customer.nik,
          total_price: price,
          dp_amount: dp,
          scheme_snapshot: JSON.parse(JSON.stringify(simulation.scheme)),
          status: 'ACTIVE',
        },
      });

      // ----------------------------------------------------------------------
      // Step 4: Create CreditContract record
      // ----------------------------------------------------------------------
      const contract = await tx.creditContract.create({
        data: {
          transaction_id: transaction.id,
          principal_amount: simulation.raw.principal.toFixed(4),
          total_interest: simulation.raw.interestAmount.toFixed(4),
          monthly_installment: simulation.raw.monthlyInstallment.toFixed(4),
          start_date: new Date(),
          due_date_day: dueDateDay,
          tenor_months: tenorMonths,
        },
      });

      // ----------------------------------------------------------------------
      // Step 5: Create Installment rows (N rows for N months)
      // ----------------------------------------------------------------------
      const installments = [];
      const startDate = new Date();

      for (let i = 1; i <= tenorMonths; i++) {
        // Calculate due date: i months from now, on the specified day
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        dueDate.setDate(dueDateDay);
        dueDate.setHours(0, 0, 0, 0);

        const installment = await tx.installment.create({
          data: {
            contract_id: contract.id,
            installment_nth: i,
            due_date: dueDate,
            amount_due: simulation.raw.monthlyInstallment.toFixed(4),
            amount_paid: 0,
            penalty_paid: 0,
            penalty_accrued: 0,
            status: 'UNPAID',
          },
        });

        installments.push(installment);
      }

      // ----------------------------------------------------------------------
      // Step 6: Decrement Product Stock
      // ----------------------------------------------------------------------
      await tx.product.update({
        where: { id: productId },
        data: {
          stock_qty: {
            decrement: 1,
          },
        },
      });

      // ----------------------------------------------------------------------
      // Return complete transaction data
      // ----------------------------------------------------------------------
      return {
        transaction,
        contract,
        installments,
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          remainingStock: product.stock_qty - 1,
        },
        simulation: simulation.display,
      };
    });
  }

  // --------------------------------------------------------------------------
  // Helper: Calculate simulation within a transaction context
  // --------------------------------------------------------------------------
  private async calculateSimulationWithTx(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    input: SimulationInput
  ): Promise<SimulationResult> {
    const { price, dp, schemeId, tenorMonths } = input;

    const scheme = await tx.loanScheme.findUnique({
      where: { id: schemeId },
    });

    if (!scheme) {
      throw new Error(`Loan scheme with ID ${schemeId} not found`);
    }

    if (!scheme.is_active) {
      throw new Error(`Loan scheme "${scheme.name}" is not active`);
    }

    const allowedTenors = scheme.tenor_options as number[];
    if (!allowedTenors.includes(tenorMonths)) {
      throw new Error(
        `Tenor ${tenorMonths} bulan tidak tersedia. Pilihan: ${allowedTenors.join(', ')} bulan`
      );
    }

    const priceDecimal = new Decimal(price);
    const dpDecimal = new Decimal(dp);
    const minDpPercent = new Decimal(scheme.min_dp_percent.toString());
    const minDpAmount = priceDecimal.mul(minDpPercent).div(100);

    if (dpDecimal.lt(minDpAmount)) {
      throw new Error(
        `DP minimal ${minDpPercent}% dari harga (Rp ${minDpAmount.toFixed(0)}). ` +
        `DP yang dimasukkan: Rp ${dpDecimal.toFixed(0)}`
      );
    }

    const principal = priceDecimal.minus(dpDecimal);
    const interestRate = new Decimal(scheme.interest_rate.toString());
    const interestAmount = principal.mul(interestRate).div(100).mul(tenorMonths);
    const totalLoan = principal.plus(interestAmount);
    const monthlyInstallment = totalLoan
      .div(tenorMonths)
      .toDecimalPlaces(0, Decimal.ROUND_CEIL);

    return {
      display: {
        price: priceDecimal.toFixed(2),
        dp: dpDecimal.toFixed(2),
        principal: principal.toFixed(2),
        interestRate: interestRate.toFixed(2),
        interestAmount: interestAmount.toFixed(2),
        totalLoan: totalLoan.toFixed(2),
        monthlyInstallment: monthlyInstallment.toFixed(2),
        tenorMonths,
      },
      raw: {
        price: priceDecimal,
        dp: dpDecimal,
        principal,
        interestRate,
        interestAmount,
        totalLoan,
        monthlyInstallment,
        tenorMonths,
      },
      scheme,
    };
  }
}

// Export singleton instance
export const creditService = new CreditService();
