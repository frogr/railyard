const Connections = {
  pendingConnection: null,

  init() {
    this.setupHandlers();
  },

  setupHandlers() {
    const canvas = document.getElementById('canvas');

    canvas.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('port-out')) {
        this.start(e);
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.target.classList.contains('port-in') && this.pendingConnection) {
        this.end(e);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.pendingConnection) {
        this.cancel();
      }
    });
  },

  start(e) {
    e.preventDefault();
    e.stopPropagation();

    const port = e.target;
    const modelNode = port.closest('.model-node');
    if (!modelNode) return;

    this.pendingConnection = {
      fromModelId: modelNode.id,
      fromPort: port
    };

    port.style.background = '#10b981';
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mousemove', this.preventTextSelection, { passive: false });
  },

  preventTextSelection(e) {
    if (Connections.pendingConnection) {
      e.preventDefault();
    }
  },

  end(e) {
    if (!this.pendingConnection) return;

    const port = e.target;
    const modelNode = port.closest('.model-node');

    if (!modelNode) {
      this.cancel();
      return;
    }

    const toModelId = modelNode.id;
    const fromModelId = this.pendingConnection.fromModelId;

    if (fromModelId === toModelId) {
      this.cancel();
      alert('Cannot create association to the same model');
      return;
    }

    const exists = Array.from(State.connections.values()).some(conn =>
      conn.from === fromModelId && conn.to === toModelId
    );

    if (exists) {
      this.cancel();
      alert('Association already exists between these models');
      return;
    }

    UI.showAssociationModal(fromModelId, toModelId);
    this.reset();
  },

  cancel() {
    this.reset();
  },

  reset() {
    if (this.pendingConnection && this.pendingConnection.fromPort) {
      this.pendingConnection.fromPort.style.background = '#3b82f6';
    }
    this.pendingConnection = null;
    document.body.style.cursor = 'default';
    document.removeEventListener('mousemove', this.preventTextSelection);
  },

  create(fromModelId, toModelId, type, name, options = {}) {
    const fromNode = document.getElementById(fromModelId);
    const toNode = document.getElementById(toModelId);
    if (!fromNode || !toNode) return;

    const fromPort = fromNode.querySelector('.port-out');
    const toPort = toNode.querySelector('.port-in');

    const line = new LeaderLine(fromPort, toPort, {
      color: this.getColor(type),
      size: 3,
      path: 'straight',
      dash: this.getDash(type),
      startPlug: this.getStartPlug(type),
      endPlug: this.getEndPlug(type),
      startPlugColor: this.getColor(type),
      endPlugColor: this.getColor(type),
      startPlugSize: 2.5,
      endPlugSize: 3
    });

    const lineElements = document.querySelectorAll('.leader-line');
    lineElements.forEach(el => {
      el.style.pointerEvents = 'none';
    });

    const connection = {
      id: State.generateConnectionId(),
      from: fromModelId,
      to: toModelId,
      type: type,
      name: name,
      options: options,
      line: line
    };

    State.addConnection(connection);
  },

  getColor(type) {
    const colors = {
      belongs_to: '#3b82f6',
      has_many: '#10b981',
      has_one: '#a855f7',
      has_and_belongs_to_many: '#f59e0b'
    };
    return colors[type] || '#64748b';
  },

  getDash(type) {
    const dashes = {
      belongs_to: false,
      has_many: { len: 12, gap: 6 },
      has_one: false,
      has_and_belongs_to_many: { len: 6, gap: 6 }
    };
    return dashes[type] || false;
  },

  getStartPlug(type) {
    return type === 'has_and_belongs_to_many' ? 'arrow3' : 'disc';
  },

  getEndPlug(type) {
    const plugs = {
      belongs_to: 'arrow1',
      has_many: 'arrow3',
      has_one: 'arrow1',
      has_and_belongs_to_many: 'arrow3'
    };
    return plugs[type] || 'arrow1';
  }
};

window.addEventListener('resize', () => {
  State.connections.forEach(conn => {
    if (conn.line) conn.line.position();
  });
});

document.getElementById('canvas').addEventListener('scroll', () => {
  State.connections.forEach(conn => {
    if (conn.line) conn.line.position();
  });
});
