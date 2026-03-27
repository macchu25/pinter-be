import { Schema, model } from 'mongoose';

const PostSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  excerpt: { type: String, required: true },
  content: { type: String, required: true },
  coverImage: { type: String },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  tags: [{ type: String }],
  author: { type: String, default: 'Admin' },
  publishedAt: { type: Date, default: Date.now },
  isFeatured: { type: Boolean, default: false },
}, { timestamps: true });

const Post = model('Post', PostSchema);

export default Post;
