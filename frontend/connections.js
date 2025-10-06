// Connection/Association management using LeaderLine

let pendingConnection = null;

// Initialize connection handlers after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  setupConnectionHandlers();
});

function setupConnectionHandlers() {
  // We'll set up handlers on the canvas using event delegation
  const canvas = document.getElementById('canvas');

  canvas.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('port-out')) {
      startConnection(e);
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.target.classList.contains('port-in') && pendingConnection) {
      endConnection(e);
    }
  });

  // Cancel connection on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pendingConnection) {
      cancelConnection();
    }
  });
}

function startConnection(e) {
  e.preventDefault();
  e.stopPropagation();

  const port = e.target;
  const modelNode = port.closest('.model-node');

  if (!modelNode) return;

  pendingConnection = {
    fromModelId: modelNode.id,
    fromPort: port
  };

  // Visual feedback
  port.style.background = '#10b981';
  document.body.style.cursor = 'crosshair';

  // Add a global mousemove listener to update cursor
  document.addEventListener('mousemove', preventTextSelection, { passive: false });
}

function preventTextSelection(e) {
  if (pendingConnection) {
    e.preventDefault();
  }
}

function endConnection(e) {
  if (!pendingConnection) return;

  const port = e.target;
  const modelNode = port.closest('.model-node');

  if (!modelNode) {
    cancelConnection();
    return;
  }

  const toModelId = modelNode.id;
  const fromModelId = pendingConnection.fromModelId;

  // Can't connect to self
  if (fromModelId === toModelId) {
    cancelConnection();
    alert('Cannot create association to the same model');
    return;
  }

  // Check if connection already exists
  const exists = Array.from(State.connections.values()).some(conn =>
    conn.from === fromModelId && conn.to === toModelId
  );

  if (exists) {
    cancelConnection();
    alert('Association already exists between these models');
    return;
  }

  // Show association modal
  showAssociationModal(fromModelId, toModelId);

  // Reset pending connection
  resetConnectionState();
}

function cancelConnection() {
  resetConnectionState();
}

function resetConnectionState() {
  if (pendingConnection && pendingConnection.fromPort) {
    pendingConnection.fromPort.style.background = '#3b82f6';
  }
  pendingConnection = null;
  document.body.style.cursor = 'default';

  // Remove the mousemove listener
  document.removeEventListener('mousemove', preventTextSelection);
}

function showAssociationModal(fromModelId, toModelId) {
  const modal = document.getElementById('association-modal');
  const fromModel = State.getModel(fromModelId);
  const toModel = State.getModel(toModelId);

  if (!fromModel || !toModel) return;

  // Set default association name based on type
  const typeSelect = document.getElementById('assoc-type');
  const nameInput = document.getElementById('assoc-name');

  // Auto-generate association name
  const updateAssociationName = () => {
    const type = typeSelect.value;
    if (type === 'belongs_to' || type === 'has_one') {
      nameInput.value = toModel.name.toLowerCase();
    } else {
      // Pluralize for has_many and HABTM
      nameInput.value = toModel.name.toLowerCase() + 's';
    }
  };

  typeSelect.addEventListener('change', updateAssociationName);
  updateAssociationName();

  modal.classList.add('active');

  // Create button
  const createBtn = document.getElementById('assoc-create');
  createBtn.onclick = () => {
    const type = typeSelect.value;
    const name = nameInput.value;
    const options = {};

    // Get options
    if (document.getElementById('assoc-optional').checked) {
      options.optional = true;
    }

    if (document.getElementById('assoc-dependent').checked) {
      options.dependent = ':destroy';
    }

    createConnectionBetween(fromModelId, toModelId, type, name, options);

    modal.classList.remove('active');

    // Reset checkboxes
    document.getElementById('assoc-optional').checked = false;
    document.getElementById('assoc-dependent').checked = false;
  };

  // Cancel button
  document.getElementById('assoc-cancel').onclick = () => {
    modal.classList.remove('active');
  };
}

function createConnectionBetween(fromModelId, toModelId, type, name, options = {}) {
  const fromNode = document.getElementById(fromModelId);
  const toNode = document.getElementById(toModelId);

  if (!fromNode || !toNode) return;

  const fromPort = fromNode.querySelector('.port-out');
  const toPort = toNode.querySelector('.port-in');

  // Create LeaderLine
  const line = new LeaderLine(
    fromPort,
    toPort,
    {
      color: getColorForAssociationType(type),
      size: 3,
      path: 'straight',
      dash: getDashForAssociationType(type),
      startPlug: getStartPlugForAssociationType(type),
      endPlug: getPlugForAssociationType(type),
      startPlugColor: getColorForAssociationType(type),
      endPlugColor: getColorForAssociationType(type),
      startPlugSize: 2.5,
      endPlugSize: 3
    }
  );

  // Fix drag issue: Prevent LeaderLine from blocking mouse events
  const lineElements = document.querySelectorAll('.leader-line');
  lineElements.forEach(el => {
    el.style.pointerEvents = 'none';
  });

  // Create connection object
  const connection = {
    id: generateConnectionId(),
    from: fromModelId,
    to: toModelId,
    type: type,
    name: name,
    options: options,
    line: line
  };

  State.addConnection(connection);

  console.log('Created association:', connection);
}

function getColorForAssociationType(type) {
  switch (type) {
    case 'belongs_to':
      return '#3b82f6'; // Blue - single relationship
    case 'has_many':
      return '#10b981'; // Green - many relationship
    case 'has_one':
      return '#a855f7'; // Purple - single relationship
    case 'has_and_belongs_to_many':
      return '#f59e0b'; // Orange - many-to-many
    default:
      return '#64748b';
  }
}

function getDashForAssociationType(type) {
  switch (type) {
    case 'belongs_to':
      return false; // Solid - belongs to one
    case 'has_many':
      return { len: 12, gap: 6 }; // Dashed - has multiple
    case 'has_one':
      return false; // Solid - has one
    case 'has_and_belongs_to_many':
      return { len: 6, gap: 6 }; // Short dash - many-to-many
    default:
      return false;
  }
}

function getStartPlugForAssociationType(type) {
  switch (type) {
    case 'belongs_to':
      return 'disc'; // Circle - originating side
    case 'has_many':
      return 'disc'; // Circle - has many from this side
    case 'has_one':
      return 'disc'; // Circle - has one from this side
    case 'has_and_belongs_to_many':
      return 'arrow3'; // Arrow both ends for many-to-many
    default:
      return 'disc';
  }
}

function getPlugForAssociationType(type) {
  switch (type) {
    case 'belongs_to':
      return 'arrow1'; // Single arrow - points to one
    case 'has_many':
      return 'arrow3'; // Crow's foot - points to many
    case 'has_one':
      return 'arrow1'; // Single arrow - points to one
    case 'has_and_belongs_to_many':
      return 'arrow3'; // Crow's foot - many on both ends
    default:
      return 'arrow1';
  }
}

// Handle window resize to reposition lines
window.addEventListener('resize', () => {
  State.connections.forEach(conn => {
    if (conn.line) {
      conn.line.position();
    }
  });
});

// Handle canvas scroll to reposition lines
document.getElementById('canvas').addEventListener('scroll', () => {
  State.connections.forEach(conn => {
    if (conn.line) {
      conn.line.position();
    }
  });
});
