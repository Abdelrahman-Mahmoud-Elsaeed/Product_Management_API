import {app} from "./src/app.ts";
import {PORT} from "./src/config/env.ts";


app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});