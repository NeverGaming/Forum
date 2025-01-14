// 获取 API URL 和认证信息
const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');
const currentUser = JSON.parse(localStorage.getItem('currentUser'));

// 在文件顶部添加变量声明
let allPosts = [];

// 页面加载时检查认证状态
document.addEventListener('DOMContentLoaded', () => {
    // 如果没有token或用户信息，重定向到登录页面
    if (!token || !currentUser) {
        window.location.href = '/index.html';
        return;
    }
    
    // 验证 token 是否有效
    verifyToken().then(isValid => {
        if (!isValid) {
            // token 无效，清除本地存储并重定向到登录页面
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            window.location.href = '/index.html';
            return;
        }
        
        // token 有效，加载用户数据
        loadUserProfile();
        loadUserPosts();
        loadUserComments();
    });
});

// 验证 token 是否有效
async function verifyToken() {
    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.ok;
    } catch (error) {
        console.error('Token 验证失败:', error);
        return false;
    }
}

// 加载用户资料
async function loadUserProfile() {
    try {
        const response = await fetch(`${API_URL}/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('加载用户资料失败');
        }
        
        const user = await response.json();
        
        // 更新页面显示
        document.getElementById('username').textContent = user.username;
        document.getElementById('userAvatar').src = user.avatar || '/images/default-avatar.png';
        
        // 更新统计数据
        document.querySelector('.user-stats').innerHTML = `
            <div class="stat-item">
                <span class="stat-label">发帖数</span>
                <span class="stat-value">${user.postCount || 0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">评论数</span>
                <span class="stat-value">${user.commentCount || 0}</span>
            </div>
        `;
    } catch (error) {
        console.error('加载用户资料失败:', error);
        alert('加载用户资料失败');
    }
}

// 加载用户的帖子
async function loadUserPosts() {
    try {
        const response = await fetch(`${API_URL}/profile/posts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('加载帖子失败');
        }
        
        allPosts = await response.json(); // 保存帖子数据
        renderUserPosts(allPosts);
    } catch (error) {
        console.error('加载帖子失败:', error);
        const postsContainer = document.getElementById('userPosts');
        postsContainer.innerHTML = '<p class="error-message">加载帖子失败，请稍后重试</p>';
    }
}

// 渲染用户帖子列表
function renderUserPosts(posts) {
    const postsContainer = document.getElementById('userPosts');
    
    if (!posts || posts.length === 0) {
        postsContainer.innerHTML = '<p class="no-data">暂无帖子</p>';
        return;
    }
    
    postsContainer.innerHTML = posts.map(post => `
        <div class="post-item">
            <div class="post-header">
                <h3>${post.title}</h3>
                <div class="post-categories">
                    <span class="category-tag">${post.category}</span>
                    ${post.tags.map(tag => `
                        <span class="tag">#${tag}</span>
                    `).join('')}
                </div>
            </div>
            ${post.image ? `
                <div class="post-image">
                    <img src="${post.image}" alt="帖子图片">
                </div>
            ` : ''}
            <div class="post-content">${post.content}</div>
            <div class="post-meta">
                <span class="post-date">${new Date(post.createdAt).toLocaleString()}</span>
                <div class="post-actions">
                    <button class="edit-btn" onclick="editPost('${post._id}')">编辑</button>
                    <button class="delete-btn" onclick="deletePost('${post._id}')">删除</button>
                </div>
            </div>
        </div>
    `).join('');
}

// 编辑帖子
window.editPost = async function(postId) {
    try {
        console.log('开始编辑帖子:', postId);
        const response = await fetch(`${API_URL}/posts/${postId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('获取帖子详情失败');
        }

        const post = await response.json();
        console.log('获取到帖子数据:', post);

        // 移除可能存在的旧表单
        const oldForm = document.querySelector('.edit-form-modal');
        if (oldForm) {
            oldForm.remove();
        }
        
        const editForm = document.createElement('div');
        editForm.className = 'edit-form-modal';
        editForm.innerHTML = `
            <div class="edit-form-content">
                <h3>编辑帖子</h3>
                <form id="editPostForm">
                    <input type="hidden" id="editPostId" value="${postId}">
                    <input type="text" id="editTitle" value="${post.title}" required>
                    
                    <select id="editCategory" required>
                        <option value="">选择分类</option>
                        <option value="技术" ${post.category === '技术' ? 'selected' : ''}>技术</option>
                        <option value="生活" ${post.category === '生活' ? 'selected' : ''}>生活</option>
                        <option value="游戏" ${post.category === '游戏' ? 'selected' : ''}>游戏</option>
                        <option value="新闻" ${post.category === '新闻' ? 'selected' : ''}>新闻</option>
                        <option value="其他" ${post.category === '其他' ? 'selected' : ''}>其他</option>
                    </select>
                    
                    <div class="tags-input-container">
                        <input type="text" id="editTags" 
                               value="${post.tags.join(', ')}" 
                               placeholder="添加标签（用逗号分隔）">
                        <div class="tags-preview" id="tagsPreview"></div>
                    </div>
                    
                    <textarea id="editContent" required>${post.content}</textarea>
                    
                    <div class="image-edit-section">
                        ${post.image ? `
                            <div class="current-image">
                                <img src="${post.image}" alt="当前图片">
                                <button type="button" class="remove-image" onclick="removePostImage()">删除图片</button>
                            </div>
                        ` : ''}
                        <div class="image-upload">
                            <input type="file" id="editPostImage" accept="image/*" onchange="previewEditImage(event)">
                            <div id="editImagePreview"></div>
                        </div>
                    </div>
                    
                    <div class="form-buttons">
                        <button type="button" onclick="submitEditForm('${postId}')">保存</button>
                        <button type="button" onclick="closeEditForm()">取消</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(editForm);

    } catch (error) {
        console.error('编辑帖子失败:', error);
        alert('获取帖子详情失败，请稍后重试');
    }
};

// 提交编辑表单
window.submitEditForm = async function(postId) {
    try {
        console.log('开始处理表单提交');
        console.log('帖子ID:', postId);

        const formData = new FormData();
        
        // 添加基本字段
        const title = document.getElementById('editTitle').value.trim();
        const content = document.getElementById('editContent').value.trim();
        const category = document.getElementById('editCategory').value;

        if (!title || !content || !category) {
            alert('请填写所有必填字段');
            return;
        }

        formData.append('title', title);
        formData.append('content', content);
        formData.append('category', category);
        
        // 处理标签
        const tags = document.getElementById('editTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag);
        tags.forEach(tag => formData.append('tags[]', tag));

        // 处理图片
        const imageInput = document.getElementById('editPostImage');
        if (imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }
        
        if (window.removeImage === true) {
            formData.append('removeImage', 'true');
        }

        // 打印表单数据
        console.log('表单数据:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}:`, value instanceof File ? value.name : value);
        }

        // 发送请求
        console.log('发送更新请求');
        const response = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || '更新失败');
        }

        console.log('更新成功:', result);
        closeEditForm();
        await loadUserPosts();

    } catch (error) {
        console.error('更新失败:', error);
        alert(error.message || '更新失败，请稍后重试');
    }
};

// 预览编辑时选择的图片
window.previewEditImage = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.match('image.*')) {
        alert('请选择图片文件');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const previewDiv = document.getElementById('editImagePreview');
        previewDiv.innerHTML = `
            <div class="preview-container">
                <img src="${e.target.result}" alt="预览图片">
                <button type="button" class="remove-preview" onclick="clearEditImagePreview()">取消</button>
            </div>
        `;
    };
    reader.readAsDataURL(file);
    window.removeImage = false; // 重置删除标记
};

