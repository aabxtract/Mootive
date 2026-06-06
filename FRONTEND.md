# FRONTEND.md

# Mootive Frontend Build Documentation

## 1. Product Name

**Mootive**

## 2. Tagline

**Fast-track your deliveries, reliably and cheaply.**

## 3. Product Summary

Mootive is a mobile-first delivery coordination platform for Nigerian sellers, everyday senders, receivers, and freelance dispatch riders.

It helps users create delivery requests, match with available riders, receive AI-powered rider and pricing recommendations, allow riders to view optimized routes, track delivery progress, and let receivers confirm delivery.

## 4. Frontend Goal

Build a mobile-first React + Vite + Tailwind web app that supports the full delivery lifecycle:

```text
User signs in
        ↓
User chooses role/profile
        ↓
Sender creates delivery request
        ↓
System shows matched riders
        ↓
AI recommends best rider
        ↓
Sender selects rider
        ↓
Rider accepts delivery
        ↓
Rider views optimized route
        ↓
Rider updates delivery status
        ↓
Receiver tracks and confirms delivery
        ↓
Delivery is completed
```

The frontend should feel like a real mobile app, not an admin dashboard.

## 5. Design Direction

### Layout

The app should be **mobile-first**.

On desktop, render the app inside a centered phone-sized container.

Recommended layout:

```text
max-width: 430px
min-height: 100vh
centered on desktop
full-width on mobile
```

### Visual Style

Use a clean modern logistics/fintech style:

* Rounded cards
* Clear status badges
* Large buttons
* Good spacing
* Bottom navigation or clear screen navigation
* Soft neutral background
* Strong accent color for action buttons
* Success state for completed delivery
* Warning state for risk/pending confirmation

### UX Principle

At every point, the user should know:

1. What is happening to the package.
2. Who is responsible for the next action.
3. Which rider is involved.
4. What the delivery status is.
5. Whether receiver confirmation is still pending.
6. What AI is recommending and why.

## 6. Core User Roles

The frontend must support three roles:

### 1. Sender

A sender can:

* Sign up/sign in
* Create a delivery request
* Enter receiver details
* View available riders
* See AI recommendation
* Select rider
* Track delivery
* View completion summary

### 2. Rider

A rider can:

* Sign up/sign in
* Create rider profile
* Set availability
* View delivery jobs
* Accept a job
* View optimized route
* Update delivery status

### 3. Receiver

A receiver can:

* Sign up/sign in
* View incoming deliveries
* Track package status
* Confirm delivery after receiving package

A user can act as more than one role where needed.

## 7. Authentication Screens

Authentication should be real, backed by Amazon Cognito.

### Screen: Welcome / Landing

Purpose: Introduce Mootive and direct the user into the app.

Content:

```text
Mootive
Fast-track your deliveries, reliably and cheaply.

Send, receive, and track deliveries with trusted riders.
```

Buttons:

```text
Get Started
Sign In
```

Interactions:

* `Get Started` opens signup.
* `Sign In` opens login.

### Screen: Signup

Fields:

* Full name
* Email
* Phone number
* Password
* Confirm password

Optional field:

* Username / Mootive tag

Button:

```text
Create Account
```

After successful signup:

* Create/fetch user profile from backend.
* Route user to role setup screen.

### Screen: Login

Fields:

* Email
* Password

Button:

```text
Sign In
```

After successful login:

* Fetch user profile.
* Route user to home dashboard.

## 8. Role Setup / Profile Screen

After signup or first login, user chooses how they want to use Mootive.

### Screen: Choose Role

Options:

```text
Send Packages
Receive Packages
Become a Rider
```

The user can select one or more.

For MVP, allow:

```text
Sender
Receiver
Rider
Sender + Receiver
```

If user chooses rider, ask for rider profile details.

## 9. Rider Profile Setup

### Screen: Rider Profile

Fields:

* Rider name
* Phone number
* Current area
* Vehicle type
* Availability status

Vehicle type options:

```text
Bike
Car
Van
Keke
```

Availability:

```text
Online
Offline
```

Button:

```text
Save Rider Profile
```

After saving:

* Route to rider dashboard.

## 10. Home Dashboard

### Screen: Home

Purpose: Give the user role-based actions.

Greeting example:

```text
Hi Tara 👋
What do you want to do today?
```

Cards/actions:

```text
Send a Package
Incoming Deliveries
Rider Jobs
Active Delivery
Delivery History
```

Show cards based on user role.

### Sender Actions

* Send a Package
* Active Delivery
* Delivery History

### Receiver Actions

* Incoming Deliveries
* Active Delivery

### Rider Actions

* Rider Jobs
* Availability
* Assigned Delivery

## 11. Sender Flow

### Screen: Create Delivery

Purpose: Sender creates a delivery request.

