require 'fileutils'
require 'timeout'
require 'tmpdir'
require 'open3'

class ScriptExecutor
  TIMEOUT = 180 # 3 minutes should be enough for Rails app generation

  def initialize(script, app_name)
    @script = script
    @app_name = app_name
    @output_dir = File.expand_path('../../output', __dir__)
  end

  def run
    # Ensure output directory exists
    FileUtils.mkdir_p(@output_dir)

    # Check if app already exists
    final_path = File.join(@output_dir, @app_name)
    if File.exist?(final_path)
      return {
        success: false,
        error: "App '#{@app_name}' already exists in output directory. Please choose a different name or delete the existing app."
      }
    end

    # Create temporary directory for execution
    Dir.mktmpdir do |temp_dir|
      begin
        result = execute_in_temp_dir(temp_dir)
        return result
      rescue => e
        return {
          success: false,
          error: "Execution failed: #{e.message}",
          log: e.backtrace.join("\n")
        }
      end
    end
  end

  private

  def execute_in_temp_dir(temp_dir)
    script_path = File.join(temp_dir, 'build.sh')

    # Write script to file
    File.write(script_path, @script)
    File.chmod(0755, script_path)

    log_output = []
    log_output << "=== RailYard Build Script ==="
    log_output << "App Name: #{@app_name}"
    log_output << "Temp Directory: #{temp_dir}"
    log_output << "=== Executing Script ==="
    log_output << ""

    # Execute with timeout and capture output
    stdout_str = ""
    stderr_str = ""
    status = nil

    begin
      Timeout.timeout(TIMEOUT) do
        # Change to temp directory and execute
        Open3.popen3("bash", script_path, chdir: temp_dir) do |stdin, stdout, stderr, wait_thr|
          stdin.close

          # Read stdout and stderr in parallel
          threads = []

          threads << Thread.new do
            stdout.each_line do |line|
              stdout_str += line
              log_output << line.chomp
            end
          end

          threads << Thread.new do
            stderr.each_line do |line|
              stderr_str += line
              log_output << "[ERROR] #{line.chomp}"
            end
          end

          threads.each(&:join)
          status = wait_thr.value
        end
      end
    rescue Timeout::Error
      log_output << ""
      log_output << "=== ERROR: Script execution timed out after #{TIMEOUT} seconds ==="
      return {
        success: false,
        error: "Script execution timed out after #{TIMEOUT} seconds",
        log: log_output.join("\n")
      }
    end

    # Check if execution was successful
    unless status.success?
      log_output << ""
      log_output << "=== ERROR: Script failed with exit code #{status.exitstatus} ==="
      return {
        success: false,
        error: "Script failed with exit code #{status.exitstatus}",
        log: log_output.join("\n")
      }
    end

    # Move generated app to output directory
    temp_app_path = File.join(temp_dir, @app_name)
    final_app_path = File.join(@output_dir, @app_name)

    unless File.exist?(temp_app_path)
      log_output << ""
      log_output << "=== ERROR: Generated app not found at #{temp_app_path} ==="
      return {
        success: false,
        error: "Generated app directory not found",
        log: log_output.join("\n")
      }
    end

    # Move to final location
    FileUtils.mv(temp_app_path, final_app_path)

    log_output << ""
    log_output << "=== SUCCESS ==="
    log_output << "App generated at: #{final_app_path}"

    {
      success: true,
      path: final_app_path,
      log: log_output.join("\n")
    }
  end
end
