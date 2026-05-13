# Raimos 后台服务 — 部署指南

后台服务负责三件事（需要 Raimos 前端登录并完成云同步才能生效）：

- **AI 自动回复评论**：用户评论 AI 的朋友圈时，AI 自动回复。
- **AI 主动发消息**：AI 定时给你发消息（离线也能收到）。
- **AI 自动发朋友圈**：AI 模拟真人，定时发带天气/心情的朋友圈。

> 后台只处理你自己的数据，`RAIMOS_UID` 决定服务谁——每个人部署自己的实例，互不干扰。

---

## 方式一：Railway 部署（推荐，免费）

### 第一步：Fork 仓库

登录 GitHub，打开 Raimos 仓库页面，点右上角 **Fork**，把代码复制到你自己的账号下。

### 第二步：准备 Firebase 服务账号 JSON

1. 打开 [Firebase 控制台](https://console.firebase.google.com/) → 进入你的项目。
2. 点左侧「⚙️ 项目设置」→ 上方标签「服务账号」。
3. 点「生成新的私钥」→「生成密钥」→ 下载 `.json` 文件（**不要分享给任何人**）。
4. 用记事本打开，**全选复制**里面的所有内容（一大串花括号内容）。

### 第三步：找到你的 Firebase 用户 UID

1. Firebase 控制台 → 左侧「构建」→「Authentication」→「Users」。
2. 找到你的账号，复制「用户 UID」列的内容（一串字母数字）。

### 第四步：在 Railway 创建项目

1. 注册/登录 [Railway](https://railway.app/)（可用 GitHub 账号一键登录）。
2. 点「New Project」→「Deploy from GitHub repo」→ 选择你 Fork 的 Raimos 仓库。
3. Railway 会自动检测，**先不要点 Deploy**。

### 第五步：设置环境变量

点「Variables」标签，逐条添加：

| 变量名 | 填写内容 |
|--------|---------|
| `FIREBASE_SERVICE_ACCOUNT` | 第二步复制的 JSON 全文（从 `{` 到 `}`） |
| `RAIMOS_UID` | 第三步复制的用户 UID |
| `OPENROUTER_API_KEY` | 你的 OpenRouter API Key（可选，没有也行） |

### 第六步：设置根目录

1. 点「Settings」→「Service」→「Root Directory」。
2. 填入 `backend`，保存。

> 如果 Railway 自动检测到了 `railway.json`，这步可以跳过。

### 第七步：部署并获取访问地址

1. 回到「Deployments」，点「Deploy」。
2. 等 1~2 分钟，看到绿色「✓ Active」表示成功。
3. 点「Settings」→「Networking」→「Generate Domain」，得到类似 `https://raimos-xxx.up.railway.app` 的网址。

### 第八步：填入前端设置（最重要！）

打开 Raimos 前端 → **⚙️ 设置**，做以下配置：

**🚂 后台服务：**
- 「后台服务地址」填入第七步的 Railway 网址

**🐾 主动消息（如需 AI 主动给你发消息）：**
- 勾选「启用」
- **「发消息的助手」下拉框选择对应 AI 助手** ← 不选这步后台不知道用谁

**🌸 朋友圈（如需 AI 自动发朋友圈）：**
- 勾选「AI 自动发圈」
- **「发圈的助手」下拉框选择对应 AI 助手** ← 同上，必须选

配置完点「💾 保存设置」，然后点「☁️ 上传同步」，把配置推送到 Firestore，后台才能读取到。

### 第九步（可选）：开启推送通知

1. 部署完成后，查看 Railway 日志（Deployments → 点最新一条 → 查看 Logs）。
2. 如果看到类似 `VAPID_PUBLIC_KEY=xxx` 的日志，复制这两行。
3. 回到 Railway「Variables」，添加 `VAPID_PUBLIC_KEY` 和 `VAPID_PRIVATE_KEY`，重新部署。
4. 前端「⚙️ 设置 → 🚂 后台服务」开启「消息推送通知」，点「🔔 立即订阅」。

---

## 方式二：自己有服务器（VPS / NAS）

### 环境要求

- Node.js 18 或以上（`node -v` 检查）
- npm

### 步骤

```bash
# 1. 克隆或上传代码
git clone https://github.com/你的用户名/Raimos.git
cd Raimos/backend

# 2. 安装依赖
npm install

# 3. 创建环境变量文件
cp .env.example .env
# 用文本编辑器打开 .env，填入各项变量

# 4. 启动（开发测试）
npm start
# 看到 "[Raimos Backend] ✓ Ready" 说明成功
```

### 后台常驻运行（推荐 PM2）

```bash
npm install -g pm2
pm2 start index.js --name raimos-backend
pm2 startup && pm2 save
```

验证：
```bash
curl http://localhost:3000
# 返回 {"status":"ok","ts":...} 说明正常
```

把服务器公网 IP 或域名填入 Raimos「设置 → 🚂 后台服务 → 后台服务地址」。

---

## 环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `FIREBASE_SERVICE_ACCOUNT` | ✅ | Firebase 服务账号完整 JSON（单行） |
| `RAIMOS_UID` | ✅ | 要服务的用户 Firebase UID |
| `OPENROUTER_API_KEY` | 可选 | 后备 AI API Key（优先用前端存的 Key） |
| `PORT` | 可选 | HTTP 端口，默认 3000（Railway 自动注入） |
| `VAPID_PUBLIC_KEY` | 可选 | Web Push 公钥（第一次启动后从日志复制） |
| `VAPID_PRIVATE_KEY` | 可选 | Web Push 私钥（同上） |

---

## 常见问题

**Q：后台一直不发消息/朋友圈？**

最常见原因：前端设置里没有选「发消息的助手」或「发圈的助手」，或者选了但没有点「☁️ 上传同步」。后台读不到助手 ID，就不知道用谁来执行。

**Q：部署失败，日志报错？**

检查 `FIREBASE_SERVICE_ACCOUNT` 是否是完整 JSON，从 `{` 开始 `}` 结束，不能有额外引号或换行。

**Q：Railway 免费额度够用吗？**

够用。后台非常轻量（主要是监听 Firestore），每月 $5 免费额度完全覆盖。

**Q：测试连接失败？**

确认 Railway 已生成域名（Settings → Networking → Generate Domain），且填写时末尾没有多余的 `/`。
