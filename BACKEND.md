# BACKEND.md — Final Technical Decisions Update

## Confirmed Backend Decisions

### 1. Authentication

Use Amazon Cognito with:

```text
Email + Password
```

Cognito handles signup and login.

The backend should create an app-level user profile after Cognito authentication.

### 2. User Roles

Supported MVP role structure:

```text
seller_receiver
driver
```

Explanation:

* Seller and receiver share one dashboard.
* Driver has a separate dashboard and workflow.

The user profile should store:

```text
role: seller_receiver | driver
```

### 3. Dashboard Logic

If user role is:

```text
seller_receiver
```

Frontend shows seller/receiver dashboard.

If user role is:

```text
driver
```

Frontend shows driver dashboard.

### 4. Delivery Job Visibility

New delivery jobs should be visible to all available drivers.

Flow:

```text
Seller creates delivery
        ↓
Delivery status = CREATED
        ↓
Analyze/match drivers
        ↓
Delivery status = OPEN_FOR_DRIVERS
        ↓
All available drivers can see the job
        ↓
First driver to accept gets assigned
        ↓
Delivery status = DRIVER_ACCEPTED
```

### 5. Required Delivery Statuses

Use these backend statuses:

```text
CREATED
ANALYZED
OPEN_FOR_DRIVERS
DRIVER_ACCEPTED
ROUTE_OPTIMIZED
PICKED_UP
IN_TRANSIT
DELIVERED
CONFIRMED
COMPLETED
ISSUE_REPORTED
```

### 6. Driver Job APIs

Add these driver-focused APIs:

```text
GET /drivers/jobs/open
GET /drivers/jobs/accepted
POST /drivers/jobs/{deliveryId}/accept
POST /drivers/availability
```

### 7. Job Acceptance Rule

When a driver accepts a job:

Backend must check:

```text
delivery.status === OPEN_FOR_DRIVERS
```

If true:

* assign driverId
* set status to `DRIVER_ACCEPTED`
* create event `DRIVER_ACCEPTED`

If another driver already accepted:

* return error:

```json
{
  "message": "This delivery has already been accepted by another driver."
}
```

### 8. Maps and Route System

Frontend can use Google Maps API for visual map display.

Backend should still support route optimization.

Preferred backend route service:

```text
Amazon Location Service
```

Route API:

```text
POST /deliveries/{deliveryId}/optimize-route
```

Backend should return:

```text
pickup coordinates
drop-off coordinates
estimated distance
estimated duration
route summary
route risk
AI route explanation
```

If Amazon Location Service setup is not completed, backend may return estimated route values while frontend displays Google Maps visuals.

### 9. AI Provider

Use:

```text
Claude on Amazon Bedrock
```

Claude should be used for explanation and decision support.

AI should support:

1. Best driver recommendation explanation
2. Fair price explanation
3. Delivery risk explanation
4. Route recommendation explanation

### 10. AI Logic Rule

Backend should calculate scores first.

Claude should explain the result.

Do not let Claude be the only source of truth for:

* driver assignment
* delivery status
* confirmation
* route data
* business rules

### 11. Receiver Without Account

Backend should support receiver confirmation through:

```text
receiver account if registered
OR
confirmation link if receiver is not registered
```

When seller enters receiver phone number:

Backend should:

1. Check if receiver exists.
2. If receiver exists, attach receiverId.
3. If receiver does not exist, generate confirmation token/link.

Suggested endpoint:

```text
GET /users/check?tag={phoneOrUsername}
```

Response if not found:

```json
{
  "receiverFound": false,
  "confirmationMode": "sms_link",
  "confirmationToken": "CONFIRM-12345"
}
```

### 12. SMS Simulation

For MVP, simulate SMS.

Backend can store:

```text
confirmationLink
smsStatus: SIMULATED_SENT
```

Frontend should display:

```text
SMS confirmation link sent to receiver.
```

Optional later:

* Add real SMS provider API.
* Keep SMS provider key in environment variables.

### 13. Payment / Payout

Do not make payout state a core frontend feature now.

Backend can still store delivery fee and payment placeholder fields for future use, but the MVP should not depend on payment release.

