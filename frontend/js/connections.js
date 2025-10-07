const Connections = {
  pendingConnection: null,
  tempLine: null,

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
      } else if (this.pendingConnection) {
        this.cancel();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.pendingConnection) {
        this.cancel();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.pendingConnection && this.tempLine) {
        this.updateTempLine(e);
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

    console.log('Starting connection from', modelNode.id);
    this.createTempLine(port, e);
    document.addEventListener('mousemove', this.preventTextSelection, { passive: false });
  },

  createTempLine(fromPort, mouseEvent) {
    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();

    const mouseTarget = document.createElement('div');
    mouseTarget.style.position = 'absolute';
    mouseTarget.style.width = '10px';
    mouseTarget.style.height = '10px';
    mouseTarget.style.pointerEvents = 'none';
    mouseTarget.style.zIndex = '1000';
    mouseTarget.style.left = (mouseEvent.clientX - canvasRect.left + canvas.scrollLeft) + 'px';
    mouseTarget.style.top = (mouseEvent.clientY - canvasRect.top + canvas.scrollTop) + 'px';

    const canvasContent = document.getElementById('canvas-content');
    canvasContent.appendChild(mouseTarget);

    this.pendingConnection.mouseTarget = mouseTarget;
    this.pendingConnection.canvasRect = canvasRect;
    this.pendingConnection.canvas = canvas;

    requestAnimationFrame(() => {
      try {
        this.tempLine = new LeaderLine(
          fromPort,
          mouseTarget,
          {
            color: '#64748b',
            size: 3,
            path: 'straight',
            dash: { len: 8, gap: 4 },
            startPlug: 'disc',
            endPlug: 'disc',
            startPlugSize: 2.5,
            endPlugSize: 2.5
          }
        );

        console.log('Temp line created:', this.tempLine);

        if (this.tempLine) {
          this.tempLine.position();
          const lineElements = document.querySelectorAll('.leader-line');
          lineElements.forEach(el => {
            el.style.pointerEvents = 'none';
          });
        }
      } catch (error) {
        console.error('Error creating temp line:', error);
      }
    });
  },

  updateTempLine(e) {
    if (this.pendingConnection && this.pendingConnection.mouseTarget) {
      const canvas = this.pendingConnection.canvas;
      const canvasRect = canvas.getBoundingClientRect();
      const x = e.clientX - canvasRect.left + canvas.scrollLeft;
      const y = e.clientY - canvasRect.top + canvas.scrollTop;

      this.pendingConnection.mouseTarget.style.left = x + 'px';
      this.pendingConnection.mouseTarget.style.top = y + 'px';

      if (this.tempLine) {
        this.tempLine.position();
      }
    }
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

    if (this.tempLine) {
      this.tempLine.remove();
      this.tempLine = null;
    }

    if (this.pendingConnection && this.pendingConnection.mouseTarget) {
      this.pendingConnection.mouseTarget.remove();
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

    let line, throughLine = null;

    if (options.through) {
      const throughModelName = options.through.replace(':', '');
      const throughModel = Array.from(State.models.values()).find(
        m => m.name.toLowerCase() === throughModelName.toLowerCase()
      );

      if (throughModel) {
        const throughNode = document.getElementById(throughModel.id);
        if (throughNode) {
          const throughPortIn = throughNode.querySelector('.port-in');
          const throughPortOut = throughNode.querySelector('.port-out');

          throughLine = new LeaderLine(fromPort, throughPortIn, {
            color: this.getColor(type),
            size: 3,
            path: 'straight',
            dash: { len: 6, gap: 3 },
            startPlug: this.getStartPlug(type),
            endPlug: 'disc',
            startPlugColor: this.getColor(type),
            endPlugColor: this.getColor(type),
            startPlugSize: 2.5,
            endPlugSize: 3
          });

          line = new LeaderLine(throughPortOut, toPort, {
            color: this.getColor(type),
            size: 3,
            path: 'straight',
            dash: { len: 6, gap: 3 },
            startPlug: 'disc',
            endPlug: this.getEndPlug(type),
            startPlugColor: this.getColor(type),
            endPlugColor: this.getColor(type),
            startPlugSize: 2.5,
            endPlugSize: 3
          });
        }
      }
    }

    if (!line) {
      line = new LeaderLine(fromPort, toPort, {
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
    }

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
      line: line,
      throughLine: throughLine
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
    if (conn.throughLine) conn.throughLine.position();
  });
});

document.getElementById('canvas').addEventListener('scroll', () => {
  State.connections.forEach(conn => {
    if (conn.line) conn.line.position();
    if (conn.throughLine) conn.throughLine.position();
  });
});
