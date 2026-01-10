/**
 * Detector 走神检测模块 (V2.0)
 * 使用摄像头检测用户是否在座位上、是否走神
 * 
 * 技术说明：
 * - 使用浏览器原生 MediaDevices API 获取摄像头
 * - 使用简单的图像亮度变化检测是否有人
 * - 适合初学者理解，无需复杂的机器学习库
 */

/**
 * DistractionDetector 类 - 走神检测器
 */
class DistractionDetector {
    constructor() {
        // 摄像头视频流
        this.stream = null;
        // 视频元素
        this.video = null;
        // Canvas 用于图像分析
        this.canvas = null;
        this.ctx = null;
        // 检测状态
        this.isRunning = false;
        // 检测间隔ID
        this.detectIntervalId = null;
        // 回调函数
        this.onPersonDetectedCallback = null;  // 检测到人
        this.onPersonLeftCallback = null;       // 人离开
        this.onDistractedCallback = null;       // 走神
        this.onFocusedCallback = null;          // 恢复专注
        this.onErrorCallback = null;            // 错误回调
        // 状态
        this.personPresent = false;             // 是否有人
        this.isDistracted = false;              // 是否走神
        this.distractionStartTime = null;       // 走神开始时间
        this.distractionThreshold = 5000;       // 走神阈值（毫秒）
        // 图像分析参数
        this.lastBrightness = 0;
        this.brightnessHistory = [];
        this.historySize = 10;
        // 人脸检测相关
        this.lastFacePosition = null;
        this.noFaceCount = 0;
        this.noFaceThreshold = 30;  // 连续30帧没检测到脸判定为离开
    }

