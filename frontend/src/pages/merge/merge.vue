<template>
	<view class="container">
		<view class="upload-section">
			<view class="upload-box" @click="chooseFiles">
				<view class="upload-icon">
					<text class="plus">+</text>
				</view>
				<text class="upload-text">点击选择PDF文件</text>
				<text class="upload-hint">支持同时选择多个文件</text>
			</view>
		</view>
		
		<view class="file-list-section" v-if="fileList.length > 0">
			<view class="section-header">
				<text class="section-title">已选择文件 ({{ fileList.length }})</text>
				<text class="section-hint">按住拖动调整顺序</text>
			</view>
			
			<view class="file-list">
				<view 
					v-for="(file, index) in fileList" 
					:key="file.fileId"
					class="file-item"
					:class="{ 'dragging': dragIndex === index }"
					@touchstart="onTouchStart($event, index)"
					@touchmove="onTouchMove($event, index)"
					@touchend="onTouchEnd"
				>
					<view class="file-order">{{ index + 1 }}</view>
					<view class="file-info">
						<text class="file-name">{{ file.filename }}</text>
						<text class="file-detail">{{ file.pageCount }} 页</text>
					</view>
					<view class="file-actions">
						<view class="action-btn move-btn" @click.stop="moveUp(index)" v-if="index > 0">
							<text class="action-icon">↑</text>
						</view>
						<view class="action-btn move-btn" @click.stop="moveDown(index)" v-if="index < fileList.length - 1">
							<text class="action-icon">↓</text>
						</view>
						<view class="action-btn delete-btn" @click.stop="removeFile(index)">
							<text class="action-icon">×</text>
						</view>
					</view>
				</view>
			</view>
		</view>
		
		<view class="empty-state" v-else>
			<text class="empty-icon">📄</text>
			<text class="empty-text">请上传PDF文件开始合并</text>
			<text class="empty-hint">至少需要2个PDF文件</text>
		</view>
		
		<view class="bottom-bar">
			<view class="btn-clear" @click="clearAll" v-if="fileList.length > 0">
				<text class="btn-text">清空列表</text>
			</view>
			<view class="btn-merge-wrapper" :class="{ 'disabled': fileList.length < 2 }">
				<button 
					class="btn-merge" 
					:disabled="fileList.length < 2 || isMerging"
					@click="startMerge"
				>
					<text v-if="!isMerging">开始合并</text>
					<text v-else>合并中...</text>
				</button>
			</view>
		</view>
		
		<view class="loading-mask" v-if="isMerging">
			<view class="loading-content">
				<view class="loading-spinner"></view>
				<text class="loading-text">正在合并PDF文件...</text>
			</view>
		</view>
	</view>
</template>

<script>
import api from '@/utils/api.js'

export default {
	data() {
		return {
			fileList: [],
			isMerging: false,
			dragIndex: -1,
			touchStartY: 0,
			touchStartIndex: 0
		}
	},
	onUnload() {
		this.cleanupFiles()
	},
	methods: {
		chooseFiles() {
			uni.chooseMessageFile({
				count: 10,
				type: 'file',
				extension: ['.pdf'],
				success: async (res) => {
					uni.showLoading({
						title: '上传中...',
						mask: true
					})
					
					try {
						for (const file of res.tempFiles) {
							await this.uploadFile(file)
						}
						uni.hideLoading()
						uni.showToast({
							title: '上传成功',
							icon: 'success'
						})
					} catch (error) {
						uni.hideLoading()
						uni.showToast({
							title: error.message || '上传失败',
							icon: 'none'
						})
					}
				},
				fail: (err) => {
					if (err.errMsg && err.errMsg.includes('cancel')) {
						return
					}
					uni.showToast({
						title: '选择文件失败',
						icon: 'none'
					})
				}
			})
		},
		
		async uploadFile(file) {
			const result = await api.uploadFile(file.path)
			if (result.success && result.files.length > 0) {
				this.fileList.push(result.files[0])
			} else {
				throw new Error(result.message || '上传失败')
			}
		},
		
		removeFile(index) {
			this.fileList.splice(index, 1)
		},
		
		clearAll() {
			uni.showModal({
				title: '提示',
				content: '确定要清空所有文件吗？',
				success: (res) => {
					if (res.confirm) {
						this.cleanupFiles()
						this.fileList = []
					}
				}
			})
		},
		
		moveUp(index) {
			if (index > 0) {
				const temp = this.fileList[index]
				this.fileList.splice(index, 1)
				this.fileList.splice(index - 1, 0, temp)
			}
		},
		
		moveDown(index) {
			if (index < this.fileList.length - 1) {
				const temp = this.fileList[index]
				this.fileList.splice(index, 1)
				this.fileList.splice(index + 1, 0, temp)
			}
		},
		
		onTouchStart(e, index) {
			this.touchStartY = e.touches[0].clientY
			this.touchStartIndex = index
			this.dragIndex = index
		},
		
		onTouchMove(e, index) {
			const currentY = e.touches[0].clientY
			const diff = currentY - this.touchStartY
			
			if (Math.abs(diff) > 50) {
				const moveDirection = diff > 0 ? 1 : -1
				const newIndex = this.touchStartIndex + moveDirection
				
				if (newIndex >= 0 && newIndex < this.fileList.length) {
					if (moveDirection > 0) {
						this.moveDown(this.touchStartIndex)
					} else {
						this.moveUp(this.touchStartIndex)
					}
					this.touchStartIndex = newIndex
					this.dragIndex = newIndex
					this.touchStartY = currentY
				}
			}
		},
		
		onTouchEnd() {
			this.dragIndex = -1
		},
		
		async startMerge() {
			if (this.fileList.length < 2) {
				uni.showToast({
					title: '至少需要2个文件',
					icon: 'none'
				})
				return
			}
			
			this.isMerging = true
			
			try {
				const filesForMerge = this.fileList.map(file => ({
					fileId: file.fileId
				}))
				
				const result = await api.mergePdfs(filesForMerge)
				
				if (result.success) {
					uni.hideLoading()
					uni.showToast({
						title: '合并成功',
						icon: 'success'
					})
					
					setTimeout(async () => {
						try {
							await api.downloadFile(result.downloadUrl, result.filename)
						} catch (e) {
							uni.showToast({
								title: '下载失败，请重试',
								icon: 'none'
							})
						}
					}, 1500)
				} else {
					throw new Error(result.message || '合并失败')
				}
			} catch (error) {
				uni.showToast({
					title: error.message || '合并失败',
					icon: 'none'
				})
			} finally {
				this.isMerging = false
			}
		},
		
		async cleanupFiles() {
			if (this.fileList.length > 0) {
				const fileIds = this.fileList.map(f => f.fileId)
				try {
					await api.cleanup(fileIds)
				} catch (e) {
					console.log('清理文件失败')
				}
			}
		}
	}
}
</script>

