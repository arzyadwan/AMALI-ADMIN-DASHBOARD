// ProductController: Express handlers for inventory management
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

// ============================================================================
// ZOD SCHEMAS (Synced with Frontend)
// ============================================================================

const baseProductSchema = z.object({
  sku: z.string().min(3),
  name: z.string().min(2),
  base_price: z.number().min(0),
  stock_qty: z.number().int().min(0),
  category: z.enum(['ELECTRONIC', 'FURNITURE', 'VEHICLE']),
  sub_category: z.string().min(2),
});

const productSchema = z.object({
  sku: z.string().min(3),
  name: z.string().min(2),
  base_price: z.number().min(0),
  stock_qty: z.number().int().min(0),
  category: z.enum(['ELECTRONIC', 'FURNITURE', 'VEHICLE']),
  sub_category: z.string().min(2),
  attributes: z.record(z.string(), z.any()), // Specify key and value schema
});

export class ProductController {
  
  // --------------------------------------------------------------------------
  // POST /api/products
  // Create a new product
  // --------------------------------------------------------------------------
  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = productSchema.parse(req.body);

      // Check for SKU uniqueness
      const existing = await prisma.product.findUnique({
        where: { sku: validatedData.sku }
      });

      if (existing) {
        res.status(409).json({
          success: false,
          error: `Product with SKU "${validatedData.sku}" already exists`
        });
        return;
      }

      const product = await prisma.product.create({
        data: {
          sku: validatedData.sku,
          name: validatedData.name,
          base_price: validatedData.base_price,
          stock_qty: validatedData.stock_qty,
          category: validatedData.category as any, // Cast to avoid Prisma enum mismatch if not synced
          sub_category: validatedData.sub_category,
          attributes: validatedData.attributes,
          is_active: true
        }
      });

      res.status(201).json({
        success: true,
        data: product
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, error: (error as any).issues || (error as any).errors });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error'
      });
    }
  }

  // --------------------------------------------------------------------------
  // PATCH /api/products/:id/stock
  // Increment product stock
  // --------------------------------------------------------------------------
  async restockProduct(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const { quantity_to_add } = req.body;
      const productId = parseInt(id);

      if (isNaN(productId)) {
        res.status(400).json({ success: false, error: 'Invalid product ID' });
        return;
      }

      if (typeof quantity_to_add !== 'number' || quantity_to_add <= 0) {
        res.status(400).json({ success: false, error: 'Quantity must be a positive number' });
        return;
      }

      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
          stock_qty: {
            increment: quantity_to_add
          }
        }
      });

      res.status(200).json({
        success: true,
        data: updatedProduct
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Update failed'
      });
    }
  }
}

export const productController = new ProductController();
