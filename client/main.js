document.addEventListener('DOMContentLoaded', () => {
    // API 基础URL
    const API_URL = 'http://localhost:3000/api';
    
    // 为所有话题图片添加悬浮效果
    const topicImages = document.querySelectorAll('.topic-item img');

    topicImages.forEach(img => {
        img.style.cursor = 'pointer';  // 设置鼠标悬浮时为手型光标
        img.style.transition = 'transform 0.3s ease';  // 添加平滑过渡效果
        
        img.addEventListener('mouseenter', () => {
            img.style.transform = 'scale(1.1)';  // 悬浮时图片放大到1.1倍
        });
        
        img.addEventListener('mouseleave', () => {
            img.style.transform = 'scale(1)';  // 鼠标离开时恢复原始大小
        });
    });

    // 存储认证令牌和用户信息
    let token = localStorage.getItem('token');
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));

    // 存储所有帖子的数组
    let allPosts = [];

    // 更新用户界面显示
    function updateAuthUI() {
        const authButtons = document.getElementById('authButtons');
        const userInfo = document.getElementById('userInfo');
        const currentUserSpan = document.getElementById('currentUser');
        const newPostForm = document.getElementById('newPostForm');
        const toggleBtn = document.getElementById('togglePostForm');

        if (currentUser) {
            authButtons.style.display = 'none';
            userInfo.style.display = 'block';
            currentUserSpan.textContent = `欢迎，${currentUser.username}`;
            
            // 添加个人中心链接的点击事件
            document.querySelector('.user-info a').onclick = function(e) {
                e.preventDefault();
                window.location.href = '/profile.html';
            };
        } else {
            authButtons.style.display = 'block';
            userInfo.style.display = 'none';
        }
    }

    // 显示登录表单
    window.showLoginForm = () => {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    };

    // 显示注册表单
    window.showRegisterForm = () => {
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('loginForm').style.display = 'none';
    };

    // 隐藏认证表单
    window.hideAuthForms = () => {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'none';
    };

    // 注册功能
    window.register = async (e) => {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            alert('两次输入的密码不一致！');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message);
            }

            alert('注册成功！请登录');
            hideAuthForms();
        } catch (error) {
            alert(error.message || '注册失败');
        }
    };

    // 登录功能
    window.login = async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message);
            }

            token = data.token;
            currentUser = data.user;
            localStorage.setItem('token', token);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateAuthUI();
            hideAuthForms();
            loadPosts(); // 重新加载帖子
        } catch (error) {
            alert(error.message || '登录失败');
        }
    };

    // 退出登录
    window.logout = () => {
        token = null;
        currentUser = null;
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        updateAuthUI();
        loadPosts(); // 重新加载帖子
    };

    // 加载所有帖子
    async function loadPosts() {
        try {
            const response = await fetch(`${API_URL}/posts`);
            const posts = await response.json();
            allPosts = posts; // 保存所有帖子
            filterPosts(); // 应用筛选
        } catch (error) {
            console.error('加载帖子失败:', error);
            alert('加载帖子失败');
        }
    }

    // 添加筛选函数
    window.filterPosts = function() {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const tagSearch = document.getElementById('tagSearch').value.toLowerCase();
        
        // 筛选帖子
        const filteredPosts = allPosts.filter(post => {
            // 分类筛选
            if (categoryFilter && post.category !== categoryFilter) {
                return false;
            }
            
            // 标签筛选
            if (tagSearch) {
                return post.tags.some(tag => 
                    tag.toLowerCase().includes(tagSearch)
                );
            }
            
            return true;
        });
        
        // 渲染筛选后的帖子
        renderPosts(filteredPosts);
        
        // 更新 URL 参数
        const params = new URLSearchParams(window.location.search);
        if (categoryFilter) {
            params.set('category', categoryFilter);
        } else {
            params.delete('category');
        }
        if (tagSearch) {
            params.set('tag', tagSearch);
        } else {
            params.delete('tag');
        }
        
        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        history.replaceState(null, '', newUrl);
    };

    // 页面加载时检查 URL 参数
    document.addEventListener('DOMContentLoaded', () => {
        const params = new URLSearchParams(window.location.search);
        const category = params.get('category');
        const tag = params.get('tag');
        
        if (category) {
            document.getElementById('categoryFilter').value = category;
        }
        if (tag) {
            document.getElementById('tagSearch').value = tag;
        }
        
        loadPosts();
    });

    // 添加热门标签功能
    function updatePopularTags() {
        const tagCounts = {};
        allPosts.forEach(post => {
            post.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });
        
        // 获取前 10 个最热门的标签
        const popularTags = Object.entries(tagCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([tag]) => tag);
            
        // 渲染热门标签
        const tagsContainer = document.querySelector('.popular-tags');
        if (tagsContainer) {
            tagsContainer.innerHTML = popularTags.map(tag => `
                <span class="tag" onclick="selectTag('${tag}')">#${tag}</span>
            `).join('');
        }
    }

    // 点击标签时的处理函数
    window.selectTag = function(tag) {
        document.getElementById('tagSearch').value = tag;
        filterPosts();
    };

    // 提交帖子
    window.submitPost = async function(event) {
        event.preventDefault();
        
        if (!currentUser) {
            alert('请先登录！');
            return;
        }

        const form = document.getElementById('newPostForm');
        const title = document.getElementById('postTitle').value;
        const content = document.getElementById('postContent').value;
        const category = document.getElementById('postCategory').value;
        const tagsInput = document.getElementById('postTags').value;
        const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag); // 处理标签
        const imageInput = document.getElementById('postImage');
        const imageFile = imageInput.files[0];
        
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('content', content);
            formData.append('category', category);
            tags.forEach(tag => formData.append('tags[]', tag));
            
            if (imageFile) {
                formData.append('image', imageFile);
            }

            const response = await fetch(`${API_URL}/posts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || '发帖失败');
            }

            // 重置表单和预览
            form.reset();
            document.getElementById('imagePreview').innerHTML = '';
            
            // 重新加载帖子列表并关闭表单
            await loadPosts();
            togglePostForm();
        } catch (error) {
            console.error('发帖错误:', error);
            alert(error.message);
        }
    };

    // 添加评论
    window.addComment = async (postId) => {
        if (!currentUser) {
            alert('请先登录后再评论！');
            return;
        }

        const commentContent = prompt('请输入你的评论：');
        if (!commentContent) return;

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
                throw new Error('评论失败');
            }

            loadPosts(); // 重新加载帖子列表
        } catch (error) {
            alert(error.message);
        }
    };

    // 渲染帖子列表
    function renderPosts(posts) {
        const postsList = document.getElementById('postsList');
        
        if (!posts || posts.length === 0) {
            postsList.innerHTML = '<p>暂无帖子</p>';
            return;
        }

        postsList.innerHTML = posts.map(post => `
            <div class="post-card" onclick="goToPost('${post._id}')">
                <h3 class="post-title">${post.title}</h3>
                
                <!-- 添加分类和标签显示 -->
                <div class="post-categories">
                    <span class="category-tag">${post.category}</span>
                    ${post.tags.map(tag => `
                        <span class="tag">#${tag}</span>
                    `).join('')}
                </div>
                
                ${post.image ? `
                    <div class="post-image">
                        <img src="${post.image}" alt="${post.title}">
                    </div>
                ` : ''}
                <div class="post-meta">
                    <span class="post-author">${post.author.username}</span>
                    <span class="post-date">${new Date(post.createdAt).toLocaleString()}</span>
                    <span class="post-comments">
                        <i class="comment-icon">💬</i>
                        ${post.comments ? post.comments.length : 0} 跟帖
                    </span>
                </div>
            </div>
        `).join('');
    }

    // 渲染评论
    function renderComments(postId, comments) {
        return comments.map(comment => `
            <div class="comment" data-comment-id="${comment._id}">
                <p>${comment.content}</p>
                <div class="comment-meta">
                    <span class="author">${comment.author.username}</span>
                    <span class="timestamp">${new Date(comment.createdAt).toLocaleString()}</span>
                    ${currentUser && currentUser.id === comment.author._id ? `
                        <div class="comment-actions">
                            <button onclick="editComment('${postId}', '${comment._id}')">编辑</button>
                            <button onclick="deleteComment('${postId}', '${comment._id}')">删除</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    // 编辑帖子
    window.editPost = async (postId) => {
        const post = document.querySelector(`[data-post-id="${postId}"]`);
        const title = post.querySelector('h3').textContent;
        const content = post.querySelector('p').textContent;

        const newTitle = prompt('编辑标题：', title);
        if (!newTitle) return;

        const newContent = prompt('编辑内容：', content);
        if (!newContent) return;

        try {
            const response = await fetch(`${API_URL}/posts/${postId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title: newTitle, content: newContent })
            });

            if (!response.ok) {
                throw new Error('更新失败');
            }

            loadPosts(); // 重新加载帖子列表
        } catch (error) {
            alert(error.message);
        }
    };

    // 删除帖子
    window.deletePost = async (postId) => {
        if (!confirm('确定要删除这个帖子吗？')) return;

        try {
            const response = await fetch(`${API_URL}/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || '删除失败');
            }

            loadPosts(); // 重新加载帖子列表
        } catch (error) {
            console.error('删除帖子出错:', error);
            alert(error.message || '删除帖子失败');
        }
    };

    // 编辑评论
    window.editComment = async (postId, commentId) => {
        const comment = document.querySelector(`[data-comment-id="${commentId}"]`);
        const content = comment.querySelector('p').textContent;

        const newContent = prompt('编辑评论：', content);
        if (!newContent) return;

        try {
            const response = await fetch(`${API_URL}/posts/${postId}/comments/${commentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: newContent })
            });

            if (!response.ok) {
                throw new Error('更新失败');
            }

            loadPosts(); // 重新加载帖子列表
        } catch (error) {
            alert(error.message);
        }
    };

    // 删除评论
    window.deleteComment = async (postId, commentId) => {
        if (!confirm('确定要删除这条评论吗？')) return;

        try {
            const response = await fetch(`${API_URL}/posts/${postId}/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || '删除失败');
            }

            loadPosts(); // 重新加载帖子列表
        } catch (error) {
            console.error('删除评论出错:', error);
            alert(error.message || '删除评论失败');
        }
    };

    // 显示用户资料编辑表单
    window.showProfileForm = async () => {
        try {
            const response = await fetch(`${API_URL}/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const user = await response.json();
            
            document.getElementById('profileUsername').value = user.username;
            document.getElementById('currentAvatar').src = user.avatar;
            document.getElementById('profileForm').style.display = 'block';
        } catch (error) {
            alert('加载用户资料失败');
        }
    };

    // 隐藏用户资料编辑表单
    window.hideProfileForm = () => {
        document.getElementById('profileForm').style.display = 'none';
    };

    // 更新用户资料
    window.updateProfile = async (e) => {
        e.preventDefault();
        const username = document.getElementById('profileUsername').value;

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
                throw new Error('更新失败');
            }

            const user = await response.json();
            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            updateAuthUI();
            hideProfileForm();
            alert('资料更新成功');
        } catch (error) {
            alert(error.message || '更新失败');
        }
    };

    // 上传头像
    window.uploadAvatar = async () => {
        const input = document.getElementById('avatarInput');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            // 检查文件类型
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                alert('只支持上传 JPG、PNG 和 GIF 格式的图片！');
                return;
            }

            // 检查文件大小
            if (file.size > 5 * 1024 * 1024) {
                alert('文件大小不能超过 5MB！');
                return;
            }

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
                    const error = await response.json();
                    throw new Error(error.message || '上传失败');
                }

                const user = await response.json();
                currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                // 更新头像显示
                document.getElementById('currentAvatar').src = user.avatar + '?t=' + new Date().getTime();
                alert('头像上传成功');
            } catch (error) {
                alert(error.message || '上传失败');
            }
        };
    };

    // 搜索功能
    window.search = async () => {
        const searchTerm = document.getElementById('searchInput').value.trim();
        if (!searchTerm) {
            loadPosts(); // 如果搜索词为空，显示所有帖子
            return;
        }

        try {
            const response = await fetch(`${API_URL}/posts/search?q=${encodeURIComponent(searchTerm)}`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            if (!response.ok) {
                throw new Error('搜索失败');
            }

            const posts = await response.json();
            renderPosts(posts);
        } catch (error) {
            console.error('搜索出错:', error);
            alert('搜索失败，请稍后重试');
        }
    };

    // 添加搜索框回车事件监听
    document.addEventListener('DOMContentLoaded', () => {
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                search();
            }
        });
    });

    // 切换发帖表单显示
    window.togglePostForm = () => {
        if (!currentUser) {
            alert('请先登录或注册');
            return;
        }
        
        const form = document.getElementById('newPostForm');
        const toggleBtn = document.getElementById('togglePostForm');
        
        if (form.style.display === 'none') {
            form.style.display = 'block';
            toggleBtn.textContent = '收起';
        } else {
            form.style.display = 'none';
            toggleBtn.textContent = '发布新帖子';
        }
    };

    // 初始化
    updateAuthUI();
    loadPosts();

    window.goToPost = function(postId) {
        window.location.href = `/post.html?id=${postId}`;
    }

    // 图片预览功能
    window.previewImage = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('imagePreview');
                preview.innerHTML = `
                    <div class="preview-container">
                        <img src="${e.target.result}" alt="预览图片">
                        <button type="button" class="remove-image" onclick="removeImage()">×</button>
                    </div>
                `;
            }
            reader.readAsDataURL(file);
        }
    };

    // 删除预览图片
    window.removeImage = function() {
        document.getElementById('postImage').value = '';
        document.getElementById('imagePreview').innerHTML = '';
    };
});
