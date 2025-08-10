const request = require('supertest');
const app = require('../server');

describe('Server Setup', () => {
  test('Health check endpoint should return OK', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    expect(response.body.status).toBe('OK');
    expect(response.body.message).toBe('API is running');
    expect(response.body.timestamp).toBeDefined();
  });

  test('Static files should be served', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    expect(response.text).toContain('html');
  });
});