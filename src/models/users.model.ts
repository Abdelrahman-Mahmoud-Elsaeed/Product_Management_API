import mongoose, { Schema, Types } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
      maxlength: 30,
      uppercase: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/,
    },

    age: {
      type: Number,
      min: 18,
      max: 100,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
    },

    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", function () {
  if (this.name === "ADMIN") {
    this.name = "SUPERADMIN";
  }
});

userSchema.post("save", function (doc) {
  console.log(`${doc.name} saved successfully`);
});

const User = mongoose.model("Users", userSchema);

export default User;
