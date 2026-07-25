import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8081',

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // Clerk
  clerkSecretKey: process.env.CLERK_SECRET_KEY!,
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY!,
  clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET,

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    apiSecret: process.env.CLOUDINARY_API_SECRET!,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },
} as const;
