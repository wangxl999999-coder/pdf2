<template>
	<view class="container">
		<view class="upload-section" v-if="!currentFile">
			<view class="upload-box" @click="chooseFile">
				<view class="upload-icon">
					<text class="plus">+</text>
				</view>
				<text class="upload-text">点击选择PDF文件</text>
				<text class="upload-hint">支持页面删除、旋转、顺序调整</text>
			</view>
		</view>
		
		<view class="file-info-section" v-else>
			<view class="file-info-card">
				<view class="file-icon">
					<text class="icon-text">📄</text>
				</view>
				<view class="file-info">
					<text class="file-name">{{ currentFile.filename }}</text>
					<text class="file-detail">共 {{ pages.length }} 页</text>
				</view>
				<view class="file-action" @click="rechooseFile">
					<text class="action-text">更换</text>
				</view>
			</view>
		</view>
		
		<view class="tool-bar" v-if="currentFile">
			<view class="tool-item" :class="{ 'active': activeTool === 'select' }" @click="setActiveTool('select')">
				<text class="tool-icon">✓</text>
				<text class="tool-text">选择删除</text>
			</view>
			<view class="tool-item" :class="{ 'active': activeTool === 'rotate' }" @click="setActiveTool('rotate')">
				<text class="tool-icon">↻</text>
				<text class="tool-text">旋转页面</text>
			</view>
			<view class="tool-item" :class="{ 'active': activeTool === 'reorder' }" @click="setActiveTool('reorder')">
				<text class="tool-icon">⇅</text>
				<text class="tool-text">调整顺序</text>
			</view>
		</view>
		
		<view class="pages-section" v-if="currentFile && pages.length > 0">
			<view class="section-header">
				<text class="section-title">页面列表</text>
				<view class="select-all" v-if="activeTool === 'select'" @click="toggleSelectAll">
					<text class="select-all-text">{{ allSelected ? '取消全选' : '全选' }}</text>
				</view>
			</view>
			
			<view class="pages-grid">
				<view 
					v-for="(page, index) in pages" 
					:key="page.pageNum"
					class="page-item"
					:class="{ 
						'selected': page.selected, 
						'dragging': dragIndex === index,
						'reorder-mode': activeTool === 'reorder'
					}"
					@click="handlePageClick(page, index)"
					@touchstart="onTouchStart($event, index)"
					@touchmove="onTouchMove($event, index)"
					@touchend="onTouchEnd"
				>
					<view class="page-preview" :style="{ transform: 'rotate(' + page.rotation + 'deg)' }">
						<view class="page-content">
							<text class="page-number-display">第 {{ page.pageNum }} 页</text>
						</view>
					</view>
					<view class="page-footer">
						<view class="page-index" v-if="activeTool === 'reorder'">
							<text class="index-text">{{ index + 1 }}</text>
						</view>
						<view class="page-select" v-else-if="activeTool === 'select'">
							<view class="checkbox" :class="{ 'checked': page.selected }">
								<text class="check-icon" v-if="page.selected">✓</text>
							</view>
						</view>
						<view class="page-rotate" v-else-if="activeTool === 'rotate'">
							<view class="rotate-btn" @click.stop="rotatePage(page, 90)">
								<text class="rotate-icon">↻</text>
							</view>
						</view>
						<text class="page-original" v-else>原第 {{ page.pageNum }} 页</text>
						<view class="rotation-indicator" v-if="page.rotation !== 0">
							<text class="rotation-text">{{ page.rotation }}°</text>
						</view>
					</view>
				</view>
			</view>
		</view>
		
		<view class="empty-state" v-if="!currentFile">
			<text class="empty-icon">📝</text>
			<text class="empty-text">请上传PDF文件开始调整</text>
			<text class="empty-hint">支持页面删除、旋转、顺序调整</text>
		</view>
		
		<view class="bottom-bar" v-if="currentFile">
			<view class="btn-reset" @click="resetAll">
				<text class="btn-text">重置</text>
			</view>
			<view class="btn-process-wrapper" :class="{ 'disabled': !canProcess }">
				<button 
					class="btn-process" 
					:disabled="!canProcess || isProcessing"
					@click="startProcess"
				>
					<text v-if="!isProcessing">应用处理</text>
					<text v-else>处理中...</text>
				</button>
			</view>
		</view>
		
		<view class="loading-mask" v-if="isProcessing">
			<view class="loading-content">
				<view class="loading-spinner"></view>
				<text class="loading-text">正在处理PDF文件...</text>
			</view>
		</view>
	</view>
</template>

<script>
import api from '@/utils/api.js'

