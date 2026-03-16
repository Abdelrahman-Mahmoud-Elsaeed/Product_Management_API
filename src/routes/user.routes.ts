import express from "express";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateUsersDynamic,
  deleteUser,
  deleteUsersDynamic,
  getUserStats,
} from "../controllers/user.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";
import { permit } from "../middlewares/role.middleware.ts";
import {
  bulkUserDeleteValidator,
  bulkUserFilterUpdateValidator,
  createUserValidator,
  updateUserValidator,
  validateUserIdParam,
} from "../validators/userValidator.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const userRouter = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: User management endpoints
 */

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               age:
 *                 type: number
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 */

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /users/stats:
 *   get:
 *     summary: Get user statistics (Admin only)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics
 */

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get a single user by ID
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: 641f8f4a2c3b2a1f4c123456
 *     responses:
 *       200:
 *         description: User object
 *       404:
 *         description: User not found
 */

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Update a user by ID
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               age:
 *                 type: number
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated user object
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 */

/**
 * @openapi
 * /users/bulk-update:
 *   patch:
 *     summary: Bulk update users (Admin only)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filter:
 *                 type: object
 *               update:
 *                 type: object
 *     responses:
 *       200:
 *         description: Users updated successfully
 *       400:
 *         description: Validation error
 */

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete a user by ID (Admin only)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */

/**
 * @openapi
 * /users/bulk-delete:
 *   delete:
 *     summary: Bulk delete users (Admin only)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Users deleted successfully
 *       400:
 *         description: Validation error
 */
userRouter.post("/", createUserValidator, asyncHandler(createUser));
userRouter.get("/", auth, permit("admin"), asyncHandler(getUsers));
userRouter.get("/stats", auth, permit("admin"), asyncHandler(getUserStats));
userRouter.get("/:id", auth, validateUserIdParam, asyncHandler(getUserById));
userRouter.put("/:id", auth, validateUserIdParam, updateUserValidator, asyncHandler(updateUser));
userRouter.patch("/bulk-update", auth, permit("admin"), bulkUserFilterUpdateValidator, asyncHandler(updateUsersDynamic));
userRouter.delete("/:id", auth, permit("admin"), validateUserIdParam, asyncHandler(deleteUser));
userRouter.delete("/bulk-delete", auth, permit("admin"), bulkUserDeleteValidator, asyncHandler(deleteUsersDynamic));

export { userRouter };