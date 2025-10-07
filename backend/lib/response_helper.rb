module ResponseHelper
  def json_response(data, status = 200)
    content_type :json
    status status
    data.to_json
  end

  def success_response(message, data = {})
    json_response({ success: true, message: message }.merge(data))
  end

  def error_response(error, status = 400, data = {})
    json_response({ success: false, error: error }.merge(data), status)
  end
end
