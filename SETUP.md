# 🚀 Quick Setup Guide

Get the AI Travel Planner running in 5 minutes!

## Prerequisites

- **Node.js** 20.0.0 or higher ([Download](https://nodejs.org))
- **npm** (comes with Node.js) or **yarn**
- (Optional) **Anthropic API Key** for real AI responses

## Step 1: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 15
- Mastra AI framework
- @dnd-kit for drag-and-drop
- Radix UI components
- Framer Motion
- And more...

## Step 2: Environment Variables (Optional)

### For Demo Mode (No API Key Required)
The app works perfectly without any API keys! It will use pre-built demo responses.

Just run:
```bash
npm run dev
```

### For Real AI Responses
Create a `.env.local` file:

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Get your API key from: https://console.anthropic.com/

## Step 3: Run the App

```bash
npm run dev
```

This now starts both:
- Next.js app (`dev:app`)
- Luffa bridge bot (`dev:bot`)

If you only want the web app:
```bash
npm run dev:app
```

Open [http://localhost:3000](http://localhost:3000)

## What You'll See

### Main Chat Interface (`/`)
- ChatGPT-style interface
- Type a travel request like: "Plan a 7-day trip to Japan for 2 people with $3000 budget"
- AI responds with interactive inline controls
- Adjust controls (travelers, budget, dates) and watch the plan update automatically

### Demo Itinerary (`/itinerary`)
- Pre-loaded 3-day Tokyo trip
- Full drag-and-drop Kanban board
- Drag activities between days
- Edit/delete activities
- Export to calendar (ICS file)

## Example Prompts to Try

```
1. "Plan a 5-day romantic trip to Paris for 2 people, budget $4000 per person, love art and food"

2. "I want a 10-day backpacking adventure in Thailand, solo traveler, budget-friendly under $2000"

3. "Plan a family trip to Disney World for 4 people (2 adults, 2 kids), 7 days, budget $6000 total"

4. "Weekend getaway to New York City for 2, moderate budget, interested in museums and restaurants"
```

## Inline UI Controls

The AI will generate interactive controls in its responses:

- `{{+[travelers]-}}` → Number stepper for travelers
- `{{+[$budget]-}}` → Price stepper for budget
- `{{::date-picker[departure]}}` → Calendar date picker
- `{{::country[destination]}}` → Country selector dropdown
- `{{::slider[range|min:X|max:Y]}}` → Range slider
- `{{::select[pace|relaxed,moderate,packed]}}` → Dropdown select
- `{{::toggle[feature]}}` → Toggle switch
- `{{::vote[item|up:X|down:Y]}}` → Voting buttons

## Features to Explore

### 1. Smart Replanning
- Adjust any inline control (travelers, budget, dates)
- Wait 1.5 seconds
- Watch the AI automatically regenerate the plan with your new preferences
- Blue banner shows "Updating your plan..."

### 2. Kanban Board
- Visit `/itinerary` to see the demo
- Drag activities between days
- Click the ⋮ menu to edit or delete
- Watch time calculations update in real-time
- Get warnings for overpacked days (>10 hours)

### 3. Calendar Export
- Click "Export to Calendar" button
- Downloads `.ics` file
- Import to Google Calendar, Apple Calendar, or Outlook
- All activities with times and locations

### 4. Multi-Agent System
The AI uses 5 specialized agents:
- **Flight Scout** - Finds best flight options
- **Hotel Hunter** - Recommends hotels near activities
- **Activity Finder** - Plans daily schedules
- **Food Expert** - Restaurant recommendations
- **Budget Optimizer** - Cost analysis and savings tips

Each agent uses real tools with Zod validation!

## Troubleshooting

### Port 3000 already in use
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

### Dependencies won't install
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### App crashes on start
Check Node.js version:
```bash
node --version  # Should be 20.0.0 or higher
```

Update if needed: https://nodejs.org

### Inline UI not rendering
- Make sure you're using the correct syntax: `{{+[name]-}}`
- Check browser console for errors
- Try refreshing the page

## Next Steps

1. **Explore the Code**
   - Check `lib/agents/` for agent implementations
   - Look at `components/inline-ui/` for UI controls
   - Read `lib/inline-ui/parser.tsx` to understand syntax

2. **Customize Agents**
   - Edit agent instructions in `lib/agents/*.ts`
   - Modify tools and mock data
   - Change output formats

3. **Add New Features**
   - Create new inline UI controls
   - Add more agents
   - Integrate real APIs (flights, hotels, activities)

4. **Deploy**
   - Push to GitHub
   - Deploy to Vercel (one click!)
   - Share with the world

## Need Help?

- Read the full [README.md](./README.md)
- Check [TODO.md](./TODO.md) for development status
- Review the [TRAVEL_PLANNER_COMPLETE_PLAN.md](./TRAVEL_PLANNER_COMPLETE_PLAN.md) for architecture

## Pro Tips

💡 **Adjust controls slowly** - The replan debounces at 1.5 seconds, so rapid changes will batch together

💡 **Use the demo page first** - `/itinerary` shows all Kanban features without needing to generate a plan

💡 **Check the console** - Useful logs show agent delegation, control changes, and API calls

💡 **No API key needed** - Perfect for demos, development, and testing without costs

---

**Happy planning! 🌍✈️**
