# RailYard

Visual schema designer for Rails. Draw your models, connect them with associations, hit generate, and get a working Rails app.

## What is this?

I got tired of scaffolding Rails apps by hand, so I built this. Drag and drop models onto a canvas, add fields and associations visually, then export the whole thing as an actual Rails application with migrations and everything.

## Running it

You need Ruby and Rails installed. Then:

```bash
cd backend
bundle install
ruby server.rb
```

Open `http://localhost:3000` in your browser.

## How to use it

**Making models:**
- Click "Add Model" and drag them around
- Click the model name to rename it
- Add fields with the button (name + type)
- Delete stuff with the × buttons or Delete key

**Making associations:**
- Drag from the right port of one model to the left port of another
- Pick your association type (belongs_to, has_many, etc.)
- Lines show up color-coded:
  - Blue = belongs_to
  - Green = has_many
  - Purple = has_one
  - Orange = has_and_belongs_to_many
- If you use "through", the line literally goes through that model

**Adding validations and callbacks:**
- Click the buttons in each model
- Pick from the dropdowns
- They'll show up in your generated Rails code

**Generating the app:**
- Fill in your app name (snake_case)
- Pick a database
- Hit "Generate Rails App"
- Your app shows up in `output/`

**Saving your work:**
- "Save Schema" downloads a JSON file
- "Load Schema" brings it back

## What you get

The generated Rails app includes all your models, migrations, associations, validations, and callback stubs. It's already set up with the database created and migrated. Just cd into it, run `bundle install` and `rails server`, and you're good to go.

## Tech

Backend is Ruby/Sinatra. Frontend is vanilla JavaScript with the LeaderLine library for drawing connections. No build step, no npm, just works.
