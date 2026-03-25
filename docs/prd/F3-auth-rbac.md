# TASK-F3: Cognito Auth + API Gateway + RBAC
**Sub-PRD — Authentication & Authorization Layer**
**Author perspective:** Senior AWS Security Architect
**Priority:** P0 — blocks all API-connected frontend work
**Status:** Ready for implementation
**Date:** 2026-03-26

---

## Table of Contents

1. [Overview](#1-overview)
2. [Cognito User Pool Configuration](#2-cognito-user-pool-configuration)
3. [Cognito User Groups](#3-cognito-user-groups)
4. [API Gateway Configuration](#4-api-gateway-configuration)
5. [JWT Authorizer vs Lambda Authorizer](#5-jwt-authorizer-vs-lambda-authorizer)
6. [Lambda Authorizer Implementation](#6-lambda-authorizer-implementation)
7. [RBAC Route Permission Matrix](#7-rbac-route-permission-matrix)
8. [Audit Integration](#8-audit-integration)
9. [Frontend Integration Notes](#9-frontend-integration-notes)
10. [Acceptance Criteria](#10-acceptance-criteria)
11. [Open Questions and Risks](#11-open-questions-and-risks)

---

## 1. Overview

### What This Task Delivers

TASK-F3 provisions the complete authentication and authorization layer for the chatbot backoffice platform. It encompasses:

- **Amazon Cognito User Pool** with banking-grade password policy, MFA configuration per role tier, and user group definitions for the four system roles (BA, DEV, MGMT, ADMIN).
- **API Gateway REST API** with staged deployments (staging, prod), usage plans, CORS, CloudWatch logging, and X-Ray tracing.
- **Lambda Authorizer** implementing group-based RBAC — validating JWT signatures, extracting Cognito group claims, and enforcing per-route access control via IAM policy documents.
- **Audit integration** for login/logout events to satisfy MAS compliance requirements.

### Why Cognito

Amazon Cognito was chosen over alternatives (Auth0, Okta, custom JWT) for the following reasons:

1. **Native AWS integration.** Cognito integrates directly with API Gateway authorizers, IAM, and CloudWatch without additional plumbing. The JWKS endpoint is stable and well-known within the AWS SDK ecosystem.
2. **No egress to third-party SaaS.** For a bank operating under MAS regulations, keeping user identity within the AWS boundary (Singapore region) simplifies data residency obligations.
3. **CDK-native provisioning.** The `aws-cognito` CDK construct covers user pools, user groups, app clients, and domain configuration in code — no manual console steps.
4. **MFA support.** Cognito natively supports TOTP-based MFA (Google Authenticator / Authy), which satisfies the bank's requirement for privileged role authentication without additional vendor integration.
5. **SAML federation readiness.** If OCBC already operates a SAML 2.0 IdP (e.g., Microsoft ADFS), Cognito supports external IdP federation with no architecture change. The Cognito user pool becomes the broker; the SAML assertion maps to Cognito groups.

### Why This Is a P0 Blocker

Every downstream API Lambda handler must receive an authenticated and authorized request context. Without the Cognito User Pool + Lambda Authorizer deployed:

- API Gateway has no mechanism to enforce access control.
- Downstream Lambdas cannot read `event.requestContext.authorizer.userId` or `event.requestContext.authorizer.primaryGroup` — required by the audit middleware and maker-checker service.
- The React SPA has nowhere to send login requests.
- TASK-F2 (Aurora schema) includes the `users` and `user_roles` tables that are populated on first authenticated login — also blocked.

All Phase 1 and Phase 2 tasks depend on this task being deployed to staging before integration work begins.

---

## 2. Cognito User Pool Configuration

### CDK Construct Parameters

```typescript
import * as cognito from 'aws-cdk-lib/aws-cognito';

const userPool = new cognito.UserPool(this, 'BackofficeUserPool', {
  userPoolName: `chatbot-backoffice-${stage}`,

  // --- Sign-in configuration ---
  signInAliases: {
    email: true,
    username: false, // Email is the canonical identifier
  },
  autoVerify: { email: true },
  selfSignUpEnabled: false, // Admin-provisioned accounts only; no public registration

  // --- Password policy ---
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireDigits: true,
    requireSymbols: true,
    tempPasswordValidity: Duration.days(7), // Initial temp password expires in 7 days
  },

  // --- Account recovery ---
  accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

  // --- Advanced security (anomaly detection, adaptive auth) ---
  advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,

  // --- Standard attributes ---
  standardAttributes: {
    email: { required: true, mutable: true },
    givenName: { required: true, mutable: true },
    familyName: { required: true, mutable: true },
  },

  // --- Custom attributes ---
  customAttributes: {
    department: new cognito.StringAttribute({ mutable: true }),
    employeeId: new cognito.StringAttribute({ mutable: false }),
  },

  // --- Email verification ---
  userVerification: {
    emailSubject: 'OCBC Chatbot Backoffice — Verify your email',
    emailBody: 'Your verification code is {####}. This code expires in 24 hours.',
    emailStyle: cognito.VerificationEmailStyle.CODE,
  },

  // --- User invitation (admin-created accounts) ---
  userInvitation: {
    emailSubject: 'OCBC Chatbot Backoffice — Your account has been created',
    emailBody:
      'Your temporary password is {####}. Please log in and change it within 7 days. ' +
      'MFA setup will be required on first login (for DEV and ADMIN roles).',
  },

  // --- Lambda triggers (populated separately below) ---
  lambdaTriggers: {
    postAuthentication: postAuthLambda,
    preTokenGeneration: preTokenLambda, // Inject custom claims
  },

  // --- Deletion protection ---
  removalPolicy: stage === 'prod'
    ? RemovalPolicy.RETAIN
    : RemovalPolicy.DESTROY,
});
```

### MFA Configuration

MFA is configured **per user group** using Cognito's `mfaConfiguration` and group-level settings:

| Role | MFA Requirement | Mechanism |
|------|----------------|-----------|
| ADMIN | Required | TOTP (software token) |
| DEV | Required | TOTP (software token) |
| BA | Optional | TOTP (software token, if configured) |
| MGMT | Not required | Email OTP only (standard Cognito challenge) |

```typescript
// User pool level: set to OPTIONAL so it can be enforced per-group via policy
userPool.addMfa({
  mfa: cognito.Mfa.OPTIONAL,
  mfaSecondFactor: {
    sms: false,   // SMS is excluded — SIM swap risk and carrier dependency
    otp: true,    // TOTP via authenticator app only
  },
});
```

MFA enforcement for ADMIN and DEV is implemented in a **Pre-Authentication Lambda trigger** that inspects the user's group membership and raises an exception if TOTP is not configured:

```typescript
// Pre-authentication Lambda (pseudocode)
export const handler = async (event) => {
  const groups = event.request.userAttributes['cognito:groups'] ?? [];
  const mfaEnabled = event.request.userAttributes['software_token_mfa_enabled'] === 'true';

  if ((groups.includes('ADMIN') || groups.includes('DEV')) && !mfaEnabled) {
    throw new Error('MFA_REQUIRED: TOTP must be configured for this role before login is permitted.');
  }
  return event;
};
```

**Rationale for TOTP over SMS:** SMS OTP is vulnerable to SIM-swap attacks and introduces carrier dependency. For a banking-context admin tool, TOTP via authenticator app (RFC 6238) is the minimum acceptable second factor for privileged roles. SMS is explicitly disabled.

### Token Validity

```typescript
const appClient = userPool.addClient('BackofficeSPAClient', {
  userPoolClientName: `chatbot-backoffice-spa-${stage}`,
  generateSecret: false, // Public SPA client — no client secret
  authFlows: {
    userSrp: true,        // SRP-based password auth (no password transmitted)
    userPassword: false,  // Disabled — SRP is always used instead
    custom: false,
    adminUserPassword: false,
  },
  oAuth: {
    flows: { authorizationCodeGrant: true },
    scopes: [
      cognito.OAuthScope.EMAIL,
      cognito.OAuthScope.OPENID,
      cognito.OAuthScope.PROFILE,
    ],
    callbackUrls: [
      `https://${cloudfrontDomain}/auth/callback`,
      'http://localhost:3000/auth/callback', // Only in staging
    ],
    logoutUrls: [
      `https://${cloudfrontDomain}/auth/logout`,
      'http://localhost:3000/auth/logout',
    ],
  },
  accessTokenValidity: Duration.hours(1),     // Short-lived; refresh frequently
  idTokenValidity: Duration.hours(1),
  refreshTokenValidity: Duration.days(30),    // 30-day sliding window
  enableTokenRevocation: true,               // Allows explicit token revocation on logout
  preventUserExistenceErrors: true,          // Prevents user enumeration attacks
});
```

**Token validity rationale:**
- Access token (1 hour): Limits the exposure window if a token is intercepted. API Gateway will reject any token older than 1 hour.
- Refresh token (30 days): Matches a typical monthly work cycle. Refresh tokens are stored server-side in Cognito and can be revoked on logout or suspicious activity.
- Refresh tokens must be revoked on explicit logout — see Section 8.

### Account Lockout Policy

Cognito's Advanced Security (ENFORCED mode) applies adaptive authentication. Additionally, a hard lockout is configured:

- **5 consecutive failed attempts** within a 15-minute window triggers a temporary lockout.
- The account is locked for **30 minutes** after the 5th failure.
- ADMIN users receive an email notification on any lockout event (via CloudWatch Alarm → SNS → email).
- Admin-forced unlock is available via the Cognito console or the `/users/{userId}/unlock` API endpoint (ADMIN role only).

Note: Cognito does not natively expose a configurable N-attempt lockout via CDK as of this writing. This is enforced via the Advanced Security adaptive auth feature (which uses ML to detect brute-force patterns) combined with a Custom Auth challenge Lambda that tracks failure counts in DynamoDB with a TTL-based counter.

### Cognito Hosted UI Domain

```typescript
userPool.addDomain('BackofficeDomain', {
  cognitoDomain: {
    domainPrefix: `ocbc-chatbot-backoffice-${stage}`,
    // Results in: https://ocbc-chatbot-backoffice-staging.auth.ap-southeast-1.amazoncognito.com
  },
});
```

The hosted UI is used for the initial login flow before a custom login page is built (TASK-FE-AUTH, Phase 2). The hosted UI supports PKCE-based authorization code flow — the SPA redirects to the hosted UI, the user authenticates, and Cognito redirects back with an authorization code. The SPA exchanges the code for tokens via the token endpoint.

---

## 3. Cognito User Groups

Four groups are defined, mapping exactly to the four system roles in the SSOT. Group precedence determines which group's permissions apply when a user belongs to multiple groups (lower value = higher priority).

### Group Definitions

#### ADMIN (Precedence: 1)

```typescript
new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
  userPoolId: userPool.userPoolId,
  groupName: 'ADMIN',
  description:
    'System administrators. Full access to all endpoints including user management. ' +
    'Responsible for provisioning users, assigning roles, configuring maker-checker rules, ' +
    'and managing system-level settings.',
  precedence: 1,
});
```

**Access:** All endpoints. This is the only group with access to `/users` (user management). ADMIN can activate/deactivate the kill switch and configure which action types require maker-checker.

#### DEV (Precedence: 2)

```typescript
new cognito.CfnUserPoolGroup(this, 'DevGroup', {
  userPoolId: userPool.userPoolId,
  groupName: 'DEV',
  description:
    'Developer / ML Engineer. Full access to technical configuration: agent management, ' +
    'guardrail policy writes, intent CRUD, document management, and all read endpoints. ' +
    'Can activate/deactivate kill switch and act as Maker or Checker in the maker-checker workflow.',
  precedence: 2,
});
```

**Access:** All endpoints except `/users`. Full read/write on `/agents`, `/guardrails` (including PUT), `/system/kill-switch` (GET and PUT). Can act as both Maker and Checker.

#### BA (Precedence: 3)

```typescript
new cognito.CfnUserPoolGroup(this, 'BaGroup', {
  userPoolId: userPool.userPoolId,
  groupName: 'BA',
  description:
    'Business Analyst / PM. Access to intent management, discovery workflows, template authoring, ' +
    'document management, audit log review, and approvals queue. Cannot access agent configuration ' +
    'or guardrail policy writes. Read-only access to guardrail policy for transparency.',
  precedence: 3,
});
```

**Access:** GET/POST/PUT/DELETE on `/intents`, `/sync-sessions`, `/templates`, `/documents`, `/approvals`. GET on `/guardrails`, `/audit`, `/metrics`. No access to `/agents`, `/users`, or `/system/kill-switch` (PUT). Can read kill switch status (GET).

#### MGMT (Precedence: 4)

```typescript
new cognito.CfnUserPoolGroup(this, 'MgmtGroup', {
  userPoolId: userPool.userPoolId,
  groupName: 'MGMT',
  description:
    'Senior Management. Read-only access to observability metrics for funding/oversight decisions. ' +
    'Cannot access any write operations or configuration endpoints. Can view kill switch status.',
  precedence: 4,
});
```

**Access:** GET `/metrics` only, plus GET `/system/kill-switch` (status visibility). No write access to anything. No access to intents, agents, audit, templates, documents, or user management.

---

## 4. API Gateway Configuration

### REST API CDK Setup

```typescript
import * as apigw from 'aws-cdk-lib/aws-apigateway';

const api = new apigw.RestApi(this, 'BackofficeApi', {
  restApiName: `chatbot-backoffice-api-${stage}`,
  description: 'OCBC Chatbot Backoffice — Admin REST API',

  // --- Deploy config ---
  deploy: true,
  deployOptions: {
    stageName: stage, // 'staging' or 'prod'
    tracingEnabled: true,         // AWS X-Ray tracing
    dataTraceEnabled: true,       // Log full request/response bodies (staging only — see note)
    loggingLevel: apigw.MethodLoggingLevel.INFO,
    metricsEnabled: true,
    accessLogDestination: new apigw.LogGroupLogDestination(apiAccessLogGroup),
    accessLogFormat: apigw.AccessLogFormat.custom(
      JSON.stringify({
        requestId: '$context.requestId',
        ip: '$context.identity.sourceIp',
        requestTime: '$context.requestTime',
        httpMethod: '$context.httpMethod',
        routeKey: '$context.resourcePath',
        status: '$context.status',
        protocol: '$context.protocol',
        responseLength: '$context.responseLength',
        userId: '$context.authorizer.userId',
        primaryGroup: '$context.authorizer.primaryGroup',
        userAgent: '$context.identity.userAgent',
        integrationLatency: '$context.integrationLatency',
        responseLatency: '$context.responseLatency',
      })
    ),
  },

  // --- CORS ---
  defaultCorsPreflightOptions: {
    allowOrigins: stage === 'prod'
      ? [`https://${cloudfrontDomain}`]
      : [`https://${cloudfrontDomain}`, 'http://localhost:3000'],
    allowMethods: apigw.Cors.ALL_METHODS,
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Amz-Date',
      'X-Api-Key',
      'X-Amz-Security-Token',
      'X-Request-ID',
    ],
    allowCredentials: false, // Tokens are in Authorization header, not cookies
    maxAge: Duration.hours(1),
  },

  // --- Error response mapping ---
  gatewayResponses: {
    [apigw.ResponseType.UNAUTHORIZED]: {
      statusCode: '401',
      responseHeaders: { 'Access-Control-Allow-Origin': "'*'" },
      templates: {
        'application/json': '{"error": "Unauthorized", "message": "$context.authorizer.errorMessage"}',
      },
    },
    [apigw.ResponseType.ACCESS_DENIED]: {
      statusCode: '403',
      responseHeaders: { 'Access-Control-Allow-Origin': "'*'" },
      templates: {
        'application/json': '{"error": "Forbidden", "message": "Your role does not have access to this resource."}',
      },
    },
  },
});
```

**Note on `dataTraceEnabled`:** Full request/response body logging is enabled in staging for debugging only. In production, this must be set to `false` — response bodies may contain sensitive PII or policy configuration. Access log format (above) captures sufficient metadata without body content.

### Stages

Two deployment stages are required: `staging` and `prod`. These correspond to separate CDK stacks deployed to the same or separate AWS accounts.

| Parameter | Staging | Production |
|-----------|---------|------------|
| Stack name | `ChatbotBackofficeStaging` | `ChatbotBackofficeProd` |
| API stage name | `staging` | `prod` |
| Cognito domain prefix | `ocbc-chatbot-backoffice-staging` | `ocbc-chatbot-backoffice-prod` |
| `dataTraceEnabled` | `true` | `false` |
| CORS allowed origins | CloudFront + localhost:3000 | CloudFront only |
| X-Ray | Enabled | Enabled |
| Deletion protection | `DESTROY` | `RETAIN` |

### Usage Plans and API Keys

Usage plans protect against runaway clients and provide baseline rate limiting even for authenticated users. Note: usage plans apply *in addition to* the Lambda authorizer — a valid JWT does not bypass rate limits.

```typescript
const usagePlan = api.addUsagePlan('DefaultUsagePlan', {
  name: `chatbot-backoffice-default-${stage}`,
  throttle: {
    rateLimit: 100,   // Requests per second (sustained)
    burstLimit: 200,  // Requests per second (burst)
  },
  quota: {
    limit: 10000,     // Requests per day per API key
    period: apigw.Period.DAY,
  },
});

// One API key per environment; SPA sends this as X-Api-Key header
const apiKey = api.addApiKey(`BackofficeApiKey-${stage}`);
usagePlan.addApiKey(apiKey);
usagePlan.addApiStage({ stage: api.deploymentStage });
```

The API key is stored in AWS Secrets Manager and injected into the SPA's runtime config at CloudFront distribution level (via a Lambda@Edge that adds the header, or via environment variable in the CDK build). This is **not** a security boundary — it is a rate-limiting identifier only. The Lambda authorizer JWT validation is the security boundary.

---

## 5. JWT Authorizer vs Lambda Authorizer

### Option A: API Gateway JWT Authorizer (Native)

API Gateway natively supports JWT authorizers using the `HttpAuthorizer` with `JwtConfiguration`. This validates:
- JWT signature against the Cognito JWKS endpoint (`https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json`)
- Token expiry (`exp` claim)
- Issuer (`iss` claim matches the User Pool)
- Audience (`aud` claim matches the App Client ID)

**Limitation:** The native JWT authorizer performs signature validation only. It **cannot** inspect the `cognito:groups` claim and make routing decisions based on group membership. Every valid token with a valid signature passes, regardless of the user's role.

This means: a MGMT user with a valid token could call `DELETE /intents/{id}` and the JWT authorizer would not block it — the downstream Lambda would have to do RBAC itself. This violates the principle of enforcing authorization at the gateway layer, and would require duplicating RBAC logic across every Lambda handler.

**Verdict: Insufficient for this system.**

### Option B: Lambda Authorizer (Recommended)

A Lambda authorizer is a custom function invoked by API Gateway before routing the request to the backend Lambda. It receives the `Authorization` header and returns an IAM policy document.

**Capabilities beyond JWT authorizer:**
- Extract and validate the `cognito:groups` claim from the decoded JWT payload.
- Determine the user's highest-precedence group (their effective role).
- Look up the route permission matrix for that group.
- Return an IAM `Allow` policy scoped to the specific HTTP method + ARN, or a `Deny` policy with a context error message.
- Inject enriched context (`userId`, `email`, `primaryGroup`) into `event.requestContext.authorizer` for downstream Lambdas.
- Cache the authorization result by token hash for 300 seconds, avoiding repeated JWKS calls.

**Verdict: Lambda Authorizer is required. This is the only option that enforces group-based RBAC at the gateway layer.**

### Decision: Lambda Authorizer

All API Gateway routes are protected by a single Lambda authorizer. Downstream Lambda handlers receive the authorization context via `event.requestContext.authorizer` and should not re-implement RBAC — they can read `primaryGroup` for any group-specific business logic (e.g., filtering audit logs to the actor's own records).

---

## 6. Lambda Authorizer Implementation

### Function Specification

**Runtime:** Node.js 22.x (Lambda)
**Memory:** 256 MB
**Timeout:** 5 seconds (authorization must complete before the 10s API Gateway integration timeout)
**Tracing:** AWS X-Ray active

### Input

API Gateway delivers the authorizer event in `REQUEST` type (recommended over `TOKEN` type for flexibility):

```typescript
interface AuthorizerEvent {
  type: 'REQUEST';
  methodArn: string;           // e.g., "arn:aws:execute-api:ap-southeast-1:123:abc123/prod/DELETE/intents/42"
  headers: {
    Authorization: string;     // "Bearer eyJhbGci..."
    [key: string]: string;
  };
  requestContext: {
    resourcePath: string;      // e.g., "/intents/{id}"
    httpMethod: string;        // e.g., "DELETE"
    stage: string;             // "staging" | "prod"
  };
}
```

### Processing Steps

```
Step 1: Extract token
  ├── Parse Authorization header: must start with "Bearer "
  ├── If missing or malformed → return Deny policy (401)
  └── Extract raw JWT string

Step 2: Validate JWT signature
  ├── Fetch JWKS from Cognito endpoint (cached in Lambda memory, refreshed every 60 min)
  ├── Decode JWT header to get `kid` (key ID)
  ├── Find matching public key in JWKS by `kid`
  ├── If `kid` not found → JWKS may have rotated → force refresh JWKS → retry once
  └── Verify RS256 signature using the public key
      └── If invalid → return Deny policy (401, "Invalid token signature")

Step 3: Validate claims
  ├── Check `exp`: if current time > exp → return Deny (401, "Token expired")
  ├── Check `iss`: must equal "https://cognito-idp.{region}.amazonaws.com/{userPoolId}"
  ├── Check `aud` or `client_id`: must equal the App Client ID
  ├── Check `token_use`: must be "access" (not "id" token)
  └── If any check fails → return Deny (401, "Invalid token claims")

Step 4: Extract group membership
  ├── Read `cognito:groups` claim (array of group names)
  ├── If empty or missing → return Deny (403, "User has no assigned role")
  └── Determine primaryGroup: the group with the lowest precedence value
      (ADMIN=1, DEV=2, BA=3, MGMT=4)

Step 5: RBAC route check
  ├── Parse requested method and resource path from methodArn
  ├── Look up ROUTE_PERMISSION_MATRIX[primaryGroup][method][resourcePath]
  └── If not found or explicitly false → effect = "Deny"
      If allowed → effect = "Allow"

Step 6: Return IAM policy document
  └── Include authorization context for downstream Lambdas
```

### IAM Policy Document Structure

The authorizer must return a policy that explicitly scopes the Allow to the specific resource ARN. Using a wildcard ARN (`*`) on Allow is acceptable for simplicity but reduces auditability. For a banking-grade system, scope the Allow to the requested resource ARN and return a Deny on all other execution ARNs.

```typescript
interface AuthorizerResponse {
  principalId: string;           // userId (Cognito sub claim)
  policyDocument: {
    Version: '2012-10-17';
    Statement: PolicyStatement[];
  };
  context: AuthorizerContext;    // Passed to downstream Lambda
  usageIdentifierKey?: string;   // API key for usage plan (optional)
}

interface AuthorizerContext {
  userId: string;       // Cognito `sub` claim (UUID)
  email: string;        // User's email
  groups: string;       // JSON-stringified array: '["DEV","ADMIN"]'
  primaryGroup: string; // Effective role: "DEV"
}
```

Example Allow response:

```json
{
  "principalId": "a1b2c3d4-...",
  "policyDocument": {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": "execute-api:Invoke",
        "Resource": "arn:aws:execute-api:ap-southeast-1:123456789:abc123/prod/DELETE/intents/*"
      }
    ]
  },
  "context": {
    "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "jsmith@ocbc.com",
    "groups": "[\"BA\"]",
    "primaryGroup": "BA"
  }
}
```

Example Deny response (MGMT attempting to access `/intents`):

```json
{
  "principalId": "x9y8z7w6-...",
  "policyDocument": {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Deny",
        "Action": "execute-api:Invoke",
        "Resource": "arn:aws:execute-api:ap-southeast-1:123456789:abc123/prod/GET/intents"
      }
    ]
  },
  "context": {
    "userId": "x9y8z7w6-...",
    "email": "ceo@ocbc.com",
    "groups": "[\"MGMT\"]",
    "primaryGroup": "MGMT",
    "errorMessage": "Role MGMT is not permitted to access GET /intents"
  }
}
```

### Authorizer Caching

```typescript
const authorizer = new apigw.RequestAuthorizer(this, 'LambdaAuthorizer', {
  handler: authorizerLambda,
  identitySources: [apigw.IdentitySource.header('Authorization')],
  resultsCacheTtl: Duration.seconds(300), // Cache by Authorization header value
});
```

**Cache key:** The `Authorization` header value (the full `Bearer <token>` string). Since access tokens change on each refresh cycle and expire in 1 hour, a 300-second (5-minute) cache TTL provides a meaningful reduction in JWKS calls without meaningfully extending the effective revocation window. If a token is revoked (e.g., force-logout by ADMIN), it will continue to be authorized for up to 5 minutes from cache — this is an acceptable trade-off for a banking-context admin tool (not a real-time financial transaction API).

**If zero-tolerance revocation is required:** Set `resultsCacheTtl: Duration.seconds(0)` to disable caching entirely. This adds ~20ms of latency per request (JWKS fetch is cached in Lambda memory; the overhead is the Cognito verification logic). Evaluate based on security policy.

### JWKS Caching in Lambda Memory

The authorizer Lambda caches the JWKS response in module-level memory (outside the handler function). This avoids fetching the JWKS URL on every cold start of a new container. The cache is refreshed every 60 minutes or when a JWT presents a `kid` that is not in the cached JWKS (indicating key rotation).

```typescript
// Module-level cache (survives warm Lambda invocations)
let jwksCache: { keys: JWK[]; fetchedAt: number } | null = null;
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes

