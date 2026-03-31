import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import Product from "../src/models/products.model.ts";


export const processLocalProductImage = async (inputFilePath, productId, deleteSource = false) => {
  try {
    try {
      await fs.access(inputFilePath);
    } catch {
      throw new Error(`File not found at path: ${inputFilePath}`);
    }

    // 2. Verify product exists
    const productExists = await Product.exists({ _id: productId });
    if (!productExists) throw new Error(`Product not found with ID: ${productId}`);

    const uploadDir = path.join(process.cwd(), "uploads"); 
    const originalName = path.basename(inputFilePath);
    const timestamp = Date.now();
    const cleanName = originalName.replace(/\s+/g, "-");
    const filename = path.parse(`${timestamp}-${cleanName}`).name;

    const folders = ["large", "low", "placeholder","small", "medium", "webp", "avif"];
    await Promise.all(folders.map(folder => fs.mkdir(path.join(uploadDir, folder), { recursive: true })));

    // 3. Generate Large JPEG
    const largePath = path.join(uploadDir, "large", `${filename}.jpg`);
    await sharp(inputFilePath)
      .flatten({ background: '#F4F4F6' })
      .jpeg({ quality: 80 })
      .toFile(largePath);

    // Update DB with the primary image immediately using modern option
    await Product.findByIdAndUpdate(
      productId,
      { image: { large: `http://localhost:3000/uploads/large/${filename}.jpg` } },
      { returnDocument: 'after' } // ✅ fix warning
    );

    console.log(`✅ Large image saved for product ${productId}`);
    console.log("⏳ Generating optimized variants...");

    // 4. Generate variants
    await Promise.all([
      sharp(inputFilePath).resize(1600).webp({ quality: 80 }).toFile(path.join(uploadDir, "webp", `${filename}.webp`)),
      sharp(inputFilePath).resize(96).webp({ quality: 80 }).toFile(path.join(uploadDir, "placeholder", `${filename}.webp`)),
      sharp(inputFilePath).resize(1600).avif({ quality: 50 }).flatten({ background: "#F4F4F6" }).toFile(path.join(uploadDir, "avif", `${filename}.avif`)),
      sharp(inputFilePath).resize(40).flatten({ background: "#F4F4F6" }).jpeg({ quality: 15 }).blur(8).toFile(path.join(uploadDir, "low", `${filename}.jpg`)),
      sharp(inputFilePath).resize(400).flatten({ background: "#F4F4F6" }).jpeg({ quality: 70 }).toFile(path.join(uploadDir, "small", `${filename}.jpg`)),
      sharp(inputFilePath).resize(800).flatten({ background: "#F4F4F6" }).jpeg({ quality: 75 }).toFile(path.join(uploadDir, "medium", `${filename}.jpg`)),
    ]);

    // 5. Update DB with all variants using modern option
    const finalProduct = await Product.findByIdAndUpdate(
      productId,
      {
        "image.placeholder": `http://localhost:3000/uploads/placeholder/${filename}.webp`,
        "image.low": `http://localhost:3000/uploads/low/${filename}.jpg`,
        "image.small": `http://localhost:3000/uploads/small/${filename}.jpg`,
        "image.medium": `http://localhost:3000/uploads/medium/${filename}.jpg`,
        "image.webp": `http://localhost:3000/uploads/webp/${filename}.webp`,
        "image.avif": `http://localhost:3000/uploads/avif/${filename}.avif`,
      },
      { returnDocument: 'after' } // ✅ fix warning
    );

    // 6. Cleanup source file
    if (deleteSource) {
      await fs.unlink(inputFilePath).catch(err => console.error("Cleanup error:", err));
    }

    console.log(`🎉 All image variants successfully generated for product ${productId}`);
    return finalProduct;

  } catch (error) {
    console.error("❌ Error processing image:", error.message);
    throw error;
  }
};