// 清除编辑图片预览
window.clearEditImagePreview = function() {
    const imageInput = document.getElementById('editPostImage');
    imageInput.value = '';
    document.getElementById('editImagePreview').innerHTML = '';
};

// 删除现有图片
window.removePostImage = function() {
    const currentImage = document.querySelector('.current-image');
    if (currentImage) {
        currentImage.style.display = 'none';
    }
    window.removeImage = true;
    
    // 清除可能存在的新图片预览
    clearEditImagePreview();
};

// 关闭编辑表单
window.closeEditForm = function() {
    const editForm = document.querySelector('.edit-form-modal');
    if (editForm) {
        editForm.remove();
    }
};

// 移除标签
window.removeTag = function(element, tagToRemove) {
    const tagsInput = document.getElementById('editTags');
    const currentTags = tagsInput.value.split(',').map(tag => tag.trim());
    const updatedTags = currentTags.filter(tag => tag !== tagToRemove);
    tagsInput.value = updatedTags.join(', ');
    element.parentElement.remove();
};

// 更新帖子
window.updatePost = async function(event) {
    event.preventDefault();
    
    const postId = document.getElementById('editPostId').value;
    const title = document.getElementById('editPostTitle').value;
    const content = document.getElementById('editPostContent').value;
    
    try {
        const response = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, content })
        });
        
        if (!response.ok) {
            throw new Error('更新帖子失败');
        }
        
        // 关闭模态框并重新加载帖子列表
        closeEditModal();
        loadUserPosts();
    } catch (error) {
        console.error('更新帖子失败:', error);
        alert('更新帖子失败');
    }
};

