<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */
	page {
		background-color: #f5f5f5;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	}
	
	.container {
		padding: 20rpx;
	}
	
	.card {
		background-color: #ffffff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
	}
	
	.btn-primary {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: #ffffff;
		border-radius: 40rpx;
		height: 88rpx;
		line-height: 88rpx;
		font-size: 32rpx;
		font-weight: 500;
		text-align: center;
		border: none;
	}
	
	.btn-primary:disabled {
		opacity: 0.5;
	}
	
	.btn-secondary {
		background-color: #f0f0f0;
		color: #333333;
		border-radius: 40rpx;
		height: 88rpx;
		line-height: 88rpx;
		font-size: 32rpx;
		text-align: center;
		border: none;
	}
	
	.text-center {
		text-align: center;
	}
	
	.text-muted {
		color: #999999;
	}
	
	.flex {
		display: flex;
	}
	
	.flex-center {
		display: flex;
		justify-content: center;
		align-items: center;
	}
	
	.flex-between {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.flex-column {
		display: flex;
		flex-direction: column;
	}
	
	.mt-20 {
		margin-top: 20rpx;
	}
	
	.mt-30 {
		margin-top: 30rpx;
	}
	
	.mb-20 {
		margin-bottom: 20rpx;
	}
	
	.p-20 {
		padding: 20rpx;
	}
</style>
