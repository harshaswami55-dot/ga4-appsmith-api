import { config } from "./config";
import { createApp } from "./app";

const app = createApp();

if (require.main === module) {
  app.listen(config.port, "0.0.0.0", () => console.log(`Sumlink Analytics API listening on port ${config.port}`));
}

export default app;

