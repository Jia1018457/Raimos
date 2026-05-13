# Raimos 后台服务 — 部署指南

后台服务负责三件事：
- **AI 自动回复评论**：有人评论朋友圈时，AI 自动回复。
- **AI 主动发消息**：AI 定时给你发暖心短信。
- **AI 自动发朋友圈**：AI 模拟真人，定时发带天气/心情的朋友圈。

---

## 方式一：Railway 一键部署（推荐，完全免费）

> 不需要懂代码，按步骤来就行。全程约 15 分钟。

### 第一步：准备 Firebase 服务账号 JSON

1. 打开 [Firebase 控制台](https://console.firebase.google.com/) → 进入你的项目。
2. 点左侧菜单「⚙️ 项目设置」→ 上方标签「服务账号」。
3. 点「生成新的私钥」→ 点「生成密钥」→ 会下载一个 `.json` 文件（**不要分享给任何人**）。
4. 用记事本打开这个文件，**全选复制**里面的所有内容（就是一大串花括号开头的文字）。

### 第二步：找到你的 Firebase 用户 UID

1. 在 Firebase 控制台 → 左侧菜单「构建」→「Authentication」。
2. 点「Users」标签，找到你的账号，复制「用户 UID」那一列的内容（一串字母数字）。

### 第三步：在 Railway 部署

1. 注册/登录 [Railway](https://railway.app/)（可用 GitHub 账号一键登录）。
2. 点右上角「New Project」→「Deploy from GitHub repo」。
3. 授权 Railway 访问你的 GitHub，然后选择你 fork 的 Raimos 仓库。
4. Railway 会自动检测到项目，**先不要点 Deploy**，继续下一步。

### 第四步：设置环境变量

在 Railway 项目页面，点「Variables」标签，逐条添加以下变量：

| 变量名 | 填写内容 |
|--------|---------|
| `FIREBASE_SERVICE_ACCOUNT` | 第一步复制的 JSON 全文（一大段花括号内容） |
| `RAIMOS_UID` | 第二步复制的用户 UID |
| `OPENROUTER_API_KEY` | 你的 OpenRouter API Key（可选，没有也行） |

> **小技巧**：`FIREBASE_SERVICE_ACCOUNT` 内容很长，直接粘贴进去就行，Railway 会自动处理。

### 第五步：设置根目录

因为后台代码在 `backend/` 子文件夹里，需要告诉 Railway 从哪里运行：

1. 在 Railway 项目页面，点「Settings」→「Service」→「Root Directory」。
2. 填入 `backend`，然后保存。

### 第六步：部署

1. 回到「Deployments」标签，点「Deploy」。
2. 等待 1~2 分钟，看到绿色「✓ Active」就代表部署成功了。
3. 点「Settings」→「Networking」→「Generate Domain」，Railway 会给你一个网址，类似 `https://raimos-backend-xxxx.up.railway.app`。

### 第七步：填入前端设置

1. 打开 Raimos 前端 → 进入「⚙️ 设置」→「🚀 后台服务」。
2. 把第六步得到的网址填进「后台服务地址」输入框。
3. 点「🔗 测试」，显示「✅ 连接成功」说明一切正常。
4. 点「💾 保存设置」→「☁️ 上传同步」，把设置同步到云端，后台才能读取到你的配置。

---

### 常见问题

**Q：部署失败，日志里出现红色错误怎么办？**

检查「Variables」里的变量是否填写正确：
- `FIREBASE_SERVICE_ACCOUNT` 必须是完整的 JSON，从 `{` 开始到 `}` 结束。
- 确保没有多余的换行或引号包裹。

**Q：测试连接显示「❌ 无法连接」？**

- 等待 Railway 完成部署（通常 1~2 分钟）。
- 检查 Railway「Settings → Networking」里是否已生成域名。
- 检查填写的网址没有末尾多余的 `/`。

**Q：Railway 免费额度够用吗？**

Railway 免费套餐提供每月 $5 额度，后台服务非常轻量（基本只是监听 Firestore），正常使用完全够用。

**Q：后台一直不发朋友圈/消息？**

1. 确认在 Raimos「⚙️ 设置」里已开启对应功能（AI 自动发朋友圈、AI 主动发消息）。
2. 确认「发圈的助手ID」「发消息的助手ID」已正确填写（长按联系人可查看 ID）。
3. 点「💾 保存设置」→「☁️ 上传同步」，让后台读取最新配置。
4. 后台每 10 分钟检查一次，请耐心等待。

---

## 方式二：自己有服务器（VPS / NAS）

适合有 Linux 服务器或 NAS（群晖、威联通等）的用户。

### 环境要求

- Node.js 18 或以上（运行 `node -v` 检查）
- npm（随 Node.js 一起安装）

### 步骤

```bash
# 1. 克隆代码（或把 backend/ 文件夹上传到服务器）
git clone https://github.com/你的用户名/Raimos.git
cd Raimos/backend

# 2. 安装依赖
npm install

# 3. 创建环境变量文件
cp .env.example .env
```

编辑 `.env` 文件，填入以下内容：

```env
# Firebase 服务账号 JSON（整段粘贴，必须在一行内）
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}

# 你的 Firebase 用户 UID
RAIMOS_UID=你的UID

# OpenRouter API Key（可选）
OPENROUTER_API_KEY=sk-or-v1-...

# HTTP 端口（默认 3000，可改）
PORT=3000
```

```bash
# 4. 启动后台（开发测试用）
npm start

# 看到 "[Raimos Backend] ✓ Ready" 说明启动成功
```

### 后台常驻运行（推荐用 PM2）

```bash
# 安装 PM2
npm install -g pm2

# 启动并常驻
pm2 start index.js --name raimos-backend

# 开机自启
pm2 startup
pm2 save
```

### 验证运行状态

```bash
curl http://localhost:3000
# 返回 {"status":"ok","ts":...,"uid":"..."} 说明正常
```

把服务器的公网 IP 或域名填入 Raimos「⚙️ 设置 → 🚀 后台服务 → 后台服务地址」，格式如 `http://your-server-ip:3000`（如有域名和 HTTPS 则填 `https://your-domain.com`）。

### 防火墙

确保服务器开放了 3000 端口（或你自定义的端口）的入站流量。

---

## 环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `FIREBASE_SERVICE_ACCOUNT` | ✅ 必填 | Firebase 服务账号完整 JSON（单行） |
| `RAIMOS_UID` | ✅ 必填 | 要服务的用户的 Firebase UID |
| `OPENROUTER_API_KEY` | 可选 | 后备 AI API Key（优先使用用户在前端存储的 Key） |
| `PORT` | 可选 | HTTP 健康检查端口，默认 3000 |
