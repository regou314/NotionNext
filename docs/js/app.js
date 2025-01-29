// 文档配置
let config = { menu: [] };

// 加载目录配置
async function loadConfig() {
    try {
        const response = await fetch('content/menu.json');
        if (!response.ok) throw new Error('配置加载失败');
        config = await response.json();
    } catch (error) {
        console.error('加载配置失败:', error);
    }
}

// 生成侧边栏菜单
function generateMenu(menuItems, parent = document.getElementById('sidebar-menu')) {
    menuItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'nav-item';

        if (item.children) {
            // 创建带子菜单的项目
            const a = document.createElement('a');
            a.className = 'nav-link parent-menu';
            a.href = '#';
            a.textContent = item.title;
            
            // 添加展开/收起指示器
            const indicator = document.createElement('span');
            indicator.className = 'menu-indicator';
            indicator.textContent = '▼';
            a.appendChild(indicator);
            
            // 添加点击事件处理
            a.onclick = (e) => {
                e.preventDefault();
                const submenu = li.querySelector('ul');
                const indicator = a.querySelector('.menu-indicator');
                
                if (submenu.style.display === 'none') {
                    submenu.style.display = 'block';
                    submenu.style.maxHeight = submenu.scrollHeight + 'px';
                    indicator.textContent = '▼';
                    indicator.style.transform = 'rotate(0deg)';
                } else {
                    submenu.style.maxHeight = '0';
                    setTimeout(() => {
                        submenu.style.display = 'none';
                    }, 300);
                    indicator.textContent = '▼';
                    indicator.style.transform = 'rotate(-90deg)';
                }
            };
            
            li.appendChild(a);

            const ul = document.createElement('ul');
            ul.className = 'nav flex-column ms-3 submenu';
            ul.style.display = 'block'; // 默认展开
            ul.style.maxHeight = 'none'; // 初始状态不限制高度
            li.appendChild(ul);

            generateMenu(item.children, ul);
        } else {
            // 创建普通菜单项
            const a = document.createElement('a');
            a.className = 'nav-link';
            a.href = '#' + item.path;
            a.textContent = item.title;
            a.onclick = (e) => {
                e.preventDefault();
                loadContent(item.path);
                // 在移动端视图下收起导航栏
                if (window.innerWidth < 768) {
                    const sidebar = document.querySelector('.sidebar');
                    if (sidebar.classList.contains('show')) {
                        bootstrap.Collapse.getInstance(sidebar).hide();
                    }
                }
            };
            li.appendChild(a);
        }

        parent.appendChild(li);
    });
}

// 生成页内导航
function generatePageNav() {
    const pageMenu = document.getElementById('page-menu');
    pageMenu.innerHTML = '';
    
    const headings = document.querySelectorAll('#content h2, #content h3, #content h4, #content h5, #content h6');
    headings.forEach(heading => {
        const li = document.createElement('li');
        li.className = 'nav-item';
        
        const a = document.createElement('a');
        a.className = 'nav-link';
        a.href = '#' + heading.id;
        a.textContent = heading.textContent;
        a.style.paddingLeft = (heading.tagName[1] - 1) + 'rem';
        
        a.onclick = (e) => {
            e.preventDefault();
            const navbarHeight = 72; // 固定导航栏的高度
            const targetPosition = heading.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        };
        
        li.appendChild(a);
        pageMenu.appendChild(li);
    });
}

// 更新页内导航激活状态
function updatePageNavActive() {
    const headings = Array.from(document.querySelectorAll('#content h2, #content h3, #content h4, #content h5, #content h6'));
    const pageLinks = document.querySelectorAll('.page-nav .nav-link');
    
    const activeIndex = headings.findIndex(heading => {
        const rect = heading.getBoundingClientRect();
        const navbarHeight = 72; // 固定导航栏的高度
        return rect.top >= navbarHeight && rect.top <= (window.innerHeight / 2 + navbarHeight);
    });
    
    pageLinks.forEach(link => link.classList.remove('active'));
    if (activeIndex >= 0 && pageLinks[activeIndex]) {
        pageLinks[activeIndex].classList.add('active');
    }
}

// 加载Markdown内容
async function loadContent(path) {
    try {
        const response = await fetch(`content/${path}`);
        if (!response.ok) throw new Error('文档加载失败');
        
        const markdown = await response.text();
        // 配置marked以处理相对链接
        marked.use({
            renderer: {
                link(href, title, text) {
                    if (href && !href.startsWith('http') && !href.startsWith('#')) {
                        // 处理相对路径链接
                        return `<a href="#${href}" onclick="event.preventDefault(); loadContent('${href}');">${text}</a>`;
                    }
                    return `<a href="${href}"${title ? ` title="${title}"` : ''}>${text}</a>`;
                }
            }
        });
        
        const html = marked.parse(markdown);
        document.getElementById('content').innerHTML = html;
        
        // 为标题添加ID
        document.querySelectorAll('#content h2, #content h3, #content h4, #content h5, #content h6').forEach((heading, index) => {
            heading.id = 'heading-' + index;
        });
        
        // 生成页内导航
        generatePageNav();
        
        // 代码高亮
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
        
        // 更新URL hash
        window.location.hash = path;
        
        // 滚动到文档顶部
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // 初始更新导航激活状态
        updatePageNavActive();
    } catch (error) {
        console.error('加载文档失败:', error);
        document.getElementById('content').innerHTML = `<div class="alert alert-danger">文档加载失败</div>`;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 先加载配置
    await loadConfig();
    
    // 生成菜单
    generateMenu(config.menu);
    
    // 根据URL hash加载初始内容
    const initialPath = window.location.hash.slice(1) || 'quick-start.md';
    loadContent(initialPath);
    
    // 添加滚动监听
    window.addEventListener('scroll', () => {
        requestAnimationFrame(updatePageNavActive);
    });
    
    // 添加点击空白区域收起导航栏的功能
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const navbarToggler = document.querySelector('.navbar-toggler');
        
        // 检查点击区域是否在导航栏和切换按钮之外
        if (!sidebar.contains(e.target) && !navbarToggler.contains(e.target) && sidebar.classList.contains('show')) {
            // 收起导航栏
            sidebar.classList.remove('show');
        }
    });
});