    /**
     * 初始化检测器
     * @param {HTMLVideoElement} videoElement - 视频元素
     * @returns {Promise<boolean>} 是否初始化成功
     */
    async init(videoElement) {
        this.video = videoElement;
        
        // 创建隐藏的 canvas 用于图像分析
        this.canvas = document.createElement('canvas');
        this.canvas.width = 320;
        this.canvas.height = 240;
        this.ctx = this.canvas.getContext('2d');

        try {
            // 请求摄像头权限
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 320 },
                    height: { ideal: 240 },
                    facingMode: 'user'  // 前置摄像头
                },
                audio: false
            });

            // 将视频流绑定到视频元素
            this.video.srcObject = this.stream;
            await this.video.play();

            console.log('摄像头初始化成功');
            return true;
        } catch (error) {
            console.error('摄像头初始化失败:', error);
            if (this.onErrorCallback) {
                this.onErrorCallback(this.getErrorMessage(error));
            }
            return false;
        }
    }

    /**
     * 获取友好的错误信息
     */
    getErrorMessage(error) {
        if (error.name === 'NotAllowedError') {
            return '摄像头权限被拒绝，请在浏览器设置中允许访问摄像头';
        } else if (error.name === 'NotFoundError') {
            return '未找到摄像头设备';
        } else if (error.name === 'NotReadableError') {
            return '摄像头被其他程序占用';
        }
        return '摄像头初始化失败: ' + error.message;
    }

    /**
     * 开始检测
     */
    start() {
        if (this.isRunning || !this.video) return;
        
        this.isRunning = true;
        
        // 每100ms检测一次（10fps）
        this.detectIntervalId = setInterval(() => {
            this.detect();
        }, 100);

        console.log('开始检测');
    }

    /**
     * 停止检测
     */
    stop() {
        this.isRunning = false;
        
        if (this.detectIntervalId) {
            clearInterval(this.detectIntervalId);
            this.detectIntervalId = null;
        }

        console.log('停止检测');
    }

    /**
     * 关闭摄像头
     */
    close() {
        this.stop();
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.video) {
            this.video.srcObject = null;
        }

        console.log('摄像头已关闭');
    }

    /**
     * 执行一次检测
     * 简单算法：通过图像中心区域的变化来判断是否有人
     */
    detect() {
        if (!this.video || !this.ctx) return;

        // 将视频帧绘制到 canvas
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        // 获取图像中心区域的数据（假设人脸在中心）
        const centerX = this.canvas.width / 2 - 50;
        const centerY = this.canvas.height / 2 - 50;
        const imageData = this.ctx.getImageData(centerX, centerY, 100, 100);
        
        // 分析图像
        const analysis = this.analyzeImage(imageData);
        
        // 判断是否有人
        this.checkPersonPresence(analysis);
        
        // 判断是否走神（基于运动检测）
        this.checkDistraction(analysis);
    }

    /**
     * 分析图像数据
     * @returns {Object} 分析结果
     */
    analyzeImage(imageData) {
        const data = imageData.data;
        let totalBrightness = 0;
        let skinPixels = 0;
        
        // 遍历像素
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // 计算亮度
            const brightness = (r + g + b) / 3;
            totalBrightness += brightness;
            
            // 简单的肤色检测（RGB范围）
            if (r > 95 && g > 40 && b > 20 &&
                r > g && r > b &&
                Math.abs(r - g) > 15 &&
                r - b > 15) {
                skinPixels++;
            }
        }

        const pixelCount = data.length / 4;
        const avgBrightness = totalBrightness / pixelCount;
        const skinRatio = skinPixels / pixelCount;

        return {
            brightness: avgBrightness,
            skinRatio: skinRatio,
            hasMotion: Math.abs(avgBrightness - this.lastBrightness) > 5
        };
    }

    /**
     * 检查是否有人在座位上
     */
    checkPersonPresence(analysis) {
        // 通过肤色比例判断是否有人
        // 如果中心区域有足够的肤色像素，认为有人
        const hasPersonNow = analysis.skinRatio > 0.1;

        if (hasPersonNow && !this.personPresent) {
            // 人来了
            this.personPresent = true;
            this.noFaceCount = 0;
            if (this.onPersonDetectedCallback) {
                this.onPersonDetectedCallback();
            }
        } else if (!hasPersonNow && this.personPresent) {
            // 可能人离开了，但要连续多帧确认
            this.noFaceCount++;
            if (this.noFaceCount > this.noFaceThreshold) {
                this.personPresent = false;
                this.isDistracted = false;
                if (this.onPersonLeftCallback) {
                    this.onPersonLeftCallback();
                }
            }
        } else if (hasPersonNow) {
            this.noFaceCount = 0;
        }

        // 更新亮度历史
        this.brightnessHistory.push(analysis.brightness);
        if (this.brightnessHistory.length > this.historySize) {
            this.brightnessHistory.shift();
        }
        this.lastBrightness = analysis.brightness;
    }

    /**
     * 检查是否走神
     * 简单逻辑：如果肤色比例突然降低（头转向别处），判定为走神
     */
    checkDistraction(analysis) {
        if (!this.personPresent) return;

        // 肤色比例低于阈值，可能头转向了
        const isLookingAway = analysis.skinRatio < 0.05;

        if (isLookingAway && !this.isDistracted) {
            // 开始走神
            if (!this.distractionStartTime) {
                this.distractionStartTime = Date.now();
            } else if (Date.now() - this.distractionStartTime > this.distractionThreshold) {
                // 走神超过阈值
                this.isDistracted = true;
                if (this.onDistractedCallback) {
                    this.onDistractedCallback();
                }
            }
        } else if (!isLookingAway) {
            // 恢复专注
            this.distractionStartTime = null;
            if (this.isDistracted) {
                this.isDistracted = false;
                if (this.onFocusedCallback) {
                    this.onFocusedCallback();
                }
            }
        }
    }

    /**
     * 设置走神阈值（秒）
     */
    setDistractionThreshold(seconds) {
        this.distractionThreshold = seconds * 1000;
    }

    /**
     * 注册回调函数
     */
    onPersonDetected(callback) {
        this.onPersonDetectedCallback = callback;
    }

    onPersonLeft(callback) {
        this.onPersonLeftCallback = callback;
    }

    onDistracted(callback) {
        this.onDistractedCallback = callback;
    }

    onFocused(callback) {
        this.onFocusedCallback = callback;
    }

    onError(callback) {
        this.onErrorCallback = callback;
    }

    /**
     * 检查摄像头是否可用
     */
    static async isAvailable() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === 'videoinput');
        } catch {
            return false;
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DistractionDetector };
}