<style scoped>
.container {
	min-height: 100vh;
	padding: 30rpx;
	padding-bottom: 180rpx;
	box-sizing: border-box;
}

.upload-section {
	margin-bottom: 30rpx;
}

.upload-box {
	background: #fff;
	border: 2rpx dashed #667eea;
	border-radius: 20rpx;
	padding: 60rpx 40rpx;
	text-align: center;
	transition: all 0.3s;
}

.upload-box:active {
	background: #f5f7ff;
}

.upload-icon {
	width: 100rpx;
	height: 100rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
	margin: 0 auto 20rpx;
}

.plus {
	color: #fff;
	font-size: 48rpx;
	font-weight: bold;
}

.upload-text {
	display: block;
	font-size: 32rpx;
	color: #333;
	font-weight: 500;
	margin-bottom: 10rpx;
}

.upload-hint {
	font-size: 24rpx;
	color: #999;
}

.file-list-section {
	
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.section-title {
	font-size: 30rpx;
	font-weight: 600;
	color: #333;
}

.section-hint {
	font-size: 22rpx;
	color: #999;
}

.file-list {
	
}

.file-item {
	display: flex;
	align-items: center;
	background: #fff;
	border-radius: 16rpx;
	padding: 30rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
	transition: transform 0.2s;
}

.file-item.dragging {
	transform: scale(1.02);
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.file-order {
	width: 60rpx;
	height: 60rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
	color: #fff;
	font-size: 26rpx;
	font-weight: bold;
	margin-right: 20rpx;
}

.file-info {
	flex: 1;
	overflow: hidden;
}

.file-name {
	display: block;
	font-size: 28rpx;
	color: #333;
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	margin-bottom: 6rpx;
}

.file-detail {
	font-size: 22rpx;
	color: #999;
}

.file-actions {
	display: flex;
	align-items: center;
}

.action-btn {
	width: 60rpx;
	height: 60rpx;
	display: flex;
	justify-content: center;
	align-items: center;
	border-radius: 50%;
	margin-left: 10rpx;
}

.move-btn {
	background: #f0f0f0;
}

.move-btn:active {
	background: #e0e0e0;
}

.delete-btn {
	background: #fff5f5;
}

.delete-btn:active {
	background: #ffe0e0;
}

.action-icon {
	font-size: 32rpx;
	color: #666;
}

.delete-btn .action-icon {
	color: #ff6b6b;
}

.empty-state {
	text-align: center;
	padding: 100rpx 40rpx;
}

.empty-icon {
	display: block;
	font-size: 100rpx;
	margin-bottom: 30rpx;
}

.empty-text {
	display: block;
	font-size: 30rpx;
	color: #333;
	margin-bottom: 10rpx;
}

.empty-hint {
	font-size: 24rpx;
	color: #999;
}

.bottom-bar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: #fff;
	padding: 20rpx 30rpx;
	padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
	display: flex;
	align-items: center;
	box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.btn-clear {
	padding: 20rpx 30rpx;
	margin-right: 20rpx;
}

.btn-clear .btn-text {
	font-size: 28rpx;
	color: #999;
}

.btn-merge-wrapper {
	flex: 1;
}

.btn-merge-wrapper.disabled .btn-merge {
	opacity: 0.5;
}

.btn-merge {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	border-radius: 44rpx;
	height: 88rpx;
	line-height: 88rpx;
	font-size: 32rpx;
	font-weight: 500;
	text-align: center;
	border: none;
	padding: 0;
	margin: 0;
}

.btn-merge::after {
	border: none;
}

.btn-merge:disabled {
	opacity: 0.5;
}

.loading-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 9999;
}

.loading-content {
	background: #fff;
	border-radius: 20rpx;
	padding: 60rpx 80rpx;
	text-align: center;
}

.loading-spinner {
	width: 60rpx;
	height: 60rpx;
	border: 4rpx solid #f0f0f0;
	border-top-color: #667eea;
	border-radius: 50%;
	animation: spin 1s linear infinite;
	margin: 0 auto 20rpx;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.loading-text {
	font-size: 28rpx;
	color: #333;
}
</style>