async function getJwks(): Promise<JWK[]> {
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys;
  }
  const response = await fetch(JWKS_URI);
  const { keys } = await response.json();
  jwksCache = { keys, fetchedAt: now };
  return keys;
}
```

### Required NPM Dependencies

```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.0",
    "jwks-rsa": "^3.1.0",
    "node-fetch": "^3.3.0"
  }
}
```

Use `jwks-rsa` for the JWKS client — it handles key caching, rate limiting, and RSA public key formatting from the JWKS endpoint natively.

---

## 7. RBAC Route Permission Matrix

The matrix below defines which HTTP methods on which endpoint groups are permitted for each role. The Lambda authorizer uses this matrix (hard-coded as a typed constant in the authorizer Lambda) to determine Allow or Deny.

All routes require authentication. There are no public endpoints on the Backoffice API.

| Endpoint Group | Method(s) | BA | DEV | MGMT | ADMIN | Notes |
|---|---|:---:|:---:|:---:|:---:|---|
| `/intents` | GET | ✅ | ✅ | ❌ | ✅ | List/search intents |
| `/intents` | POST | ✅ | ✅ | ❌ | ✅ | Create intent |
| `/intents/{id}` | PUT | ✅ | ✅ | ❌ | ✅ | Edit intent |
| `/intents/{id}` | DELETE | ✅ | ✅ | ❌ | ✅ | Delete intent |
| `/intents/{id}/promote` | POST | ✅ | ✅ | ❌ | ✅ | Staging→Prod; triggers maker-checker |
| `/intents/{id}/rollback` | POST | ✅ | ✅ | ❌ | ✅ | Rollback to snapshot |
| `/agents` | GET | ❌ | ✅ | ❌ | ✅ | List agents |
| `/agents` | POST | ❌ | ✅ | ❌ | ✅ | Create agent |
| `/agents/{id}` | PUT | ❌ | ✅ | ❌ | ✅ | Edit agent config/prompt |
| `/agents/{id}` | DELETE | ❌ | ✅ | ❌ | ✅ | Delete agent |
| `/sync-sessions` | GET | ✅ | ✅ | ❌ | ✅ | List discovery sessions |
| `/sync-sessions` | POST | ✅ | ✅ | ❌ | ✅ | Trigger discovery |
| `/sync-sessions/{id}` | GET | ✅ | ✅ | ❌ | ✅ | Session detail + diffs |
| `/sync-sessions/{id}/approve` | POST | ✅ | ✅ | ❌ | ✅ | Approve diffs to staging |
| `/guardrails` | GET | ✅ | ✅ | ❌ | ✅ | Read policy (BA: transparency) |
| `/guardrails` | PUT | ❌ | ✅ | ❌ | ✅ | Update guardrail policy |
| `/guardrails/test` | POST | ❌ | ✅ | ❌ | ✅ | Test query against policy |
| `/metrics` | GET | ✅ | ✅ | ✅ | ✅ | Only endpoint MGMT can access |
| `/audit` | GET | ✅ | ✅ | ❌ | ✅ | Read audit log (filtered) |
| `/audit/export` | GET | ✅ | ✅ | ❌ | ✅ | CSV export |
| `/templates` | GET | ✅ | ✅ | ❌ | ✅ | List templates |
| `/templates` | POST | ✅ | ✅ | ❌ | ✅ | Create template |
| `/templates/{id}` | PUT | ✅ | ✅ | ❌ | ✅ | Edit; triggers maker-checker |
| `/templates/{id}` | DELETE | ✅ | ✅ | ❌ | ✅ | Soft-delete template |
| `/templates/{id}/activate` | POST | ✅ | ✅ | ❌ | ✅ | Activate/deactivate template |
| `/templates/{id}/restore` | POST | ✅ | ✅ | ❌ | ✅ | Restore version |
| `/documents` | GET | ✅ | ✅ | ❌ | ✅ | List documents |
| `/documents` | POST | ✅ | ✅ | ❌ | ✅ | Upload (pre-signed URL) |
| `/documents/{id}` | PUT | ✅ | ✅ | ❌ | ✅ | Update metadata / re-upload |
| `/documents/{id}` | DELETE | ✅ | ✅ | ❌ | ✅ | Soft-delete |
| `/documents/{id}/reindex` | POST | ✅ | ✅ | ❌ | ✅ | Manual re-index trigger |
| `/approvals` | GET | ✅ | ✅ | ❌ | ✅ | View pending approval queue |
| `/approvals` | POST | ✅ | ✅ | ❌ | ✅ | Submit change for approval (Maker) |
| `/approvals/{id}/approve` | PUT | ✅ | ✅ | ❌ | ✅ | Approve (Checker — different actor enforced in Lambda) |
| `/approvals/{id}/reject` | PUT | ✅ | ✅ | ❌ | ✅ | Reject with comment |
| `/system/kill-switch` | GET | ✅ | ✅ | ✅ | ✅ | Read kill switch state |
| `/system/kill-switch` | PUT | ❌ | ✅ | ❌ | ✅ | Activate or deactivate |
| `/users` | GET | ❌ | ❌ | ❌ | ✅ | List users |
| `/users` | POST | ❌ | ❌ | ❌ | ✅ | Create user account |
| `/users/{id}` | PUT | ❌ | ❌ | ❌ | ✅ | Edit user / assign role |
| `/users/{id}` | DELETE | ❌ | ❌ | ❌ | ✅ | Deactivate user |
| `/users/{id}/unlock` | POST | ❌ | ❌ | ❌ | ✅ | Unlock locked account |
| `/generation/utterances` | POST | ✅ | ✅ | ❌ | ✅ | AI utterance generation |
| `/generation/response` | POST | ✅ | ✅ | ❌ | ✅ | AI RAG response draft |

### Implementation in Authorizer Lambda

The matrix is expressed as a TypeScript constant to allow type checking and avoid runtime lookup errors:

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type GroupName = 'ADMIN' | 'DEV' | 'BA' | 'MGMT';

interface RoutePermission {
  pattern: RegExp;           // Matches the resource path (from methodArn)
  methods: HttpMethod[];     // HTTP methods this rule covers
  allowedGroups: GroupName[];
}

const ROUTE_PERMISSIONS: RoutePermission[] = [
  // /metrics — only endpoint MGMT can access
  {
    pattern: /^\/metrics/,
    methods: ['GET'],
    allowedGroups: ['ADMIN', 'DEV', 'BA', 'MGMT'],
  },
  // /system/kill-switch GET — all authenticated users can read status
  {
    pattern: /^\/system\/kill-switch$/,
    methods: ['GET'],
    allowedGroups: ['ADMIN', 'DEV', 'BA', 'MGMT'],
  },
  // /system/kill-switch PUT — DEV and ADMIN only
  {
    pattern: /^\/system\/kill-switch$/,
    methods: ['PUT'],
    allowedGroups: ['ADMIN', 'DEV'],
  },
  // /users — ADMIN only
  {
    pattern: /^\/users/,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedGroups: ['ADMIN'],
  },
  // /agents — DEV and ADMIN only
  {
    pattern: /^\/agents/,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedGroups: ['ADMIN', 'DEV'],
  },
  // /guardrails GET — BA, DEV, ADMIN (read transparency)
  {
    pattern: /^\/guardrails$/,
    methods: ['GET'],
    allowedGroups: ['ADMIN', 'DEV', 'BA'],
  },
  // /guardrails PUT + /guardrails/test — DEV and ADMIN only
  {
    pattern: /^\/guardrails/,
    methods: ['PUT', 'POST'],
    allowedGroups: ['ADMIN', 'DEV'],
  },
  // All other endpoints — BA, DEV, ADMIN (not MGMT)
  {
    pattern: /^\/(?:intents|sync-sessions|templates|documents|approvals|audit|generation)/,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedGroups: ['ADMIN', 'DEV', 'BA'],
  },
];
```

