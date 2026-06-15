import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User';
import { createError } from '../middleware/error.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'xeno-crm-dev-secret-2024';
const JWT_EXPIRES_IN = '7d';

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = RegisterSchema.parse(req.body);
    const exists = await User.findOne({ email: data.email });
    if (exists) throw createError('Email already registered', 409);

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({ name: data.name, email: data.email, passwordHash });
    const token = jwt.sign({ userId: user._id.toString(), role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = LoginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email });
    if (!user) throw createError('Invalid credentials', 401);

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw createError('Invalid credentials', 401);

    const token = jwt.sign({ userId: user._id.toString(), role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request & { userId?: string }, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}