// 删除帖子
window.deletePost = async function(postId) {
    if (!confirm('确定要删除这篇帖子吗？')) {
        return;
    }
    
    try {
        console.log('开始删除帖子:', postId);
        const response = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || '删除帖子失败');
        }
        
        console.log('删除成功:', result);
        
        // 从页面中移除帖子
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (postElement) {
            postElement.remove();
        }
        
        // 重新加载帖子列表
        await loadUserPosts();
        
    } catch (error) {
        console.error('删除帖子失败:', error);
        alert(error.message || '删除帖子失败，请稍后重试');
    }
};

// 获取单个帖子详情
async function fetchPost(postId) {
    const response = await fetch(`${API_URL}/posts/${postId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error('获取帖子详情失败');
    }
    
    return await response.json();
}

// 切换标签页
window.switchTab = function(tabName) {
    // 更新标签样式
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.tab[onclick="switchTab('${tabName}')"]`).classList.add('active');
    
    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
};

// 上传头像
window.uploadAvatar = function() {
    document.getElementById('avatarInput').click();
};

// 处理头像文件选择
document.getElementById('avatarInput').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
        const response = await fetch(`${API_URL}/profile/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('上传头像失败');
        }
        
        const result = await response.json();
        document.getElementById('userAvatar').src = result.avatar;
        
        // 更新本地存储的用户信息
        const updatedUser = { ...currentUser, avatar: result.avatar };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    } catch (error) {
        console.error('上传头像失败:', error);
        alert('上传头像失败');
    }
});

// 显示编辑资料表单
window.showEditProfileForm = function() {
    const form = document.getElementById('editProfileForm');
    const usernameInput = document.getElementById('editUsername');
    usernameInput.value = currentUser.username;
    form.style.display = 'block';
};

// 隐藏编辑资料表单
window.hideEditProfileForm = function() {
    document.getElementById('editProfileForm').style.display = 'none';
};

// 更新用户资料
window.updateProfile = async function(event) {
    event.preventDefault();
    
    const username = document.getElementById('editUsername').value;
    
    try {
        const response = await fetch(`${API_URL}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username })
        });
        
        if (!response.ok) {
            throw new Error('更新资料失败');
        }
        
        const updatedUser = await response.json();
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        
        hideEditProfileForm();
        loadUserProfile();
    } catch (error) {
        console.error('更新资料失败:', error);
        alert('更新资料失败');
    }
};

// 加载用户的评论
async function loadUserComments() {
    try {
        console.log('开始加载评论...'); // 添加调试日志
        const response = await fetch(`${API_URL}/profile/comments`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                console.log('认证失败，重定向到登录页面'); // 添加调试日志
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                window.location.href = '/index.html';
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.message || '加载评论失败');
        }
        
        const comments = await response.json();
        console.log('成功加载评论:', comments); // 添加调试日志
        renderUserComments(comments);
    } catch (error) {
        console.error('加载评论失败:', error);
        const commentsContainer = document.getElementById('userComments');
        commentsContainer.innerHTML = `
            <p class="error-message">
                加载评论失败: ${error.message || '请稍后重试'}
            </p>
        `;
    }
}

// 渲染用户评论列表
function renderUserComments(comments) {
    const commentsContainer = document.getElementById('userComments');
    
    if (!comments || comments.length === 0) {
        commentsContainer.innerHTML = '<p class="no-data">暂无评论</p>';
        return;
    }
    
    commentsContainer.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <div class="comment-header">
                <strong>评论于：${
                    comment.post ? 
                    `<a href="/post.html?id=${comment.post._id}">${comment.post.title}</a>` : 
                    '已删除的帖子'
                }</strong>
                <span class="comment-date">${new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <div class="comment-content">${comment.content}</div>
            <div class="comment-meta">
                <span class="like-count">
                    <i class="like-icon">👍</i> ${comment.likeCount || 0}
                </span>
                ${comment.post ? `
                    <div class="comment-actions">
                        <button class="edit-btn" onclick="editComment('${comment._id}')">编辑</button>
                        <button class="delete-btn" onclick="deleteComment('${comment._id}')">删除</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}
