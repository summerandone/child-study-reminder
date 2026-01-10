/**
 * App 主程序入口
 * 负责初始化和协调各模块
 */

// 配置键名
const CONFIG_KEY = 'childStudyReminderConfig';

// 默认配置
const DEFAULT_CONFIG = {
    reminderInterval: 25,      // 提醒间隔（分钟）
    soundEnabled: true,        // 是否启用声音
    autoMode: false,           // 是否启用智能模式（摄像头）
    distractionThreshold: 5    // 走神阈值（秒）
};

/**
 * App 类 - 主程序
 */
class App {
    constructor() {
        // 创建模块实例
        this.timer = new Timer();
        this.reminder = new Reminder();
        this.detector = new DistractionDetector();
        
        // 加载配置
        this.config = this.loadConfig();
        
        // DOM元素引用
        this.timerDisplay = null;
        this.timerStatus = null;
        this.startBtn = null;
        this.pauseBtn = null;
        this.resetBtn = null;
        this.settingsBtn = null;
        this.settingsPanel = null;
        this.intervalInput = null;
        this.soundEnabledCheckbox = null;
        this.saveSettingsBtn = null;
        // V2.0 新增
        this.autoModeSwitch = null;
        this.cameraSection = null;
        this.cameraPreview = null;
        this.cameraStatus = null;
        this.distractionThresholdInput = null;
    }

    /**
     * 初始化应用
     */
    init() {
        // 获取DOM元素
        this.timerDisplay = document.getElementById('timer');
        this.timerStatus = document.getElementById('timerStatus');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.intervalInput = document.getElementById('intervalInput');
        this.soundEnabledCheckbox = document.getElementById('soundEnabled');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        // V2.0 新增
        this.autoModeSwitch = document.getElementById('autoModeSwitch');
        this.cameraSection = document.getElementById('cameraSection');
        this.cameraPreview = document.getElementById('cameraPreview');
        this.cameraStatus = document.getElementById('cameraStatus');
        this.distractionThresholdInput = document.getElementById('distractionThreshold');

        // 初始化提醒模块
        this.reminder.init();

        // 应用配置
        this.applyConfig();

        // 绑定事件
        this.bindEvents();

        // 设置定时器回调
        this.setupTimerCallbacks();

        // 设置检测器回调
        this.setupDetectorCallbacks();

        console.log('儿童学习提醒助手已启动！');
    }

    /**
     * 绑定UI事件
     */
    bindEvents() {
        // 开始按钮
        this.startBtn.addEventListener('click', () => {
            this.handleStart();
        });

        // 暂停按钮
        this.pauseBtn.addEventListener('click', () => {
            this.handlePause();
        });

        // 重置按钮
        this.resetBtn.addEventListener('click', () => {
            this.handleReset();
        });

        // 设置按钮
        this.settingsBtn.addEventListener('click', () => {
            this.toggleSettings();
        });

        // 保存设置按钮
        this.saveSettingsBtn.addEventListener('click', () => {
            this.saveSettings();
        });

        // 提醒关闭回调
        this.reminder.onDismiss(() => {
            this.handleReminderDismiss();
        });

        // V2.0: 智能模式切换
        if (this.autoModeSwitch) {
            this.autoModeSwitch.addEventListener('change', () => {
                this.toggleAutoMode();
            });
        }
    }

    /**
     * 设置定时器回调
     */
    setupTimerCallbacks() {
        // 每秒更新显示
        this.timer.onTick((seconds) => {
            this.updateDisplay(seconds);
        });

        // 到达提醒间隔
        this.timer.onIntervalReached(() => {
            this.handleIntervalReached();
        });
    }

    /**
     * 设置检测器回调 (V2.0)
     */
    setupDetectorCallbacks() {
        // 检测到人坐下
        this.detector.onPersonDetected(() => {
            this.updateCameraStatus('检测到你了！开始学习吧~', 'detecting');
            this.updateTimerStatus('检测到你坐下了，自动开始计时', 'active');
            // 自动开始计时
            if (this.config.autoMode && this.timer.getState() !== TimerState.RUNNING) {
                this.timer.start();
                this.updateButtonStates();
            }
        });

        // 人离开
        this.detector.onPersonLeft(() => {
            this.updateCameraStatus('没有检测到你，暂停计时', '');
            this.updateTimerStatus('你离开了，计时已暂停', 'warning');
            // 自动暂停
            if (this.config.autoMode) {
                this.timer.pause();
                this.updateButtonStates();
            }
        });

        // 走神
        this.detector.onDistracted(() => {
            this.updateCameraStatus('请专心学习哦！', 'warning');
            this.reminder.showFocusReminder();
        });

        // 恢复专注
        this.detector.onFocused(() => {
            this.updateCameraStatus('很棒！继续保持专注~', 'detecting');
            this.reminder.dismiss();
        });

        // 错误处理
        this.detector.onError((message) => {
            this.showError(message);
            // 关闭智能模式
            this.config.autoMode = false;
            this.autoModeSwitch.checked = false;
            this.cameraSection.classList.add('hidden');
        });
    }

