"use strict";
const common_vendor = require("../common/vendor.js");
const BASE_URL = "http://localhost:5000/api";
const request = (options) => {
  return new Promise((resolve, reject) => {
    common_vendor.index.request({
      url: BASE_URL + options.url,
      method: options.method || "GET",
      data: options.data || {},
      header: {
        "Content-Type": "application/json",
        ...options.header
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(res.data || { message: "请求失败" });
        }
      },
      fail: (err) => {
        reject({ message: "网络错误，请稍后重试" });
      }
    });
  });
};
const uploadFile = (filePath, formData = {}) => {
  return new Promise((resolve, reject) => {
    common_vendor.index.uploadFile({
      url: BASE_URL + "/upload",
      filePath,
      name: "file",
      formData,
      success: (res) => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(res.data);
            resolve(data);
          } catch (e) {
            reject({ message: "解析响应失败" });
          }
        } else {
          reject({ message: "上传失败" });
        }
      },
      fail: (err) => {
        reject({ message: "网络错误，请稍后重试" });
      }
    });
  });
};
const downloadFile = (url, filename) => {
  return new Promise((resolve, reject) => {
    common_vendor.index.downloadFile({
      url: BASE_URL + url,
      success: (res) => {
        if (res.statusCode === 200) {
          const filePath = res.tempFilePath;
          common_vendor.index.openDocument({
            filePath,
            showMenu: true,
            fileType: "pdf",
            success: () => {
              resolve(filePath);
            },
            fail: (err) => {
              common_vendor.index.saveFile({
                tempFilePath: filePath,
                success: (saveRes) => {
                  common_vendor.index.showToast({
                    title: "文件已保存",
                    icon: "success"
                  });
                  resolve(saveRes.savedFilePath);
                },
                fail: () => {
                  reject({ message: "无法打开文件" });
                }
              });
            }
          });
        } else {
          reject({ message: "下载失败" });
        }
      },
      fail: (err) => {
        reject({ message: "网络错误，请稍后重试" });
      }
    });
  });
};
const api = {
  healthCheck: () => request({ url: "/health", method: "GET" }),
  uploadFile: (filePath) => uploadFile(filePath),
  mergePdfs: (files) => request({
    url: "/merge",
    method: "POST",
    data: { files }
  }),
  getPageInfo: (fileId) => request({
    url: "/page-info",
    method: "POST",
    data: { fileId }
  }),
  processPdf: (fileId, operations) => request({
    url: "/process",
    method: "POST",
    data: { fileId, operations }
  }),
  downloadFile: (url, filename) => downloadFile(url),
  cleanup: (fileIds) => request({
    url: "/cleanup",
    method: "POST",
    data: { fileIds }
  })
};
exports.api = api;
