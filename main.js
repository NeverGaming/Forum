// 在文件开头定义全局变量
const API_URL = 'http://localhost:3000/api'; // 确保这个URL正确
let isSubmitting = false;

// 修改提交函数，将其定义为全局函数
window.submitPost = async function(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    
    try {
        const title = document.getElementById('postTitle').value.trim();
        const content = document.getElementById('postContent').value.trim();
        const imageFile = document.getElementById('postImage').files[0];
        
        if (!title || !content) {
            throw new Error('标题和内容不能为空');
        }
        
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        if (imageFile) {
            formData.append('image', imageFile);
        }
        
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '发布失败');
        }
        
        // 清空表单
        form.reset();
        document.getElementById('imagePreview').innerHTML = '';
        
        // 隐藏发帖表单
        window.togglePostForm();
        
        // 重新加载帖子列表
        await loadPosts();
        
    } catch (error) {
        console.error('发布帖子失败:', error);
        alert(error.message || '发布失败，请重试');
    } finally {
        submitButton.disabled = false;
    }
};

// 修改初始化代码
function initializeForm() {
    const postForm = document.getElementById('newPostForm');
    if (!postForm) return;

    // 移除所有现有的事件监听器
    postForm.outerHTML = postForm.outerHTML;

    // 重新获取表单并添加事件监听器
    const newForm = document.getElementById('newPostForm');
    if (newForm) {
        newForm.addEventListener('submit', window.submitPost);
    }

    // 重新绑定图片上传事件
    const postImage = document.getElementById('postImage');
    if (postImage) {
        postImage.addEventListener('change', window.previewImage);
    }
}

// 修改 DOMContentLoaded 事件处理
document.addEventListener('DOMContentLoaded', function() {
    if (window.isInitialized) return;
    window.isInitialized = true;
    
    // 初始化表单
    initializeForm();
    
    // 加载初始帖子列表
    loadPosts();
});

// 确保这些函数在全局作用域中定义
window.previewImage = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = `
                <div class="preview-container">
                    <img src="${e.target.result}" alt="预览图片">
                    <button type="button" class="remove-image" onclick="window.removeImage()">×</button>
                </div>
            `;
        }
        reader.readAsDataURL(file);
    }
};

window.removeImage = function() {
    document.getElementById('postImage').value = '';
    document.getElementById('imagePreview').innerHTML = '';
};

window.togglePostForm = function() {
    const form = document.getElementById('newPostForm');
    if (form) {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    }
};

// 加载帖子列表
async function loadPosts() {
    try {
        const response = await fetch(`${API_URL}/posts`);
        const posts = await response.json();
        
        const postsList = document.getElementById('postsList');
        postsList.innerHTML = posts.map(post => `
            <div class="post-card">
                <div class="post-content" onclick="goToPost('${post._id}')">
                    <h3 class="post-title">${post.title}</h3>
                    ${post.image ? `
                        <div class="post-image">
                            <img src="${post.image}" alt="${post.title}">
                        </div>
                    ` : ''}
                    <div class="post-meta">
                        <span class="post-author">
                            <img src="${post.author.avatar || './images/default-avatar.png'}" 
                                 alt="${post.author.username}" 
                                 class="author-avatar">
                            ${post.author.username}
                        </span>
                        <span class="post-date">${new Date(post.createdAt).toLocaleString()}</span>
                        <span class="post-comments">${post.comments ? post.comments.length : 0} 评论</span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载帖子失败:', error);
    }
}

// 添加跳转到帖子详情页的函数
window.goToPost = function(postId) {
    window.location.href = `/topic.html?id=${postId}`;
} 