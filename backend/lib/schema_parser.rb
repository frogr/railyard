class SchemaParser
  RESERVED_WORDS = %w[
    Application Record Base Class Module Object Kernel String Integer Float Array Hash
    ActiveRecord ActiveModel ActionController ActionView ApplicationRecord ApplicationController
  ].freeze

  VALID_FIELD_TYPES = %w[
    string text integer bigint decimal float boolean date datetime time
    binary json jsonb uuid references
  ].freeze

  VALID_ASSOCIATION_TYPES = %w[
    belongs_to has_many has_one has_and_belongs_to_many
  ].freeze

  def initialize(schema)
    @schema = schema
    @errors = []
  end

  def validate
    validate_app_name
    validate_rails_version
    validate_models
    @errors
  end

  private

  def validate_app_name
    app_name = @schema['app_name']

    if app_name.nil? || app_name.strip.empty?
      @errors << "App name is required"
      return
    end

    unless app_name =~ /^[a-z][a-z0-9_]*$/
      @errors << "App name must be snake_case and start with a letter (got: #{app_name})"
    end

    if RESERVED_WORDS.include?(app_name.camelize)
      @errors << "App name '#{app_name}' conflicts with reserved word"
    end
  end

  def validate_rails_version
    version = @schema['rails_version']

    unless version =~ /^\d+\.\d+$/
      @errors << "Invalid Rails version format (expected: X.Y, got: #{version})"
    end
  end

  def validate_models
    models = @schema['models']

    if models.nil? || !models.is_a?(Array)
      @errors << "Models must be an array"
      return
    end

    if models.empty?
      @errors << "At least one model is required"
      return
    end

    model_names = []

    models.each_with_index do |model, index|
      validate_model(model, index)
      model_names << model['name'] if model['name']
    end

    # Check for duplicate model names
    duplicates = model_names.select { |name| model_names.count(name) > 1 }.uniq
    unless duplicates.empty?
      @errors << "Duplicate model names found: #{duplicates.join(', ')}"
    end
  end

  def validate_model(model, index)
    name = model['name']

    if name.nil? || name.strip.empty?
      @errors << "Model ##{index + 1}: Name is required"
      return
    end

    unless name =~ /^[A-Z][a-zA-Z0-9]*$/
      @errors << "Model '#{name}': Must be CamelCase and start with uppercase letter"
    end

    if RESERVED_WORDS.include?(name)
      @errors << "Model name '#{name}' is a reserved word"
    end

    # Validate fields
    if model['fields'] && model['fields'].is_a?(Array)
      model['fields'].each do |field|
        validate_field(field, name)
      end
    end

    # Validate associations
    if model['associations'] && model['associations'].is_a?(Array)
      model['associations'].each do |assoc|
        validate_association(assoc, name)
      end
    end
  end

  def validate_field(field, model_name)
    field_name = field['name']
    field_type = field['type']

    if field_name.nil? || field_name.strip.empty?
      @errors << "Model '#{model_name}': Field name is required"
      return
    end

    unless field_name =~ /^[a-z][a-z0-9_]*$/
      @errors << "Model '#{model_name}': Field '#{field_name}' must be snake_case"
    end

    if %w[id created_at updated_at type].include?(field_name)
      @errors << "Model '#{model_name}': Field '#{field_name}' is automatically added by Rails"
    end

    unless VALID_FIELD_TYPES.include?(field_type)
      @errors << "Model '#{model_name}': Invalid field type '#{field_type}' for field '#{field_name}'"
    end
  end

  def validate_association(assoc, model_name)
    assoc_type = assoc['type']
    assoc_name = assoc['name']
    target = assoc['target']

    unless VALID_ASSOCIATION_TYPES.include?(assoc_type)
      @errors << "Model '#{model_name}': Invalid association type '#{assoc_type}'"
    end

    if assoc_name.nil? || assoc_name.strip.empty?
      @errors << "Model '#{model_name}': Association name is required"
    end

    if target.nil? || target.strip.empty?
      @errors << "Model '#{model_name}': Association target model is required"
    end
  end
end

# Simple camelize method for string
class String
  def camelize
    self.split('_').map(&:capitalize).join
  end
end
