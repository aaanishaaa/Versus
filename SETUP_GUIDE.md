# Versus Days 4-5 Setup & Demo Guide

## 🎉 Implementation Complete!

All Day 4 and Day 5 features have been implemented. This guide will help you set up and run the full demo.

## Prerequisites

- Node.js (v16+)
- PostgreSQL (running locally on default port 5432)
- Docker (for Piston code execution engine)

## 📋 Quick Setup

### Step 1: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Initialize database (if not already done)
psql -U postgres -c "CREATE DATABASE versus" 2>/dev/null || true
psql -U postgres -d versus -f src/sql/schema.sql
psql -U postgres -d versus -f src/sql/matches.sql

# Populate with seed data
node seed.js

# Start backend server
npm run dev
```

Expected output:
```
✅ Inserted 15 users
✅ Created 20 matches
✅ Updated user stats
🎉 Seed complete!
Backend listening on http://localhost:4000
```

### Step 2: Start Piston (Code Execution Engine)

```bash
docker run --rm -d -p 2000:2000 ghcr.io/engineer-man/piston
```

### Step 3: Frontend Setup

```bash
cd frontend/versus-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Expected output:
```
VITE v7.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

## 🧪 Demo Walkthrough

### Login & Dashboard
1. Open http://localhost:5173 in your browser
2. Log in with:
   - **Email:** player1@vs.com
   - **Password:** demo1234
   - **Rating:** 1200
   
3. Explore the Dashboard page to see:
   - Your rating and stats
   - "Find Match" button
   - NavBar with Leaderboard and Profile links

### Leaderboard
1. Click "Leaderboard" in NavBar
2. See top 20 players with:
   - Rank (🥇🥈🥉 for top 3)
   - Player name
   - League badge (Bronze/Silver/Gold/Platinum/Diamond)
   - Rating, W/L record, Win Rate
3. Search for a player by name
4. Current user row is highlighted in blue

### Profile
1. Click on any leaderboard entry or "Profile" in NavBar
2. See player details:
   - Initials avatar with league color
   - Stats: Total Matches, Wins, Losses, Win Rate
   - Last 10 matches with results and rating deltas
3. Click on any match to view the full result

### Battle & Results
1. Open two browser tabs/windows
2. Tab 1: Log in as player1@vs.com
3. Tab 2: Log in as player2@vs.com (Rating: 1850)
4. Tab 1: Click "Find Match"
5. Wait for matchmaking (should be instant with seeded data)
6. Both players should see "Match Found" with 3-second countdown
7. Navigate to battle page showing:
   - Problem description on left
   - Code editor in middle
   - Match info on right (timer, opponent, status)
8. Submit solutions:
   - Both players code will test against sample test cases
   - First to get AC (all tests pass) wins
9. See Result page with:
   - **🎉 Confetti animation** (for winner)
   - **Animated rating counter** showing old → new rating
   - Rating delta badge (green for +, red for -)
   - Match summary (problem, time, result)
   - Side-by-side code comparison
   - "Play Again" button

### Disconnect Handling
1. During a match, close the browser tab/window
2. The other player should see:
   - Connection status indication
   - Reconnection attempts
   - After opponent disconnect timeout: win notification

## 🏗️ Architecture Overview

### Backend
- **Server:** Express.js with Socket.io
- **Database:** PostgreSQL
- **ELO System:** 32-point K factor, standard ELO formula
- **Execution:** Piston API for code testing

### Frontend
- **Framework:** React with React Router
- **Styling:** Tailwind CSS
- **Editor:** Monaco Editor (VS Code)
- **Realtime:** Socket.io client
- **Notifications:** react-hot-toast
- **Animations:** canvas-confetti

## 📊 Database Schema Changes

### New Columns (matches table)
- `winner_rating_delta INTEGER` - Rating change for winner
- `loser_rating_delta INTEGER` - Rating change for loser

### New Table (match_submissions)
Tracks code submissions for each match

## 🔑 Key Features Implemented

### Day 4: Winner Logic & ELO Ratings
- ✅ `calculateELO()` function with proper formula
- ✅ Match completion with rating updates
- ✅ Result endpoint with full match data
- ✅ Confetti celebration animation
- ✅ Animated rating counter

### Day 5: Leaderboard, Profile & Polish
- ✅ Leaderboard with search and sorting
- ✅ Player profiles with match history
- ✅ Navigation bar on all pages
- ✅ League badges (Bronze→Diamond)
- ✅ Loading spinners on all async operations
- ✅ Toast notifications for errors/success
- ✅ Mobile responsive design
- ✅ Automatic socket reconnection
- ✅ Seeded database with realistic data

## 🐛 Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
Solution: Ensure PostgreSQL is running
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Windows
# Start PostgreSQL from Services or pgAdmin
```

### Piston Connection Error
```
Error: fetch failed (http://localhost:2000)
```
Solution: Start Piston container
```bash
docker run --rm -d -p 2000:2000 ghcr.io/engineer-man/piston
```

### Port Already in Use
```
Port 4000 or 5173 is already in use
```
Solution: Kill the process or use a different port
```bash
# macOS/Linux
lsof -i :4000  # Find process
kill -9 <PID>  # Kill it

# Or change port in .env or code
```

### No Users/Matches in Database
```bash
# Re-run seed
node backend/seed.js

# Or manually insert demo users
psql -U postgres -d versus
INSERT INTO users (email, password_hash, rating, wins, losses)
VALUES ('player1@vs.com', '$2a$10$...', 1200, 5, 3);
```

## 📝 Demo Checklist

- [ ] Backend running on port 4000
- [ ] Frontend running on port 5173
- [ ] Piston running on port 2000
- [ ] Database seeded with 15 users and 20 matches
- [ ] Can log in with player1@vs.com / demo1234
- [ ] Can view Leaderboard
- [ ] Can view Player Profiles
- [ ] Can find a match and see battle page
- [ ] Can submit code and see results
- [ ] Can see confetti animation on win
- [ ] Rating counter animates on result page
- [ ] Can navigate between all pages
- [ ] Mobile layout works on smaller screens

## 🚀 Performance Tips

### For Live Demo
1. Pre-run seed.js before showing
2. Keep both browsers visible (split screen)
3. Use player1 and player2 as participants
4. Use easy problems (Two Sum, Valid Parentheses) for quick wins
5. Have solutions pre-written but typed live

### Monitor Performance
```bash
# Backend logs
tail -f backend/server.js

# Frontend console (in DevTools)
# Shows all socket events and API calls
```

## 📞 Support

If issues arise during demo:
1. Check browser console for errors (F12)
2. Check backend logs for API errors
3. Verify all services are running
4. Check .env variables match ports
5. Try restarting all services

---

**Ready to demo! 🎮** Open http://localhost:5173 and start testing Versus!
