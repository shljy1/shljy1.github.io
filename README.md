# shljy

shljy的个人网站。

**在线访问**: [https://shljy1.github.io/](https://shljy1.github.io/)

## 技术栈

| 类别     | 技术                                                                 |
| -------- | -------------------------------------------------------------------- |
| 框架     | [Nuxt 4](https://nuxt.com/) / [Vue 3](https://vuejs.org/)            |
| 构建     | [Vite](https://vitejs.dev/) (Nuxt 内置)                              |
| 样式     | [UnoCSS](https://unocss.dev/) + [Sass](https://sass-lang.com/)       |
| UI 组件  | [@pixelium/web-vue](https://www.npmjs.com/package/@pixelium/web-vue) |
| 类型检查 | [TypeScript](https://www.typescriptlang.org/)                        |
| CI/CD    | GitHub Actions                                                       |
| 部署     | GitHub Pages                                                         |

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建静态站点
npm run generate

# 预览构建结果
npm run preview
```

## 部署流程

本项目使用 GitHub Actions 自动部署到 GitHub Pages：

1. 代码推送到 `main` 分支
2. GitHub Actions 自动触发构建
3. 执行 `nuxt generate` 生成静态文件
4. 部署到 GitHub Pages

详细配置见 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

## 许可证

MIT
