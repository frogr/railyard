const Canvas = {
  init() {
    this.setupZoomControls();
    this.setupPan();
    this.setupKeyboardShortcuts();
    this.setupWheelZoom();
  },

  updateTransform() {
    const canvasContent = document.getElementById('canvas-content');
    canvasContent.style.transform = `translate(${State.panX}px, ${State.panY}px) scale(${State.zoom})`;

    document.getElementById('zoom-reset').textContent = `${Math.round(State.zoom * 100)}%`;

    State.connections.forEach(conn => {
      if (conn.line) conn.line.position();
    });
  },

  zoomIn() {
    if (State.zoom < 2) {
      State.zoom = Math.min(2, State.zoom + 0.1);
      this.updateTransform();
    }
  },

  zoomOut() {
    if (State.zoom > 0.3) {
      State.zoom = Math.max(0.3, State.zoom - 0.1);
      this.updateTransform();
    }
  },

  zoomReset() {
    State.zoom = 1;
    State.panX = 0;
    State.panY = 0;
    this.updateTransform();
  },

  setupZoomControls() {
    document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
    document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
    document.getElementById('zoom-reset').addEventListener('click', () => this.zoomReset());
  },

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault();
        this.zoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        this.zoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        this.zoomReset();
      }
    });
  },

  setupWheelZoom() {
    const canvas = document.getElementById('canvas');
    canvas.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          this.zoomIn();
        } else {
          this.zoomOut();
        }
      }
    }, { passive: false });
  },

  setupPan() {
    const canvas = document.getElementById('canvas');
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let startPanX = 0;
    let startPanY = 0;

    canvas.addEventListener('mousedown', (e) => {
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
        this.updateTransform();
      }
    });

    document.addEventListener('mouseup', () => {
      if (isPanning) {
        isPanning = false;
        canvas.classList.remove('panning');
      }
    });
  }
};
