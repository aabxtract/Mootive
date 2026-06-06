# Mootive AWS Backend

This backend is migrated to an **actual AWS serverless scaffold** using:

- `AWS SAM`
- `AWS Lambda`
- `API Gateway HTTP API`
- `DynamoDB`

It is no longer an Express simulation.

## What is included

- `template.yaml` for infrastructure
- Lambda handler in `backend/src/app.js`
- DynamoDB access via AWS SDK v3
- auto-seeding for demo users and riders
- rule-based rider recommendation logic
- dispute ticket flow
- required hackathon AWS tags

## Required AWS tags

Provisioned resources are tagged with:

- `aws-apn-id=pc:8l8gcn23lmlgammd8572tk6va`
- `event=oneWithAI`

For future Bedrock or GenAI resources, use:

- `aws-apn-id=pc:a8xnp70u5w0s41039u52e6iuj`
- `event=oneWithAI`

## Prerequisites

Install locally:

- Node.js
- AWS CLI
- AWS SAM CLI

Configure AWS:

```bash
aws configure
```

Recommended region from your brief:

```bash
us-east-1
```

## Install

```bash
cd backend
npm install
```

## Validate locally

```bash
npm run check
```

## Build and deploy

```bash
sam build
sam deploy --guided
```

Suggested guided deploy values:

- Stack name: `mootive-backend`
- Region: `us-east-1`
- Confirm changes before deploy: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Disable rollback: `N`
- Save arguments to configuration file: `Y`

## Infrastructure

`template.yaml` creates:

- 1 Lambda function
- 1 HTTP API
- 4 DynamoDB tables:
  - `MootiveUsers`
  - `MootiveDeliveries`
  - `MootiveRiders`
  - `MootiveTickets`

## API routes

### Health
- `GET /health`

### Users
- `POST /users`
- `GET /users`
- `GET /users/{tag}`
- `GET /users/{tag}/incoming`

### Deliveries
- `POST /deliveries`
- `GET /deliveries`
- `GET /deliveries/{deliveryId}`
- `POST /deliveries/{deliveryId}/select-rider`
- `POST /deliveries/{deliveryId}/simulate-payment`
- `POST /deliveries/{deliveryId}/status`
- `PATCH /deliveries/{deliveryId}/status`
- `POST /deliveries/{deliveryId}/confirm`
- `POST /deliveries/{deliveryId}/tickets`
- `GET /deliveries/{deliveryId}/tickets`

### Riders and recommendation
- `GET /riders`
- `POST /riders/find`
- `POST /recommend-rider`

## Data flow mapping

### Fake Login
- Frontend calls `POST /users`
- Lambda creates or reuses a user in DynamoDB
- Response returns `userId`

### Create Delivery
- Frontend calls `POST /deliveries`
- Lambda creates a delivery record in DynamoDB
- Receiver is checked from the registry
- Missing receivers get a confirmation link

### Rider Discovery
- Frontend calls `POST /riders/find`
- Lambda returns seeded riders from DynamoDB

### Recommendation
- Frontend calls `POST /recommend-rider`
- Lambda calculates:
  - fair price estimate
  - best rider recommendation
  - delivery risk score
  - route note

### Rider Selection
- Frontend calls `POST /deliveries/{deliveryId}/select-rider`
- Lambda attaches the selected rider to the delivery

### Payment Simulation
- Frontend calls `POST /deliveries/{deliveryId}/simulate-payment`
- Lambda creates the 60/40 payout state

### Delivery Tracking
- Frontend calls `POST` or `PATCH /deliveries/{deliveryId}/status`
- Lambda updates the delivery status
- On `Picked Up`, 60% is released

### Receiver Confirmation
- Frontend calls `POST /deliveries/{deliveryId}/confirm`
- Lambda marks the delivery completed
- Remaining 40% is released

### Dispute Simulation
- Frontend calls `POST /deliveries/{deliveryId}/tickets`
- Lambda creates a ticket in DynamoDB

## Auto-seeding

The Lambda auto-seeds the first time it needs empty tables:

- 4 users
- 5 riders

You can also seed manually after deployment:

```bash
npm run seed:demo
```

## Example curl

```bash
API_URL="https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com"
```

Create user:

```bash
curl -X POST "$API_URL/users" \
  -H "Content-Type: application/json" \
  -d '{"name":"Tara Styles","phoneNumber":"08000000000","username":"tarastyles"}'
```

Create delivery:

```bash
curl -X POST "$API_URL/deliveries" \
  -H "Content-Type: application/json" \
  -d '{"senderId":"USR-DEMO","receiverTag":"@amaka","pickupLocation":"Yaba","dropoffLocation":"Lekki Phase 1","receiverName":"Amaka","receiverPhone":"08111111111","packageType":"Fashion item","packageValue":25000,"urgency":"same day","deliveryNote":"Call receiver before arrival"}'
```

Find riders:

```bash
curl -X POST "$API_URL/riders/find" \
  -H "Content-Type: application/json" \
  -d '{"deliveryId":"DLV-EXAMPLE"}'
```

Recommend rider:

```bash
curl -X POST "$API_URL/recommend-rider" \
  -H "Content-Type: application/json" \
  -d '{"deliveryId":"DLV-EXAMPLE"}'
```

Select rider:

```bash
curl -X POST "$API_URL/deliveries/DLV-EXAMPLE/select-rider" \
  -H "Content-Type: application/json" \
  -d '{"riderId":"rider_B"}'
```

Simulate payment:

```bash
curl -X POST "$API_URL/deliveries/DLV-EXAMPLE/simulate-payment" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Update status:

```bash
curl -X POST "$API_URL/deliveries/DLV-EXAMPLE/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"Picked Up"}'
```

Confirm delivery:

```bash
curl -X POST "$API_URL/deliveries/DLV-EXAMPLE/confirm" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Raise ticket:

```bash
curl -X POST "$API_URL/deliveries/DLV-EXAMPLE/tickets" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Receiver has not confirmed delivery."}'
```

## Important note

I converted the backend into a real AWS deployable structure, but I could not
deploy it from this environment because `aws` CLI and `sam` CLI are not installed
here yet.
