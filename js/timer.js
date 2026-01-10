/**
 * Timer 定时器模块
 * 负责学习时间的计时功能
 */

// 定时器状态枚举
const TimerState = {
    IDLE: 'idle',       // 未开始
    RUNNING: 'running', // 计时中
    PAUSED: 'paused'    // 已暂停
};

/**
 * Timer 类 - 定时器核心实现
 */
class Timer {
    constructor() {
        // 当前状态
        this.state = TimerState.IDLE;
        // 已计时秒数
        this.elapsedSeconds = 0;
        // 提醒间隔（秒），默认25分钟
        this.reminderInterval = 25 * 60;
        // 定时器ID
        this.timerId = null;
        // 回调函数
        this.tickCallback = null;
        this.intervalReachedCallback = null;
    }

    /**
     * 开始计时
     * 状态转换：idle -> running, paused -> running
     */
    start() {
        if (this.state === TimerState.RUNNING) {
            return; // 已经在运行中，不重复启动
        }

        this.state = TimerState.RUNNING;
        
        // 每秒更新一次
        this.timerId = setInterval(() => {
            this.elapsedSeconds++;
            
            // 触发每秒回调
            if (this.tickCallback) {
                this.tickCallback(this.elapsedSeconds);
            }

            // 检查是否到达提醒间隔
            if (this.elapsedSeconds > 0 && 
                this.elapsedSeconds % this.reminderInterval === 0) {
                if (this.intervalReachedCallback) {
                    this.intervalReachedCallback();
                }
            }
        }, 1000);
    }

    /**
     * 暂停计时
     * 状态转换：running -> paused
     */
    pause() {
        if (this.state !== TimerState.RUNNING) {
            return; // 只有运行中才能暂停
        }

        this.state = TimerState.PAUSED;
        
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    /**
     * 重置计时
     * 状态转换：any -> idle，时间归零
     */
    reset() {
        this.state = TimerState.IDLE;
        this.elapsedSeconds = 0;
        
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }

        // 触发回调更新显示
        if (this.tickCallback) {
            this.tickCallback(0);
        }
    }

    /**
     * 获取当前计时时长（秒）
     * @returns {number} 已计时秒数
     */
    getTime() {
        return this.elapsedSeconds;
    }

    /**
     * 获取当前状态
     * @returns {string} 当前状态
     */
    getState() {
        return this.state;
    }

    /**
     * 设置提醒间隔
     * @param {number} minutes - 间隔分钟数
     */
    setInterval(minutes) {
        if (minutes > 0) {
            this.reminderInterval = minutes * 60;
        }
    }

    /**
     * 获取提醒间隔（分钟）
     * @returns {number} 间隔分钟数
     */
    getInterval() {
        return this.reminderInterval / 60;
    }

    /**
     * 注册每秒回调
     * @param {Function} callback - 回调函数，参数为当前秒数
     */
    onTick(callback) {
        this.tickCallback = callback;
    }

    /**
     * 注册到达间隔时的回调
     * @param {Function} callback - 回调函数
     */
    onIntervalReached(callback) {
        this.intervalReachedCallback = callback;
    }

    /**
     * 格式化时间显示
     * @param {number} totalSeconds - 总秒数
     * @returns {string} 格式化的时间字符串 HH:MM:SS
     */
    static formatTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return [hours, minutes, seconds]
            .map(v => v.toString().padStart(2, '0'))
            .join(':');
    }
}

// 导出供其他模块使用（如果在模块环境中）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Timer, TimerState };
}
