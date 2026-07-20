import { app } from "./src/app.ts";
import { PORT } from "./src/config/env.ts";

app.get('/', (req, res) => {
  res.status(200).send('OK');
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const HOST: string = '0.0.0.0';
const portNumber: number = Number(PORT) || 3000;

app.listen(portNumber, HOST, () => {
  console.log(`Server listening at http://${HOST}:${portNumber}`);
});