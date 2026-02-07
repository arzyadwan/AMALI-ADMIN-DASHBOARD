// PaymentController: Express handlers for contract management and payments
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export class PaymentController {
  
  // --------------------------------------------------------------------------
  // GET /api/contracts/active
  // Fetch all active credit contracts with schedules
  // --------------------------------------------------------------------------
  async getActiveContracts(_req: Request, res: Response): Promise<void> {
    try {
      const contracts = await prisma.creditContract.findMany({
        where: {
          transaction: {
            status: 'ACTIVE'
          }
        },
        include: {
          transaction: {
            include: {
              product: true
            }
          },
          installments: {
            orderBy: { installment_nth: 'asc' }
          }
        },
        orderBy: {
          start_date: 'desc'
        }
      });

      res.status(200).json({
        success: true,
        data: contracts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  }

  // --------------------------------------------------------------------------
  // POST /api/installments/:id/pay
  // Record payment for a specific installment
  // --------------------------------------------------------------------------
  async payInstallment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const installmentId = parseInt(id as string);

      if (isNaN(installmentId)) {
        res.status(400).json({ success: false, error: 'Invalid installment ID' });
        return;
      }

      await prisma.$transaction(async (tx) => {
        const installment = await tx.installment.findUnique({
          where: { id: installmentId },
          include: {
            contract: {
              include: {
                installments: true,
                transaction: true
              }
            }
          }
        });

        if (!installment) {
          throw new Error('Installment not found');
        }

        if (installment.status === 'PAID') {
          throw new Error('Installment is already paid');
        }

        // Update installment as paid
        await tx.installment.update({
          where: { id: installmentId },
          data: {
            status: 'PAID',
            amount_paid: installment.amount_due,
            paid_at: new Date(),
          }
        });

        // CHECK IF ALL INSTALLMENTS ARE PAID
        const allPaid = installment.contract.installments.every(inst => 
          inst.id === installmentId ? true : inst.status === 'PAID'
        );

        if (allPaid) {
          // Update transaction to PAID (Completed)
          await tx.transaction.update({
            where: { id: installment.contract.transaction_id },
            data: { status: 'PAID' }
          });
        }
      });

      res.status(200).json({
        success: true,
        message: 'Payment received successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      });
    }
  }
}

export const paymentController = new PaymentController();
