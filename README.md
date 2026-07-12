# FaceFence Hostel Guard

FaceFence Hostel Guard is a hostel attendance system that combines GPS geofencing, liveness detection, and facial recognition to verify that a student is physically present when marking attendance.

## Features

- Admin dashboard for managing students, attendance sessions, and reports
- Student attendance marking with GPS verification
- Face registration and live face matching
- Liveness checks such as blinking, smiling, or head turns
- Bulk student import through CSV upload

## Tech Stack

- Frontend: React, Bootstrap, React Router, Axios
- Face AI: face-api.js
- Backend: Node.js, Express, MongoDB, Mongoose
- Authentication: JWT and bcrypt
- File handling: Multer

## Project Structure

```text
FaceFenceHostelGuard/
├── backend/         # Express API, MongoDB models, auth, uploads
├── frontend/        # React application and face verification UI
├── package.json     # Root scripts if needed
└── sample_students.csv
```

## Setup

### Prerequisites

- Node.js 18+
- MongoDB running locally or on MongoDB Atlas
- npm

### Backend

```bash
cd backend
npm install
```

Create a .env file in the backend folder with values similar to:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/facefence
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
NODE_ENV=development
```

Then start the backend:

```bash
node seed.js
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Notes

- The face verification flow uses pre-trained models from face-api.js.
- Model weight files should be placed in the frontend public models folder before running the app.

## Default Admin Login

- Username: admin
- Password: Admin@123

> Change the default password after the first login.
| GET | `/api/attendance/my-history` | Student | Own attendance history + summary |
| GET | `/api/attendance/dashboard-stats` | Admin | Today's counts for dashboard |
| GET | `/api/attendance/monitoring` | Admin | Full monitoring with filters |
| PATCH | `/api/attendance/:id/review` | Admin | Approve/Reject suspicious record |
| GET | `/api/attendance/export` | Admin | Export report data as JSON |

---

## Environment Variables Reference

### Backend (`backend/.env`)

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/geoface_hostel
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRE=7d
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:3000
```

### Frontend

The React app uses the `proxy` field in `package.json` to forward `/api` requests to the backend during development. No separate `.env` needed for local development.

For production builds, set:
```env
REACT_APP_API_URL=https://your-production-domain.com
```

And update `frontend/src/api/axios.js`:
```js
const API = axios.create({ baseURL: process.env.REACT_APP_API_URL + '/api' });
```

---

## Production Deployment

### Backend (e.g. AWS EC2 / Railway / Render)

```bash
cd backend
NODE_ENV=production npm start
```

Use a process manager:
```bash
npm install -g pm2
pm2 start server.js --name geoface-backend
pm2 save
```

### Frontend (e.g. AWS S3 + CloudFront / Vercel / Netlify)

```bash
cd frontend
npm run build
# Upload the build/ folder to your static hosting
```

### MongoDB Atlas (Cloud)

Replace `MONGO_URI` with your Atlas connection string:
```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/geoface_hostel?retryWrites=true&w=majority
```

---

## Security Considerations

- All passwords hashed with `bcryptjs` (salt rounds: 12)
- JWT tokens expire in 7 days (configurable via `JWT_EXPIRE`)
- `password` field has `select: false` on the User schema — never returned in API responses
- Students cannot change their own username
- Deactivated accounts are rejected at the JWT middleware level
- Uploaded file types are validated (images only for photos, CSV/Excel only for bulk upload)
- File size limits: 5MB for images, 10MB for CSV
- CORS restricted to `CLIENT_ORIGIN`

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `No active session found` | Admin must create a session for today with current time within the window |
| `You are outside the hostel boundary` | Student is too far from the session GPS coordinates; increase radius or recheck coordinates |
| `Camera access denied` | Allow camera permission in browser settings; HTTPS required on mobile |
| `Liveness verification not triggering` | Ensure face-api model files are present in `public/models/`; check browser console for 404 errors |
| `Face models fail to load` | Download the 8 required `.json` and `-shard1` files from vladmandic/face-api GitHub |
| MongoDB connection refused | Ensure MongoDB service is running: `mongod --dbpath /data/db` |
| `jwt malformed` on refresh | Clear localStorage and log in again |

---

## Future Scope

### 1. Mobile Application
Build native iOS and Android apps using **React Native** with the same backend API. Leverage device-native camera APIs for improved face detection performance and offline GPS caching for areas with poor connectivity.

### 2. QR Code + Face Dual Verification
Add a session-specific **QR code** generated by the warden. Students scan the QR (proving physical presence at a specific terminal) and then complete face verification — two-factor physical verification.

### 3. AI Anti-Spoofing (Presentation Attack Detection)
Integrate a **depth estimation model** or **infrared liveness** check to detect printed photos, screen replays, or 3D masks. Replace basic EAR/expression liveness with a dedicated PAD (Presentation Attack Detection) neural network.

### 4. Parent & Guardian Notifications
Send automated **SMS/WhatsApp/Email** alerts to registered parent contacts when:
- A student is marked Absent
- A Suspicious attendance is flagged
- A student has not marked attendance within 15 minutes of session start
Use **AWS SNS**, **Twilio**, or **Nodemailer** for the notification pipeline.

### 5. Email & Push Alerts
- Warden email digest with daily attendance summary PDF at 10 PM
- Browser **Push Notifications** via Web Push API for real-time suspicious alerts
- Student reminder notification before the attendance window closes

### 6. Multi-Hostel Support
Extend the data model to support multiple hostels under one institution:
- Add `Hostel` collection with name, block list, and warden assignment
- Scope all students, sessions, and records to a hostel
- Super-admin role to manage multiple wardens and hostels from a single dashboard

### 7. Attendance Analytics & Insights
- Weekly and monthly trend charts per student
- Block-wise and room-wise heatmaps
- Automatic flagging of students with attendance below a configurable threshold (e.g. < 75%)
- Predictive absence risk scoring using historical patterns

### 8. Offline Mode with Background Sync
Cache the active session data using a **Service Worker**. Allow students to start the GPS + face flow offline and sync the record when connectivity is restored using the **Background Sync API**.

### 9. Admin Mobile Dashboard
A lightweight **Progressive Web App (PWA)** version of the admin monitoring page that wardens can pin to their phone home screen for quick real-time checks without opening a full browser.

### 10. Integration with College ERP
Expose a secure webhook or REST API adapter to push attendance data into existing **college ERP systems** (e.g. Fedena, Wisenet, or custom portals) so hostel attendance is reflected in the central academic record automatically.

---

## License

MIT License — free to use, modify, and distribute with attribution.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit with clear messages: `git commit -m "feat: add push notifications"`
4. Push and open a Pull Request

---

*Built with ❤️ for hostel wardens who deserve smarter tools.*
