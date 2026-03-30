import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dbConnect from './lib/mongodb.js';
import Post from './models/Post.js';
import Category from './models/Category.js';
import User from './models/User.js';
import { authMiddleware, AuthRequest } from './middleware/auth.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Ensure uploads directory exists
import fs from 'fs';
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Cloudinary Config (Bạn hãy lấy Cloud Name, API Key, API Secret từ Dashboard Cloudinary của bạn)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'pinter-cloud',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'pinter_uploads',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
  } as any,
});

const upload = multer({ storage });

// Database Connection
dbConnect();

// API Routes
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().populate('category').sort({ publishedAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/posts/:slug', async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug }).populate('category');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/categories/:slug/posts', async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const posts = await Post.find({ category: category._id }).populate('category').sort({ publishedAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const user = new User({ email, password, name });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await (user as any).comparePassword(password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Social Login Sync
app.post('/api/auth/social-login', async (req, res) => {
  try {
    const { email, name } = req.body;
    let user = await User.findOne({ email });

    if (!user) {
      // Create a guest user if they don't exist
      user = new User({
        email,
        name,
        password: Math.random().toString(36).slice(-10), // Random password
        role: 'user'
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Social Sync Failed' });
  }
});

// Upload Route
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // multer-storage-cloudinary trả về link ảnh tại req.file.path
  res.json({ imageUrl: (req.file as any).path });
});

// Post creation (Protected)
app.post('/api/posts', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, slug, excerpt, content, coverImage, category } = req.body;

    // Check if slug exists
    const existingPost = await Post.findOne({ slug });
    if (existingPost) return res.status(400).json({ error: 'Slug already exists' });

    const newPost = new Post({
      title,
      slug,
      excerpt,
      content,
      coverImage,
      category,
      author: req.user.name || 'Admin'
    });

    console.log(`Creating post with title: ${title} and category ID: ${category}`);
    await newPost.save();
    console.log(`✅ Post saved successfully with ID: ${newPost._id}`);
    res.status(201).json(newPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('SERVER ERROR:', err.stack || err.message || err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

export default app;
