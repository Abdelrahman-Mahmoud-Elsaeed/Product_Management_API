import mongoose from "mongoose";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

import User from "../src/models/users.model.ts";
import Category from "../src/models/categories.model.ts";
import Product from "../src/models/products.model.ts";
import { con, discon } from "../src/config/db.ts";

// Import your image processing function
import { processLocalProductImage } from "./processLocalProductImage.js"; 

const users = JSON.parse(fs.readFileSync("./data/users.json", "utf-8"));
const categories = JSON.parse(fs.readFileSync("./data/categories.json", "utf-8"));
const products = JSON.parse(fs.readFileSync("./data/products.json", "utf-8"));

const categoryOrder = [
  "Electronics",
  "Apparel & Accessories",
  "Home & Kitchen",
  "Sports & Outdoors",
  "Books & Media"
];

// Sleep function
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const seedDatabase = async () => {
  try {
    await con();

    const imagesDir = path.resolve("./data/images");
    const availableImages = await fsPromises.readdir(imagesDir);
    const validImages = availableImages.filter(file => !file.startsWith("."));

    if (validImages.length === 0) {
      throw new Error("No images found in the ./images directory!");
    }

    await User.deleteMany();
    await Category.deleteMany();
    await Product.deleteMany();
    console.log("🧹 Cleared existing database data (users except admin)");
    await sleep(100);

    // 4️⃣ Insert Users
    const createdUsers = await User.create(users);
    const userIds = createdUsers.map((user) => user._id);
    console.log(`👤 Inserted ${userIds.length} users`);
    await sleep(100);

    // 5️⃣ Insert Categories
    const createdCategories = await Category.insertMany(categories);
    const categoryMap = createdCategories.reduce((acc, category) => {
      acc[category.name] = category._id;
      return acc;
    }, {});
    console.log(`📁 Inserted ${createdCategories.length} categories`);
    await sleep(100);

    // 6️⃣ Map over products, attach refs, and remove 'image' key
    const productsWithRefs = products.map((product, index) => {
      const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
      let nameIndex = Math.floor(index / 20);
      if (nameIndex >= categoryOrder.length) nameIndex = categoryOrder.length - 1;
      const targetCategoryName = categoryOrder[nameIndex];
      const assignedCategoryId = categoryMap[targetCategoryName];

      const { image, ...productWithoutImage } = product;
      return {
        ...productWithoutImage,
        categoryId: assignedCategoryId,
        createdBy: randomUserId,
      };
    });

    // 7️⃣ Insert Products
    const insertedProducts = await Product.insertMany(productsWithRefs);
    console.log(`📦 Inserted ${insertedProducts.length} products (without images yet)`);

    console.log("🖼️ Starting image processing...");

    // 8️⃣ Process images in parallel
    await Promise.all(
      insertedProducts.map(async (product) => {
        const randomImageFile = validImages[Math.floor(Math.random() * validImages.length)];
        const imagePath = path.join(imagesDir, randomImageFile);
        await processLocalProductImage(imagePath, product._id, false); 
        // Make sure inside processLocalProductImage, use:
        // findOneAndUpdate(filter, update, { returnDocument: 'after' })
      })
    );

    console.log("🎉 Database seeded and all images processed successfully!");
    await discon();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    await discon();
    process.exit(1);
  }
};

seedDatabase();