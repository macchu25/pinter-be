import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Post from './models/Post.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pinter';
const OLD_URL = 'http://localhost:5001';
const NEW_URL = 'https://pinter-be.vercel.app'; // URL Backend của bạn trên Vercel

async function fixUrls() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected');

    const posts = await Post.find({ coverImage: { $regex: OLD_URL } });
    console.log(`Found ${posts.length} posts with localhost URLs.`);

    for (const post of posts) {
      if (post.coverImage) {
        post.coverImage = post.coverImage.replace(OLD_URL, NEW_URL);
        await post.save();
        console.log(`Updated post: ${post.title}`);
      }
    }

    console.log('✅ All URLs updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixUrls();
