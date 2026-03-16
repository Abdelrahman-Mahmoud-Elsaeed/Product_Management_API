import mongoose from "mongoose";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

import User from "../src/models/users.model.ts";
import Category from "../src/models/categories.model.ts";
import Product from "../src/models/products.model.ts";
import { con, discon } from "../src/config/db.ts";

// Import your image processing function (adjust the path as needed)
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const seedDatabase = async () => {
  try {
    con();
    
    // 1. Get available images from the directory
    const imagesDir = path.resolve("./data/images");
    const availableImages = await fsPromises.readdir(imagesDir);
    
    // Filter out hidden files like .DS_Store just in case
    const validImages = availableImages.filter(file => !file.startsWith("."));
    
    if (validImages.length === 0) {
      throw new Error("No images found in the ./images directory!");
    }

    // 2. Clear existing data
    await User.deleteMany();
    await Category.deleteMany();
    await Product.deleteMany();
    console.log("🧹 Cleared existing database data");
    await sleep(100); 

    // 3. Insert Users
    const createdUsers = await User.create(users);
    const userIds = createdUsers.map((user) => user._id);
    console.log(`👤 Inserted ${userIds.length} users`);
    await sleep(100);

    // 4. Insert Categories
    const createdCategories = await Category.insertMany(categories);
    const categoryMap = createdCategories.reduce((acc, category) => {
      acc[category.name] = category._id;
      return acc;
    }, {});
    console.log(`📁 Inserted ${createdCategories.length} categories`);
    await sleep(100);

    // 5. Map over products, attach refs, and REMOVE the 'image' key
    const productsWithRefs = products.map((product, index) => {
      const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];

      let nameIndex = Math.floor(index / 20);
      if (nameIndex >= categoryOrder.length) {
        nameIndex = categoryOrder.length - 1;
      }

      const targetCategoryName = categoryOrder[nameIndex];
      const assignedCategoryId = categoryMap[targetCategoryName];

      // Destructure to extract and ignore the "image" key from the JSON
      const { image, ...productWithoutImage } = product;

      return {
        ...productWithoutImage,
        categoryId: assignedCategoryId, 
        createdBy: randomUserId,
      };
    });

    // 6. Insert the finalized Products
    // We capture the result here so we have the newly generated _ids!
    const insertedProducts = await Product.insertMany(productsWithRefs);
    console.log(`📦 Inserted ${insertedProducts.length} products (without images yet)`);

    console.log("🖼️ Starting image processing...");
    
    for (const product of insertedProducts) {
      const randomImageFile = validImages[Math.floor(Math.random() * validImages.length)];
      const imagePath = path.join(imagesDir, randomImageFile);

      await processLocalProductImage(imagePath, product._id, false);
      
      await sleep(100); 
    }

    console.log("🎉 Database seeded and all images processed successfully!");
    discon();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    discon();
    process.exit(1);
  }
};

seedDatabase();