export default {
  async run(query, attempts = 5) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const result = await query.run();
        if (result && typeof result === "object") return result;
        throw new Error("The analytics server is still waking up");
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          if (attempt === 1) showAlert("Analytics is waking up. This can take about a minute.", "info");
          await new Promise((resolve) => setTimeout(resolve, 15000));
        }
      }
    }
    showAlert("Analytics could not be loaded. Please try Refresh.", "error");
    throw lastError;
  },
};

