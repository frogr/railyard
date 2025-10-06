// Global state management
const State = {
  models: new Map(),
  connections: new Map(),
  selectedModel: null,
  nextModelId: 1,
  nextConnectionId: 1,
  zoom: 1,
  panX: 0,
  panY: 0,

  addModel(model) {
    this.models.set(model.id, model);
  },

  removeModel(id) {
    this.models.delete(id);
    // Remove connections related to this model
    this.connections.forEach((conn, connId) => {
      if (conn.from === id || conn.to === id) {
        conn.line.remove();
        this.connections.delete(connId);
      }
    });
  },

  getModel(id) {
    return this.models.get(id);
  },

  addConnection(connection) {
    this.connections.set(connection.id, connection);
  },

  removeConnection(id) {
    const connection = this.connections.get(id);
    if (connection && connection.line) {
      connection.line.remove();
    }
    this.connections.delete(id);
  },

  clear() {
    // Remove all connections
    this.connections.forEach(conn => {
      if (conn.line) conn.line.remove();
    });
    this.connections.clear();

    // Remove all model nodes
    this.models.forEach(model => {
      const element = document.getElementById(model.id);
      if (element) element.remove();
    });
    this.models.clear();

    this.selectedModel = null;
    this.nextModelId = 1;
    this.nextConnectionId = 1;
  },

  exportToJSON() {
    const models = [];

    this.models.forEach(model => {
      const modelData = {
        name: model.name || 'Model',
        fields: model.fields || [],
        validations: model.validations || [],
        callbacks: model.callbacks || [],
        associations: []
      };

      // Add associations from connections
      this.connections.forEach(conn => {
        if (conn.from === model.id) {
          const targetModel = this.getModel(conn.to);
          if (targetModel) {
            const association = {
              type: conn.type,
              name: conn.name,
              target: targetModel.name,
              options: conn.options || {}
            };
            modelData.associations.push(association);
          }
        }
      });

      models.push(modelData);
    });

    return {
      app_name: document.getElementById('app-name').value || 'my_rails_app',
      rails_version: document.getElementById('rails-version').value,
      database: document.getElementById('database').value,
      api_only: false,
      models: models
    };
  }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  console.log('RailYard initialized');
});

function setupEventListeners() {
  // Toolbar buttons
  document.getElementById('add-model').addEventListener('click', () => {
    createModel(100 + State.nextModelId * 50, 100 + State.nextModelId * 30);
  });

  document.getElementById('clear-canvas').addEventListener('click', () => {
    if (confirm('Clear all models and connections?')) {
      State.clear();
    }
  });

  document.getElementById('export').addEventListener('click', generateRailsApp);
  document.getElementById('save-schema').addEventListener('click', saveSchema);
  document.getElementById('load-schema').addEventListener('click', loadSchema);

  // Zoom controls
  document.getElementById('zoom-in').addEventListener('click', zoomIn);
  document.getElementById('zoom-out').addEventListener('click', zoomOut);
  document.getElementById('zoom-reset').addEventListener('click', zoomReset);

  // Canvas pan/drag
  setupCanvasPan();

  // Keyboard shortcuts for zoom
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === '=') {
      e.preventDefault();
      zoomIn();
    } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
      e.preventDefault();
      zoomOut();
    } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault();
      zoomReset();
    }
  });

  // Mouse wheel zoom
  const canvas = document.getElementById('canvas');
  canvas.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    }
  }, { passive: false });

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.modal').classList.remove('active');
    });
  });

  // Click outside modal to close
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
}

async function generateRailsApp() {
  const appName = document.getElementById('app-name').value;

  if (!appName || !appName.match(/^[a-z][a-z0-9_]*$/)) {
    alert('Please enter a valid app name (lowercase, snake_case)');
    return;
  }

  if (State.models.size === 0) {
    alert('Please add at least one model');
    return;
  }

  const schema = State.exportToJSON();
  console.log('Exporting schema:', schema);

  // Show loading state
  const exportBtn = document.getElementById('export');
  const originalText = exportBtn.textContent;
  exportBtn.textContent = 'Generating...';
  exportBtn.disabled = true;

  try {
    const response = await fetch('/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(schema)
    });

    const result = await response.json();

    // Show result modal
    showResultModal(result);

  } catch (error) {
    showResultModal({
      success: false,
      error: 'Failed to connect to server',
      log: error.toString()
    });
  } finally {
    exportBtn.textContent = originalText;
    exportBtn.disabled = false;
  }
}