Use sections.

#### Section 1: Pickup Details

Fields:

* Pickup address/area
* Pickup note

Example:

```text
Pickup area: Yaba
Pickup note: Call when outside
```

#### Section 2: Drop-off Details

Fields:

* Drop-off address/area
* Receiver tag/phone/username
* Receiver name
* Receiver phone number

Example:

```text
Receiver: Tolu
Receiver tag: tolu123
Drop-off: Lekki Phase 1
```

#### Section 3: Package Details

Fields:

* Package type
* Package value
* Urgency
* Delivery note

Package type options:

```text
Fashion item
Food
Document
Gadget
Medicine
Other
```

Urgency options:

```text
Normal
Same day
Urgent
```

Button:

```text
Find Riders
```

### Interactions

When user taps `Find Riders`:

1. Validate required fields.
2. Call backend to create delivery.
3. Check receiver tag.
4. Call delivery analysis endpoint.
5. Move to rider matching screen.

## 12. Rider Matching / Analysis Screen

### Screen: Finding Riders

Purpose: Show that system is analyzing delivery and finding nearby riders.

UI text:

```text
Finding nearby riders...
Checking price, trust score, route, and delivery risk.
```

Show loading for a short period while backend returns analysis.

Backend should return:

* matched riders
* fair price range
* delivery risk score
* recommended rider
* AI recommendation
* route/traffic summary if available

## 13. Rider Selection Screen

### Screen: Choose Rider

This is one of the most important screens.

Top summary card:

```text
Yaba → Lekki Phase 1
Fashion item · Same day
Fair price: ₦2,300 - ₦2,800
Risk: Medium
Estimated delivery: 45 mins
```

### AI Recommendation Card

Show:

```text
Recommended Rider: Tunde

Tunde is recommended because he has a high trust score, faster pickup time, and a fair price compared to other riders.
```

Button:

```text
Choose Recommended
```

### Rider Cards

Each rider card should show:

* Rider name
* Price
* Trust score
* Completion rate
* Distance from pickup
* Estimated pickup time
* Badge
* Select button

Example:

```text
Tunde
Recommended

₦2,500
91% trust
96% completion
1.4km away
14 mins pickup

[Select Rider]
```

Badges:

```text
Cheapest
Recommended
Fastest
Best Value
```

### Interactions

If user taps `Choose Recommended`:

* Auto-select recommended rider.
* Call select rider endpoint.
* Move to selected rider/payment review.

If user selects another rider:

* Show selected rider.
* Show warning if selected rider is cheaper but lower trust.

Example:

```text
You selected the cheapest rider. Note: this rider has lower trust and longer pickup time.
```

## 14. Payment / Payout Simulation Screen

Payment transfer is not real in MVP, but payout state should be tracked.

### Screen: Delivery Fee Review

Show:

```text
Total delivery fee: ₦2,500
₦1,500 released to rider after pickup
₦1,000 held until receiver confirms delivery
```

Explain:

```text
This protects the sender while ensuring the rider receives part of the payment after pickup.
```

Button:

```text
Start Delivery
```

### Interaction

When sender taps `Start Delivery`:

1. Call backend payment simulation endpoint.
2. Delivery status becomes rider selected / awaiting rider acceptance.
3. Rider can now see assigned job.

## 15. Rider Flow

### Screen: Rider Dashboard

Purpose: Show rider’s available jobs and assigned deliveries.

Sections:

```text
Availability Toggle
Available Jobs
Assigned Delivery
Completed Jobs
```

### Availability Toggle

Button/switch:

```text
Online / Offline
```

When rider goes online:

* Call backend to update rider availability.

### Available Jobs Screen

Show delivery jobs available to rider.

Each job card:

* Pickup area
* Drop-off area
* Package type
* Estimated fee
* Estimated route time
* Risk label
* Accept button

Example:

```text
Yaba → Lekki Phase 1
Fashion item
Estimated fee: ₦2,500
Route time: 45 mins
Risk: Medium

[Accept Job]
```

### Interaction: Accept Job

When rider taps `Accept Job`:

1. Call backend accept job endpoint.
2. Delivery status becomes `RIDER_ACCEPTED`.
3. Create delivery event.
4. Rider is taken to route screen.

## 16. Rider Route Optimization Screen

### Screen: Optimized Route

Purpose: Show rider route recommendation.

Content:

* Pickup location
* Drop-off location
* Estimated distance
* Estimated duration
* Route summary
* AI route explanation

Example:

```text
Route ready

Pickup: Yaba
Drop-off: Lekki Phase 1
Distance: 14.8km
Estimated time: 45 mins

AI route note:
This route is recommended because it balances distance and travel time. Expect moderate traffic near Lekki.
```

Map area:

