const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 添加在路由文件顶部
const requestLogger = (req, res, next) => {
    console.log('\n===== 收到请求 =====');
    console.log('方法:', req.method);
    console.log('路径:', req.path);
    console.log('查询参数:', req.query);
    console.log('请求头:', req.headers);
    console.log('请求体:', req.body);
    console.log('文件:', req.file);
    next();
};

// 配置文件上传
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // 使用绝对路径
        const uploadDir = path.join(__dirname, '../../client/uploads/posts');
        // 确保目录存在
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        console.log('上传目录:', uploadDir);
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        // 生成安全的文件名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `${uniqueSuffix}${ext}`;
        console.log('生成的文件名:', filename);
        cb(null, filename);
    }
});

// 创建 multer 实例
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: function(req, file, cb) {
        // 检查文件类型
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('只支持上传图片文件(jpeg, jpg, png, gif)！'));
    }
});

// 搜索帖子
router.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.q;
        if (!searchTerm) {
            return res.status(400).json({ message: '请提供搜索关键词' });
        }

        // 创建搜索条件，同时搜索标题和内容
        const searchRegex = new RegExp(searchTerm, 'i'); // 'i' 表示不区分大小写
        const posts = await Post.find({
            $or: [
                { title: searchRegex },
                { content: searchRegex }
            ]
        })
        .populate('author', 'username avatar')
        .populate({
            path: 'comments',
            populate: { path: 'author', select: 'username avatar' }
        })
        .sort({ createdAt: -1 });

        res.json(posts);
    } catch (error) {
        console.error('搜索出错:', error);
        res.status(500).json({ message: '搜索失败' });
    }
});

// 获取所有帖子
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find()
            .populate('author', 'username avatar')
            .populate({
                path: 'comments',
                populate: { path: 'author', select: 'username avatar' }
            })
            .sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

// 创建新帖子
router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        console.log('创建帖子请求体:', req.body);
        const { title, content, category } = req.body;
        
        // 处理标签数组
        let tags = [];
        if (req.body.tags) {
            // 如果是字符串，先按逗号分割
            if (typeof req.body.tags === 'string') {
                tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            }
            // 如果是数组
            else if (Array.isArray(req.body.tags)) {
                tags = req.body.tags.map(tag => tag.trim()).filter(tag => tag);
            }
            // 如果是 tags[]
            else if (req.body['tags[]']) {
                const tagsArray = Array.isArray(req.body['tags[]']) ? 
                    req.body['tags[]'] : [req.body['tags[]']];
                tags = tagsArray.map(tag => tag.trim()).filter(tag => tag);
            }
        }

        console.log('处理后的标签:', tags);

        const postData = {
            title,
            content,
            category,
            tags,
            author: req.user.id
        };

        if (req.file) {
            postData.image = `/uploads/posts/${req.file.filename}`;
        }

        const post = new Post(postData);
        await post.save();

        console.log('保存的帖子数据:', post);

        const populatedPost = await Post.findById(post._id)
            .populate('author', 'username avatar');

        res.status(201).json(populatedPost);
    } catch (error) {
        console.error('创建帖子错误:', error);
        res.status(500).json({ 
            message: '服务器错误',
            error: error.message 
        });
    }
});

