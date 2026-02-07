// CustomerController: CRM logic for managing customer profiles and history
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

const customerSchema = z.object({
  nik: z.string().min(16, 'NIK harus 16 digit').max(16, 'NIK harus 16 digit'),
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  phone: z.string().min(10, 'Telepon minimal 10 digit'),
  address: z.string().min(5, 'Alamat minimal 5 karakter'),
});

export class CustomerController {
  
  // --------------------------------------------------------------------------
  // POST /api/customers
  // Create a new customer record
  // --------------------------------------------------------------------------
  async create(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = customerSchema.parse(req.body);

      // Check uniqueness of NIK and Phone
      const existingNik = await prisma.customer.findUnique({
        where: { nik: validatedData.nik }
      });
      if (existingNik) {
        res.status(409).json({ success: false, error: 'NIK sudah terdaftar' });
        return;
      }

      const existingPhone = await prisma.customer.findUnique({
        where: { phone: validatedData.phone }
      });
      if (existingPhone) {
        res.status(409).json({ success: false, error: 'Nomor telepon sudah terdaftar' });
        return;
      }

      const customer = await prisma.customer.create({
        data: validatedData
      });

      res.status(201).json({
        success: true,
        data: customer
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, error: error.issues });
        return;
      }
      console.error('Customer create error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error'
      });
    }
  }

  // --------------------------------------------------------------------------
  // GET /api/customers?query=...
  // Search customers by name or phone
  // --------------------------------------------------------------------------
  async search(req: Request, res: Response): Promise<void> {
    try {
      const query = (req.query.query as string) || '';

      const customers = await prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query } },
            { nik: { contains: query } }
          ]
        },
        take: 10, // Limit results
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data: customers
      });
    } catch (error) {
      console.error('Customer search error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Gagal mencari data customer'
      });
    }
  }

  // --------------------------------------------------------------------------
  // GET /api/customers/:id
  // Get customer details and their transaction history
  // --------------------------------------------------------------------------
  async getDetail(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: 'ID tidak valid' });
        return;
      }

      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          transactions: {
            orderBy: { created_at: 'desc' },
            include: {
              contract: {
                include: {
                  installments: {
                    orderBy: { installment_nth: 'asc' }
                  }
                }
              }
            }
          }
        }
      });

      if (!customer) {
        res.status(404).json({ success: false, error: 'Customer tidak ditemukan' });
        return;
      }

      // Calculate summary metrics
      const history = customer.transactions.map(t => ({
        id: t.id,
        date: t.created_at,
        total_price: t.total_price,
        status: t.status,
        contractId: t.contract?.id,
        installments: t.contract?.installments.map(ins => ({
            nth: ins.installment_nth,
            status: ins.status,
            amount: ins.amount_due
        })) || []
      }));

      res.json({
        success: true,
        data: {
          profile: {
            id: customer.id,
            nik: customer.nik,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            created_at: customer.created_at
          },
          history
        }
      });
    } catch (error) {
      console.error('Customer getDetail error:', error);
      res.status(500).json({
        success: false,
        error: 'Gagal mengambil detail customer'
      });
    }
  }
}

export const customerController = new CustomerController();
