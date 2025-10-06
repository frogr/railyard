require 'json'

class RailsBuilder
  def initialize(schema)
    @schema = schema
    @app_name = schema['app_name']
    @rails_version = schema['rails_version'] || '7.1'
    @database = schema['database'] || 'postgresql'
    @api_only = schema['api_only'] || false
    @models = schema['models'] || []
    @join_tables = schema['join_tables'] || []
  end

  def generate_script
    script = []
    script << "#!/bin/bash"
    script << "set -e"
    script << ""
    script << "echo 'Starting Rails app generation...'"
    script << ""

    # Create Rails app
    script << generate_rails_new_command
    script << ""
    script << "cd #{@app_name}"
    script << ""

    # Generate models
    @models.each do |model|
      script << generate_model_command(model)
      script << ""
    end

    # Generate join tables for HABTM associations
    @join_tables.each do |join_table|
      script << generate_join_table_migration(join_table)
      script << ""
    end

    # Add model code (validations, associations, callbacks)
    @models.each do |model|
      script += generate_model_modifications(model)
      script << ""
    end

    # Create database and run migrations
    script << "echo 'Setting up database...'"
    script << "bundle exec rails db:create"
    script << "bundle exec rails db:migrate"
    script << ""

    script << "echo 'Rails app generated successfully!'"
    script << "echo 'App location: #{@app_name}'"
    script << "echo 'To start the server: cd #{@app_name} && rails server'"

    script.join("\n")
  end

  private

  def generate_rails_new_command
    cmd = "rails new #{@app_name}"
    cmd += " --database=#{@database}"
    cmd += " --api" if @api_only
    cmd += " --skip-test" # Skip test files for simplicity
    cmd
  end

  def generate_model_command(model)
    model_name = model['name']
    fields = model['fields'] || []

    # Build field list for generator
    field_args = fields.map do |field|
      field_str = "#{field['name']}:#{field['type']}"

      # Add field options if specified
      if field['options'] && !field['options'].empty?
        options = field['options'].map { |k, v| "#{k}:#{v}" }.join(' ')
        field_str += "{#{options}}"
      end

      field_str
    end

    "rails generate model #{model_name} #{field_args.join(' ')}"
  end

  def generate_join_table_migration(join_table)
    model1 = join_table['models'][0].downcase
    model2 = join_table['models'][1].downcase
    table_name = join_table['table_name'] || "#{model1}_#{model2}"

    "rails generate migration CreateJoinTable#{model1.capitalize}#{model2.capitalize} #{model1} #{model2}"
  end

  def generate_model_modifications(model)
    modifications = []
    model_name = model['name']
    model_file = "app/models/#{model_name.downcase}.rb"

    # Collect all modifications
    associations = generate_associations(model)
    validations = generate_validations(model)
    callbacks = generate_callbacks(model)
    indices = generate_indices(model)

    if associations.any? || validations.any? || callbacks.any?
      modifications << "# Adding code to #{model_name} model"

      # Use a Ruby script to properly insert code into the model
      ruby_code = build_model_code(model_name, associations, validations, callbacks)

      modifications << "cat > tmp_model_code.rb << 'RUBY_CODE'"
      modifications << ruby_code
      modifications << "RUBY_CODE"
      modifications << ""
      modifications << "ruby tmp_model_code.rb"
      modifications << "rm tmp_model_code.rb"
    end

    # Generate index migrations
    if indices.any?
      indices.each do |index|
        modifications << generate_index_migration(model_name, index)
      end
    end

    modifications
  end

  def build_model_code(model_name, associations, validations, callbacks)
    code = []
    code << "# Script to add code to #{model_name} model"
    code << "model_file = 'app/models/#{model_name.downcase}.rb'"
    code << "content = File.read(model_file)"
    code << ""
    code << "# Find the class definition"
    code << "additions = []"

    # Add associations
    associations.each do |assoc|
      code << "additions << '  #{assoc}'"
    end

    # Add validations
    validations.each do |val|
      code << "additions << '  #{val}'"
    end

    # Add callbacks and their methods
    callbacks.each do |cb|
      if cb.is_a?(Array)
        cb.each { |line| code << "additions << '  #{line}'" }
      else
        code << "additions << '  #{cb}'"
      end
    end

    code << ""
    code << "# Insert before the last 'end'"
    code << "lines = content.lines"
    code << "last_end_index = lines.rindex { |line| line.strip == 'end' }"
    code << ""
    code << "if last_end_index"
    code << "  lines.insert(last_end_index, additions.join(\"\\n\") + \"\\n\")"
    code << "  File.write(model_file, lines.join)"
    code << "  puts 'Updated #{model_name} model'"
    code << "else"
    code << "  puts 'Error: Could not find end of class in #{model_name}'"
    code << "end"

    code.join("\n")
  end

  def generate_associations(model)
    return [] unless model['associations']

    model['associations'].map do |assoc|
      assoc_code = "#{assoc['type']} :#{assoc['name']}"

      if assoc['options'] && !assoc['options'].empty?
        options = assoc['options'].map do |key, value|
          if value.is_a?(String) && value.start_with?(':')
            "#{key}: #{value}"
          elsif value.is_a?(String)
            "#{key}: '#{value}'"
          else
            "#{key}: #{value}"
          end
        end.join(', ')

        assoc_code += ", #{options}"
      end

      assoc_code
    end
  end

  def generate_validations(model)
    return [] unless model['validations']

    model['validations'].map do |val|
      val_code = "validates :#{val['field']}, #{val['type']}: true"

      if val['options'] && !val['options'].empty?
        options = val['options'].map do |key, value|
          if value.is_a?(Hash)
            hash_str = value.map { |k, v| "#{k}: #{v}" }.join(', ')
            "#{key}: { #{hash_str} }"
          elsif value.is_a?(String)
            "#{key}: '#{value}'"
          else
            "#{key}: #{value}"
          end
        end.join(', ')

        val_code = "validates :#{val['field']}, #{val['type']}: { #{options} }"
      end

      val_code
    end
  end

  def generate_callbacks(model)
    return [] unless model['callbacks']

    callbacks = []

    model['callbacks'].each do |cb|
      # Add the callback declaration
      callbacks << "#{cb['type']} :#{cb['method']}"

      # Add a simple method stub if provided
      if cb['code']
        callbacks << ""
        callbacks << "private"
        callbacks << ""
        callbacks << "def #{cb['method']}"
        callbacks << "  # TODO: Implement #{cb['method']}"
        callbacks << "  #{cb['code']}"
        callbacks << "end"
      end
    end

    callbacks
  end

  def generate_indices(model)
    return [] unless model['indices']
    model['indices']
  end

  def generate_index_migration(model_name, index)
    fields = index['fields'].join('_')
    unique = index['unique'] ? 'Unique' : ''
    migration_name = "Add#{unique}IndexTo#{model_name}#{fields.split('_').map(&:capitalize).join}"

    cmd = "rails generate migration #{migration_name}"

    # The migration will need to be edited manually or we can add the index command
    # For simplicity, we'll add a note
    "# TODO: Add index for #{model_name}: #{index['fields'].join(', ')}"
  end
end