// 获取帖子的评论
router.get('/:postId/comments', async (req, res) => {
    try {
        const postId = req.params.postId;
        
        // 验证帖子ID格式
        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ message: '无效的帖子ID' });
        }

        // 查找帖子及其评论
        const post = await Post.findById(postId)
            .populate({
                path: 'comments',
                populate: { 
                    path: 'author',
                    select: 'username avatar'
                }
            });

        if (!post) {
            return res.status(404).json({ message: '帖子不存在' });
        }

        res.json(post.comments);
    } catch (error) {
        console.error('获取评论失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 添加评论
router.post('/:postId/comments', auth, async (req, res) => {
    try {
        const { content } = req.body;
        const postId = req.params.postId;

        // 验证帖子ID格式
        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ message: '无效的帖子ID' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: '帖子不存在' });
        }

        const comment = new Comment({
            content,
            author: req.user.id,
            post: postId
        });

        await comment.save();
        
        // 将评论ID添加到帖子的comments数组中
        post.comments.push(comment._id);
        await post.save();

        // 返回包含作者信息的评论
        const populatedComment = await Comment.findById(comment._id)
            .populate('author', 'username avatar');

        res.status(201).json(populatedComment);
    } catch (error) {
        console.error('添加评论失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 删除帖子
router.delete('/:postId', auth, async (req, res) => {
    try {
        console.log('开始删除帖子:', req.params.postId);
        
        const post = await Post.findById(req.params.postId);
        
        if (!post) {
            console.log('帖子不存在');
            return res.status(404).json({ message: '帖子不存在' });
        }
        
        // 验证是否是帖子作者
        console.log('验证作者权限 - 帖子作者:', post.author.toString(), '当前用户:', req.user.id);
        if (post.author.toString() !== req.user.id) {
            console.log('权限验证失败');
            return res.status(403).json({ message: '无权限删除此帖子' });
        }

        // 删除帖子相关的评论
        console.log('删除帖子相关的评论');
        const deleteCommentsResult = await Comment.deleteMany({ post: req.params.postId });
        console.log('删除评论结果:', deleteCommentsResult);
        
        // 如果帖子有图片，删除图片文件
        if (post.image) {
            console.log('准备删除帖子图片');
            const imagePath = path.join(__dirname, '../../client', post.image);
            console.log('图片路径:', imagePath);
            
            try {
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                    console.log('成功删除图片文件');
                } else {
                    console.log('图片文件不存在');
                }
            } catch (error) {
                console.error('删除图片文件失败:', error);
                // 继续执行，即使图片删除失败
            }
        }
        
        // 删除帖子
        console.log('删除帖子文档');
        const deleteResult = await Post.findByIdAndDelete(req.params.postId);
        console.log('删除帖子结果:', deleteResult);
        
        res.json({ message: '帖子删除成功' });
    } catch (error) {
        console.error('删除帖子失败:', error);
        res.status(500).json({ 
            message: '删除帖子失败',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// 更新帖子
router.put('/:postId', requestLogger, auth, upload.single('image'), async (req, res) => {
    try {
        console.log('更新帖子请求体:', req.body);
        const { title, content, category, removeImage } = req.body;
        
        // 处理标签
        let tags = [];
        if (req.body.tags) {
            // 如果是字符串，先按逗号分割
            if (typeof req.body.tags === 'string') {
                tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            }
            // 如果是数组
            else if (Array.isArray(req.body.tags)) {
                tags = req.body.tags.map(tag => tag.trim()).filter(tag => tag);
            }
            // 如果是 tags[]
            else if (req.body['tags[]']) {
                const tagsArray = Array.isArray(req.body['tags[]']) ? 
                    req.body['tags[]'] : [req.body['tags[]']];
                tags = tagsArray.map(tag => tag.trim()).filter(tag => tag);
            }
        }

        console.log('处理后的标签:', tags);

        // 查找并验证帖子
        const post = await Post.findById(req.params.postId);
        if (!post) {
            console.log('帖子不存在:', req.params.postId);
            return res.status(404).json({ message: '帖子不存在' });
        }

        // 验证作者权限
        console.log('作者验证 - 帖子作者ID:', post.author.toString());
        console.log('作者验证 - 当前用户ID:', req.user.id);

        if (post.author.toString() !== req.user.id) {
            console.log('权限验证失败');
            return res.status(403).json({ message: '无权限修改此帖子' });
        }

        console.log('权限验证通过');

        // 记录更新前的数据
        console.log('更新前的帖子数据:', {
            title: post.title,
            content: post.content,
            category: post.category,
            tags: post.tags,
            image: post.image
        });

        // 更新字段
        const updates = {
            title: title || post.title,
            content: content || post.content,
            category: category || post.category,
            tags: tags,
            updatedAt: Date.now()
        };

        console.log('准备更新的数据:', updates);

        // 处理图片
        if (removeImage === 'true') {
            console.log('处理图片删除请求');
            if (post.image) {
                const oldImagePath = path.join(__dirname, '../../client', post.image);
                console.log('要删除的图片路径:', oldImagePath);
                try {
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                        console.log('成功删除旧图片文件');
                    }
                } catch (error) {
                    console.error('删除图片文件失败:', error);
                }
                updates.image = null;
            }
        }

        if (req.file) {
            console.log('处理新上传的图片:', req.file.filename);
            if (post.image) {
                const oldImagePath = path.join(__dirname, '../../client', post.image);
                try {
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                        console.log('成功删除旧图片文件');
                    }
                } catch (error) {
                    console.error('删除旧图片失败:', error);
                }
            }
            updates.image = `/uploads/posts/${req.file.filename}`;
        }

        // 使用 findByIdAndUpdate 替代直接修改和保存
        const updatedPost = await Post.findByIdAndUpdate(
            req.params.postId,
            { $set: updates },
            { 
                new: true,
                runValidators: true 
            }
        ).populate('author', 'username avatar');

        if (!updatedPost) {
            console.log('更新失败: 未找到帖子');
            return res.status(404).json({ message: '更新失败' });
        }

        console.log('更新后的帖子数据:', {
            title: updatedPost.title,
            content: updatedPost.content,
            category: updatedPost.category,
            tags: updatedPost.tags,
            image: updatedPost.image
        });

        console.log('===== 更新完成 =====\n');
        res.json(updatedPost);
    } catch (error) {
        console.error('更新帖子失败:', error);
        res.status(500).json({ 
            message: '服务器错误',
            error: error.message,
            stack: error.stack
        });
    }
});

// 删除评论
router.delete('/:postId/comments/:commentId', auth, async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        
        // 验证MongoDB ID格式
        if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({ error: '无效的ID格式' });
        }
        
        // 先检查评论是否存在及权限验证
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: '评论未找到' });
        }
        
        // 验证评论作者
        if (comment.author.toString() !== req.user.id) {
            return res.status(403).json({ error: '没有权限删除此评论' });
        }
        
        // 再检查帖子是否存在
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: '帖子未找到' });
        }
        
        // 确认评论属于该帖子
        if (!post.comments.includes(commentId)) {
            return res.status(400).json({ error: '该评论不属于此帖子' });
        }
        
        await Comment.findByIdAndDelete(commentId);
        
        // 从帖子中移除评论引用
        await Post.findByIdAndUpdate(postId, {
            $pull: { comments: commentId }
        });
        
        res.status(200).json({ message: '评论已成功删除' });
    } catch (error) {
        console.error('删除评论时出错:', error.stack);
        res.status(500).json({ error: '服务器内部错误', details: error.message });
    }
});

