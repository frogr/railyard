const Models = {
  create(x, y) {
    const id = State.generateId();
    const model = {
      id: id,
      name: `Model${State.nextModelId}`,
      position: { x, y },
      fields: [],
      validations: [],
      callbacks: []
    };
    State.addModel(model);
    this.render(model);
  },

  createWithData(x, y, data) {
    const id = State.generateId();
    const model = {
      id: id,
      name: data.name || 'Model',
      position: { x, y },
      fields: data.fields || [],
      validations: data.validations || [],
      callbacks: data.callbacks || []
    };
    State.addModel(model);
    this.render(model);
  },

  render(model) {
    const canvasContent = document.getElementById('canvas-content');
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

    canvasContent.appendChild(node);

    this.renderFields(model);
    this.renderValidations(model);
    this.renderCallbacks(model);
    this.setupEventListeners(node, model);
    this.makeDraggable(node, model);
  },

  setupEventListeners(node, model) {
    node.querySelector('.model-name').addEventListener('input', (e) => {
      model.name = e.target.value;
    });

    node.querySelector('.delete-model').addEventListener('click', () => {
      if (confirm(`Delete model "${model.name}"?`)) {
        State.removeModel(model.id);
        node.remove();
      }
    });

    node.querySelector('.add-field').addEventListener('click', () => {
      this.addField(model);
    });

    node.querySelector('.add-validation').addEventListener('click', () => {
      UI.showValidationModal(model);
    });

    node.querySelector('.add-callback').addEventListener('click', () => {
      UI.showCallbackModal(model);
    });

    node.addEventListener('click', (e) => {
      if (!e.target.closest('input, select, button')) {
        this.select(node);
      }
    });
  },

  makeDraggable(element, model) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let rafId = null;
    const header = element.querySelector('.model-header');

    header.onmousedown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
      element.classList.add('dragging');
    };

    const elementDrag = (e) => {
      e.preventDefault();
      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        const newTop = element.offsetTop - pos2;
        const newLeft = element.offsetLeft - pos1;

        element.style.top = newTop + "px";
        element.style.left = newLeft + "px";

        model.position.x = newLeft;
        model.position.y = newTop;

        this.updateConnections(model.id);
      });
    };

    const closeDragElement = () => {
      document.onmouseup = null;
      document.onmousemove = null;
      element.classList.remove('dragging');
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      this.updateConnections(model.id);
    };
  },

  select(node) {
    document.querySelectorAll('.model-node').forEach(n => {
      n.classList.remove('selected');
    });
    node.classList.add('selected');
    State.selectedModel = node.id;
  },

  addField(model) {
    model.fields.push({ name: '', type: 'string', options: {} });
    this.renderFields(model);
  },

  renderFields(model) {
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

      fieldDiv.querySelector('input').addEventListener('input', (e) => {
        field.name = e.target.value;
      });

      fieldDiv.querySelector('select').addEventListener('change', (e) => {
        field.type = e.target.value;
      });

      fieldDiv.querySelector('.delete-field').addEventListener('click', () => {
        model.fields.splice(index, 1);
        this.renderFields(model);
      });

      container.appendChild(fieldDiv);
    });
  },

  renderValidations(model) {
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
        this.renderValidations(model);
      });

      container.appendChild(valDiv);
    });
  },

  renderCallbacks(model) {
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
        this.renderCallbacks(model);
      });

      container.appendChild(cbDiv);
    });
  },

  updateConnections(modelId) {
    const model = State.getModel(modelId);
    if (!model) return;

    State.connections.forEach(conn => {
      if (conn.from === modelId || conn.to === modelId) {
        if (conn.line) conn.line.position();
        if (conn.throughLine) conn.throughLine.position();
      }

      if (conn.options && conn.options.through) {
        const throughModelName = conn.options.through.replace(':', '');
        if (model.name.toLowerCase() === throughModelName.toLowerCase()) {
          if (conn.line) conn.line.position();
          if (conn.throughLine) conn.throughLine.position();
        }
      }
    });
  }
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Delete' && State.selectedModel) {
    const model = State.getModel(State.selectedModel);
    if (model && confirm(`Delete model "${model.name}"?`)) {
      State.removeModel(model.id);
      document.getElementById(model.id).remove();
      State.selectedModel = null;
    }
  }
});
