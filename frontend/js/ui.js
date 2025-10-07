const UI = {
  init() {
    this.setupToolbar();
    this.setupModals();
  },

  setupToolbar() {
    document.getElementById('add-model').addEventListener('click', () => {
      Models.create(100 + State.nextModelId * 50, 100 + State.nextModelId * 30);
    });

    document.getElementById('clear-canvas').addEventListener('click', () => {
      if (confirm('Clear all models and connections?')) {
        State.clear();
      }
    });

    document.getElementById('export').addEventListener('click', () => this.generateRailsApp());
    document.getElementById('save-schema').addEventListener('click', () => this.saveSchema());
    document.getElementById('load-schema').addEventListener('click', () => this.loadSchema());
  },

  setupModals() {
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.remove('active');
      });
    });

    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });
  },

  async generateRailsApp() {
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
    const exportBtn = document.getElementById('export');
    const originalText = exportBtn.textContent;

    exportBtn.textContent = 'Generating...';
    exportBtn.disabled = true;

    try {
      const result = await API.generateRailsApp(schema);
      this.showResultModal(result);
    } catch (error) {
      this.showResultModal({
        success: false,
        error: 'Failed to connect to server',
        log: error.toString()
      });
    } finally {
      exportBtn.textContent = originalText;
      exportBtn.disabled = false;
    }
  },

  showResultModal(result) {
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

    document.getElementById('result-close').onclick = () => {
      modal.classList.remove('active');
    };
  },

  saveSchema() {
    const schema = State.exportToJSON();
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
  },

  loadSchema() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          State.clear();

          if (data.schema) {
            document.getElementById('app-name').value = data.schema.app_name || 'my_rails_app';
            document.getElementById('rails-version').value = data.schema.rails_version || '7.1';
            document.getElementById('database').value = data.schema.database || 'postgresql';
            document.getElementById('api-only').checked = data.schema.api_only || false;

            if (data.schema.models) {
              data.schema.models.forEach((modelData, index) => {
                let x = 100 + index * 50;
                let y = 100 + index * 30;

                if (data.positions) {
                  const savedPos = Object.values(data.positions).find(pos => pos.name === modelData.name);
                  if (savedPos) {
                    x = savedPos.x;
                    y = savedPos.y;
                  }
                }

                Models.createWithData(x, y, modelData);
              });

              setTimeout(() => {
                data.schema.models.forEach(modelData => {
                  if (modelData.associations) {
                    modelData.associations.forEach(assoc => {
                      const sourceModel = Array.from(State.models.values()).find(m => m.name === modelData.name);
                      const targetModel = Array.from(State.models.values()).find(m => m.name === assoc.target);

                      if (sourceModel && targetModel) {
                        Connections.create(sourceModel.id, targetModel.id, assoc.type, assoc.name, assoc.options);
                      }
                    });
                  }
                });
              }, 100);
            }
          }
        } catch (error) {
          alert('Failed to load schema: ' + error.message);
        }
      };

      reader.readAsText(file);
    };

    input.click();
  },

  showValidationModal(model) {
    const modal = document.getElementById('validation-modal');
    const fieldSelect = document.getElementById('val-field');

    fieldSelect.innerHTML = model.fields.map(f =>
      `<option value="${f.name}">${f.name || '(unnamed)'}</option>`
    ).join('');

    if (model.fields.length === 0) {
      alert('Add fields first before adding validations');
      return;
    }

    modal.classList.add('active');

    document.getElementById('val-create').onclick = () => {
      model.validations.push({
        field: fieldSelect.value,
        type: document.getElementById('val-type').value,
        options: {}
      });

      Models.renderValidations(model);
      modal.classList.remove('active');
    };

    document.getElementById('val-cancel').onclick = () => {
      modal.classList.remove('active');
    };
  },

  showCallbackModal(model) {
    const modal = document.getElementById('callback-modal');
    modal.classList.add('active');

    document.getElementById('callback-create').onclick = () => {
      model.callbacks.push({
        type: document.getElementById('callback-type').value,
        method: document.getElementById('callback-method').value || 'callback_method'
      });

      Models.renderCallbacks(model);
      modal.classList.remove('active');
      document.getElementById('callback-method').value = '';
    };

    document.getElementById('callback-cancel').onclick = () => {
      modal.classList.remove('active');
    };
  },

  showAssociationModal(fromModelId, toModelId) {
    const modal = document.getElementById('association-modal');
    const fromModel = State.getModel(fromModelId);
    const toModel = State.getModel(toModelId);

    if (!fromModel || !toModel) return;

    const typeSelect = document.getElementById('assoc-type');
    const nameInput = document.getElementById('assoc-name');
    const throughSelect = document.getElementById('assoc-through');

    if (!typeSelect || !nameInput || !throughSelect) {
      console.error('Modal elements not found');
      return;
    }

    const populateThroughDropdown = () => {
      throughSelect.innerHTML = '<option value="">None</option>';
      State.models.forEach(model => {
        if (model.id !== fromModelId && model.id !== toModelId) {
          throughSelect.innerHTML += `<option value="${model.name.toLowerCase()}">${model.name}</option>`;
        }
      });
    };

    const updateUIBasedOnType = () => {
      const type = typeSelect.value;

      if (type === 'belongs_to' || type === 'has_one') {
        nameInput.value = toModel.name.toLowerCase();
      } else {
        nameInput.value = toModel.name.toLowerCase() + 's';
      }

      const throughGroup = document.getElementById('through-group');
      const polymorphicLabel = document.getElementById('polymorphic-label');
      const optionalLabel = document.getElementById('optional-label');
      const dependentLabel = document.getElementById('dependent-label');

      if (throughGroup) {
        throughGroup.style.display = (type === 'has_many' || type === 'has_one') ? 'block' : 'none';
      }

      if (polymorphicLabel) {
        polymorphicLabel.style.display = type === 'belongs_to' ? 'flex' : 'none';
      }

      if (optionalLabel) {
        optionalLabel.style.display = type === 'belongs_to' ? 'flex' : 'none';
      }

      if (dependentLabel) {
        dependentLabel.style.display = (type === 'has_many' || type === 'has_one') ? 'flex' : 'none';
      }
    };

    populateThroughDropdown();

    typeSelect.onchange = updateUIBasedOnType;
    updateUIBasedOnType();

    modal.classList.add('active');

    document.getElementById('assoc-create').onclick = () => {
      const type = typeSelect.value;
      const name = nameInput.value;
      const options = {};

      if (document.getElementById('assoc-optional').checked) {
        options.optional = true;
      }

      if (document.getElementById('assoc-dependent').checked) {
        options.dependent = ':destroy';
      }

      if (document.getElementById('assoc-polymorphic').checked) {
        options.polymorphic = true;
      }

      const throughModel = throughSelect.value;
      if (throughModel) {
        options.through = ':' + throughModel;
      }

      Connections.create(fromModelId, toModelId, type, name, options);
      modal.classList.remove('active');

      document.getElementById('assoc-optional').checked = false;
      document.getElementById('assoc-dependent').checked = false;
      document.getElementById('assoc-polymorphic').checked = false;
      throughSelect.value = '';
    };

    document.getElementById('assoc-cancel').onclick = () => {
      modal.classList.remove('active');
    };
  }
};
