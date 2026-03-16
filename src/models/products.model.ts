import mongoose, { Schema, Types } from "mongoose";

const imageSchema = new Schema({
  placeholder: { type: String, default: "" },
  low: { type: String, default: "" },
  small: { type: String, default: "" },
  medium: { type: String, default: "" },
  large: { type: String, default: "" },
  webp: { type: String, default: "" },
  avif: { type: String, default: "" },
});

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, min: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviews: { type: Number, default: 0 },
    discount: { type: String, default: "" },
    image: { type: imageSchema, default: {} },
    categoryId: { type: Types.ObjectId, ref: "Category", required: true },
    createdBy: { type: Types.ObjectId, ref: "Users", required: true },
    stock :{ type: Number, default: 0 }
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;