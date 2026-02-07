// TransactionController: Express handlers for credit transactions
import type { Request, Response } from 'express';
import { creditService } from '../services/CreditService.js';
import { prisma } from '../lib/prisma.js';

// ============================================================================
// TRANSACTION CONTROLLER
// ============================================================================

export class TransactionController {
  
  // --------------------------------------------------------------------------
  // GET /api/products
  // Fetch all active products
  // --------------------------------------------------------------------------
  async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const { category, sub_category } = req.query;
      console.log('Fetching products with filters:', { category, sub_category });

      const products = await prisma.product.findMany({
        where: { 
          is_active: true,
          ...(category ? { category: category as any } : {}),
          ...(sub_category ? { sub_category: sub_category as string } : {}),
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          sku: true,
          name: true,
          base_price: true,
          stock_qty: true,
          category: true,
          sub_category: true,
        }
      });

      console.log(`✅ Returned ${products.length} products`);
      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error('❌ Prisma Error in getProducts:', error);
      if (error instanceof Error) {
        console.error('Stack:', error.stack);
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  }

  // --------------------------------------------------------------------------
  // GET /api/schemes
  // Fetch active loan schemes
  // --------------------------------------------------------------------------
  async getSchemes(_req: Request, res: Response): Promise<void> {
    try {
      const schemes = await prisma.loanScheme.findMany({
        where: { is_active: true },
        orderBy: { name: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: schemes,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  }

  // --------------------------------------------------------------------------
  // POST /api/transactions/simulate
  // Calculate credit simulation without creating a transaction
  // --------------------------------------------------------------------------
  async simulate(req: Request, res: Response): Promise<void> {
    try {
      const { price, dp, schemeId, tenorMonths } = req.body;

      // Basic validation
      if (!price || !dp || !schemeId || !tenorMonths) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: price, dp, schemeId, tenorMonths',
        });
        return;
      }

      // Validate numeric types
      if (
        typeof price !== 'number' ||
        typeof dp !== 'number' ||
        typeof schemeId !== 'number' ||
        typeof tenorMonths !== 'number'
      ) {
        res.status(400).json({
          success: false,
          error: 'All fields must be numbers',
        });
        return;
      }

      // Validate positive values
      if (price <= 0 || dp < 0 || schemeId <= 0 || tenorMonths <= 0) {
        res.status(400).json({
          success: false,
          error: 'Price and tenor must be positive. DP cannot be negative.',
        });
        return;
      }

      // Validate DP doesn't exceed price
      if (dp >= price) {
        res.status(400).json({
          success: false,
          error: 'DP tidak boleh melebihi atau sama dengan harga',
        });
        return;
      }

      const result = await creditService.calculateSimulation({
        price,
        dp,
        schemeId,
        tenorMonths,
      });

      res.status(200).json({
        success: true,
        data: {
          simulation: result.display,
          scheme: {
            id: result.scheme.id,
            name: result.scheme.name,
            interestRate: result.scheme.interest_rate.toString(),
            tenorOptions: result.scheme.tenor_options,
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }

  // --------------------------------------------------------------------------
  // POST /api/transactions
  // Create a new credit transaction
  // --------------------------------------------------------------------------
  async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        productId,
        customerId,
        price,
        dp,
        schemeId,
        tenorMonths,
        dueDateDay,
      } = req.body;

      // Basic validation
      const requiredFields = [
        'productId',
        'customerId',
        'price',
        'dp',
        'schemeId',
        'tenorMonths',
        'dueDateDay',
      ];

      const missingFields = requiredFields.filter(
        (field) => req.body[field] === undefined || req.body[field] === null
      );

      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
        });
        return;
      }

      // Validate numeric fields
      const numericFields = { productId, customerId, price, dp, schemeId, tenorMonths, dueDateDay };
      for (const [key, value] of Object.entries(numericFields)) {
        if (typeof value !== 'number' || isNaN(value)) {
          res.status(400).json({
            success: false,
            error: `Field ${key} harus berupa angka`,
          });
          return;
        }
      }

      // Validate positive values
      if (price <= 0) {
        res.status(400).json({
          success: false,
          error: 'Harga harus lebih dari 0',
        });
        return;
      }

      if (dp < 0) {
        res.status(400).json({
          success: false,
          error: 'DP tidak boleh negatif',
        });
        return;
      }

      if (dp >= price) {
        res.status(400).json({
          success: false,
          error: 'DP tidak boleh melebihi atau sama dengan harga',
        });
        return;
      }

      // Create the transaction
      const result = await creditService.createTransaction({
        productId,
        customerId,
        price,
        dp,
        schemeId,
        tenorMonths,
        dueDateDay,
      });

      res.status(201).json({
        success: true,
        message: 'Transaksi kredit berhasil dibuat',
        data: {
          transactionId: result.transaction.id,
          contractId: result.contract.id,
          customer: {
            name: result.transaction.customer_name,
            phone: result.transaction.customer_phone,
          },
          product: result.product,
          financials: result.simulation,
          installmentCount: result.installments.length,
          firstDueDate: result.installments[0]?.due_date,
          lastDueDate: result.installments[result.installments.length - 1]?.due_date,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      // Check for specific error types
      if (message.includes('tidak ditemukan') || message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: message,
        });
        return;
      }

      if (message.includes('habis') || message.includes('tidak aktif')) {
        res.status(409).json({
          success: false,
          error: message,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }
}

// Export singleton instance
export const transactionController = new TransactionController();