Route matching is first-match-wins on `pattern` + `methods`. The authorizer iterates the array in order and returns the `allowedGroups` from the first matching rule.

---

## 8. Audit Integration

### Login Events — Cognito Post-Authentication Lambda Trigger

Every successful authentication event writes a login record to the audit log via a Post-Authentication Lambda trigger. This covers both password authentication and MFA completion (the trigger fires after the full auth challenge chain).

```typescript
// Cognito Post-Authentication Lambda trigger
export const handler = async (event: CognitoUserPoolTriggerEvent) => {
  const auditRecord = {
    actor_id: event.userName,                          // Cognito username (email)
    actor_email: event.request.userAttributes.email,
    action_type: 'USER_LOGIN',
    entity_type: 'SESSION',
    entity_id: event.request.userAttributes.sub,       // Cognito user UUID
    timestamp: new Date().toISOString(),
    source_ip: event.request.ipAddress,
    user_agent: event.request.userAttributes['custom:user_agent'] ?? 'unknown',
    metadata: JSON.stringify({
      cognito_groups: event.request.groupConfiguration?.groupsToOverride ?? [],
      new_device_used: event.request.newDeviceUsed,
      client_metadata: event.request.clientMetadata,
    }),
    before_value: null,
    after_value: null,
  };

  // Write to Aurora audit_log table via the Audit Service Lambda
  // (direct DB write from trigger is acceptable here since no HTTP layer)
  await auditServiceClient.writeAuditRecord(auditRecord);

  return event; // Must return the event for Cognito to continue
};
```

