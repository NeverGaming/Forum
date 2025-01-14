const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// 注册路由
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 检查用户是否已存在
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: '用户名已存在' });
        }

        // 创建新用户
        user = new User({
            username,
            password
        });

        await user.save();

        // 生成 JWT
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                avatar: user.avatar
            }
        });
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

// 登录路由
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 查找用户
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }

        // 验证密码
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }

        // 生成 JWT
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('用户登录成功:', {
            userId: user._id,
            username: user.username
        });

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 验证 token
router.get('/verify', auth, (req, res) => {
    res.status(200).json({ valid: true });
});

module.exports = router; 