import express from "express";
import { userRouter } from "./user.routes.ts";
import { authRouter } from "./auth.routers.ts";
import { categoryRouter } from "./category.routes.ts";
import { productRouter } from "./product.routes.ts";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/categories", categoryRouter);
router.use("/products", productRouter);



export { router };
