import express from 'express';

const diagnosticApp = express();

let realApp: any = null;
let initError: any = null;

try {
  const serverModule = await import('../server.js');
  realApp = serverModule.default;
} catch (err: any) {
  initError = {
    message: err.message,
    stack: err.stack,
    code: err.code,
  };
}

diagnosticApp.use((req, res, next) => {
  if (initError) {
    return res.status(500).json({
      error: 'Server initialization failed',
      details: initError,
    });
  }
  if (realApp) {
    return realApp(req, res, next);
  }
  res.status(500).json({ error: 'App not initialized' });
});

export default diagnosticApp;
