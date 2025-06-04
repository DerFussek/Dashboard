const request = require('supertest');
const app = require('../src/server');

describe('GET /slides', () => {
  it('responds with slide data', async () => {
    const res = await request(app).get('/slides');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('slide 1');
  });
});
