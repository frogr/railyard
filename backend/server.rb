require 'sinatra'
require 'json'
require_relative 'lib/response_helper'
require_relative 'lib/schema_parser'
require_relative 'lib/rails_builder'
require_relative 'lib/script_executor'

helpers ResponseHelper

set :port, 3000
set :bind, '0.0.0.0'
set :public_folder, File.expand_path('../frontend', __dir__)

before do
  response.headers['Access-Control-Allow-Origin'] = '*'
  response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
end

options '*' do
  200
end

get '/' do
  send_file File.join(settings.public_folder, 'index.html')
end

get '/health' do
  success_response('RailYard server is running')
end

post '/generate' do
  request.body.rewind
  body = request.body.read

  halt 400, error_response('Request body is empty') if body.nil? || body.empty?

  schema = JSON.parse(body)

  parser = SchemaParser.new(schema)
  errors = parser.validate

  return error_response('Schema validation failed', 400, { errors: errors }) unless errors.empty?

  builder = RailsBuilder.new(schema)
  script = builder.generate_script

  executor = ScriptExecutor.new(script, schema['app_name'])
  result = executor.run

  if result[:success]
    success_response('Rails app generated successfully!', {
      output_path: result[:path],
      log: result[:log]
    })
  else
    error_response(result[:error], 500, { log: result[:log] })
  end

rescue JSON::ParserError => e
  error_response('Invalid JSON', 400, { message: e.message })
rescue => e
  puts "Error: #{e.message}"
  puts e.backtrace
  error_response('Internal server error', 500, { message: e.message })
end

get '/apps' do
  output_dir = File.expand_path('../output', __dir__)

  apps = if File.exist?(output_dir)
    Dir.entries(output_dir)
      .select { |entry| File.directory?(File.join(output_dir, entry)) }
      .reject { |entry| entry.start_with?('.') }
  else
    []
  end

  success_response('Apps retrieved', { apps: apps })
end

puts "\n" + "=" * 50
puts "  RailYard Server"
puts "=" * 50
puts "  Running at: http://localhost:3000"
puts "=" * 50 + "\n"