* Show simple map view if possible.
* If full map is not ready, show route card with pickup/drop-off markers.

Buttons:

```text
Start Pickup
Mark Picked Up
Start Trip
Mark Delivered
```

## 17. Delivery Tracking Screen

There should be tracking views for sender, rider, and receiver.

### Shared Delivery Timeline

Statuses:

```text
CREATED
RIDERS_MATCHED
RIDER_RECOMMENDED
RIDER_SELECTED
RIDER_ACCEPTED
ROUTE_OPTIMIZED
PICKED_UP
IN_TRANSIT
DELIVERED
CONFIRMED
COMPLETED
```

Frontend labels:

```text
Created
Riders Found
Recommended
Rider Selected
Rider Accepted
Route Ready
Picked Up
In Transit
Delivered
Confirmed
Completed
```

### Sender Tracking View

Show:

* Delivery status
* Rider name
* Pickup/drop-off
* Package type
* Receiver name
* Payment/payout state
* Timeline
* Route summary

### Rider Tracking View

Show:

* Current job
* Next action button
* Optimized route summary
* Timeline
* Pickup/drop-off details

### Receiver Tracking View

Show:

* Incoming delivery
* Sender name
* Rider name
* Package type
* Delivery status
* Estimated delivery time
* Confirm button when delivered

## 18. Receiver Flow

### Screen: Incoming Deliveries

Purpose: Show packages coming to the receiver.

Each incoming delivery card:

```text
Incoming Delivery

From: Tara Styles
Package: Fashion item
Rider: Tunde
Status: In Transit
Estimated time: 45 mins

[View Delivery]
```

### Screen: Receiver Delivery Detail

Before delivery is marked delivered:

```text
Your package is on the way.

Sender: Tara Styles
Package: Fashion item
Rider: Tunde
Status: In Transit

Confirm Delivery button disabled
```

When delivery is marked delivered:

```text
Package marked as delivered.
Please confirm once you have received it.
```

Buttons:

```text
Confirm Delivery
I did not receive this
```

### Interaction: Confirm Delivery

When receiver taps `Confirm Delivery`:

1. Call backend confirm endpoint.
2. Delivery status becomes `COMPLETED`.
3. Remaining payout state is released.
4. Receiver sees success screen.
5. Sender sees completed summary.

## 19. Completion Screen

### Screen: Completed Delivery Summary

Show:

```text
Delivery Completed ✅

Receiver confirmed delivery.
Delivery has been completed successfully.
```

Summary:

* Delivery ID
* Sender
* Receiver
* Rider
* Package type
* Route
* Total fee
* Released after pickup
* Released after confirmation
* Final status

Buttons:

```text
Send Another Package
Back Home
```

## 20. Report Issue Screen

For now, this is simple and not a main priority.

If receiver taps `I did not receive this`:

Show:

```text
Delivery issue reported.
This delivery will be reviewed.
```

This can call a simple report issue endpoint or remain a placeholder.

## 21. Frontend State Needed

Frontend should manage:

```text
authUser
appUserProfile
activeRole
deliveryForm
currentDelivery
matchedRiders
recommendedRider
selectedRider
routeData
deliveryEvents
paymentState
incomingDeliveries
```

## 22. API Service File

Create a frontend API service file:

```text
src/lib/api.js
```

It should include functions for:

```text
createUserProfile
getMe
updateProfile
createRiderProfile
updateRiderAvailability
createDelivery
getDelivery
analyzeDelivery
selectRider
acceptJob
optimizeRoute
updateDeliveryStatus
getDeliveryEvents
getIncomingDeliveries
confirmDelivery
reportIssue
```

## 23. Suggested Frontend File Structure

```text
src/
  App.jsx
  main.jsx
  lib/
    api.js
    auth.js
  data/
    constants.js
  components/
    AppShell.jsx
    Button.jsx
    Card.jsx
    StatusBadge.jsx
    Timeline.jsx
    RiderCard.jsx
    RouteCard.jsx
  screens/
    Landing.jsx
    Signup.jsx
    Login.jsx
    RoleSetup.jsx
    Home.jsx
    CreateDelivery.jsx
    FindingRiders.jsx
    RiderSelection.jsx
    PaymentReview.jsx
    SenderTracking.jsx
    RiderDashboard.jsx
    RiderJobs.jsx
    RiderRoute.jsx
    ReceiverIncoming.jsx
    ReceiverDeliveryDetail.jsx
    CompletedSummary.jsx
    ReportIssue.jsx
```

## 24. Build Priority

Build frontend in this order:

1. App shell and routing/state navigation.
2. Landing/signup/login screens.
3. Role setup.
4. Sender create delivery flow.
5. Rider selection and AI recommendation display.
6. Rider dashboard and accept job.
7. Route optimization screen.
8. Tracking timeline.
9. Receiver incoming delivery and confirmation.
10. Completion summary.

