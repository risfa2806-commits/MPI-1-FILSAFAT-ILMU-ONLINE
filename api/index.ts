import type { Request, Response } from 'express';
import app from '../server';

export default function handler(req: Request, res: Response) {
  // Normalize incoming URL so Express router always matches defined /api endpoints on Vercel
  const targetUrl = req.originalUrl || req.url || '/api/health';
  if (targetUrl.startsWith('/api')) {
    req.url = targetUrl;
  } else {
    req.url = `/api${targetUrl.startsWith('/') ? '' : '/'}${targetUrl}`;
  }
  return app(req, res);
}
