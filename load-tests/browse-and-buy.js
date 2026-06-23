import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

// ─── Stages: Ramp up → Sustain 100 users → Ramp down ───
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // warm up
    { duration: '1m',  target: 100 },  // ramp to 100 users
    { duration: '2m',  target: 100 },  // sustain 100 users
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed:   ['rate<0.01'],  // less than 1% errors
    errors:            ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const TOKEN    = __ENV.TOKEN    || '';  // pass via: k6 run -e TOKEN=... script.js

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
};

// ─── Most Famous Scenario: Browse → Search → Buy ───
export default function () {
  // 1. GET products (most frequent operation)
  const products = http.get(`${BASE_URL}/products?page=1&limit=20`, { headers });
  check(products, { 'GET /products 200': (r) => r.status === 200 });
  errorRate.add(products.status !== 200);
  sleep(1);

  // 2. Search products by name
  const search = http.get(`${BASE_URL}/products?search=laptop&limit=10`, { headers });
  check(search, { 'GET /products?search 200': (r) => r.status === 200 });
  errorRate.add(search.status !== 200);
  sleep(0.5);

  // 3. GET single product
  const product = http.get(`${BASE_URL}/products/1`, { headers });
  check(product, { 'GET /products/1 200': (r) => r.status === 200 });
  errorRate.add(product.status !== 200);
  sleep(0.5);

  // 4. GET categories
  const cats = http.get(`${BASE_URL}/categories`, { headers });
  check(cats, { 'GET /categories 200': (r) => r.status === 200 });
  errorRate.add(cats.status !== 200);
  sleep(0.5);

  // 5. POST sale (checkout) — every 5thw virtual user
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
