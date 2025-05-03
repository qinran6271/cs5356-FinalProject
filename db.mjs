import mongoose from "mongoose";
import mongooseSlugPlugin from "mongoose-slug-plugin";
import fs from "fs";
import path from "path";
import url from "url";

const DreamSchema = new mongoose.Schema({
  user:        { type: String, required: true },
  title:       { type: String, required: true },
  date:        { type: Date,   required: true },
  emotions:    { type: String, required: true },
  colorfulness:{ type: String, required: true },
  narration:   { type: String, required: true },
});
DreamSchema.plugin(mongooseSlugPlugin, { tmpl: "<%=title%>" });

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String },
  name:     { type: String, required: true },
  mechanism:{ type: String, required: true },
});

mongoose.model("Dream", DreamSchema);
mongoose.model("User",  UserSchema);

let connectionString;

if (process.env.NODE_ENV === "PRODUCTION") {
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const configPath = path.join(__dirname, "config.json");
  const raw = fs.readFileSync(configPath, "utf8");
  const conf = JSON.parse(raw);
  connectionString = conf.dbconf;
} else if (process.env.MONGO_URL) {
  connectionString = process.env.MONGO_URL;
} else {
  connectionString = "mongodb://localhost:27017/yourLocalDbName";
}

if (!connectionString) {
  console.error("No MongoDB connection string available.");
  process.exit(1);
}

mongoose
  .connect(connectionString, {
    useNewUrlParser:    true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
