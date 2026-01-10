# 设计文档：儿童学习提醒助手

## 概述

本项目是一个基于 Web 的儿童学习提醒应用，采用纯前端技术实现，无需后端服务器。

## 技术选型

| 技术 | 用途 | 选择理由 |
|------|------|----------|
| HTML5 | 页面结构 | 标准、兼容性好 |
| CSS3 | 样式设计 | 支持动画、渐变等现代特性 |
| JavaScript | 业务逻辑 | 浏览器原生支持，无需编译 |
| localStorage | 数据存储 | 简单易用，无需后端 |

## 架构设计

### 模块划分

```
┌─────────────────────────────────────────┐
│              index.html                  │
│  ┌─────────────────────────────────────┐│
│  │            UI Layer                  ││
│  │  计时显示 | 控制按钮 | 设置面板     ││
│  └─────────────────────────────────────┘│
│  ┌─────────────┐  ┌─────────────────────┐│
│  │  timer.js   │  │   reminder.js       ││
│  │  定时器模块 │  │   提醒模块          ││
│  └─────────────┘  └─────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │              app.js                  ││
│  │            主程序入口                ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### 模块职责

1. **Timer 模块** (`timer.js`)
   - 管理计时状态（空闲/运行/暂停）
   - 提供开始、暂停、重置功能
   - 支持设置提醒间隔
   - 提供时间格式化工具

2. **Reminder 模块** (`reminder.js`)
   - 显示提醒弹窗
   - 播放提示音
   - 管理提醒的显示和关闭

3. **App 主程序** (`app.js`)
   - 初始化各模块
   - 绑定 UI 事件
   - 协调模块间通信
   - 管理配置存储

## 状态管理

### 定时器状态机

```
        start()
  ┌───────────────┐
  │               ▼
┌─────┐       ┌─────────┐
│IDLE │       │ RUNNING │
└─────┘       └─────────┘
  ▲               │
  │    reset()    │ pause()
  │               ▼
  │           ┌────────┐
  └───────────│ PAUSED │
    reset()   └────────┘
                  │
                  │ start()
                  ▼
              ┌─────────┐
              │ RUNNING │
              └─────────┘
```

### 数据流

```
用户操作 → UI事件 → App处理 → 更新Timer/Reminder → 更新UI显示
                                    ↓
                              localStorage（配置持久化）
```

## 关键实现

### 1. 精确计时

使用 `setInterval` 每秒触发一次，累加计时秒数：

```javascript
this.timerId = setInterval(() => {
    this.elapsedSeconds++;
    this.tickCallback(this.elapsedSeconds);
}, 1000);
```

### 2. 提醒触发

当计时秒数达到设定间隔的整数倍时触发提醒：

```javascript
if (this.elapsedSeconds % this.reminderInterval === 0) {
    this.intervalReachedCallback();
}
```

### 3. 配置持久化

使用 localStorage 保存用户设置：

```javascript
localStorage.setItem('config', JSON.stringify(config));
```

## 扩展性设计

### V2.0 走神检测

预留了 `detector.js` 模块接口：

```javascript
class DistractionDetector {
    async init()           // 初始化摄像头
    start()                // 开始检测
    stop()                 // 停止检测
    onDistracted(callback) // 走神回调
}
```

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## 性能考虑

- 使用 CSS 动画代替 JavaScript 动画
- 定时器使用 `setInterval` 而非 `requestAnimationFrame`（精度足够）
- 提示音按需加载
