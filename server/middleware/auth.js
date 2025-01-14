const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    try {
        // 获取 token
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            return res.status(401).json({ message: '无访问权限，请先登录' });
        }

        const token = authHeader.replace('Bearer ', '');
        
        // 验证 token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 设置用户信息
        req.user = {
            id: decoded.userId
        };
        
        console.log('认证成功 - 用户ID:', req.user.id);
        next();
    } catch (error) {
        console.error('Token 验证失败:', error);
        res.status(401).json({ message: '无效的 token，请重新登录' });
    }
}; 