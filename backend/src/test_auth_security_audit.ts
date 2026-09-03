import { requireAuth } from './middleware/auth.js';
import { Response } from 'express';

function createMockRes(): { res: Response; getStatus: () => number | null; getBody: () => any } {
  let resStatus: number | null = null;
  let resBody: any = null;

  const res = {
    status(code: number) {
      resStatus = code;
      return res;
    },
    json(data: any) {
      resBody = data;
      return res;
    },
  } as unknown as Response;

  return {
    res,
    getStatus: () => resStatus,
    getBody: () => resBody,
  };
}

async function runSecurityAuditTests() {
  console.log('🧪 Starting FINNEX Demo Authentication Audit Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, actualInfo?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - Actual: ${actualInfo}`);
      failed++;
    }
  }

  // Test 1: Signed out state (no headers) -> 401 Unauthorized
  {
    const req: any = { headers: {} };
    const { res, getStatus } = createMockRes();
    let nextCalled = false;
    await requireAuth(req, res, () => { nextCalled = true; });
    assert(
      getStatus() === 401 && !nextCalled,
      'Test 1: Signed out request without auth headers returns 401 Unauthorized',
      `status=${getStatus()}, nextCalled=${nextCalled}`
    );
  }

  // Test 2: Rohan Demo Login via Bearer header -> Authenticated
  {
    const req: any = { headers: { authorization: 'Bearer rohan@finnex.app' } };
    const { res } = createMockRes();
    let nextCalled = false;
    await requireAuth(req, res, () => { nextCalled = true; });
    assert(
      nextCalled && req.user && req.user.email === 'rohan@finnex.app',
      'Test 2: Rohan demo login resolves to rohan@finnex.app PostgreSQL user',
      `nextCalled=${nextCalled}, email=${req.user?.email}`
    );
  }

  // Test 3: Rohan Demo Login via x-user-id header -> Authenticated
  {
    const req: any = { headers: { 'x-user-id': 'dev_user_demo_123' } };
    const { res } = createMockRes();
    let nextCalled = false;
    await requireAuth(req, res, () => { nextCalled = true; });
    assert(
      nextCalled && req.user && req.user.email === 'rohan@finnex.app',
      'Test 3: x-user-id dev_user_demo_123 resolves to Rohan PostgreSQL account',
      `nextCalled=${nextCalled}, email=${req.user?.email}`
    );
  }

  console.log(`\n==================================================`);
  console.log(`🧪 Demo Auth Audit Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityAuditTests().catch((err) => {
  console.error('Audit script failure:', err);
  process.exit(1);
});
