"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const _sfc_main = {
  data() {
    return {
      fileList: [],
      isMerging: false,
      dragIndex: -1,
      touchStartY: 0,
      touchStartIndex: 0
    };
  },
  onUnload() {
    this.cleanupFiles();
  },
  methods: {
    chooseFiles() {
      common_vendor.index.chooseMessageFile({
        count: 10,
        type: "file",
        extension: [".pdf"],
        success: async (res) => {
          common_vendor.index.showLoading({
            title: "上传中...",
            mask: true
          });
          try {
            for (const file of res.tempFiles) {
              await this.uploadFile(file);
            }
            common_vendor.index.hideLoading();
            common_vendor.index.showToast({
              title: "上传成功",
              icon: "success"
            });
          } catch (error) {
            common_vendor.index.hideLoading();
            common_vendor.index.showToast({
              title: error.message || "上传失败",
              icon: "none"
            });
          }
        },
        fail: (err) => {
          if (err.errMsg && err.errMsg.includes("cancel")) {
            return;
          }
          common_vendor.index.showToast({
            title: "选择文件失败",
            icon: "none"
          });
        }
      });
    },
    async uploadFile(file) {
      const result = await utils_api.api.uploadFile(file.path);
      if (result.success && result.files.length > 0) {
        this.fileList.push(result.files[0]);
      } else {
        throw new Error(result.message || "上传失败");
      }
    },
    removeFile(index) {
      this.fileList.splice(index, 1);
    },
    clearAll() {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要清空所有文件吗？",
        success: (res) => {
          if (res.confirm) {
            this.cleanupFiles();
            this.fileList = [];
          }
        }
      });
    },
    moveUp(index) {
      if (index > 0) {
        const temp = this.fileList[index];
        this.fileList.splice(index, 1);
        this.fileList.splice(index - 1, 0, temp);
      }
    },
    moveDown(index) {
      if (index < this.fileList.length - 1) {
        const temp = this.fileList[index];
        this.fileList.splice(index, 1);
        this.fileList.splice(index + 1, 0, temp);
      }
    },
    onTouchStart(e, index) {
      this.touchStartY = e.touches[0].clientY;
      this.touchStartIndex = index;
      this.dragIndex = index;
    },
    onTouchMove(e, index) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - this.touchStartY;
      if (Math.abs(diff) > 50) {
        const moveDirection = diff > 0 ? 1 : -1;
        const newIndex = this.touchStartIndex + moveDirection;
        if (newIndex >= 0 && newIndex < this.fileList.length) {
          if (moveDirection > 0) {
            this.moveDown(this.touchStartIndex);
          } else {
            this.moveUp(this.touchStartIndex);
          }
          this.touchStartIndex = newIndex;
          this.dragIndex = newIndex;
          this.touchStartY = currentY;
        }
      }
    },
    onTouchEnd() {
      this.dragIndex = -1;
    },
    async startMerge() {
      if (this.fileList.length < 2) {
        common_vendor.index.showToast({
          title: "至少需要2个文件",
          icon: "none"
        });
        return;
      }
      this.isMerging = true;
      try {
        const filesForMerge = this.fileList.map((file) => ({
          fileId: file.fileId
        }));
        const result = await utils_api.api.mergePdfs(filesForMerge);
        if (result.success) {
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({
            title: "合并成功",
            icon: "success"
          });
          setTimeout(async () => {
            try {
              await utils_api.api.downloadFile(result.downloadUrl, result.filename);
            } catch (e) {
              common_vendor.index.showToast({
                title: "下载失败，请重试",
                icon: "none"
              });
            }
          }, 1500);
        } else {
          throw new Error(result.message || "合并失败");
        }
      } catch (error) {
        common_vendor.index.showToast({
          title: error.message || "合并失败",
          icon: "none"
        });
      } finally {
        this.isMerging = false;
      }
    },
    async cleanupFiles() {
      if (this.fileList.length > 0) {
        const fileIds = this.fileList.map((f) => f.fileId);
        try {
          await utils_api.api.cleanup(fileIds);
        } catch (e) {
          console.log("清理文件失败");
        }
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.chooseFiles && $options.chooseFiles(...args)),
    b: $data.fileList.length > 0
  }, $data.fileList.length > 0 ? {
    c: common_vendor.t($data.fileList.length),
    d: common_vendor.f($data.fileList, (file, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(index + 1),
        b: common_vendor.t(file.filename),
        c: common_vendor.t(file.pageCount),
        d: index > 0
      }, index > 0 ? {
        e: common_vendor.o(($event) => $options.moveUp(index), file.fileId)
      } : {}, {
        f: index < $data.fileList.length - 1
      }, index < $data.fileList.length - 1 ? {
        g: common_vendor.o(($event) => $options.moveDown(index), file.fileId)
      } : {}, {
        h: common_vendor.o(($event) => $options.removeFile(index), file.fileId),
        i: file.fileId,
        j: $data.dragIndex === index ? 1 : "",
        k: common_vendor.o(($event) => $options.onTouchStart($event, index), file.fileId),
        l: common_vendor.o(($event) => $options.onTouchMove($event, index), file.fileId),
        m: common_vendor.o((...args) => $options.onTouchEnd && $options.onTouchEnd(...args), file.fileId)
      });
    })
  } : {}, {
    e: $data.fileList.length > 0
  }, $data.fileList.length > 0 ? {
    f: common_vendor.o((...args) => $options.clearAll && $options.clearAll(...args))
  } : {}, {
    g: !$data.isMerging
  }, !$data.isMerging ? {} : {}, {
    h: $data.fileList.length < 2 || $data.isMerging,
    i: common_vendor.o((...args) => $options.startMerge && $options.startMerge(...args)),
    j: $data.fileList.length < 2 ? 1 : "",
    k: $data.isMerging
  }, $data.isMerging ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-980c459e"], ["__file", "D:/my/tare2/pdf2/frontend/src/pages/merge/merge.vue"]]);
wx.createPage(MiniProgramPage);
