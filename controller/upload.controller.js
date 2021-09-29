/**
 * @module 文件上传控制器
 */

const qiniu = require('qiniu')
const formidable = require('formidable')
const { QINIU } = require('../config/config.default')
const HandleResponse = require('../core/response-handler')

class UploadController {

  uploadFiles (req, res) {

    const upToken = () => {
      const putPolicy = new qiniu.rs.PutPolicy({
        scope: QINIU.scope,
        expires: 7200
      })
      const mac = new qiniu.auth.digest.Mac(QINIU.accessKey, QINIU.secretKey)
      const uploadToken = putPolicy.uploadToken(mac)
      return uploadToken
    }

    const form = new formidable.IncomingForm({
      multiples: true,
      keepExtensions: true,   // 保留后缀
      maxFieldsSize: 5 * 1024 * 1024  // 限制最大 5MB
    })

    form.parse(req, (err, fields, files) => {
      if (err) {
        return new HandleResponse('上传出错了～').fail(res)
      }

      // 上传到七牛后保存的文件名
      let key = new Date().getTime()

      // 获取上传凭证 token
      let token = upToken()

      // 要上传文件的本地路径 (表单 type 为 file)
      let filePath = files.file.path

      const config = new qiniu.conf.Config({
        // 华南机房 Zone 对象
        // 参照：https://developer.qiniu.com/kodo/1289/nodejs
        zone: qiniu.zone.Zone_z2,
      })
      const formUploader = new qiniu.form_up.FormUploader(config)
      const putExtra = new qiniu.form_up.PutExtra()

      formUploader.putFile(token, key, filePath, putExtra, (respErr, respBody, respInfo) => {
        if (respErr) {
          return new HandleResponse('上传出错了～').fail(res)
        }

        // 上传成功，返回七牛云中图片地址
        if (respInfo.statusCode === 200) {
          const response = {
            'url': QINIU.url + key
          }
          new HandleResponse(response, '图片上传成功').success(res)
        } else {
          return new HandleResponse('图片上传失败').fail(res)
        }
      })
    })
  }
}

module.exports = new UploadController()
