const API_BASE = process.env.YOUNGTECH_API_BASE || 'http://127.0.0.1:5000/api';

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const results = [];
const record = (name, status, detail = '') => results.push({ name, status, detail });

const products = await api('/products');
assert(products.status === 200 && Array.isArray(products.body), '상품 목록 API가 정상 응답하지 않습니다.');
record('상품 목록 API', 'PASS', `${products.body.length}개`);

const login = await api('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: 'test@youngtech.com', password: 'password' })
});
assert(login.status === 200 && login.body.token, '테스트 회원 로그인이 실패했습니다.');
record('테스트 회원 로그인', 'PASS', login.body.user?.email);

const auth = { Authorization: `Bearer ${login.body.token}` };

const addresses = await api('/addresses', { headers: auth });
assert(addresses.status === 200 && Array.isArray(addresses.body), '배송지 목록 API가 실패했습니다.');
record('배송지 목록 API', 'PASS', `${addresses.body.length}개`);

const created = await api('/addresses', {
  method: 'POST',
  headers: auth,
  body: JSON.stringify({
    label: 'Smoke Test',
    recipient: '테스트',
    phone: '01012345678',
    postcode: '12345',
    base_address: '서울 테스트로 1',
    detail_address: '101호',
    delivery_memo: '테스트',
    is_default: false
  })
});
assert(created.status === 201 && created.body.id, '배송지 생성 API가 실패했습니다.');
record('배송지 생성 API', 'PASS', `id=${created.body.id}`);

const deleted = await api(`/addresses/${created.body.id}`, {
  method: 'DELETE',
  headers: auth
});
assert(deleted.status === 200, '배송지 삭제 API가 실패했습니다.');
record('배송지 삭제 API', 'PASS');

const weakRegister = await api('/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    email: `weak_${Date.now()}@example.com`,
    password: 'abc123',
    name: '테스트',
    phone: '01012345678'
  })
});
assert(weakRegister.status === 400, '약한 비밀번호 가입 차단이 동작하지 않습니다.');
record('약한 비밀번호 차단', 'PASS', weakRegister.body.message);

console.table(results);
