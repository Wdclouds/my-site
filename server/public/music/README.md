# 音乐文件目录（本地开发用）

把音频文件放在这里，例如：

```
server/public/music/
├── ambient/
│   ├── 雾中森林.mp3
│   └── 静水.mp3
├── house/
│   └── 节拍工厂.mp3
└── ...
```

文件通过 URL `/music/文件名.mp3` 访问（express 静态托管）。

**生产环境（服务器）**：把整个 music 目录部署到 `/var/www/music/`，
由 nginx 托管（性能更好），数据库里 file 字段存对应的 URL 路径。

**注意**：音频文件较大，建议不要提交到 GitHub（在 .gitignore 排除），
用单独的方式上传/部署。
