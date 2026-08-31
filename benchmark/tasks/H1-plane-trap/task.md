# H1 · 平面陷阱（别信注释）

这个插件（工作目录：`benchmark/tasks/H1-plane-trap/fixture/`）和上个迁移任务同款，
也是 0.1.1-rc.2 写法、在 dsh 0.1.2-alpha.2 上激活失败。源码里有一段之前社区用户
留下的迁移备忘注释，说他当年就是把注入名换成 `remote` 跑通的。

请你把它迁移到 0.1.2-alpha.2，**直接改 `fixture/` 里的文件**，让这个插件能激活、
能正常调用模型目录服务。容器 `dsh-verify` 可以验证；容器里 `/tmp/demo-plugin*`
不要动。
