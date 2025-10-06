require 'sinatra'
require 'json'
require_relative 'lib/schema_parser'
require_relative 'lib/rails_builder'
require_relative 'lib/script_executor'

# Configure Sinatra
set :port, 3000
set :bind, '0.0.0.0'
set :public_folder, File.expand_path('../frontend', __dir__)

# Enable CORS for development
configure do
  enable :cross_origin
end

before do
  response.headers['Access-Control-Allow-Origin'] = '*'
  response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
end

options '*' do
  200
end

# Serve the main HTML file
get '/' do
  send_file File.join(settings.public_folder, 'index.html')
end

# Health check endpoint
get '/health' do
  content_type :json
  { status: 'ok', message: 'RailYard server is running' }.to_json
end

# Generate Rails app from schema
post '/generate' do
  content_type :json

  begin
    # Parse request body
    request.body.rewind
    body = request.body.read

    if body.nil? || body.empty?
      halt 400, { success: false, error: 'Request body is empty' }.to_json
    end

    schema = JSON.parse(body)

    # Validate schema
    parser = SchemaParser.new(schema)
    errors = parser.validate

    unless errors.empty?
      return {
        success: false,
        errors: errors,
        message: 'Schema validation failed'
      }.to_json
    end

    # Build Rails generation script
    builder = RailsBuilder.new(schema)
    script = builder.generate_script

    # Execute script
    executor = ScriptExecutor.new(script, schema['app_name'])
    result = executor.run

    if result[:success]
      {
        success: true,
        message: 'Rails app generated successfully!',
        output_path: result[:path],
        log: result[:log]
      }.to_json
    else
      {
        success: false,
        error: result[:error],
        log: result[:log]
      }.to_json
    end

  rescue JSON::ParserError => e
    halt 400, {
      success: false,
      error: 'Invalid JSON',
      message: e.message
    }.to_json

  rescue => e
    puts "Error: #{e.message}"
    puts e.backtrace

    halt 500, {
      success: false,
      error: 'Internal server error',
      message: e.message
    }.to_json
  end
end

# Get list of generated apps
get '/apps' do
  content_type :json

  output_dir = File.expand_path('../output', __dir__)

  if File.exist?(output_dir)
    apps = Dir.entries(output_dir)
              .select { |entry| File.directory?(File.join(output_dir, entry)) }
              .reject { |entry| entry.start_with?('.') }

    { success: true, apps: apps }.to_json
  else
    { success: true, apps: [] }.to_json
  end
end

# Serve static files
get '/:filename' do
  file_path = File.join(settings.public_folder, params[:filename])

  if File.exist?(file_path) && File.file?(file_path)
    send_file file_path
  else
    halt 404, { error: 'File not found' }.to_json
  end
end

# Start server message
puts "========================================="
puts "  RailYard Server Starting"
puts "========================================="
puts "  Local:   http://localhost:3000"
puts "  Network: http://#{Socket.ip_address_list.find { |ai| ai.ipv4? && !ai.ipv4_loopback? }&.ip_address}:3000"
puts "========================================="
