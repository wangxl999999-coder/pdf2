const BASE_URL = 'http://localhost:5000/api'

const request = (options) => {
	return new Promise((resolve, reject) => {
		uni.request({
			url: BASE_URL + options.url,
			method: options.method || 'GET',
			data: options.data || {},
			header: {
				'Content-Type': 'application/json',
				...options.header
			},
			success: (res) => {
				if (res.statusCode === 200) {
					resolve(res.data)
				} else {
					reject(res.data || { message: '请求失败' })
				}
			},
			fail: (err) => {
				reject({ message: '网络错误，请稍后重试' })
			}
		})
	})
}

const uploadFile = (filePath, formData = {}) => {
	return new Promise((resolve, reject) => {
		uni.uploadFile({
			url: BASE_URL + '/upload',
			filePath: filePath,
			name: 'file',
			formData: formData,
			success: (res) => {
				if (res.statusCode === 200) {
					try {
						const data = JSON.parse(res.data)
						resolve(data)
					} catch (e) {
						reject({ message: '解析响应失败' })
					}
				} else {
					reject({ message: '上传失败' })
				}
			},
			fail: (err) => {
				reject({ message: '网络错误，请稍后重试' })
			}
		})
	})
}

const downloadFile = (url, filename) => {
	return new Promise((resolve, reject) => {
		uni.downloadFile({
			url: BASE_URL + url,
			success: (res) => {
				if (res.statusCode === 200) {
					const filePath = res.tempFilePath
					uni.openDocument({
						filePath: filePath,
						showMenu: true,
						fileType: 'pdf',
						success: () => {
							resolve(filePath)
						},
						fail: (err) => {
							uni.saveFile({
								tempFilePath: filePath,
								success: (saveRes) => {
									uni.showToast({
										title: '文件已保存',
										icon: 'success'
									})
									resolve(saveRes.savedFilePath)
								},
								fail: () => {
									reject({ message: '无法打开文件' })
								}
							})
						}
					})
				} else {
					reject({ message: '下载失败' })
				}
			},
			fail: (err) => {
				reject({ message: '网络错误，请稍后重试' })
			}
		})
	})
}

export const api = {
	healthCheck: () => request({ url: '/health', method: 'GET' }),
	
	uploadFile: (filePath) => uploadFile(filePath),
	
	mergePdfs: (files) => request({
		url: '/merge',
		method: 'POST',
		data: { files }
	}),
	
	getPageInfo: (fileId) => request({
		url: '/page-info',
		method: 'POST',
		data: { fileId }
	}),
	
	processPdf: (fileId, operations) => request({
		url: '/process',
		method: 'POST',
		data: { fileId, operations }
	}),
	
	downloadFile: (url, filename) => downloadFile(url, filename),
	
	cleanup: (fileIds) => request({
		url: '/cleanup',
		method: 'POST',
		data: { fileIds }
	})
}

export default api
