# Mootive Frontend

React + Vite + Tailwind. Mobile-first, wrapped in a desktop phone mockup. Auth via Amazon Cognito, maps + place search via Amazon Location Service.

## Stack

- React 19 + Vite 8 + Tailwind 3
- `aws-amplify` (Auth + Geo modules)
- `maplibre-gl` + `@aws/amazon-location-utilities-auth-helper` for map tiles
- `@aws-sdk/client-location` for place search
- Capacitor 8 wrappers for iOS / Android shells

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local
```

Fill `.env.local` from the `sam deploy` outputs:
- `VITE_API_URL` ← `ApiUrl`
- `VITE_USER_POOL_ID` ← `UserPoolId`
- `VITE_USER_POOL_CLIENT_ID` ← `UserPoolClientId`
- `VITE_IDENTITY_POOL_ID` ← `IdentityPoolId`
- `VITE_MAP_NAME` ← `MapName` (defaults to `mootive-map`)
- `VITE_PLACE_INDEX_NAME` ← `PlaceIndexName` (defaults to `mootive-places`)

You can also paste the API URL at runtime via the Settings button on the phone frame.

## Run

```bash
npm run dev      # local Vite dev server
npm run build    # production bundle
npm run preview  # preview the built bundle

npm run cap:android   # build + sync + open Android Studio
npm run cap:ios       # build + sync + open Xcode
```

## File map

```
src/
  App.jsx                     view router
  main.jsx                    entry
  index.css, App.css          base styles
  lib/
    api.js                    every HTTP endpoint (attaches Cognito JWT)
    auth.js                   Amplify config + signup/login/confirm/logout/token
    constants.js              STATUSES, PACKAGE_TYPES, URGENCY_LEVELS, formatNaira
  context/
    AppContext.jsx            single context — auth, profile, delivery, driver state, navigation
  components/
    PhoneFrame.jsx            iPhone mockup shell with status bar + settings sheet
    MapView.jsx               MapLibre + Amazon Location tiles
    PlaceSearch.jsx           Location Service SearchPlaceIndexForText autocomplete
    StatusBadge.jsx
    Timeline.jsx              renders /deliveries/{id}/events
    RecommendationCard.jsx    Claude explanations
    JobCard.jsx               driver job card
  screens/
    LandingScreen.jsx
    SignupScreen.jsx
    ConfirmSignupScreen.jsx
    LoginScreen.jsx
    RoleSetupScreen.jsx       picks seller_receiver | driver, POSTs /users/profile
    DriverProfileSetupScreen  driver-only vehicle/area setup
    SellerHomeScreen.jsx
    CreateDeliveryScreen.jsx  place autocomplete + receiver check
    FindingDriversScreen.jsx  loader while backend auto-analyzes
    SenderTrackingScreen.jsx  AI recommendation + map + timeline + status
    IncomingScreen.jsx
    ReceiverConfirmScreen.jsx
    CompletedScreen.jsx
    ReportIssueScreen.jsx
    DriverHomeScreen.jsx      availability toggle, GPS ping, counts
    AvailableJobsScreen.jsx   polls /drivers/jobs/open every 10s
    JobDetailScreen.jsx       Accept Job (409 toast on conflict)
    DriverRouteScreen.jsx     auto-calls /optimize-route, status advance buttons
    DriverAcceptedJobsScreen.jsx
```

## Flow

```
Landing → Signup → ConfirmSignup → Login → RoleSetup → (DriverProfileSetup if driver)
                                                     ↓
                       seller_receiver: SellerHome ──┴── driver: DriverHome
                                ↓                          ↓
                       CreateDelivery               AvailableJobs (polls)
                                ↓                          ↓
                       FindingDrivers               JobDetail → claim
                                ↓                          ↓
                       SenderTracking               DriverRoute → status updates
                                ↓                          ↓
                       Incoming/Receiver            (delivery moves through states)
                       Confirm → Completed
```

## Notes

- Status enum is the BACKEND.md `SCREAMING_SNAKE_CASE` 11-state machine. `constants.js` maps each to a display label + badge tone.
- All API calls attach `Authorization: Bearer <IdToken>` from `aws-amplify/auth.fetchAuthSession()`.
- The receiver-confirm flow supports both authenticated receivers (token from JWT) and unregistered receivers (confirmationToken from `?t=` URL). Frontend uses the auth path; deep-link handling for `?t=` is wired in the API client but the receiver-via-link screen is not built (out of scope for the demo).
