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
    this.connections.forEach(conn => {
      if (conn.line) conn.line.remove();
    });
    this.connections.clear();

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

      this.connections.forEach(conn => {
        if (conn.from === model.id) {
          const targetModel = this.getModel(conn.to);
          if (targetModel) {
            modelData.associations.push({
              type: conn.type,
              name: conn.name,
              target: targetModel.name,
              options: conn.options || {}
            });
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
  },

  generateId() {
    return `model-${this.nextModelId++}`;
  },

  generateConnectionId() {
    return `conn-${this.nextConnectionId++}`;
  }
};
