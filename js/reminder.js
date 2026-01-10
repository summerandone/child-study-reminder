/**
 * Reminder 提醒模块
 * 负责显示提醒弹窗和播放提示音
 */

/**
 * Reminder 类 - 提醒功能实现
 */
class Reminder {
    constructor() {
        // Web Audio API 上下文
        this.audioContext = null;
        // 是否启用声音
        this.soundEnabled = true;
        // DOM元素引用
        this.modal = null;
        this.titleElement = null;
        this.messageElement = null;
        this.dismissBtn = null;
        // 关闭回调
        this.dismissCallback = null;
    }

    /**
     * 初始化提醒模块
     * 绑定DOM元素和事件
     */
    init() {
        // 获取DOM元素
        this.modal = document.getElementById('reminderModal');
        this.titleElement = document.getElementById('reminderTitle');
        this.messageElement = document.getElementById('reminderMessage');
        this.dismissBtn = document.getElementById('dismissBtn');

        // 绑定关闭按钮事件
        if (this.dismissBtn) {
            this.dismissBtn.addEventListener('click', () => {
                this.dismiss();
            });
        }

        // 点击遮罩层不关闭（强制用户点击按钮确认）
    }

    /**
     * 初始化 Web Audio API（需要用户交互后调用）
     */
    initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    /**
     * 显示休息提醒
     */
    showBreakReminder() {
        this.show(
            '该休息了！',
            '请喝水、看看远方，保护眼睛哦~',
            '🌟'
        );
    }

    /**
     * 显示专注提醒（走神时使用，V2.0）
     */
    showFocusReminder() {
        this.show(
            '请专心学习哦',
            '集中注意力，你可以的！',
            '📖'
        );
    }

    /**
     * 显示自定义提醒
     * @param {string} title - 标题
     * @param {string} message - 消息内容
     * @param {string} icon - 图标emoji
     */
    show(title, message, icon = '🔔') {
        if (!this.modal) {
            console.error('Reminder: Modal element not found');
            return;
        }

        // 设置内容
        if (this.titleElement) {
            this.titleElement.textContent = title;
        }
        if (this.messageElement) {
            this.messageElement.textContent = message;
        }

        // 设置图标
        const iconElement = this.modal.querySelector('.modal-icon');
        if (iconElement) {
            iconElement.textContent = icon;
        }

        // 显示弹窗
        this.modal.classList.remove('hidden');

        // 播放提示音
        if (this.soundEnabled) {
            this.playSound();
        }
    }

    /**
     * 播放提示音（使用 Web Audio API 生成）
     */
    playSound() {
        try {
            this.initAudio();
            
            if (!this.audioContext) return;

            // 创建振荡器生成提示音
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // 设置音调（愉快的提示音）
            oscillator.frequency.setValueAtTime(523.25, this.audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, this.audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, this.audioContext.currentTime + 0.2); // G5

            // 设置音量渐变
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
        } catch (err) {
            console.log('Audio play failed:', err.message);
        }
    }

    /**
     * 关闭提醒
     */
    dismiss() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }

        // 触发关闭回调
        if (this.dismissCallback) {
            this.dismissCallback();
        }
    }

    /**
     * 设置是否启用声音
     * @param {boolean} enabled - 是否启用
     */
    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
    }

    /**
     * 注册关闭回调
     * @param {Function} callback - 回调函数
     */
    onDismiss(callback) {
        this.dismissCallback = callback;
    }

    /**
     * 检查提醒是否正在显示
     * @returns {boolean} 是否显示中
     */
    isShowing() {
        return this.modal && !this.modal.classList.contains('hidden');
    }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Reminder };
}
