require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const profileRoutes = require('./routes/profile');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const sharp = require('sharp');

const app = express();

// 连接数据库
connectDB();

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/profile', profileRoutes);

// 初始化上传目录
function initializeUploadDirectories() {
    const directories = [
        path.join(__dirname, '../client/uploads'),
        path.join(__dirname, '../client/uploads/avatars'),
        path.join(__dirname, '../client/uploads/posts')
    ];

    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`创建目录: ${dir}`);
        }
    });
}

// 在应用启动时初始化目录
initializeUploadDirectories();

// 静态文件服务
app.use(express.static('client', {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// 静态文件服务 - 上传目录
app.use('/uploads', express.static(path.join(__dirname, '../client/uploads')));

// 图片处理中间件
app.use('/uploads/posts/*', async (req, res, next) => {
    try {
        const imagePath = path.join(__dirname, '../client', req.path);
        const width = parseInt(req.query.width) || null;
        const height = parseInt(req.query.height) || null;

        if (!width && !height) {
            return next();
        }

        // 检查文件是否存在
        try {
            await fsPromises.access(imagePath);
        } catch (error) {
            return res.status(404).send('Image not found');
        }

        const image = sharp(imagePath);
        const metadata = await image.metadata();

        let resizeOptions = {};
        if (width && height) {
            resizeOptions = {
                width,
                height,
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            };
        } else if (width) {
            resizeOptions = { width };
        } else {
            resizeOptions = { height };
        }

        const processedImage = await image
            .resize(resizeOptions)
            .toBuffer();

        res.setHeader('Content-Type', `image/${metadata.format}`);
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.send(processedImage);

    } catch (error) {
        console.error('图片处理错误:', error);
        next(error);
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: '服务器错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 