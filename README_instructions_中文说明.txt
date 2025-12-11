这是 GED 词汇学习网站的完整前端代码。

当前包里自带的 words.json 只是一个【示例小词库】，用于测试功能。
你已经在 ChatGPT 对话中构建了完整的 A–Z 词汇 JSON（约 1200+ 个单词），
需要在 GitHub 上将 words.json 的内容替换为你自己的完整版。

使用方法（在 GitHub Pages 上）：
1. 新建一个 GitHub 仓库，将本 ZIP 解压后的所有文件（index.html, script.js, style.css, words.json 等）上传到仓库根目录。
2. 在 GitHub 仓库中点击 words.json 文件 → 按 “Edit” 按钮。
3. 删除原本示例内容，把你在 ChatGPT 里整理好的 A–Z 完整 JSON 词库粘贴进去（注意保证是一个合法的 JSON 对象：用 { } 包住，键是英文单词，值是中文释义）。
4. 保存（Commit changes）。
5. 打开仓库的 Settings → Pages → 选择 main 分支 / root 目录，启用 GitHub Pages。
6. 等几分钟后，用 GitHub Pages 提供的链接访问你的在线 GED 词汇网站。

所有前端功能（SRS 记忆、单练模式、错题本、闪卡、连连看、深色模式、本地缓存等）已经就绪，
只要你把 words.json 换成自己的完整词库，网站就会自动使用全部单词。
