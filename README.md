# Live 应援座位规划系统

场馆座位分配 · 应援色标记 · 物资统筹 · 换票管理

## 功能概览

- 🎫 **多区域座位管理**：支持创建多个场馆区域，自定义行列数
- 🌈 **应援色标记**：为每个座位分配应援色，直观可视化
- 📦 **物资汇总**：按区域汇总成员携带物资，支持数量统计
- 🔄 **换票管理**：记录换票状态，跟踪待处理/已确认/已换票
- 🖨️ **打印视图**：灵活配置打印内容，支持保存打印方案
- 🔍 **全局搜索**：跨区域搜索成员、座号、物资等信息
- 💾 **本地持久化**：数据自动保存到浏览器本地存储
- ↩️ **撤销/重做**：支持操作历史记录

## 主要页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 总览页 | `/` | 区域卡片 / 平面图视图 / 全局统计 / 换票待办 |
| 区域座位规划 | `/zone/:zoneId` | 座位网格 / 成员分配 / 批量操作 / 搜索定位 |
| 物资汇总 | `/supplies` | 按区域分组 / 物资统计 / 快速编辑 / 跳转座位 |
| 打印视图 | `/print` `/print/:zoneId` | 可配置打印方案 / 全场或单区域打印 |

## 技术栈

- **框架**：React 18 + TypeScript
- **构建工具**：Vite
- **路由**：React Router v7
- **状态管理**：Zustand
- **样式**：Tailwind CSS
- **图标**：Lucide React
- **测试**：Vitest
- **Lint**：ESLint + typescript-eslint

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

启动后访问 http://localhost:5173

### 类型检查

```bash
pnpm check
```

运行 TypeScript 类型检查（不生成产物）。

### Lint 检查

```bash
pnpm lint
```

运行 ESLint 代码检查。

### 运行测试

```bash
# 单次运行
pnpm test

# 监听模式
pnpm test:watch

# UI 界面
pnpm test:ui
```

### 构建生产版本

```bash
pnpm build
```

构建产物输出到 `dist` 目录。

### 本地预览构建产物

```bash
pnpm preview
```

## 代码质量校验

提交前建议运行完整校验：

```bash
pnpm verify
```

该命令会依次运行类型检查、Lint 检查和单元测试，确保代码质量。

## 项目结构

```
src/
├── components/     # 通用组件
├── pages/          # 页面组件
├── store/          # Zustand 状态管理
├── types/          # TypeScript 类型定义
├── lib/            # 工具函数
├── App.tsx         # 应用入口 & 路由配置
├── main.tsx        # 渲染入口
└── index.css       # 全局样式
```
