const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const auth = require('../middleware/auth');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const mongoose = require('mongoose');
const sharp = require('sharp');

// 配置文件上传
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // 确保目录存在
        const dir = 'client/uploads/avatars';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function(req, file, cb) {
        // 生成安全的文件名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// 创建 multer 实例
const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB
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

// 获取用户资料
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        const postCount = await Post.countDocuments({ author: req.user.id });
        const commentCount = await Comment.countDocuments({ author: req.user.id });
        
        res.json({
            ...user.toObject(),
            postCount,
            commentCount
        });
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取用户的帖子
router.get('/posts', auth, async (req, res) => {
    try {
        const posts = await Post.find({ author: req.user.id })
            .sort({ createdAt: -1 })
            .populate('author', 'username avatar');
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取用户的评论
router.get('/comments', auth, async (req, res) => {
    try {
        console.log('正在获取用户评论，用户ID:', req.user.id); // 添加调试日志

        const comments = await Comment.find({ author: req.user.id })
            .sort({ createdAt: -1 })
            .populate('post', 'title')  // 只获取帖子的标题
            .populate('author', 'username avatar')  // 获取作者信息
            .lean();  // 转换为普通 JavaScript 对象

        if (!comments) {
            return res.json([]); // 如果没有评论，返回空数组
        }

        // 处理评论数据，确保所有必要的字段都存在
        const processedComments = comments.map(comment => ({
            _id: comment._id,
            content: comment.content,
            createdAt: comment.createdAt,
            author: comment.author || { username: '未知用户' },
            post: comment.post || { title: '已删除的帖子' },
            likes: comment.likes || [],
            likeCount: (comment.likes || []).length
        }));

        console.log('成功获取评论:', processedComments.length); // 添加调试日志
        res.json(processedComments);
    } catch (error) {
        console.error('获取用户评论失败:', error); // 添加错误日志
        res.status(500).json({ 
            message: '服务器错误',
            error: error.message 
        });
    }
});

// 更新用户资料
router.put('/', auth, async (req, res) => {
    try {
        const { username } = req.body;
        const user = await User.findById(req.user.id);

        if (username && username !== user.username) {
            const userExists = await User.findOne({ username });
            if (userExists) {
                return res.status(400).json({ message: '用户名已存在' });
            }
            user.username = username;
        }

        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

// 上传头像
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '请选择要上传的头像' });
        }

        // 使用 sharp 处理图片
        const processedImageBuffer = await sharp(req.file.path)
            .resize(128, 128, { // 设置合适的尺寸
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 80 }) // 压缩质量
            .toBuffer();

        // 保存处理后的图片
        const filename = req.file.filename;
        await fs.promises.writeFile(req.file.path, processedImageBuffer);

        // 更新用户头像路径
        const user = await User.findById(req.user.id);
        user.avatar = `/uploads/avatars/${filename}`;
        await user.save();

        res.json({ avatar: user.avatar });
    } catch (error) {
        console.error('上传头像失败:', error);
        res.status(500).json({ message: '上传头像失败' });
    }
});

module.exports = router; 