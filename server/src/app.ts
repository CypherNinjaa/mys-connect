import express, { Request } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { clerkMiddleware } from '@clerk/express';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { apiRouter } from './routes';

const app = express();

type RequestWithRawBody = Request & { rawBody?: Buffer };

// ─── Security ─────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Mobile apps, Postman, curl send no origin or null origin
      if (!origin || config.nodeEnv === 'development') {
        return callback(null, true);
      }
      if (config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(null, true);
    },
    credentials: true,
  })
);

// ─── Parsing ──────────────────────────────
// Svix signs the original bytes, so retain them for the Clerk webhook before
// JSON parsing. Re-serializing `req.body` changes the signed payload.
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buffer) => {
      if ((req as Request).originalUrl === '/api/v1/webhooks/clerk') {
        (req as RequestWithRawBody).rawBody = Buffer.from(buffer);
      }
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

// ─── Logging ──────────────────────────────
app.use(morgan('dev'));

// ─── Clerk Authentication Middleware ──────
// Parses JWT from Bearer Authorization headers into req.auth
app.use(clerkMiddleware());

// ─── Health Check ─────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// ─── API Routes ───────────────────────────
app.use('/api/v1', apiRouter);

// ─── Error Handler (must be last) ─────────
app.use(errorHandler);

export { app };