Keep fields optional:

```text
totalDeliveryFee
paymentStatus
```

Do not prioritize:

```text
releasedToRider
lockedAmount
```

### 14. Updated Required Tables

#### MootiveUsers

```text
userId
cognitoSub
name
email
phoneNumber
username
role
createdAt
updatedAt
```

#### MootiveDrivers

```text
driverId
userId
name
phoneNumber
currentArea
currentLat
currentLng
vehicleType
trustScore
completionRate
averagePickupTime
availabilityStatus
createdAt
updatedAt
```

#### MootiveDeliveries

```text
deliveryId
senderId
receiverId
receiverTag
receiverName
receiverPhone
confirmationToken
confirmationLink
smsStatus
pickupAddress
pickupArea
pickupLat
pickupLng
dropoffAddress
dropoffArea
dropoffLat
dropoffLng
packageType
packageValue
urgency
deliveryNote
status
assignedDriverId
recommendedDriverId
fairPriceMin
fairPriceMax
riskScore
riskReasons
aiRecommendation
routeId
estimatedDistance
estimatedDuration
routeSummary
totalDeliveryFee
createdAt
updatedAt
```

#### MootiveDeliveryEvents

```text
eventId
deliveryId
actorId
actorRole
eventType
message
metadata
createdAt
```

#### MootiveRoutes

```text
routeId
deliveryId
driverId
pickupLat
pickupLng
dropoffLat
dropoffLng
distance
duration
routeSummary
routeGeometry
routeRisk
aiRouteExplanation
createdAt
```

### 15. Updated Required APIs

#### Profile APIs

```text
POST /users/profile
GET /users/me
PATCH /users/me
GET /users/check?tag={tag}
```

#### Driver APIs

```text
POST /drivers/profile
GET /drivers/me
PATCH /drivers/availability
GET /drivers/jobs/open
GET /drivers/jobs/accepted
POST /drivers/jobs/{deliveryId}/accept
```

#### Delivery APIs

```text
POST /deliveries
GET /deliveries/{deliveryId}
GET /deliveries/sent
GET /deliveries/incoming
POST /deliveries/{deliveryId}/analyze
POST /deliveries/{deliveryId}/optimize-route
POST /deliveries/{deliveryId}/status
GET /deliveries/{deliveryId}/events
POST /deliveries/{deliveryId}/confirm
POST /deliveries/{deliveryId}/report-issue
```

### 16. Updated Main Backend Flow

```text
User signs up/logs in with Cognito
        ↓
Backend creates user profile
        ↓
User role determines dashboard
        ↓
Seller creates delivery
        ↓
Backend checks receiver tag/phone
        ↓
Backend generates SMS confirmation link if receiver is not registered
        ↓
Backend analyzes delivery
        ↓
Backend finds available drivers
        ↓
Claude explains recommendation/risk/price
        ↓
Delivery opens for available drivers
        ↓
Driver accepts job
        ↓
Backend assigns driver
        ↓
Backend optimizes route
        ↓
Driver updates status
        ↓
Receiver confirms delivery
        ↓
Delivery completes
```

### 17. Build Priority

Build backend in this order:

1. Cognito email/password auth.
2. User profile endpoint.
3. Role selection/profile update.
4. Driver profile and availability.
5. Delivery creation.
6. Receiver check and SMS-link simulation.
7. Open jobs for drivers.
8. Driver accepts job.
9. Delivery analyze endpoint with Claude on Bedrock.
10. Route optimization endpoint.
11. Delivery status updates.
12. Delivery events.
13. Receiver confirmation.
14. Issue reporting placeholder.

### 18. What Is Real vs Simulated

#### Real

```text
Cognito auth
User profiles
Role-based dashboards
Driver profile
Driver availability
Delivery creation
Driver job visibility
Driver job acceptance
Claude on Bedrock AI explanations
Route optimization endpoint
Delivery status tracking
Receiver confirmation
Delivery event timeline
```

#### Simulated / Optional

```text
SMS sending
Real payment
Live driver GPS streaming
Full dispute resolution
Full KYC
```
