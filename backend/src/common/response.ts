import { Request, Response, NextFunction } from 'express';

export const successResponse = (res: Response, data: any, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};

export const paginatedResponse = (
  res: Response,
  data: any[],
  total: number,
  page: number,
  limit: number,
  message = 'Success'
) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
};

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