    /**
     * 切换智能模式 (V2.0)
     */
    async toggleAutoMode() {
        const enabled = this.autoModeSwitch.checked;
        
        if (enabled) {
            // 启用智能模式
            this.cameraSection.classList.remove('hidden');
            this.updateCameraStatus('正在初始化摄像头...', '');
            
            const success = await this.detector.init(this.cameraPreview);
            
            if (success) {
                this.config.autoMode = true;
                this.detector.start();
                this.updateCameraStatus('等待检测...', '');
                // 隐藏手动控制按钮
                this.startBtn.style.display = 'none';
                this.pauseBtn.style.display = 'none';
                this.updateTimerStatus('智能模式：坐下自动开始计时', '');
            } else {
                this.autoModeSwitch.checked = false;
                this.cameraSection.classList.add('hidden');
            }
        } else {
            // 关闭智能模式
            this.config.autoMode = false;
            this.detector.close();
            this.cameraSection.classList.add('hidden');
            // 显示手动控制按钮
            this.startBtn.style.display = '';
            this.pauseBtn.style.display = '';
            this.updateTimerStatus('点击开始学习', '');
        }

        this.saveConfig();
    }

    /**
     * 更新摄像头状态显示
     */
    updateCameraStatus(text, className) {
        if (this.cameraStatus) {
            this.cameraStatus.textContent = text;
            this.cameraStatus.className = 'camera-status ' + className;
        }
    }

    /**
     * 更新计时器状态显示
     */
    updateTimerStatus(text, className) {
        if (this.timerStatus) {
            this.timerStatus.textContent = text;
            this.timerStatus.className = 'timer-status ' + (className || '');
        }
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        // 创建错误提示元素
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        // 插入到摄像头区域后面
        this.cameraSection.after(errorDiv);
        
        // 5秒后自动移除
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    /**
     * 处理开始按钮点击
     */
    handleStart() {
        this.timer.start();
        this.updateButtonStates();
        this.updateTimerStatus('学习中...加油！', 'active');
    }

    /**
     * 处理暂停按钮点击
     */
    handlePause() {
        this.timer.pause();
        this.updateButtonStates();
        this.updateTimerStatus('已暂停', '');
    }

    /**
     * 处理重置按钮点击
     */
    handleReset() {
        this.timer.reset();
        this.updateButtonStates();
        this.updateTimerStatus('点击开始学习', '');
    }

    /**
     * 处理到达提醒间隔
     */
    handleIntervalReached() {
        // 暂停计时
        this.timer.pause();
        this.updateButtonStates();
        this.updateTimerStatus('休息时间到！', 'warning');
        
        // 显示休息提醒
        this.reminder.showBreakReminder();
    }

    /**
     * 处理提醒关闭
     */
    handleReminderDismiss() {
        // 重置计时器并重新开始
        this.timer.reset();
        this.timer.start();
        this.updateButtonStates();
        this.updateTimerStatus('学习中...加油！', 'active');
    }

    /**
     * 更新计时显示
     * @param {number} seconds - 秒数
     */
    updateDisplay(seconds) {
        if (this.timerDisplay) {
            this.timerDisplay.textContent = Timer.formatTime(seconds);
        }
    }

    /**
     * 更新按钮状态
     */
    updateButtonStates() {
        const state = this.timer.getState();

        switch (state) {
            case TimerState.IDLE:
                this.startBtn.disabled = false;
                this.startBtn.textContent = '开始学习';
                this.pauseBtn.disabled = true;
                break;
            case TimerState.RUNNING:
                this.startBtn.disabled = true;
                this.pauseBtn.disabled = false;
                break;
            case TimerState.PAUSED:
                this.startBtn.disabled = false;
                this.startBtn.textContent = '继续学习';
                this.pauseBtn.disabled = true;
                break;
        }
    }

    /**
     * 切换设置面板显示
     */
    toggleSettings() {
        if (this.settingsPanel) {
            this.settingsPanel.classList.toggle('hidden');
        }
    }

    /**
     * 保存设置
     */
    saveSettings() {
        // 获取输入值
        const interval = parseInt(this.intervalInput.value, 10);
        const soundEnabled = this.soundEnabledCheckbox.checked;
        const distractionThreshold = parseInt(this.distractionThresholdInput.value, 10);

        // 验证
        if (interval < 1 || interval > 120) {
            alert('提醒间隔请设置在1-120分钟之间');
            return;
        }

        if (distractionThreshold < 3 || distractionThreshold > 30) {
            alert('走神阈值请设置在3-30秒之间');
            return;
        }

        // 更新配置
        this.config.reminderInterval = interval;
        this.config.soundEnabled = soundEnabled;
        this.config.distractionThreshold = distractionThreshold;

        // 保存到localStorage
        this.saveConfig();

        // 应用配置
        this.applyConfig();

        // 隐藏设置面板
        this.settingsPanel.classList.add('hidden');

        console.log('设置已保存:', this.config);
    }

    /**
     * 应用配置
     */
    applyConfig() {
        // 设置定时器间隔
        this.timer.setInterval(this.config.reminderInterval);
        
        // 设置提醒声音
        this.reminder.setSoundEnabled(this.config.soundEnabled);

        // 设置走神阈值
        this.detector.setDistractionThreshold(this.config.distractionThreshold);

        // 更新UI显示
        if (this.intervalInput) {
            this.intervalInput.value = this.config.reminderInterval;
        }
        if (this.soundEnabledCheckbox) {
            this.soundEnabledCheckbox.checked = this.config.soundEnabled;
        }
        if (this.distractionThresholdInput) {
            this.distractionThresholdInput.value = this.config.distractionThreshold;
        }
        if (this.autoModeSwitch) {
            this.autoModeSwitch.checked = this.config.autoMode;
        }
    }

    /**
     * 加载配置
     * @returns {Object} 配置对象
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem(CONFIG_KEY);
            if (saved) {
                return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('无法读取配置，使用默认值:', e.message);
        }
        return { ...DEFAULT_CONFIG };
    }

    /**
     * 保存配置
     */
    saveConfig() {
        try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
        } catch (e) {
            console.warn('无法保存配置:', e.message);
        }
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
