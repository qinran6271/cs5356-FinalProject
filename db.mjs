import mongoose, { Schema } from 'mongoose';
import mongooseSlugPlugin from 'mongoose-slug-plugin';

const DreamSchema = new mongoose.Schema({
    user: {type: String, required: true},
    title: {type: String, required: true},
    date: {type: Date, required: true},
    emotions: {type: String, required: true},
    colorfulness: {type: String, required: true},
    narration: {type: String, required: true}
}); 

const UserSchema = new mongoose.Schema({
    username: {type: String, required: true, unique: true}, 
    password: {type: String},
    name: {type: String, required: true},
    mechanism: {type: String, required: true} // google or password
});

DreamSchema.plugin(mongooseSlugPlugin, {tmpl:'<%=title%>'});

mongoose.model('User', UserSchema);
mongoose.model('Dream', DreamSchema);

// is the environment variable, NODE_ENV, set to PRODUCTION? 
import fs from 'fs';
import path from 'path';
import url from 'url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
let dbconf;

const url = process.env.MONGO_URL;

if (!url) {
  console.error("Missing MONGO_URL env var—cannot start database");
  process.exit(1);
}

mongoose
  .connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

if (process.env.NODE_ENV === 'PRODUCTION') {
    // if we're in PRODUCTION mode, then read the configration from a file
    // use blocking file io to do this...
    const fn = path.join(__dirname, 'config.json');
    const data = fs.readFileSync(fn);

    // our configuration file will be in json, so parse it and set the
    // conenction string appropriately!
    const conf = JSON.parse(data);
    dbconf = conf.dbconf;
} else {
    // if we're not in PRODUCTION mode, then use
    dbconf = 'mongodb://localhost/yw5073';
}

mongoose.connect(dbconf);