export default {
	data() {
		return {
			currentFile: null,
			pages: [],
			activeTool: 'select',
			dragIndex: -1,
			touchStartY: 0,
			touchStartIndex: 0,
			isProcessing: false
		}
	},
	computed: {
		allSelected() {
			return this.pages.length > 0 && this.pages.every(p => p.selected)
		},
		canProcess() {
			if (this.pages.length === 0) return false
			const hasSelectedPages = this.pages.some(p => p.selected)
			const hasRotations = this.pages.some(p => p.rotation !== 0)
			const hasOrderChanges = this.pages.some((p, i) => p.pageNum !== i + 1)
			return hasSelectedPages || hasRotations || hasOrderChanges
		}
	},
	onUnload() {
		this.cleanupFile()
	},
	methods: {
		chooseFile() {
			uni.chooseMessageFile({
				count: 1,
				type: 'file',
				extension: ['.pdf'],
				success: async (res) => {
					uni.showLoading({
						title: '加载中...',
						mask: true
					})
					
					try {
						await this.uploadAndLoadFile(res.tempFiles[0])
						uni.hideLoading()
					} catch (error) {
						uni.hideLoading()
						uni.showToast({
							title: error.message || '加载失败',
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
		
		rechooseFile() {
			uni.showModal({
				title: '提示',
				content: '更换文件将丢失当前修改，确定更换吗？',
				success: (res) => {
					if (res.confirm) {
						this.cleanupFile()
						this.currentFile = null
						this.pages = []
						this.chooseFile()
					}
				}
			})
		},
		
		async uploadAndLoadFile(file) {
			const result = await api.uploadFile(file.path)
			
			if (result.success && result.files.length > 0) {
				this.currentFile = result.files[0]
				
				const pageResult = await api.getPageInfo(this.currentFile.fileId)
				
				if (pageResult.success) {
					this.pages = pageResult.pages.map(p => ({
						...p,
						originalPageNum: p.pageNum
					}))
				} else {
					throw new Error(pageResult.message || '获取页面信息失败')
				}
			} else {
				throw new Error(result.message || '上传失败')
			}
		},
		
		setActiveTool(tool) {
			this.activeTool = tool
		},
		
		handlePageClick(page, index) {
			if (this.activeTool === 'select') {
				page.selected = !page.selected
			} else if (this.activeTool === 'rotate') {
				this.rotatePage(page, 90)
			}
		},
		
		rotatePage(page, angle) {
			page.rotation = (page.rotation + angle) % 360
		},
		
		toggleSelectAll() {
			const allSelected = this.allSelected
			this.pages.forEach(p => {
				p.selected = !allSelected
			})
		},
		
		onTouchStart(e, index) {
			if (this.activeTool !== 'reorder') return
			
			this.touchStartY = e.touches[0].clientY
			this.touchStartIndex = index
			this.dragIndex = index
		},
		
		onTouchMove(e, index) {
			if (this.activeTool !== 'reorder') return
			
			const currentY = e.touches[0].clientY
			const diff = currentY - this.touchStartY
			
			if (Math.abs(diff) > 80) {
				const moveDirection = diff > 0 ? 1 : -1
				const newIndex = this.touchStartIndex + moveDirection
				
				if (newIndex >= 0 && newIndex < this.pages.length) {
					const temp = this.pages[this.touchStartIndex]
					this.pages.splice(this.touchStartIndex, 1)
					this.pages.splice(newIndex, 0, temp)
					
					this.touchStartIndex = newIndex
					this.dragIndex = newIndex
					this.touchStartY = currentY
				}
			}
		},
		
		onTouchEnd() {
			this.dragIndex = -1
		},
		
		resetAll() {
			uni.showModal({
				title: '提示',
				content: '确定要重置所有修改吗？',
				success: (res) => {
					if (res.confirm) {
						this.pages.sort((a, b) => a.originalPageNum - b.originalPageNum)
						this.pages.forEach(p => {
							p.selected = true
							p.rotation = 0
						})
						uni.showToast({
							title: '已重置',
							icon: 'success'
						})
					}
				}
			})
		},
		
		async startProcess() {
			if (!this.canProcess) {
				uni.showToast({
					title: '没有需要处理的内容',
					icon: 'none'
				})
				return
			}
			
			this.isProcessing = true
			
			try {
				const operations = []
				
				const selectedPageNums = this.pages
					.filter(p => p.selected)
					.map(p => p.pageNum)
				
				const allSelected = selectedPageNums.length === this.pages.length
				if (!allSelected && selectedPageNums.length > 0) {
					operations.push({
						type: 'select',
						pages: selectedPageNums
					})
				}
				
				const pagesWithRotation = this.pages.filter(p => p.rotation !== 0)
				for (const page of pagesWithRotation) {
					operations.push({
						type: 'rotate',
						pageNum: page.pageNum,
						angle: page.rotation
					})
				}
				
				const currentOrder = this.pages.map(p => p.pageNum)
				const originalOrder = this.pages
					.slice()
					.sort((a, b) => a.originalPageNum - b.originalPageNum)
					.map(p => p.pageNum)
				
				const orderChanged = currentOrder.some((p, i) => p !== originalOrder[i])
				if (orderChanged) {
					operations.push({
						type: 'reorder',
						newOrder: currentOrder
					})
				}
				
				const result = await api.processPdf(this.currentFile.fileId, operations)
				
				if (result.success) {
					uni.hideLoading()
					uni.showToast({
						title: '处理成功',
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
					throw new Error(result.message || '处理失败')
				}
			} catch (error) {
				uni.showToast({
					title: error.message || '处理失败',
					icon: 'none'
				})
			} finally {
				this.isProcessing = false
			}
		},
		
		async cleanupFile() {
			if (this.currentFile) {
				try {
					await api.cleanup([this.currentFile.fileId])
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
	border: 2rpx dashed #f093fb;
	border-radius: 20rpx;
	padding: 60rpx 40rpx;
	text-align: center;
	transition: all 0.3s;
}

.upload-box:active {
	background: #fff5fb;
}

.upload-icon {
	width: 100rpx;
	height: 100rpx;
	background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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

.file-info-section {
	margin-bottom: 30rpx;
}

.file-info-card {
	display: flex;
	align-items: center;
	background: #fff;
	border-radius: 16rpx;
	padding: 30rpx;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.file-icon {
	width: 80rpx;
	height: 80rpx;
	background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
	border-radius: 16rpx;
	display: flex;
	justify-content: center;
	align-items: center;
	margin-right: 20rpx;
}

.icon-text {
	font-size: 40rpx;
}

.file-info {
	flex: 1;
}

.file-name {
	display: block;
	font-size: 30rpx;
	color: #333;
	font-weight: 500;
	margin-bottom: 6rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 400rpx;
}

.file-detail {
	font-size: 24rpx;
	color: #999;
}

.file-action {
	padding: 16rpx 24rpx;
	background: #f5f5f5;
	border-radius: 8rpx;
}

.action-text {
	font-size: 26rpx;
	color: #666;
}

.tool-bar {
	display: flex;
	background: #fff;
	border-radius: 16rpx;
	padding: 10rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.tool-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 20rpx 10rpx;
	border-radius: 12rpx;
	transition: all 0.3s;
}

.tool-item.active {
	background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.tool-item:active {
	transform: scale(0.96);
}

.tool-icon {
	font-size: 36rpx;
	margin-bottom: 6rpx;
}

.tool-item.active .tool-icon {
	color: #fff;
}

.tool-text {
	font-size: 22rpx;
	color: #666;
}

.tool-item.active .tool-text {
	color: #fff;
}

.pages-section {
	
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

.select-all {
	padding: 10rpx 20rpx;
}

.select-all-text {
	font-size: 24rpx;
	color: #f093fb;
}

.pages-grid {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-start;
	gap: 20rpx;
}

.page-item {
	width: calc(33.333% - 14rpx);
	background: #fff;
	border-radius: 12rpx;
	overflow: hidden;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
	transition: all 0.2s;
	border: 2rpx solid transparent;
}

.page-item.selected {
	border-color: #f093fb;
	box-shadow: 0 4rpx 16rpx rgba(240, 147, 251, 0.3);
}

.page-item.dragging {
	transform: scale(1.05);
	opacity: 0.8;
}

.page-item.reorder-mode {
	cursor: grab;
}

.page-preview {
	width: 100%;
	height: 200rpx;
	background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%);
	display: flex;
	justify-content: center;
	align-items: center;
	transition: transform 0.3s;
}

.page-content {
	width: 80%;
	height: 80%;
	background: #fff;
	border: 1rpx solid #e0e0e0;
	display: flex;
	justify-content: center;
	align-items: center;
}

.page-number-display {
	font-size: 20rpx;
	color: #999;
}

.page-footer {
	padding: 16rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.page-index {
	width: 50rpx;
	height: 50rpx;
	background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
}

.index-text {
	font-size: 22rpx;
	color: #fff;
	font-weight: bold;
}

.page-select {
	
}

.checkbox {
	width: 44rpx;
	height: 44rpx;
	border: 2rpx solid #ddd;
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
	transition: all 0.2s;
}

.checkbox.checked {
	background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
	border-color: transparent;
}

.check-icon {
	font-size: 24rpx;
	color: #fff;
}

.page-rotate {
	
}

.rotate-btn {
	width: 50rpx;
	height: 50rpx;
	background: #f5f5f5;
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
}

.rotate-btn:active {
	background: #e0e0e0;
}

.rotate-icon {
	font-size: 28rpx;
	color: #666;
}

.page-original {
	font-size: 20rpx;
	color: #999;
}

.rotation-indicator {
	background: rgba(240, 147, 251, 0.1);
	padding: 4rpx 10rpx;
	border-radius: 6rpx;
}

.rotation-text {
	font-size: 18rpx;
	color: #f093fb;
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

.btn-reset {
	padding: 20rpx 30rpx;
	margin-right: 20rpx;
}

.btn-reset .btn-text {
	font-size: 28rpx;
	color: #999;
}

.btn-process-wrapper {
	flex: 1;
}

.btn-process-wrapper.disabled .btn-process {
	opacity: 0.5;
}

.btn-process {
	background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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

.btn-process::after {
	border: none;
}

.btn-process:disabled {
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
	border-top-color: #f093fb;
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
