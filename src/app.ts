import express from "express";
import morgan from "morgan";
import { con, discon } from "./config/db.ts";
import { router } from "./routes/routes.ts";
import cors from "cors";
import errorMiddleware from "./middlewares/error.middleware.ts";
import { setupSwagger } from "./swagger/swagger.ts";

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/uploads", express.static("uploads"));

con();

app.use("/api/v1", router);


setupSwagger(app);

app.use(errorMiddleware);

app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

process.on("SIGINT", discon);

export { app };