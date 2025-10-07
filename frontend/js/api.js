const API = {
  async generateRailsApp(schema) {
    const response = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schema)
    });
    return await response.json();
  },

  async getApps() {
    const response = await fetch('/apps');
    return await response.json();
  },

  async healthCheck() {
    const response = await fetch('/health');
    return await response.json();
  }
};
