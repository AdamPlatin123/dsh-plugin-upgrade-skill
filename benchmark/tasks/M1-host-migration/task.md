# M1 · 宿主插件迁移（基础迁移题）

我维护一个 DSH 插件（工作目录：`benchmark/tasks/M1-host-migration/fixture/`），
它按 dsh 0.1.1-rc.2 时代的 API 编写。我们宿主已升级到 dsh 0.1.2-alpha.2，
现在它激活不了。请你：

1. 找出它在 0.1.2-alpha.2 上激活失败的原因；
2. 把插件源码迁移好，**直接改 `fixture/` 里的文件**；
3. 可选：把迁移报告写到 `benchmark/agent-output/M1-host-migration/` 下。

目标只有一个：这个插件在 dsh 0.1.2-alpha.2 上能激活、能正常调用模型目录服务。
环境里有一个 Docker 容器 `dsh-verify`（dsh 0.1.2-alpha.2 已全局安装），你可以
用它来验证；容器里 `/tmp/demo-plugin*` 是别人的东西，不要动。
