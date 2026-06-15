import { Router } from 'express';
import { listCustomers, getCustomer, importOrders, getDistinctCities, createCustomer } from '../controllers/customer.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware as any);
router.post('/', createCustomer as any);
router.get('/', listCustomers as any);
router.get('/meta/cities', getDistinctCities as any);
router.get('/:id', getCustomer as any);
router.post('/orders/import', importOrders as any);
export default router;
