import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m',  target: 200  },
    { duration: '2m',  target: 1000 },
    { duration: '3m',  target: 1000 },
    { duration: '1m',  target: 0    },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed:   ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const TOKEN    = __ENV.TOKEN    || '';
const headers  = { 'Authorization': `Bearer ${TOKEN}` };

export default function () {
  const r = http.get(`${BASE_URL}/products?page=1&limit=20`, { headers });
  check(r, { '200': (res) => res.status === 200 });
  sleep(0.1);
}
