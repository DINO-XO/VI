import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  console.log('[NOTIFY EVENT TRIGGER STUB]: Notification event received!');
  console.log('Event Payload:', JSON.stringify(req.body?.event?.data?.new || req.body, null, 2));

  return res.status(200).json({
    received: true,
    processed_at: new Date().toISOString(),
    status: 'delivered_via_stub',
  });
}
