# Mootive AWS Backend

Serverless backend aligned to `BACKEND.md`.

## Stack

- **Amazon Cognito** — email + password auth, JWT authorizer on the HTTP API
- **API Gateway HTTP API** — JWT-authorized routes, public confirm + health
- **AWS Lambda (Node.js 20)** — single function `mootive-api`, routes split into `src/routes/*`
- **DynamoDB** — 5 tables (`MootiveUsers`, `MootiveDrivers`, `MootiveDeliveries`, `MootiveDeliveryEvents`, `MootiveRoutes`) with GSIs for sender, receiver, driver, status, availability, events-by-delivery
- **Amazon Bedrock** — Claude Haiku 4.5 (`anthropic.claude-haiku-4-5-20251001-v1:0`) for explanations
- **Amazon Location Service** — HERE route calculator for real distance/duration/geometry

## Required AWS tags

- General resources: `aws-apn-id=pc:8l8gcn23lmlgammd8572tk6va`, `event=oneWithAI`
- Bedrock-invoking resources (the Lambda): `aws-apn-id=pc:a8xnp70u5w0s41039u52e6iuj`, `event=oneWithAI`

## Roles

```
seller_receiver  → seller + receiver dashboard
driver           → driver dashboard
```

## Delivery state machine

```
CREATED → ANALYZED → OPEN_FOR_DRIVERS → DRIVER_ACCEPTED
       → ROUTE_OPTIMIZED → PICKED_UP → IN_TRANSIT
       → DELIVERED → CONFIRMED → COMPLETED
(any non-terminal state → ISSUE_REPORTED)
```

`POST /deliveries` chains `CREATED → ANALYZED → OPEN_FOR_DRIVERS` in one call.

## Endpoints

All routes require a Cognito ID token in `Authorization: Bearer <jwt>` **except**:
- `GET /health`
- `POST /deliveries/{deliveryId}/confirm` (token-based for unregistered receivers)

### Users
```
POST   /users/profile           create app profile after Cognito signup
GET    /users/me                current profile (from JWT)
PATCH  /users/me                update name/phone/username
GET    /users/check?tag=...     receiver lookup by username or phone
```

### Drivers
```
POST   /drivers/profile             create driver profile (role must be driver)
GET    /drivers/me                  current driver
PATCH  /drivers/availability        {available, lat, lng, currentArea}
GET    /drivers/jobs/open           OPEN_FOR_DRIVERS jobs
GET    /drivers/jobs/accepted       jobs assigned to me
POST   /drivers/jobs/{id}/accept    first-driver-wins (atomic conditional update)
```

### Deliveries
```
POST   /deliveries                          create + auto-analyze + open to drivers
GET    /deliveries/sent                     sender = me
GET    /deliveries/incoming                 receiver = me
GET    /deliveries/{id}
POST   /deliveries/{id}/analyze             re-run AI scoring + Claude explanations
POST   /deliveries/{id}/optimize-route      Amazon Location Service + Claude route note
POST   /deliveries/{id}/status              {status} — guarded by state machine
GET    /deliveries/{id}/events              full event timeline
POST   /deliveries/{id}/confirm             receiver confirms (auth OR confirmationToken)
POST   /deliveries/{id}/report-issue        any participant → ISSUE_REPORTED
```

## AI

`POST /deliveries/{id}/analyze` (also called internally by `POST /deliveries`):

1. **Deterministic scoring** in `src/routes/ai.js`:
   - Weighted score: trust 0.5, pickup time 0.3, price 0.2
   - Risk: package value + urgency + distance
   - Fair price: ±8% around mean of available driver estimates
2. **Claude Haiku 4.5** produces 4 short explanations: driver pick, fair price, risk, route note
3. Claude **explains, never decides** — driver assignment, status, and routes are all backend-owned

If Bedrock fails, the endpoint returns scored output with a templated fallback explanation.

## Routing

`POST /deliveries/{id}/optimize-route` calls Amazon Location Service `CalculateRoute` against the provisioned `mootive-route-calculator` (HERE), persists geometry to `MootiveRoutes`, and writes `aiRouteExplanation` via Bedrock. Falls back to Haversine distance if Location Service is unavailable.

## Deploy

```bash
cd backend
npm install
npm run check
sam build
sam deploy --guided
```

Suggested values:
- Stack name: `mootive-backend`
- Region: `us-east-1`
- Allow SAM CLI IAM role creation: `Y`

Note `UserPoolId`, `UserPoolClientId`, `ApiUrl` from the outputs.

## Seed demo users

After deploy, the user pool is empty. Run:

```bash
USER_POOL_ID=<from-outputs> \
USERS_TABLE=MootiveUsers \
DRIVERS_TABLE=MootiveDrivers \
npm run seed:demo
```

Creates:
- 1 seller_receiver (`tara@mootive.test`)
- 2 drivers (`kunle@mootive.test` in Yaba, `ifeanyi@mootive.test` in Lekki)

All accounts use password `MootiveDemo1!`.

## Auth flow for the frontend

1. Cognito `InitiateAuth` with `USER_PASSWORD_AUTH` using `UserPoolClientId`
2. On signup, after email verification, call `POST /users/profile` with `{name, role, username, phoneNumber}`
3. Subsequent calls send `Authorization: Bearer <IdToken>`

## What is real vs simulated

**Real:** Cognito auth, user/driver profiles, role-based dashboards, delivery creation, driver job visibility, atomic job acceptance, Claude on Bedrock, Amazon Location Service routes, status state machine, event timeline, receiver confirmation, issue reporting.

**Simulated:** SMS sending (`smsStatus: SIMULATED_SENT`), payment release (`totalDeliveryFee` stored, no money moved), live GPS streaming (drivers ping `PATCH /drivers/availability` for location).
