import path from 'path';
import express from 'express';
import { createApp } from './src/app';
import { errorHandler } from './src/middleware/errorHandler';
import { notFound } from './src/middleware/notFound';

const app = createApp();

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