## 25. Important UX Rules

Do not make Mootive look like a desktop admin panel.

Do not hide AI reasoning.

Do not show only the cheapest rider as best.

Do not let receiver confirmation feel like an afterthought.

Do not let rider flow be missing.

Do not overbuild dispute now.

Focus the experience on:

```text
Sender creates delivery.
Mootive finds and recommends rider.
Rider accepts and follows optimized route.
Receiver confirms.
Delivery completes.
```

# FRONTEND.md — Final Interaction Decisions Update

## Confirmed Frontend Decisions

### 1. Authentication

Users will sign up and log in with:

```text
Email + Password
```

Authentication will be powered by Amazon Cognito.

The frontend must include:

* Signup screen
* Login screen
* Authenticated app shell

### 2. Role Selection

After signup/login, users select their role.

For the MVP:

```text
Seller/Sender and Receiver share the same dashboard.
Driver/Rider has a different dashboard.
```

This means the app has two main dashboard experiences:

1. **Seller/Receiver Dashboard**
2. **Driver Dashboard**

A seller can also receive packages using the same account/dashboard.

### 3. Seller/Receiver Dashboard

The seller/receiver dashboard should include:

```text
Send a Package
Incoming Deliveries
Active Deliveries
Delivery History
```

The same user can:

* Send a package as a seller/sender.
* Receive a package as a receiver.
* Confirm incoming delivery.

### 4. Driver Dashboard

The driver dashboard should be separate.

It should include:

```text
Availability toggle
Available Jobs
Accepted Jobs
Route View
Delivery Status Updates
Completed Jobs
```

Drivers should see delivery jobs when they are available.

### 5. Job Visibility

For the MVP:

```text
All available drivers should see new delivery jobs.
```

Flow:

```text
Sender creates delivery
        ↓
Delivery becomes available to online drivers
        ↓
Drivers can view job details
        ↓
A driver accepts the job
        ↓
Delivery becomes assigned to that driver
```

Once one driver accepts, the job should no longer be available to other drivers.

### 6. Google Maps Visuals

The frontend should use Google Maps API or Google Maps-style visuals for map display.

Map use cases:

* Show pickup location
* Show drop-off location
* Show available riders/drivers around pickup
* Show selected route visually
* Show rider route screen

If full Google Maps integration takes time, use a map-like visual card as fallback.

### 7. Receiver Without Account

If the receiver does not have a Mootive account, the app should support a simulated SMS confirmation link.

Flow:

```text
Sender enters receiver phone number
        ↓
System generates confirmation link
        ↓
System simulates sending SMS
        ↓
Receiver opens link
        ↓
Receiver confirms delivery
```

The frontend should show this as:

```text
SMS confirmation link sent to receiver.
```

Real SMS can be added later using a free/low-cost SMS API if time permits.

### 8. Payment Display

Do **not** show the 60/40 payout state in the main frontend MVP.

Payment/payout can remain backend/future logic, but the visible MVP should focus on:

* Rider matching
* AI recommendation
* Route optimization
* Tracking
* Receiver confirmation

### 9. Main Frontend Flow

The main MVP flow is now:

```text
User signs up/logs in
        ↓
User chooses Seller/Receiver or Driver
        ↓
Seller creates delivery
        ↓
System checks receiver phone/tag
        ↓
System shows available drivers
        ↓
AI recommends best driver
        ↓
Delivery becomes visible to available drivers
        ↓
Driver accepts job
        ↓
Driver sees route/map
        ↓
Driver updates delivery status
        ↓
Receiver confirms delivery
        ↓
Delivery completed
```

### 10. Updated Screen List

#### Auth Screens

1. Landing
2. Signup
3. Login
4. Role selection

#### Seller/Receiver Screens

5. Seller/Receiver dashboard
6. Create delivery
7. Finding drivers
8. Driver recommendation / available drivers
9. Delivery tracking
10. Incoming deliveries
11. Receiver confirmation
12. Completed delivery summary

#### Driver Screens

13. Driver dashboard
14. Driver availability
15. Available jobs
16. Job detail
17. Accept job
18. Route/map screen
19. Delivery status update screen
20. Completed job summary

### 11. Updated UX Priority

The frontend should make these things obvious:

1. Seller can create a delivery quickly.
2. Available drivers can see the job.
3. AI recommends the best driver.
4. Driver can accept and follow route.
5. Receiver can confirm delivery.
6. Delivery status is visible to all parties.

Do not overfocus on payment UI for now.

#UPDATES##################
# FRONTEND.md — Final Confirmation (No Changes to Logic)
Use Amazon Location Service for map display, place search/geocoding, pickup/drop-off visualization, driver location visualization, and route display.