**Failed login attempts** are also captured. Use the **User Migration Lambda** trigger (or a separate Pre-Authentication trigger) to detect and log failed authentication attempts:

```typescript
// Pre-Authentication Lambda: capture failed attempts for audit visibility
// Note: Cognito does not expose a "failed login" trigger directly.
// Failed attempts are captured from Cognito CloudWatch Logs via a log subscription filter
// that matches "Authentication failed" events → forwards to the Audit Service Lambda.
```

### Logout Events

Logout is a client-initiated event (the SPA calls Cognito's `/oauth2/revoke` endpoint). The flow:

1. SPA calls `POST /auth/logout` on the Backoffice API (authenticated).
2. Logout Lambda: (a) writes a `USER_LOGOUT` audit record, (b) calls Cognito token revocation to invalidate the refresh token, (c) optionally calls the Cognito global sign-out endpoint to invalidate all tokens for the user across all devices.
3. SPA clears in-memory token state and redirects to the Cognito hosted UI logout URL.

```typescript
// POST /auth/logout handler (downstream Lambda, not the authorizer)
export const handler = async (event: APIGatewayEvent) => {
  const { userId, email } = event.requestContext.authorizer as AuthorizerContext;
  const { refreshToken } = JSON.parse(event.body ?? '{}');

  // 1. Revoke refresh token with Cognito
  await cognitoClient.send(new RevokeTokenCommand({
    Token: refreshToken,
    ClientId: process.env.COGNITO_CLIENT_ID,
  }));

  // 2. Global sign-out (invalidates all access tokens — note: 5-min authorizer cache may still pass)
  await cognitoClient.send(new GlobalSignOutCommand({
    AccessToken: event.headers.Authorization.replace('Bearer ', ''),
  }));

  // 3. Write audit record
  await auditServiceClient.writeAuditRecord({
    actor_id: userId,
    actor_email: email,
    action_type: 'USER_LOGOUT',
    entity_type: 'SESSION',
    entity_id: userId,
    timestamp: new Date().toISOString(),
    source_ip: event.requestContext.identity.sourceIp,
  });

  return { statusCode: 200, body: JSON.stringify({ message: 'Logged out successfully' }) };
};
```

**Note on authorizer cache and revocation:** After global sign-out, the access token will still pass the Lambda authorizer for up to 5 minutes (cache TTL). For force-logout scenarios (compromised account, ADMIN-initiated), the authorizer cache must be invalidated. API Gateway does not support selective cache invalidation by token — the options are: (a) disable caching (`resultsCacheTtl: Duration.seconds(0)`), (b) implement a token blocklist in DynamoDB checked in the authorizer Lambda, or (c) accept the 5-minute window. For this system, option (b) is recommended for ADMIN-forced logouts only — the blocklist check adds a DynamoDB read per request but only applies to an in-memory set of recently revoked token IDs (cleared after the access token's 1-hour expiry).

---

## 9. Frontend Integration Notes

### Token Management Strategy

Tokens must **not** be stored in `localStorage` or `sessionStorage`. XSS attacks can exfiltrate any value accessible from JavaScript in storage. The recommended storage strategy:

| Token | Storage Location | Rationale |
|-------|-----------------|-----------|
| Access token | JavaScript memory (module-level variable) | Not accessible to injected scripts; lost on page refresh (intentional) |
| ID token | JavaScript memory | Same as above |
| Refresh token | `httpOnly` SameSite=Strict cookie (set by a backend endpoint) | Not accessible to JavaScript; persists across page refresh; CSRF-protected by SameSite |

The SPA exchanges the authorization code for tokens by calling a backend `/auth/token` endpoint (a thin Lambda proxy), which returns the access and ID tokens in the JSON body and sets the refresh token as an `httpOnly` cookie. The SPA stores access and ID tokens in memory only.

### Amplify JS Integration

Use `@aws-amplify/auth` (Amplify v6, modular) for Cognito integration:

```typescript
import { Amplify } from 'aws-amplify';
import { signIn, signOut, fetchAuthSession, getCurrentUser } from '@aws-amplify/auth';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN,
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [window.location.origin + '/auth/callback'],
          redirectSignOut: [window.location.origin + '/auth/logout'],
          responseType: 'code', // PKCE flow
        },
      },
    },
  },
});
```

Amplify v6 handles PKCE code exchange, token refresh, and JWKS caching internally. The `fetchAuthSession()` call returns the current access token and automatically triggers a refresh if the token is within the refresh window.

### Login Flow

```
1. User loads the SPA → check memory for valid access token
2. No valid token → redirect to Cognito hosted UI (authorization code + PKCE)
3. User authenticates (password + TOTP if required by group)
4. Cognito redirects to /auth/callback?code=...
5. SPA exchanges code for tokens (Amplify handles this automatically)
6. SPA reads `cognito:groups` from the ID token to determine tab visibility
7. SPA stores access token in memory; refresh token in httpOnly cookie (via backend endpoint)
8. Render the correct tabs based on primaryGroup
```

### RBAC-Aware Tab Rendering

The SPA reads the `cognito:groups` claim from the decoded ID token to determine which tabs to render. The group with the lowest precedence number is the `primaryGroup` that drives visibility:

```typescript
function getVisibleTabs(primaryGroup: string): Tab[] {
  switch (primaryGroup) {
    case 'ADMIN':
    case 'DEV':
      return ALL_TABS;
    case 'BA':
      return ['IntentDiscovery', 'ActiveIntents', 'ChatbotPreview', 'AuditTrail', 'AdminControlInterface'];
    case 'MGMT':
      return ['ExecutiveDashboard'];
    default:
      return [];
  }
}
```

Tab hiding is a UX convenience, not a security control. Security is enforced at the API layer by the Lambda authorizer. The SPA tab list is never treated as authoritative.

### Token Refresh and 401 Handling

All API calls include the `Authorization: Bearer <accessToken>` header. The SPA API client intercepts 401 responses:

```typescript
async function apiRequest(path: string, options: RequestInit) {
  const session = await fetchAuthSession();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.tokens.accessToken.toString()}`,
      'X-Api-Key': import.meta.env.VITE_API_KEY,
    },
  });

  if (response.status === 401) {
    // Token expired — attempt refresh
    try {
      const newSession = await fetchAuthSession({ forceRefresh: true });
      // Retry the original request once with the new token
      return fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newSession.tokens.accessToken.toString()}`,
          'X-Api-Key': import.meta.env.VITE_API_KEY,
        },
      });
    } catch {
      // Refresh failed (refresh token expired or revoked) → redirect to login
      await signOut();
      window.location.href = '/auth/login';
    }
  }

  return response;
}
```

### Environment Variables (Vite)

These must be set in `.env.local` for local development and injected at build time or via CloudFront for deployed environments:

```
VITE_COGNITO_USER_POOL_ID=ap-southeast-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_DOMAIN=ocbc-chatbot-backoffice-staging.auth.ap-southeast-1.amazoncognito.com
VITE_API_BASE_URL=https://abc123.execute-api.ap-southeast-1.amazonaws.com/staging
VITE_API_KEY=xxxx  # Rate-limiting identifier only, not a secret
```

---

## 10. Acceptance Criteria

The following criteria derive from TASK-F3 in `AGENT_TASKS.md` and are extended with additional banking-grade security requirements.

### From AGENT_TASKS.md

- [ ] Users in MGMT group can **only** access `GET /metrics` and `GET /system/kill-switch`. All other endpoints return 403.
- [ ] Users in BA group can access intent, discovery, template, document, and audit endpoints. Cannot access `/agents`, `/users`, or `PUT /guardrails`.
- [ ] Users in DEV group have full access to all endpoints except `/users`.
- [ ] JWT validation rejects expired tokens with 401 (not 403).
- [ ] JWT validation rejects tokens with an invalid signature with 401.
- [ ] Missing `Authorization` header returns 401.

### Additional Security Criteria

- [ ] ADMIN and DEV users with TOTP not configured cannot complete login (Pre-Authentication Lambda blocks them with a clear error message).
- [ ] Passwords must meet the banking-grade policy (12+ chars, uppercase, lowercase, digit, symbol). The Cognito User Pool rejects passwords that do not meet this policy.
- [ ] Login events appear in the Aurora `audit_log` table within 5 seconds of successful authentication.
- [ ] Logout revokes the refresh token in Cognito and writes a `USER_LOGOUT` audit record.
- [ ] A user removed from a Cognito group (role changed by ADMIN) will have their next API request authorized under the updated group after at most 305 seconds (300s authorizer cache + 5s propagation).
- [ ] The Lambda authorizer returns 403 (not 401) when the token is valid but the role is not permitted for the requested route. The response body includes `"error": "Forbidden"`.
- [ ] The authorizer result cache keys on the full `Authorization` header value. Two different users with different tokens are never given each other's cached policy.
- [ ] CORS preflight requests return the correct `Access-Control-Allow-Origin` header scoped to the deployed CloudFront domain (not wildcard `*`).
- [ ] The Cognito User Pool has `selfSignUpEnabled: false`. No external parties can self-register.
- [ ] All CDK resources have tags: `Project=chatbot-backoffice`, `Environment=staging|prod`, `ManagedBy=cdk`.
- [ ] `cdk synth` produces valid CloudFormation for both staging and prod stacks with no unresolved tokens.
- [ ] Integration test: a synthesized JWT (using a test RSA key, not the Cognito key) is rejected by the authorizer with 401. This verifies signature validation is active and not merely trusting any JWT.

---

## 11. Open Questions and Risks

### Risk 1: Bank Has Existing SAML IdP (HIGH IMPACT)

**Situation:** OCBC may already operate a Microsoft ADFS or Azure AD SAML 2.0 identity provider for internal staff. Forcing staff to create a second set of credentials in Cognito creates an adoption barrier and a compliance risk (duplicate identity management).

**Recommended resolution:** Before provisioning the Cognito User Pool, confirm with the OCBC IT/IAM team whether a SAML IdP exists and whether it should be federated. If yes:
- Configure Cognito as a SAML Service Provider (SP) — Cognito handles token issuance while ADFS handles authentication.
- The `users` table in Aurora stores Cognito `sub` claims, which remain stable under SAML federation.
- MFA is then managed by the IdP (likely already enforced), and Cognito's TOTP requirement can be relaxed.
- **This decision must be made before CDK deployment** — retrofitting SAML federation into an existing Cognito User Pool with users already enrolled requires a migration plan.

**Estimated coordination time:** 2–5 business days.

### Risk 2: Token Refresh Race Conditions in SPA (MEDIUM IMPACT)

**Situation:** If the SPA has multiple concurrent API calls in flight and the access token expires simultaneously, each call will attempt a token refresh. Multiple simultaneous calls to `fetchAuthSession({ forceRefresh: true })` can result in multiple Cognito token endpoint calls, potentially causing one to succeed and the others to fail with `invalid_grant` (since the refresh token rotates on each use).

**Resolution:** Implement a singleton refresh promise in the API client:

```typescript
let refreshPromise: Promise<AuthSession> | null = null;

async function getValidSession(): Promise<AuthSession> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetchAuthSession({ forceRefresh: true }).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}
```

This ensures only one refresh call is in flight at any time; all concurrent 401-triggered refreshes coalesce onto the single promise.

### Risk 3: Cognito JWKS Key Rotation Handling (MEDIUM IMPACT)

**Situation:** Cognito rotates its signing keys periodically. If the authorizer Lambda has cached the JWKS and the key rotates, JWTs signed with the new key will have a `kid` that is not in the cache, and the authorizer will reject them until the cache refreshes.

**Resolution:** The authorizer implements a JWKS cache-miss retry:

1. Decode the JWT header to get `kid`.
2. Check the in-memory JWKS cache for `kid`.
3. If not found: force-refresh the JWKS from the Cognito endpoint.
4. Retry the lookup. If still not found: reject the token (the `kid` is genuinely invalid).

This is already specified in Section 6 (Processing Steps, Step 2). The 60-minute module-level cache TTL means the maximum key rotation lag per Lambda container is 60 minutes. In practice, Cognito's key rotation window is days to weeks, so this is not a real operational risk if the retry logic is correctly implemented.

### Risk 4: Authorizer Cold Starts Add Latency (LOW IMPACT)

**Situation:** The Lambda authorizer adds one Lambda invocation per API request (when not cached). Cold starts on the authorizer Lambda can add 400–800ms to the first request after a period of inactivity.

**Resolution:**
- Provision the authorizer Lambda with **Provisioned Concurrency** of at least 1 instance during business hours (using an EventBridge schedule to enable provisioned concurrency at 08:00 SGT and disable at 22:00 SGT).
- The 300-second result cache TTL means that repeated requests from the same user token within 5 minutes do not invoke the authorizer Lambda at all — only the first request in each 5-minute window takes the cold-start hit.

### Risk 5: MGMT Role Scope Creep (LOW IMPACT)

**Situation:** Senior management may request access to additional endpoints post-deployment (e.g., audit log for compliance review meetings). Expanding MGMT permissions requires a code change to the authorizer Lambda and redeployment.

**Resolution:** The route permission matrix is declared as a typed constant in the authorizer Lambda — changes are a single-line edit with a test run and CDK deploy. The matrix should be documented and change-controlled. Any MGMT permission expansion should be reviewed by the security architect and logged as an architecture decision record (ADR).

---

*End of TASK-F3 Sub-PRD — F3-auth-rbac.md*
*This document is authoritative for the authentication and authorization implementation. Downstream tasks (TASK-I1, TASK-T1, TASK-A1, TASK-MC1, TASK-FE-AUTH, etc.) must read Section 6 for the authorizer context shape and Section 7 for the RBAC matrix.*
