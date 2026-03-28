# TrackIt - Real-Time Bus Tracking System

A complete real-time bus tracking system with admin bulk data entry, driver GPS tracking, and student/parent live map view.

## Tech Stack

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- Socket.io (Real-time communication)
- JWT Authentication

### Frontend
- React 18 + Vite
- Tailwind CSS
- Mapbox GL JS
- Socket.io Client
- React Router v6

## Project Structure

```
trackit/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/
│   │   ├── adminController.js  # Bulk entry processing
│   │   ├── authController.js   # Login/Register
│   │   ├── driverController.js # Trip management
│   │   └── trackingController.js
│   ├── middleware/
│   │   └── auth.js            # JWT middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── Route.js
│   │   ├── Bus.js
│   │   └── Location.js
│   ├── routes/
│   │   ├── admin.js
│   │   ├── auth.js
│   │   ├── driver.js
│   │   └── tracking.js
│   ├── utils/
│   │   └── generateToken.js
│   ├── server.js
│   ├── package.json
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── AdminDashboard.jsx
    │   │   ├── DriverDashboard.jsx
    │   │   └── StudentDashboard.jsx
    │   ├── services/
    │   │   ├── api.js
    │   │   └── socket.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

## Setup Instructions

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Mapbox account (for access token)

### 1. Backend Setup

```bash
cd trackit/backend

# Install dependencies
npm install

# Create .env file (already exists with defaults)
# Edit if needed:
# PORT=5000
# MONGODB_URI=mongodb://localhost:27017/trackit
# JWT_SECRET=your_secret_key
# JWT_EXPIRE=7d

# Start server
npm run dev
```

### 2. Frontend Setup

```bash
cd trackit/frontend

# Install dependencies
npm install

# Create .env file for Mapbox token
cp .env.example .env
# Edit .env and add your Mapbox token

# Start development server
npm run dev
```

### 3. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Default Credentials

| Role   | Email              | Password  |
|--------|-------------------|-----------|
| Admin  | admin@trackit.com | admin123  |
| Driver | (created via bulk entry) | driver123 |

## Features

### Admin Module (`/admin`)

**Bulk Data Entry:**
- Paste data in format: `RegNo | DriverName | Phone | Route`
- Routes separated by `-` create automatic stops
- Duplicate buses are skipped
- Drivers are reused if phone number exists

**Example Input:**
```
UK07PA1696 | Sunil Kumar | 7060226291 | Clock Tower- Darshanlal Chowk- ISBT- GEU
UK07PA1691 | Pramod Chand Ramola | 7535860889 | Ballupur- IT Park- Pacific Mall- GEU
```

**Dashboard Features:**
- View all buses, drivers, routes
- Statistics overview
- Manage fleet

### Driver Module (`/driver`)

- View assigned bus details
- Start/Stop trip
- Update available seats
- Real-time GPS tracking using `navigator.geolocation.watchPosition`
- Location sent via Socket.io every position update

### Student/Parent Module (`/dashboard`)

- Select route from dropdown
- View all buses on selected route
- Real-time bus location on Mapbox
- Click bus for details:
  - Bus number
  - Driver name
  - Phone number (clickable)
  - Available seats
- Route visualization with stops

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | Register (student/parent) |
| GET | `/api/auth/me` | Get current user |

### Admin (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/bulk-entry` | Process bulk data |
| GET | `/api/admin/drivers` | Get all drivers |
| GET | `/api/admin/buses` | Get all buses |
| GET | `/api/admin/routes` | Get all routes |
| GET | `/api/admin/stats` | Get dashboard stats |

### Driver (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/driver/my-bus` | Get assigned bus |
| POST | `/api/driver/start-trip` | Start trip |
| POST | `/api/driver/stop-trip` | Stop trip |
| PUT | `/api/driver/update-seats` | Update seat count |

### Tracking (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tracking/routes` | Get all routes |
| GET | `/api/tracking/buses/:routeId` | Get buses by route |
| GET | `/api/tracking/active-buses` | Get active buses |
| GET | `/api/tracking/bus/:busId` | Get bus details |

## Socket.io Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `sendLocation` | `{busId, lat, lng, availableSeats}` | Driver sends location |
| `tripStarted` | `{busId}` | Driver starts trip |
| `tripStopped` | `{busId}` | Driver stops trip |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `receiveLocation` | `{busId, lat, lng, availableSeats, timestamp}` | Broadcast location |
| `busStatusChanged` | `{busId, isActive}` | Bus status update |

## Database Schema

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: ['admin', 'driver', 'student', 'parent'],
  phoneNumber: String (unique)
}
```

### Route
```javascript
{
  routeNumber: String (auto: R1, R2...),
  routeName: String (unique),
  stops: [{
    name: String,
    lat: Number,
    lng: Number,
    order: Number
  }]
}
```

### Bus
```javascript
{
  busNumber: String (unique, from RegNo),
  driverId: ObjectId (ref: User),
  routeId: ObjectId (ref: Route),
  totalSeats: Number (default: 40),
  availableSeats: Number (default: 40),
  isActive: Boolean
}
```

### Location
```javascript
{
  busId: ObjectId (ref: Bus),
  lat: Number,
  lng: Number,
  timestamp: Date
}
```

## Business Rules

1. **Drivers** - Created ONLY by admin via bulk entry (no self-registration)
2. **Bus-Driver** - Each driver has exactly ONE bus
3. **Bus-Route** - Each bus has exactly ONE route
4. **Routes** - Must be unique (no duplicates)
5. **GPS** - Only from driver device
6. **Data Entry** - Only admin bulk input

## Mapbox Setup

1. Create account at https://mapbox.com
2. Get access token from dashboard
3. Add to `frontend/.env`:
   ```
   VITE_MAPBOX_TOKEN=your_token_here
   ```

## Production Deployment

### Backend
```bash
npm start
```

### Frontend
```bash
npm run build
# Serve dist/ folder
```

