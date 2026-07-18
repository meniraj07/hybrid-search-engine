import { env } from "./config/env.js";
import { createApp } from "./http/app.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});
