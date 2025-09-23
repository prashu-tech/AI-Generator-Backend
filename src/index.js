import dotenv from 'dotenv';
import connectDB from './db/index.js';
import { app } from './app.js';

// Load .env locally; on Render, dashboard env vars are injected automatically
dotenv.config(); // default is ".env" at project root

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT) || 4000;

connectDB()
  .then(() => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`Server listening on http://${HOST}:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    app.on('error', (error) => {
      console.error('Express app error:', error);
    });

    server.on('error', (error) => {
      console.error('HTTP server error:', error);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
      });
    });
  })
  .catch((err) => {
    console.error('Mongoose connection error:', err);
    process.exit(1);
  });
