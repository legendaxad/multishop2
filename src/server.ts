import dotenv from "dotenv";
import app from "./app";
import mongoose from "mongoose";

dotenv.config();

mongoose.set("strictQuery", false);
mongoose
  .connect(process.env.MONGO_URL as string)
  .then(() => {
    console.log("Connected to MongoDB");
    const PORT = process.env.PORT || 3000;
    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port http://localhost:${PORT}`);
      console.info(`Admin project on http://localhost:${PORT}/admin \n`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });
