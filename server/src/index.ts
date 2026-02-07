// AMALI-KREDIT API Server
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import { transactionController } from './controllers/TransactionController.js';
import { paymentController } from './controllers/PaymentController.js';
import { productController } from './controllers/ProductController.js';
import { customerController } from './controllers/CustomerController.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ============================================================================
// ROUTES
// ============================================================================

// GET /api/products - Fetch all active products
app.get('/api/products', (req, res) => {
  transactionController.getProducts(req, res);
});

// POST /api/products - Create a new product
app.post('/api/products', (req, res) => {
  productController.createProduct(req, res);
});

// PATCH /api/products/:id/stock - Restock a product
app.patch('/api/products/:id/stock', (req, res) => {
  productController.restockProduct(req, res);
});

// GET /api/schemes - Fetch active loan schemes
app.get('/api/schemes', (req, res) => {
  transactionController.getSchemes(req, res);
});

// POST /api/transactions/simulate - Calculate credit simulation
app.post('/api/transactions/simulate', (req, res) => {
  transactionController.simulate(req, res);
});

// POST /api/transactions - Create a new credit transaction
app.post('/api/transactions', (req, res) => {
  transactionController.create(req, res);
});

// GET /api/contracts/active - Fetch all active credit contracts
app.get('/api/contracts/active', (req, res) => {
  paymentController.getActiveContracts(req, res);
});

// POST /api/installments/:id/pay - Pay an installment
app.post('/api/installments/:id/pay', (req, res) => {
  paymentController.payInstallment(req, res);
});

// GET /api/customers - Search customers
app.get('/api/customers', (req, res) => {
  customerController.search(req, res);
});

// POST /api/customers - Create a new customer
app.post('/api/customers', (req, res) => {
  customerController.create(req, res);
});

// GET /api/customers/:id - Get customer detail
app.get('/api/customers/:id', (req, res) => {
  customerController.getDetail(req, res);
});

// Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log('📊 API Endpoints:');
  console.log('   GET  /health');
  console.log('   GET  /api/products');
  console.log('   GET  /api/schemes');
  console.log('   POST /api/transactions/simulate');
  console.log('   POST /api/transactions');
  console.log('   GET  /api/contracts/active');
  console.log('   POST /api/installments/:id/pay');
  console.log('   GET  /api/customers (Search)');
  console.log('   POST /api/customers (Create)');
  console.log('   GET  /api/customers/:id (Detail)\n');
});