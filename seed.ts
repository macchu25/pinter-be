import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Category from './models/Category.js';
import Post from './models/Post.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pinter';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Seed Admin
    const adminEmail = 'admin@pinter.com';
    let admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      admin = new User({
        email: adminEmail,
        password: 'adminpassword123',
        name: 'Pinter Admin',
        role: 'admin'
      });
      await admin.save();
      console.log('👤 Admin user created');
    }

    // 2. Seed Categories
    const categoriesData = [
      { name: 'Travel', slug: 'travel', description: 'Explore the world' },
      { name: 'Technology', slug: 'tech', description: 'Latest in tech' },
      { name: 'Lifestyle', slug: 'lifestyle', description: 'Live your best life' },
    ];

    const seededCategories = [];
    for (const cat of categoriesData) {
      let existingCat = await Category.findOne({ slug: cat.slug });
      if (!existingCat) {
        existingCat = await Category.create(cat);
        console.log(`📁 Category created: ${cat.name}`);
      }
      seededCategories.push(existingCat);
    }

    // 3. Seed initial posts (if empty)
    const postCount = await Post.countDocuments();
    if (postCount === 0) {
      await Post.create([
        {
          title: 'Chào mừng bạn đến với Pinter',
          slug: 'welcome-to-pinter',
          excerpt: 'Đây là bài viết đầu tiên trên hệ thống Adsense mới của bạn.',
          content: '# Xin chào!\n\nĐây là nội dung bài viết mẫu. Bạn có thể thay đổi nội dung này trong trang quản trị.',
          category: seededCategories[0]._id,
          author: 'Pinter Admin',
          coverImage: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=2070&auto=format&fit=crop'
        }
      ]);
      console.log('📝 Sample post created');
    }

    console.log('✨ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
