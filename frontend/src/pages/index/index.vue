<template>
	<view class="container">
		<view class="header">
			<text class="title">PDF处理工具</text>
			<text class="subtitle">简单、快速、安全的PDF处理方案</text>
		</view>
		
		<view class="feature-list">
			<view class="feature-item" @click="goToMerge">
				<view class="feature-icon merge-icon">
					<text class="icon-text">合</text>
				</view>
				<view class="feature-content">
					<text class="feature-title">PDF合并</text>
					<text class="feature-desc">将多个PDF文件合并成一个文件</text>
				</view>
				<text class="arrow">›</text>
			</view>
			
			<view class="feature-item" @click="goToProcess">
				<view class="feature-icon process-icon">
					<text class="icon-text">调</text>
				</view>
				<view class="feature-content">
					<text class="feature-title">PDF调整</text>
					<text class="feature-desc">页面删除、旋转、顺序调整</text>
				</view>
				<text class="arrow">›</text>
			</view>
		</view>
		
		<view class="footer">
			<text class="footer-text">所有处理均在本地完成，保护您的隐私安全</text>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			
		}
	},
	onLoad() {
		
	},
	methods: {
		goToMerge() {
			uni.navigateTo({
				url: '/pages/merge/merge'
			})
		},
		goToProcess() {
			uni.navigateTo({
				url: '/pages/process/process'
			})
		}
	}
}
</script>

<style scoped>
.container {
	min-height: 100vh;
	padding: 40rpx 30rpx;
	box-sizing: border-box;
}

.header {
	text-align: center;
	padding: 60rpx 0;
}

.title {
	display: block;
	font-size: 48rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 20rpx;
}

.subtitle {
	font-size: 28rpx;
	color: #999;
}

.feature-list {
	margin-top: 40rpx;
}

.feature-item {
	display: flex;
	align-items: center;
	background: #fff;
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
	transition: transform 0.2s, box-shadow 0.2s;
}

.feature-item:active {
	transform: scale(0.98);
	box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.08);
}

.feature-icon {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
	margin-right: 30rpx;
}

.merge-icon {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.process-icon {
	background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.icon-text {
	color: #fff;
	font-size: 36rpx;
	font-weight: bold;
}

.feature-content {
	flex: 1;
}

.feature-title {
	display: block;
	font-size: 34rpx;
	font-weight: 600;
	color: #333;
	margin-bottom: 10rpx;
}

.feature-desc {
	font-size: 26rpx;
	color: #999;
}

.arrow {
	font-size: 40rpx;
	color: #ccc;
	margin-left: 20rpx;
}

.footer {
	margin-top: 80rpx;
	text-align: center;
}

.footer-text {
	font-size: 24rpx;
	color: #ccc;
}
</style>
