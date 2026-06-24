import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '20m', target: 100000 },
    { duration: '30m', target: 100000 },
    { duration: '20m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const TOKEN = __ENV.TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
};

export default function () {
  const products = http.get(`${BASE_URL}/products?page=1&limit=20`, { headers });
  check(products, { 'GET /products 200': (r) => r.status === 200 });
  errorRate.add(products.status !== 200);
  sleep(1);

  const search = http.get(`${BASE_URL}/products?search=laptop&limit=10`, { headers });
  check(search, { 'GET /products?search 200': (r) => r.status === 200 });
  errorRate.add(search.status !== 200);
  sleep(0.5);

  const product = http.get(`${BASE_URL}/products/1`, { headers });
  check(product, { 'GET /products/1 200': (r) => r.status === 200 });
  errorRate.add(product.status !== 200);
  sleep(0.5);

  const cats = http.get(`${BASE_URL}/categories`, { headers });
  check(cats, { 'GET /categories 200': (r) => r.status === 200 });
  errorRate.add(cats.status !== 200);
  sleep(0.5);

  if (__VU % 5 === 0) {
    const sale = http.post(
      `${BASE_URL}/sales`,
      JSON.stringify({ items: [{ productId: 1, quantity: 1 }] }),
      { headers },
    );
    check(sale, { 'POST /sales 201': (r) => r.status === 201 });
    errorRate.add(sale.status !== 201);
    sleep(1);
  }

  sleep(1);
}
