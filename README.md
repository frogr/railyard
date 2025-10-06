# RailYard

**Visual Rails Schema Designer** - Design your Rails application schema visually and export a working Rails app.

## Overview

RailYard is a local developer tool that provides a visual node-based editor for designing Rails models. Create models, define fields, add associations, validations, and callbacks through an intuitive drag-and-drop interface. Export your design as a fully-functional Rails application.

## Features

- 🎨 **Visual Node Editor** - Drag-and-drop interface for creating Rails models
- 🔗 **Association Management** - Visual connections for belongs_to, has_many, has_one, and HABTM
- ✅ **Validations** - Add common Rails validations visually
- 🔄 **Callbacks** - Define model lifecycle callbacks
- 💾 **Save/Load Schemas** - Save your designs and load them later
- 🚀 **Generate Rails Apps** - Export to a complete Rails application with one click
- 🎯 **Field Types** - Support for all Rails field types (string, text, integer, boolean, datetime, references, etc.)

## Project Structure

```
railyard/
├── backend/              # Ruby/Sinatra backend
│   ├── server.rb        # Main server
│   ├── lib/
│   │   ├── schema_parser.rb    # Schema validation
│   │   ├── rails_builder.rb    # Rails command generation
│   │   └── script_executor.rb  # Safe script execution
│   └── Gemfile
├── frontend/            # Vanilla JavaScript frontend
│   ├── index.html
│   ├── style.css
│   ├── app.js          # State management
│   ├── nodes.js        # Model node management
│   ├── connections.js  # Association connections
│   └── vendor/
│       └── leader-line.min.js
└── output/             # Generated Rails apps
```

## Installation

### Prerequisites

- Ruby 3.0+ (with Bundler)
- Rails 6.1+ installed globally
- Node.js not required (uses vanilla JavaScript)

### Setup

1. Clone or navigate to the repository:
   ```bash
   cd railyard
   ```

2. Install Ruby dependencies:
   ```bash
   cd backend
   bundle install
   ```

## Usage

### Start the Server

```bash
cd backend
ruby server.rb
```

The server will start on `http://localhost:3000`

### Using RailYard

1. **Open your browser** to `http://localhost:3000`

2. **Add Models**:
   - Click "+ Add Model" button
   - Drag models around the canvas to position them
   - Click on model name to edit it (use CamelCase)

3. **Add Fields**:
   - Click "+ Add Field" in a model
   - Enter field name (snake_case)
   - Select field type from dropdown
   - Click × to delete a field

4. **Add Validations**:
   - Click "+ Add Validation"
   - Select field and validation type
   - Validations appear in the model

5. **Add Callbacks**:
   - Click "+ Add Callback"
   - Select callback type (before_save, after_create, etc.)
   - Enter method name

6. **Create Associations**:
   - Click and drag from a model's blue port (right side)
   - Drop on another model's blue port (left side)
   - Select association type in the modal
   - Association appears as a colored line:
     - 🔵 Blue solid = belongs_to
     - 🟢 Green dashed = has_many
     - 🟣 Purple solid = has_one
     - 🟠 Orange dashed = HABTM

7. **Generate Rails App**:
   - Enter app name (lowercase, snake_case)
   - Select database type (PostgreSQL, MySQL, SQLite)
   - Select Rails version
   - Click "Generate Rails App"
   - Wait for generation to complete
   - Your app will be in the `output/` directory

8. **Save/Load Schema**:
   - Click "Save Schema" to download JSON file
   - Click "Load Schema" to restore a saved design

### Keyboard Shortcuts

- **Delete** - Delete selected model
- **Escape** - Cancel connection creation

## Generated Rails App

The generated Rails application includes:

- ✅ All models with proper associations
- ✅ Database migrations with fields
- ✅ Validations in model files
- ✅ Callback method stubs
- ✅ Proper foreign keys and indices
- ✅ Database created and migrated

### Running Your Generated App

```bash
cd output/your_app_name
bundle install
rails server
```

Your Rails app is ready to use!

## Example: Blog Application

1. Create a `User` model with fields:
   - `email` (string)
   - `name` (string)

2. Create a `Post` model with fields:
   - `title` (string)
   - `content` (text)
   - `published` (boolean)

3. Add associations:
   - User → Post: `has_many :posts`
   - Post → User: `belongs_to :user`

4. Add validations:
   - User email: presence, uniqueness
   - Post title: presence

5. Generate the app and you'll have a working Rails blog foundation!

## Architecture

### Backend (Ruby/Sinatra)

- **server.rb** - Sinatra server with REST API
- **schema_parser.rb** - Validates JSON schema (naming, reserved words, etc.)
- **rails_builder.rb** - Converts schema to bash script with Rails commands
- **script_executor.rb** - Executes script safely with timeout and isolation

### Frontend (Vanilla JavaScript)

- **app.js** - Global state management, schema export/import
- **nodes.js** - Model creation, field management, drag-and-drop
- **connections.js** - LeaderLine integration for visual associations
- **style.css** - Modern, gradient-based UI design

### Connection Colors

- **Blue** (solid) - belongs_to
- **Green** (dashed) - has_many
- **Purple** (solid) - has_one
- **Orange** (dashed) - has_and_belongs_to_many

## API Endpoints

- `GET /` - Serve frontend
- `POST /generate` - Generate Rails app from schema
- `GET /apps` - List generated apps
- `GET /health` - Health check

## Validation Rules

The backend validates:

- ✅ App name format (snake_case)
- ✅ Model names (CamelCase, not reserved words)
- ✅ Field names (snake_case, not auto-generated fields)
- ✅ Field types (valid Rails types)
- ✅ Association types (valid Rails associations)
- ✅ No duplicate model names

## Troubleshooting

### Port 3000 already in use
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9
```

### Generated app doesn't appear
- Check the server logs in terminal
- Verify app name is valid (lowercase, snake_case)
- Check `output/` directory permissions

### Rails not found
```bash
# Install Rails globally
gem install rails
```

## Development

### Adding New Features

- Backend logic goes in `backend/lib/`
- Frontend components go in `frontend/`
- State management in `app.js`
- UI styling in `style.css`

## Contributing

RailYard is designed to be simple and extensible. Feel free to:

- Add new field types
- Implement index generation UI
- Add model method generators
- Create templates for common patterns
- Improve the visual design

## License

MIT License - use it however you'd like!

## Credits

- Built with [Sinatra](http://sinatrarb.com/) for the backend
- Uses [LeaderLine](https://anseki.github.io/leader-line/) for visual connections
- Inspired by visual database designers and Rails developers who love clean code

---

**Made with ❤️ for Rails developers who think visually**
