import express from 'express';

const app = express();

app.all('*', async (req, res, next) => {
  try {
    const serverModule = await import('../server');
    const realApp = serverModule.default;
    return realApp(req, res, next);
  } catch (err: any) {
    res.status(500).json({
      error: 'Vercel Lambda Runtime Crash',
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code
    });
  }
});

export default app;
