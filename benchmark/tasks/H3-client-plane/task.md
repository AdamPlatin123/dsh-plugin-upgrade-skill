# H3 · 客户端平面（能装能激活，浏览器里也得在名册上）

我还有一个浏览器插件（工作目录：`benchmark/tasks/H3-client-plane/fixture/`），
0.1.1 时代的写法，页面上往输入框贴剪贴板内容那种。宿主已经升到 dsh
0.1.2-alpha.2，麻烦你把它迁移好：**直接改 `fixture/` 里的文件**，让它在
0.1.2-alpha.2 上能装、能激活，浏览器侧也能真正加载到它。

容器 `dsh-verify` 可以验证（`dsh web` 能起）；容器里 `/tmp/demo-plugin*` 不要动。
