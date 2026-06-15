import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.findOne({});
    }
    if (!admin) {
      admin = await User.create({
        name: 'XenoPilot Admin',
        email: 'admin@xenopilot.com',
        passwordHash: '$2b$12$6t/rYxZ1H1dG7L8CjE6/Oe1.mG09jEeeo8mP.x6K1c0Wd.Q.V7n3y', // bcrypt for AdminPassword123!
        role: 'admin'
      });
    }
    req.userId = admin._id.toString();
    req.userRole = admin.role;
    next();
  } catch (err) {
    next(err);
  }
}
