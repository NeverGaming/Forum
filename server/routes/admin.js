const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const { protect, authorize } = require('../middleware/auth');

// 获取所有用户
router.get('/users', protect, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

// 禁用用户
router.post('/users/:userId/ban', protect, authorize('admin'), async (req, res) => {
    try {
        const { days } = req.body;
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        user.status = 'banned';
        user.banExpires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        await user.save();

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

// 禁言用户
router.post('/users/:userId/mute', protect, authorize('admin'), async (req, res) => {
    try {
        const { hours } = req.body;
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        user.status = 'muted';
        user.muteExpires = new Date(Date.now() + hours * 60 * 60 * 1000);
        await user.save();

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

// 内容审核
router.post('/posts/:postId/review', protect, authorize('admin'), async (req, res) => {
    try {
        const { action, reason } = req.body;
        const post = await Post.findById(req.params.postId);

        if (!post) {
            return res.status(404).json({ message: '帖子不存在' });
        }

        if (action === 'approve') {
            post.status = 'approved';
        } else if (action === 'reject') {
            post.status = 'rejected';
            post.rejectReason = reason;
        }

        await post.save();
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

module.exports = router; 