function showResultModal(result) {
  const modal = document.getElementById('result-modal');
  const messageDiv = document.getElementById('result-message');
  const logDiv = document.getElementById('result-log');

  if (result.success) {
    messageDiv.className = 'success';
    messageDiv.textContent = `✓ ${result.message || 'Success!'}\nLocation: ${result.output_path}`;
  } else {
    messageDiv.className = 'error';
    messageDiv.textContent = `✗ ${result.error || 'Failed'}`;

    if (result.errors && result.errors.length > 0) {
      messageDiv.textContent += '\n\nValidation Errors:\n' + result.errors.join('\n');
    }
  }

  logDiv.textContent = result.log || 'No log available';

  modal.classList.add('active');

  // Close button
  document.getElementById('result-close').onclick = () => {
    modal.classList.remove('active');
  };
}

function saveSchema() {
  const schema = State.exportToJSON();

  // Also save positions
  const saveData = {
    schema: schema,
    positions: {}
  };

  State.models.forEach((model, id) => {
    const element = document.getElementById(id);
    if (element) {
      saveData.positions[id] = {
        x: parseInt(element.style.left),
        y: parseInt(element.style.top),
        name: model.name
      };
    }
  });

  const json = JSON.stringify(saveData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${schema.app_name}_schema.json`;
  a.click();

  URL.revokeObjectURL(url);
}

function loadSchema() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);

        // Clear existing state
        State.clear();

        // Restore schema settings
        if (data.schema) {
          document.getElementById('app-name').value = data.schema.app_name || 'my_rails_app';
          document.getElementById('rails-version').value = data.schema.rails_version || '7.1';
          document.getElementById('database').value = data.schema.database || 'postgresql';

          // Recreate models
          if (data.schema.models) {
            data.schema.models.forEach((modelData, index) => {
              // Get position if available
              let x = 100 + index * 50;
              let y = 100 + index * 30;

              // Try to find saved position
              if (data.positions) {
                const savedPos = Object.values(data.positions).find(pos => pos.name === modelData.name);
                if (savedPos) {
                  x = savedPos.x;
                  y = savedPos.y;
                }
              }

              // Create model with data
              createModelWithData(x, y, modelData);
            });

            // Recreate connections after a short delay (to ensure models are rendered)
            setTimeout(() => {
              data.schema.models.forEach(modelData => {
                if (modelData.associations) {
                  modelData.associations.forEach(assoc => {
                    // Find source and target models
                    const sourceModel = Array.from(State.models.values()).find(m => m.name === modelData.name);
                    const targetModel = Array.from(State.models.values()).find(m => m.name === assoc.target);

                    if (sourceModel && targetModel) {
                      createConnectionBetween(sourceModel.id, targetModel.id, assoc.type, assoc.name, assoc.options);
                    }
                  });
                }
              });
            }, 100);
          }
        }

        console.log('Schema loaded successfully');
      } catch (error) {
        alert('Failed to load schema: ' + error.message);
      }
    };

    reader.readAsText(file);
  };

  input.click();
}

// Helper function to generate unique IDs
function generateId() {
  return `model-${State.nextModelId++}`;
}

function generateConnectionId() {
  return `conn-${State.nextConnectionId++}`;
}

// Zoom and Pan functionality
function updateCanvasTransform() {
  const canvasContent = document.getElementById('canvas-content');
  canvasContent.style.transform = `translate(${State.panX}px, ${State.panY}px) scale(${State.zoom})`;

  // Update zoom display
  document.getElementById('zoom-reset').textContent = `${Math.round(State.zoom * 100)}%`;

  // Update all connection lines
  State.connections.forEach(conn => {
    if (conn.line) {
      conn.line.position();
    }
  });
}

function zoomIn() {
  if (State.zoom < 2) {
    State.zoom = Math.min(2, State.zoom + 0.1);
    updateCanvasTransform();
  }
}

function zoomOut() {
  if (State.zoom > 0.3) {
    State.zoom = Math.max(0.3, State.zoom - 0.1);
    updateCanvasTransform();
  }
}

function zoomReset() {
  State.zoom = 1;
  State.panX = 0;
  State.panY = 0;
  updateCanvasTransform();
}

function setupCanvasPan() {
  const canvas = document.getElementById('canvas');
  let isPanning = false;
  let startX = 0;
  let startY = 0;
  let startPanX = 0;
  let startPanY = 0;

  canvas.addEventListener('mousedown', (e) => {
    // Only pan if clicking on canvas background (not on a model or port)
    if (e.target.id === 'canvas' || e.target.id === 'canvas-content') {
      isPanning = true;
      startX = e.clientX;
      startY = e.clientY;
      startPanX = State.panX;
      startPanY = State.panY;
      canvas.classList.add('panning');
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (isPanning) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      State.panX = startPanX + dx;
      State.panY = startPanY + dy;
      updateCanvasTransform();
    }
  });

  document.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      canvas.classList.remove('panning');
    }
  });
}
