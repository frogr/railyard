// Model node creation and management

function createModel(x, y) {
  const id = generateId();

  const model = {
    id: id,
    name: `Model${State.nextModelId}`,
    position: { x, y },
    fields: [],
    validations: [],
    callbacks: []
  };

  State.addModel(model);
  renderModelNode(model);
}

function createModelWithData(x, y, data) {
  const id = generateId();

  const model = {
    id: id,
    name: data.name || 'Model',
    position: { x, y },
    fields: data.fields || [],
    validations: data.validations || [],
    callbacks: data.callbacks || []
  };

  State.addModel(model);
  renderModelNode(model);
}

function renderModelNode(model) {
  const canvas = document.getElementById('canvas');

  const node = document.createElement('div');
  node.className = 'model-node';
  node.id = model.id;
  node.style.left = `${model.position.x}px`;
  node.style.top = `${model.position.y}px`;

  node.innerHTML = `
    <div class="model-header">
      <input type="text" class="model-name" value="${model.name}" placeholder="ModelName">
      <button class="delete-model">&times;</button>
    </div>
    <div class="model-body">
      <div class="model-fields">
        <div class="section-title">Fields</div>
        <div class="fields-container"></div>
        <button class="add-field">+ Add Field</button>
      </div>
      <div class="model-validations">
        <div class="section-title">Validations</div>
        <div class="validations-container"></div>
        <button class="add-validation">+ Add Validation</button>
      </div>
      <div class="model-callbacks">
        <div class="section-title">Callbacks</div>
        <div class="callbacks-container"></div>
        <button class="add-callback">+ Add Callback</button>
      </div>
    </div>
    <div class="ports">
      <div class="port-out" title="Drag to create association"></div>
      <div class="port-in" title="Association target"></div>
    </div>
  `;

  canvas.appendChild(node);

  // Render existing fields, validations, callbacks
  renderFields(model);
  renderValidations(model);
  renderCallbacks(model);

  // Setup event listeners
  setupNodeEventListeners(node, model);

  // Make draggable
  makeDraggable(node, model);
}

function setupNodeEventListeners(node, model) {
  // Model name change
  const nameInput = node.querySelector('.model-name');
  nameInput.addEventListener('input', (e) => {
    model.name = e.target.value;
  });

  // Delete model
  node.querySelector('.delete-model').addEventListener('click', () => {
    if (confirm(`Delete model "${model.name}"?`)) {
      State.removeModel(model.id);
      node.remove();
    }
  });

  // Add field
  node.querySelector('.add-field').addEventListener('click', () => {
    addField(model);
  });

  // Add validation
  node.querySelector('.add-validation').addEventListener('click', () => {
    showValidationModal(model);
  });

  // Add callback
  node.querySelector('.add-callback').addEventListener('click', () => {
    showCallbackModal(model);
  });

  // Node selection
  node.addEventListener('click', (e) => {
    if (!e.target.closest('input, select, button')) {
      selectNode(node);
    }
  });
}

function makeDraggable(element, model) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  let rafId = null;

  const header = element.querySelector('.model-header');

  header.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    // Don't drag if clicking on input or button
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
      return;
    }

    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;

    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;

    element.classList.add('dragging');
  }

  function elementDrag(e) {
    e.preventDefault();

    // Cancel previous animation frame if it exists
    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    // Use requestAnimationFrame for smooth 60fps updates
    rafId = requestAnimationFrame(() => {
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;

      const newTop = element.offsetTop - pos2;
      const newLeft = element.offsetLeft - pos1;

      element.style.top = newTop + "px";
      element.style.left = newLeft + "px";

      // Update model position
      model.position.x = newLeft;
      model.position.y = newTop;

      // Update connections - this is now batched by RAF
      updateConnectionsForModel(model.id);
    });
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    element.classList.remove('dragging');

    // Final connection update after drag ends
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    updateConnectionsForModel(model.id);
  }
}

function selectNode(node) {
  // Deselect all nodes
  document.querySelectorAll('.model-node').forEach(n => {
    n.classList.remove('selected');
  });

  // Select this node
  node.classList.add('selected');
  State.selectedModel = node.id;
}

function addField(model) {
  const field = {
    name: '',
    type: 'string',
    options: {}
  };

  model.fields.push(field);
  renderFields(model);
}

