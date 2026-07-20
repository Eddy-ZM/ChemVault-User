# ChemVault User Center

ChemVault User Center 是 ChemVault 的统一账号与权限中心，面向 ChemVault 各网站服务提供登录、身份资料、服务访问、邮箱绑定和后台管理能力。

正式入口：

- `https://user.chemvault.science`

## 网站定位

ChemVault User Center 用于集中管理 ChemVault 用户身份。用户可在这里创建账号、登录 ChemVault 服务、维护个人资料、连接第三方登录方式、申请或绑定 ChemVault 邮箱，并查看自己可访问的 ChemVault 服务。

User Center 也是账户数据生命周期的唯一入口：用户可请求跨服务数据导出或永久删除；删除只有在 Files、Lab、Notifications、Mail 和兼容 Extract 服务全部确认后才完成，失败任务保留状态供重试。

管理员可通过后台统一管理用户、权限、服务访问范围、页面访问范围、邮箱账号和操作记录。

## 面向用户的功能

### 注册与登录

- 支持邮箱账号注册和登录。
- 支持 ChemVault Mail 账号登录入口。
- 支持 Apple Account、Google、Microsoft 和 GitHub 登录。
- 登录后可返回原本访问的 ChemVault 服务页面。
- 生产环境注册流程包含人机验证，减少批量注册和滥用。

### 用户仪表盘

- 展示当前账号状态和基础资料。
- 展示可访问的 ChemVault 服务。
- 展示账号使用概览和服务入口。
- 为未完成资料或邮箱配置的用户提供引导入口。

### 个人资料

- 修改姓名、机构、研究方向、个人简介等资料。
- 查看账号邮箱、账号来源、角色和状态。
- 维护头像链接等公开资料信息。

### 安全设置

- 修改账号密码。
- 连接或解绑 Apple Account、Google、Microsoft、GitHub 等登录方式。
- 防止用户解绑最后一个可用登录方式导致账号无法登录。
- 支持用户主动删除自己的账号。

### ChemVault 邮箱

- 已有 ChemVault 邮箱的用户可绑定自己的邮箱账号。
- 没有 ChemVault 邮箱的用户可提交邮箱申请。
- 支持查看邮箱绑定状态和可用权限。
- 邮箱申请会发送给 ChemVault 管理团队处理。

### ChemVault 服务访问

User Center 为以下 ChemVault 服务提供统一账号与访问判断：

- ChemVault App
- ChemVault File
- ChemVault Docs
- ChemVault Model
- ChemVault Extract
- ChemVault Molecule
- ChemVault Notification

用户登录后，各服务可识别当前用户身份，并根据账号权限展示对应内容。

### 会员与计划

- 用户可查看当前账号计划。
- 计划页面用于展示账号等级、会员状态和可用权益。

## 管理后台功能

### 总览

- 展示用户数量、服务状态、近期操作记录等管理概览。
- 为用户、权限、邮箱和同步管理提供快捷入口。

### 用户管理

- 查看用户列表。
- 按关键词、角色和状态筛选用户。
- 查看用户详情、资料、服务访问、权限和操作记录。
- 修改用户角色和账号状态。
- 删除普通用户账号。
- 对高权限账号提供保护，避免被普通管理员降级或删除。

### 权限管理

- 管理全局权限定义。
- 为用户配置直接授权或拒绝。
- 除 ChemVault Mail 收发、接收和登录权限外，服务、页面、文件、文档、模型、API 和后台权限均由 User Center 统一设置。
- 支持按 User System 默认规则和用户直接规则计算最终权限。
- 支持针对具体服务和页面的访问控制。

### 服务与页面访问

- 控制用户是否可以访问指定 ChemVault 服务。
- 控制用户是否可以访问指定服务页面。
- 支持启用、禁用、暂停等访问状态。

### 邮箱账号管理

- 为用户创建或分配 ChemVault 邮箱。
- 管理邮箱地址、显示名称、邮箱状态、配额和别名。
- 邮箱访问、发送、接收和登录行为遵循 ChemVault Mail 中分配的 Mail role。
- 支持邮箱账号软删除。

### 邮箱系统同步

- 支持导入 ChemVault Mail 管理员和超级管理员列表作为审计参考。
- 支持接收 ChemVault Mail 推送的新用户和邮箱账号信息。
- ChemVault Mail 同步不会自动授予 User Center 管理员角色；Mail 收发权限由 ChemVault Mail role 决定。
- 同步结果会显示在管理记录中，便于追踪和审计。

### 审计记录

- 记录管理员对用户、权限、邮箱和账号状态的关键操作。
- 用户详情页可查看该用户相关的操作历史。
- 管理后台可查看近期系统操作记录。

## 页面范围

### 用户页面

- 登录
- 注册
- 仪表盘
- 个人资料
- 安全设置
- 服务列表
- 邮箱引导
- 会员计划
- 法务与协议页面

### 管理员页面

- 管理后台首页
- 用户列表
- 用户详情
- 用户权限
- 用户服务访问
- 用户页面访问
- 权限中心
- 邮箱账号管理
- 邮箱同步管理

## 产品边界

- User Center 负责 ChemVault 统一账号、登录、权限和邮箱账号管理。
- 除 ChemVault Mail 的访问、发送、接收和登录行为遵循 Mail role 外，其他 ChemVault 服务访问、页面访问和功能权限均由 User Center 统一配置与下发。
- 具体业务功能由各 ChemVault 服务网站提供。
- 第三方登录仅用于确认用户身份，不代表 ChemVault 会获取第三方服务中的业务数据。
- ChemVault 邮箱绑定和申请用于连接 ChemVault 账号体系与 ChemVault Mail 服务。
- ChemVault Mail 是邮箱身份、邮箱资料和 Mail role 的来源；邮件收发与登录按 Mail role 执行，不在 User Center 单独配置。

## 版权

ChemVault User Center 是 ChemVault 账号体系的一部分。未经仓库所有者或 ChemVault 项目负责人书面许可，不得复制、分发、部署或用于衍生项目。