// 更新评论
router.put('/:postId/comments/:commentId', auth, async (req, res) => {
    try {
        const { content } = req.body;
        const comment = await Comment.findById(req.params.commentId);
        
        if (!comment) {
            return res.status(404).json({ message: '评论不存在' });
        }

        // 检查是否为评论作者
        if (comment.author.toString() !== req.user.id) {
            return res.status(403).json({ message: '无权限编辑此评论' });
        }

        comment.content = content;
        await comment.save();

        const updatedComment = await Comment.findById(comment._id)
            .populate('author', 'username avatar');

        res.json(updatedComment);
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取单个帖子详情
router.get('/:postId', async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId)
            .populate('author', 'username avatar')
            .populate({
                path: 'comments',
                populate: { path: 'author', select: 'username avatar' }
            });
            
        if (!post) {
            return res.status(404).json({ message: '帖子不存在' });
        }

        // 确保标签字段存在
        const postData = post.toObject();
        postData.tags = postData.tags || [];
        
        console.log('返回的帖子数据:', {
            id: postData._id,
            title: postData.title,
            tags: postData.tags
        });
        
        res.json(postData);
    } catch (error) {
        console.error('获取帖子详情失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 点赞评论
router.post('/:postId/comments/:commentId/like', auth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ message: '评论不存在' });
        }

        // 检查用户是否已经点赞
        const likeIndex = comment.likes.indexOf(req.user.id);
        
        if (likeIndex === -1) {
            // 添加点赞
            comment.likes.push(req.user.id);
        } else {
            // 取消点赞
            comment.likes.splice(likeIndex, 1);
        }
        
        await comment.save();
        
        res.json({ 
            likes: comment.likes.length,
            isLiked: likeIndex === -1  // 返回最新的点赞状态
        });
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取相关帖子
router.get('/related/:postId', async (req, res) => {
    try {
        const currentPost = await Post.findById(req.params.postId);
        if (!currentPost) {
            return res.status(404).json({ message: '帖子不存在' });
        }

        // 查找同类别或有相同标签的帖子
        const relatedPosts = await Post.find({
            _id: { $ne: currentPost._id }, // 排除当前帖子
            $or: [
                { category: currentPost.category },
                { tags: { $in: currentPost.tags } }
            ]
        })
        .limit(5) // 限制返回5个相关帖子
        .populate('author', 'username avatar')
        .select('title category tags createdAt');

        res.json(relatedPosts);
    } catch (error) {
        console.error('获取相关帖子失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 按分类获取帖子
router.get('/category/:category', async (req, res) => {
    try {
        const posts = await Post.find({ category: req.params.category })
            .populate('author', 'username avatar')
            .populate({
                path: 'comments',
                populate: { path: 'author', select: 'username avatar' }
            })
            .sort({ createdAt: -1 });
        
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

// 按标签搜索帖子
router.get('/tags/:tag', async (req, res) => {
    try {
        const tag = req.params.tag;
        const posts = await Post.find({ tags: tag })
            .populate('author', 'username avatar')
            .populate({
                path: 'comments',
                populate: { path: 'author', select: 'username avatar' }
            })
            .sort({ createdAt: -1 });
        
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取热门标签
router.get('/tags', async (req, res) => {
    try {
        const posts = await Post.find().select('tags');
        const tagCounts = {};
        
        // 统计每个标签的使用次数
        posts.forEach(post => {
            post.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });
        
        // 转换为数组并排序
        const sortedTags = Object.entries(tagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // 只返回前10个
        
        res.json(sortedTags);
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

module.exports = router; 