function renderFields(model) {
  const node = document.getElementById(model.id);
  const container = node.querySelector('.fields-container');
  container.innerHTML = '';

  model.fields.forEach((field, index) => {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'field';

    fieldDiv.innerHTML = `
      <input type="text" placeholder="field_name" value="${field.name || ''}">
      <select>
        <option value="string" ${field.type === 'string' ? 'selected' : ''}>string</option>
        <option value="text" ${field.type === 'text' ? 'selected' : ''}>text</option>
        <option value="integer" ${field.type === 'integer' ? 'selected' : ''}>integer</option>
        <option value="bigint" ${field.type === 'bigint' ? 'selected' : ''}>bigint</option>
        <option value="decimal" ${field.type === 'decimal' ? 'selected' : ''}>decimal</option>
        <option value="float" ${field.type === 'float' ? 'selected' : ''}>float</option>
        <option value="boolean" ${field.type === 'boolean' ? 'selected' : ''}>boolean</option>
        <option value="date" ${field.type === 'date' ? 'selected' : ''}>date</option>
        <option value="datetime" ${field.type === 'datetime' ? 'selected' : ''}>datetime</option>
        <option value="time" ${field.type === 'time' ? 'selected' : ''}>time</option>
        <option value="references" ${field.type === 'references' ? 'selected' : ''}>references</option>
      </select>
      <button class="field-btn delete-field" title="Delete field">&times;</button>
    `;

    // Field name change
    fieldDiv.querySelector('input').addEventListener('input', (e) => {
      field.name = e.target.value;
    });

    // Field type change
    fieldDiv.querySelector('select').addEventListener('change', (e) => {
      field.type = e.target.value;
    });

    // Delete field
    fieldDiv.querySelector('.delete-field').addEventListener('click', () => {
      model.fields.splice(index, 1);
      renderFields(model);
    });

    container.appendChild(fieldDiv);
  });
}

function showValidationModal(model) {
  const modal = document.getElementById('validation-modal');
  const fieldSelect = document.getElementById('val-field');

  // Populate field options
  fieldSelect.innerHTML = model.fields.map(f =>
    `<option value="${f.name}">${f.name || '(unnamed)'}</option>`
  ).join('');

  if (model.fields.length === 0) {
    alert('Add fields first before adding validations');
    return;
  }

  modal.classList.add('active');

  // Create button
  document.getElementById('val-create').onclick = () => {
    const validation = {
      field: fieldSelect.value,
      type: document.getElementById('val-type').value,
      options: {}
    };

    model.validations.push(validation);
    renderValidations(model);
    modal.classList.remove('active');
  };

  // Cancel button
  document.getElementById('val-cancel').onclick = () => {
    modal.classList.remove('active');
  };
}

function renderValidations(model) {
  const node = document.getElementById(model.id);
  const container = node.querySelector('.validations-container');
  container.innerHTML = '';

  model.validations.forEach((validation, index) => {
    const valDiv = document.createElement('div');
    valDiv.className = 'validation-item';

    valDiv.innerHTML = `
      <code>validates :${validation.field}, ${validation.type}: true</code>
      <button class="field-btn delete-field">&times;</button>
    `;

    valDiv.querySelector('.delete-field').addEventListener('click', () => {
      model.validations.splice(index, 1);
      renderValidations(model);
    });

    container.appendChild(valDiv);
  });
}

function showCallbackModal(model) {
  const modal = document.getElementById('callback-modal');

  modal.classList.add('active');

  // Create button
  document.getElementById('callback-create').onclick = () => {
    const callback = {
      type: document.getElementById('callback-type').value,
      method: document.getElementById('callback-method').value || 'callback_method'
    };

    model.callbacks.push(callback);
    renderCallbacks(model);
    modal.classList.remove('active');

    // Clear input
    document.getElementById('callback-method').value = '';
  };

  // Cancel button
  document.getElementById('callback-cancel').onclick = () => {
    modal.classList.remove('active');
  };
}

function renderCallbacks(model) {
  const node = document.getElementById(model.id);
  const container = node.querySelector('.callbacks-container');
  container.innerHTML = '';

  model.callbacks.forEach((callback, index) => {
    const cbDiv = document.createElement('div');
    cbDiv.className = 'callback-item';

    cbDiv.innerHTML = `
      <code>${callback.type} :${callback.method}</code>
      <button class="field-btn delete-field">&times;</button>
    `;

    cbDiv.querySelector('.delete-field').addEventListener('click', () => {
      model.callbacks.splice(index, 1);
      renderCallbacks(model);
    });

    container.appendChild(cbDiv);
  });
}

function updateConnectionsForModel(modelId) {
  State.connections.forEach(conn => {
    if (conn.from === modelId || conn.to === modelId) {
      // Update line position
      if (conn.line) {
        conn.line.position();
      }
    }
  });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Delete key - delete selected model
  if (e.key === 'Delete' && State.selectedModel) {
    const model = State.getModel(State.selectedModel);
    if (model && confirm(`Delete model "${model.name}"?`)) {
      State.removeModel(model.id);
      document.getElementById(model.id).remove();
      State.selectedModel = null;
    }
  }
});
