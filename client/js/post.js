const API_URL = 'http://localhost:3000/api';
let currentUser = JSON.parse(localStorage.getItem('currentUser'));
let token = localStorage.getItem('token');

// 获取帖子ID
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

// 加载帖子详情
async function loadPost() {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}`);
        const post = await response.json();
        
        document.title = post.title;
        
        document.getElementById('postContent').innerHTML = `
            <div class="post-header">
                <h1 class="post-title">${post.title}</h1>
                
                <!-- 添加分类和标签显示 -->
                <div class="post-categories">
                    <span class="category-tag">${post.category}</span>
                    ${post.tags.map(tag => `
                        <span class="tag">#${tag}</span>
                    `).join('')}
                </div>
                
                <div class="post-meta">
                    <span class="post-author">
                        <img src="${post.author.avatar || '/images/default-avatar.png'}" 
                             alt="${post.author.username}"
                             class="author-avatar">
                        ${post.author.username}
                    </span>
                    <span class="post-date">${new Date(post.createdAt).toLocaleString()}</span>
                    <span class="post-comments">
                        <i class="comment-icon">💬</i>
                        ${post.comments ? post.comments.length : 0} 跟帖
                    </span>
                </div>
            </div>
            ${post.image ? `
                <div class="post-image">
                    <img src="${post.image}" alt="${post.title}">
                </div>
            ` : ''}
            <div class="post-body">
                ${post.content}
            </div>
        `;
        
        // 加载评论
        await loadComments(postId);
        
        // 加载相关帖子
        await loadRelatedPosts(post);
    } catch (error) {
        console.error('加载帖子失败:', error);
        alert('加载帖子失败，请稍后重试');
    }
}

// 加载评论
async function loadComments(postId) {
    try {
        if (!postId) {
            throw new Error('帖子ID未定义');
        }
        
        const response = await fetch(`${API_URL}/posts/${postId}/comments`);
        
        if (!response.ok) {
            throw new Error('获取评论失败');
        }
        
        const comments = await response.json();
        renderComments(comments);
    } catch (error) {
        console.error('加载评论失败:', error);
    }
}

// 提交评论
async function submitComment() {
    if (!currentUser) {
        alert('请先登录后再评论！');
        return;
    }

    const commentContent = document.getElementById('commentContent').value;
    
    if (!commentContent.trim()) {
        alert('请输入评论内容');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content: commentContent })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '评论失败');
        }

        // 清空评论输入框
        document.getElementById('commentContent').value = '';
        
        // 重新加载评论
        await loadComments(postId);
    } catch (error) {
        console.error('提交评论失败:', error);
        alert(error.message);
    }
}

// 添加点赞功能
window.toggleLike = async function(commentId, button) {
    if (!currentUser) {
        alert('请先登录后再点赞');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/posts/${postId}/comments/${commentId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('点赞失败');
        }

        const data = await response.json();
        
        // 更新点赞按钮状态
        button.classList.toggle('liked', data.isLiked);
        button.querySelector('.like-count').textContent = data.likes;
    } catch (error) {
        console.error('点赞失败:', error);
        alert('点赞失败，请稍后重试');
    }
};

// 修改评论渲染函数，添加点赞状态
function renderComments(comments) {
    const commentsContainer = document.getElementById('comments');
    
    if (!comments || comments.length === 0) {
        commentsContainer.innerHTML = '<p>暂无评论</p>';
        return;
    }
    
    commentsContainer.innerHTML = comments.map(comment => {
        const isLiked = comment.likes && comment.likes.includes(currentUser?.id);
        return `
            <div class="comment">
                <div class="comment-header">
                    <img src="${comment.author.avatar || '/images/default-avatar.png'}" 
                         alt="${comment.author.username}" 
                         class="comment-avatar">
                    <span class="comment-author">${comment.author.username}</span>
                    <span class="comment-date">${new Date(comment.createdAt).toLocaleString()}</span>
                </div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-actions">
                    <button class="like-button ${isLiked ? 'liked' : ''}" 
                            onclick="toggleLike('${comment._id}', this)">
                        <span class="like-icon">👍</span>
                        <span class="like-count">${comment.likes ? comment.likes.length : 0}</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 添加相关帖子推荐功能
async function loadRelatedPosts(currentPost) {
    try {
        // 获取同类别或相同标签的帖子
        const response = await fetch(`${API_URL}/posts/related/${currentPost._id}`);
        const relatedPosts = await response.json();
        
        const relatedContainer = document.createElement('div');
        relatedContainer.className = 'related-posts';
        relatedContainer.innerHTML = `
            <h3>相关帖子</h3>
            <div class="related-posts-list">
                ${relatedPosts.map(post => `
                    <div class="related-post-card" onclick="location.href='/post.html?id=${post._id}'">
                        <h4>${post.title}</h4>
                        <div class="post-categories">
                            <span class="category-tag">${post.category}</span>
                            ${post.tags.map(tag => `
                                <span class="tag">#${tag}</span>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.querySelector('.post-container').appendChild(relatedContainer);
    } catch (error) {
        console.error('加载相关帖子失败:', error);
    }
}

// 页面加载时执行
document.addEventListener('DOMContentLoaded', loadPost); 

function renderPost(post) {
    document.querySelector('.post-title').textContent = post.title;
    document.querySelector('.category-tag').textContent = post.category;
    
    // 渲染标签
    const tagsContainer = document.querySelector('.post-tags');
    if (post.tags && post.tags.length > 0) {
        tagsContainer.innerHTML = post.tags.map(tag => `
            <span class="tag">${tag}</span>
        `).join('');
    } else {
        tagsContainer.style.display = 'none';
    }

    // 渲染图片
    if (post.image) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'post-image';
        imageContainer.innerHTML = `<img src="${post.image}" alt="帖子图片">`;
        document.querySelector('.post-content').before(imageContainer);
    }

    // 渲染其他内容
    document.querySelector('.post-content').textContent = post.content;
    document.querySelector('.post-author').textContent = post.author.username;
    document.querySelector('.post-date').textContent = new Date(post.createdAt).toLocaleString();
} 

// 创建新帖子
async function createPost(event) {
    event.preventDefault();
    
    const formData = new FormData();
    formData.append('title', document.getElementById('postTitle').value);
    formData.append('content', document.getElementById('postContent').value);
    formData.append('category', document.getElementById('postCategory').value);
    
    // 处理标签
    const tags = document.getElementById('postTags').value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);
    
    // 添加每个标签到 FormData
    tags.forEach(tag => formData.append('tags[]', tag));

    // ... 其他代码保持不变 ...
} 