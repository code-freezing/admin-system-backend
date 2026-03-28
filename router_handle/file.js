/**
 * 模块说明：
 * 1. 文件管理业务处理层。
 * 2. 支持文件列表、删除、下载，以及分片上传、秒传和断点续传。
 * 3. 文件物理存储与业务记录分离：同一内容只保留一份物理文件，列表可保留多条业务记录。
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const db = require('../db/index')
const {
  CHUNK_ROOT,
  OBJECT_ROOT,
  PUBLIC_ROOT,
  SESSION_EXPIRE_HOURS,
} = require('../services/file_upload_bootstrap')
const FILE_LIST_COLUMNS = `
  id,
  file_name,
  file_size,
  upload_person,
  upload_time,
  download_number,
  file_url,
  object_id,
  content_hash,
  storage_path,
  status
`

const query = (sql, values = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, values, (err, results) => {
      if (err) {
        reject(err)
        return
      }

      resolve(results)
    })
  })

const buildPublicUrl = (req, storagePath) => {
  if (!storagePath) {
    return null
  }

  return `${req.protocol}://${req.get('host')}${storagePath}`
}

const normalizeFileName = (originalName = '') => {
  return Buffer.from(originalName, 'latin1').toString('utf8')
}

const toFileSizeKb = (sizeBytes) => {
  return (Number(sizeBytes || 0) / 1024).toFixed(2)
}

const toAbsolutePath = (storagePath) => {
  if (!storagePath) {
    return null
  }

  return path.join(PUBLIC_ROOT, storagePath.replace(/^\//, ''))
}

const exists = async (targetPath) => {
  if (!targetPath) {
    return false
  }

  try {
    await fs.promises.access(targetPath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

const ensureChunkDir = async (uploadId) => {
  const chunkDir = path.join(CHUNK_ROOT, uploadId)
  await fs.promises.mkdir(chunkDir, { recursive: true })
  return chunkDir
}

const removeChunkDir = async (uploadId) => {
  const chunkDir = path.join(CHUNK_ROOT, uploadId)
  if (await exists(chunkDir)) {
    await fs.promises.rm(chunkDir, { recursive: true, force: true })
  }
}

const hashFile = (targetPath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5')
    const stream = fs.createReadStream(targetPath)

    stream.on('error', reject)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  })

const parseUploadedChunks = (value) => {
  if (!value) {
    return []
  }

  try {
    const chunks = JSON.parse(value)
    if (!Array.isArray(chunks)) {
      return []
    }

    return chunks
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 0)
      .sort((a, b) => a - b)
  } catch {
    return []
  }
}

const stringifyUploadedChunks = (chunks) => {
  const normalized = Array.from(new Set(chunks))
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0)
    .sort((a, b) => a - b)

  return JSON.stringify(normalized)
}

const getCurrentUserName = (req) => {
  return req.accessContext?.user?.name || req.body?.name || ''
}

const getCurrentUserKey = (req) => {
  return req.accessContext?.user?.account || req.accessContext?.user?.id || 'anonymous'
}

const getReadyFileRecordById = async (id) => {
  const rows = await query(
    `
      select *
      from files
      where id = ?
        and status = 'ready'
      limit 1
    `,
    [id]
  )

  return rows[0] || null
}

const getFileObjectByHash = async (contentHash) => {
  const rows = await query('select * from file_objects where content_hash = ? limit 1', [contentHash])
  return rows[0] || null
}

const getFileObjectById = async (id) => {
  const rows = await query('select * from file_objects where id = ? limit 1', [id])
  return rows[0] || null
}

const incrementObjectRefCount = async (objectId) => {
  await query('update file_objects set ref_count = ref_count + 1 where id = ?', [objectId])
}

const createFileRecord = async (req, payload) => {
  const result = await query('insert into files set ?', {
    object_id: payload.objectId,
    content_hash: payload.contentHash,
    storage_path: payload.storagePath,
    status: 'ready',
    file_url: buildPublicUrl(req, payload.storagePath),
    file_name: payload.fileName,
    file_size: toFileSizeKb(payload.fileSize),
    upload_person: payload.uploadPerson,
    upload_time: new Date(),
    download_number: 0,
  })

  const rows = await query('select * from files where id = ? limit 1', [result.insertId])
  return rows[0]
}

const createFileRecordFromObject = async (req, fileObject, fileName, uploadPerson) => {
  await incrementObjectRefCount(fileObject.id)
  return createFileRecord(req, {
    objectId: fileObject.id,
    contentHash: fileObject.content_hash,
    storagePath: fileObject.storage_path,
    fileName,
    fileSize: fileObject.file_size,
    uploadPerson,
  })
}

const getPendingSession = async (payload) => {
  const rows = await query(
    `
      select *
      from file_upload_sessions
      where content_hash = ?
        and file_name = ?
        and file_size = ?
        and chunk_size = ?
        and chunk_total = ?
        and created_by = ?
        and status = 'pending'
        and expires_at > now()
      order by updated_at desc
      limit 1
    `,
    [
      payload.contentHash,
      payload.fileName,
      payload.fileSize,
      payload.chunkSize,
      payload.chunkTotal,
      payload.createdBy,
    ]
  )

  return rows[0] || null
}

const createUploadSession = async (payload) => {
  const uploadId = crypto.randomBytes(16).toString('hex')
  await query(
    `
      insert into file_upload_sessions
        (upload_id, content_hash, file_name, file_size, chunk_size, chunk_total, mime_type, uploaded_chunks, status, created_by, created_at, updated_at, expires_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, now(), now(), date_add(now(), interval ? hour))
    `,
    [
      uploadId,
      payload.contentHash,
      payload.fileName,
      payload.fileSize,
      payload.chunkSize,
      payload.chunkTotal,
      payload.mimeType,
      '[]',
      payload.createdBy,
      SESSION_EXPIRE_HOURS,
    ]
  )

  return {
    upload_id: uploadId,
    uploaded_chunks: '[]',
  }
}

const getSessionByUploadId = async (uploadId) => {
  const rows = await query('select * from file_upload_sessions where upload_id = ? limit 1', [uploadId])
  return rows[0] || null
}

const updateSessionChunks = async (uploadId, chunks) => {
  await query(
    `
      update file_upload_sessions
      set uploaded_chunks = ?,
          updated_at = now(),
          expires_at = date_add(now(), interval ? hour)
      where upload_id = ?
    `,
    [stringifyUploadedChunks(chunks), SESSION_EXPIRE_HOURS, uploadId]
  )
}

const markSessionStatus = async (uploadId, status) => {
  await query(
    `
      update file_upload_sessions
      set status = ?,
          updated_at = now()
      where upload_id = ?
    `,
    [status, uploadId]
  )
}

const createFileObject = async (payload) => {
  const result = await query(
    `
      insert into file_objects
        (content_hash, storage_path, file_size, chunk_size, chunk_total, mime_type, ref_count, created_at)
      values (?, ?, ?, ?, ?, ?, 0, now())
    `,
    [
      payload.contentHash,
      payload.storagePath,
      payload.fileSize,
      payload.chunkSize,
      payload.chunkTotal,
      payload.mimeType,
    ]
  )

  return getFileObjectById(result.insertId)
}

const resolveFileExtension = (fileName, mimeType = '') => {
  const explicitExtension = path.extname(fileName || '')
  if (explicitExtension) {
    return explicitExtension
  }

  if (mimeType === 'image/jpeg') return '.jpg'
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'application/pdf') return '.pdf'
  return ''
}

const mergeChunksToObject = async (session) => {
  const extension = resolveFileExtension(session.file_name, session.mime_type)
  const objectStoragePath = `/upload/objects/${session.content_hash}${extension}`
  const objectAbsolutePath = toAbsolutePath(objectStoragePath)

  if (await exists(objectAbsolutePath)) {
    return objectStoragePath
  }

  const chunkDir = path.join(CHUNK_ROOT, session.upload_id)
  const tempAbsolutePath = path.join(OBJECT_ROOT, `${session.content_hash}.${Date.now()}.tmp`)
  const writeStream = fs.createWriteStream(tempAbsolutePath)

  try {
    for (let index = 0; index < Number(session.chunk_total); index += 1) {
      const chunkPath = path.join(chunkDir, `${index}.part`)
      if (!(await exists(chunkPath))) {
        throw new Error(`第 ${index + 1} 个分片缺失`)
      }

      await new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(chunkPath)
        readStream.on('error', reject)
        readStream.on('end', resolve)
        readStream.pipe(writeStream, { end: false })
      })
    }

    await new Promise((resolve) => {
      writeStream.end(resolve)
    })

    const mergedHash = await hashFile(tempAbsolutePath)
    if (mergedHash !== session.content_hash) {
      throw new Error('文件内容校验失败，请重新上传')
    }

    await fs.promises.rename(tempAbsolutePath, objectAbsolutePath)
    return objectStoragePath
  } catch (error) {
    writeStream.destroy()

    if (await exists(tempAbsolutePath)) {
      await fs.promises.rm(tempAbsolutePath, { force: true })
    }

    throw error
  }
}

const ensureFileObjectForSession = async (session) => {
  const existing = await getFileObjectByHash(session.content_hash)
  const existingAbsolutePath = toAbsolutePath(existing?.storage_path)

  if (existing && (await exists(existingAbsolutePath))) {
    return existing
  }

  const objectStoragePath = await mergeChunksToObject(session)
  const existingAfterMerge = await getFileObjectByHash(session.content_hash)
  if (existingAfterMerge) {
    return existingAfterMerge
  }

  return createFileObject({
    contentHash: session.content_hash,
    storagePath: objectStoragePath,
    fileSize: session.file_size,
    chunkSize: session.chunk_size,
    chunkTotal: session.chunk_total,
    mimeType: session.mime_type,
  })
}

const validateInitPayload = (body) => {
  const fileName = String(body.fileName || '').trim()
  const contentHash = String(body.contentHash || '').trim()
  const mimeType = String(body.mimeType || '').trim()
  const fileSize = Number(body.fileSize || 0)
  const chunkSize = Number(body.chunkSize || 0)
  const chunkTotal = Number(body.chunkTotal || 0)

  if (!fileName || !contentHash || !fileSize || !chunkSize || !chunkTotal) {
    return null
  }

  return {
    fileName,
    contentHash,
    mimeType,
    fileSize,
    chunkSize,
    chunkTotal,
  }
}

exports.initMultipartUpload = async (req, res) => {
  try {
    const payload = validateInitPayload(req.body)
    if (!payload) {
      return res.send({
        status: 1,
        message: '上传初始化参数不完整',
      })
    }

    const uploadPerson = getCurrentUserName(req)
    const createdBy = String(getCurrentUserKey(req))
    const existingObject = await getFileObjectByHash(payload.contentHash)
    const objectAbsolutePath = toAbsolutePath(existingObject?.storage_path)

    if (existingObject && (await exists(objectAbsolutePath))) {
      const fileRecord = await createFileRecordFromObject(req, existingObject, payload.fileName, uploadPerson)
      return res.send({
        status: 0,
        uploadId: '',
        shouldUpload: false,
        uploadedChunks: [],
        fileRecord,
      })
    }

    const session =
      (await getPendingSession({
        ...payload,
        createdBy,
      })) ||
      (await createUploadSession({
        ...payload,
        createdBy,
      }))

    return res.send({
      status: 0,
      uploadId: session.upload_id,
      shouldUpload: true,
      uploadedChunks: parseUploadedChunks(session.uploaded_chunks),
    })
  } catch (error) {
    return res.cc(error)
  }
}

exports.uploadChunk = async (req, res) => {
  try {
    const uploadId = String(req.body.uploadId || '').trim()
    const contentHash = String(req.body.contentHash || '').trim()
    const chunkIndex = Number(req.body.chunkIndex)
    const chunkFile = req.files?.[0]

    if (!uploadId || !contentHash || !Number.isInteger(chunkIndex) || chunkIndex < 0 || !chunkFile) {
      return res.send({
        status: 1,
        message: '分片参数不完整',
      })
    }

    const session = await getSessionByUploadId(uploadId)
    if (!session || session.status !== 'pending') {
      return res.send({
        status: 1,
        message: '上传会话不存在或已失效',
      })
    }

    if (session.content_hash !== contentHash) {
      return res.send({
        status: 1,
        message: '文件指纹不匹配',
      })
    }

    const chunkDir = await ensureChunkDir(uploadId)
    const targetPath = path.join(chunkDir, `${chunkIndex}.part`)
    await fs.promises.rename(chunkFile.path, targetPath)

    const uploadedChunks = parseUploadedChunks(session.uploaded_chunks)
    if (!uploadedChunks.includes(chunkIndex)) {
      uploadedChunks.push(chunkIndex)
    }

    await updateSessionChunks(uploadId, uploadedChunks)

    return res.send({
      status: 0,
      message: '分片上传成功',
      uploadedChunks: uploadedChunks.sort((a, b) => a - b),
    })
  } catch (error) {
    return res.cc(error)
  }
}

exports.completeMultipartUpload = async (req, res) => {
  try {
    const uploadId = String(req.body.uploadId || '').trim()
    const contentHash = String(req.body.contentHash || '').trim()
    if (!uploadId || !contentHash) {
      return res.send({
        status: 1,
        message: '缺少上传会话信息',
      })
    }

    const session = await getSessionByUploadId(uploadId)
    if (!session || session.status !== 'pending') {
      return res.send({
        status: 1,
        message: '上传会话不存在或已结束',
      })
    }

    if (session.content_hash !== contentHash) {
      return res.send({
        status: 1,
        message: '文件指纹不匹配',
      })
    }

    const uploadedChunks = parseUploadedChunks(session.uploaded_chunks)
    if (uploadedChunks.length !== Number(session.chunk_total)) {
      return res.send({
        status: 1,
        message: '分片未上传完整',
      })
    }

    const fileObject = await ensureFileObjectForSession(session)
    const fileRecord = await createFileRecordFromObject(
      req,
      fileObject,
      session.file_name,
      getCurrentUserName(req),
    )

    await markSessionStatus(uploadId, 'completed')
    await removeChunkDir(uploadId)

    return res.send({
      status: 0,
      message: '文件上传成功',
      fileRecord,
    })
  } catch (error) {
    return res.cc(error)
  }
}

exports.abortMultipartUpload = async (req, res) => {
  try {
    const uploadId = String(req.body.uploadId || '').trim()
    if (!uploadId) {
      return res.send({
        status: 1,
        message: '缺少上传会话信息',
      })
    }

    const session = await getSessionByUploadId(uploadId)
    if (!session) {
      return res.send({
        status: 0,
        message: '上传会话已结束',
      })
    }

    await markSessionStatus(uploadId, 'aborted')
    await removeChunkDir(uploadId)

    return res.send({
      status: 0,
      message: '已取消上传',
    })
  } catch (error) {
    return res.cc(error)
  }
}

// 兼容旧版整文件直传，内部会复用新的对象去重逻辑。
exports.uploadFile = async (req, res) => {
  try {
    const file = req.files?.[0]
    if (!file) {
      return res.send({
        status: 1,
        message: '未检测到上传文件',
      })
    }

    const fileName = normalizeFileName(file.originalname)
    const uploadPerson = getCurrentUserName(req)
    const contentHash = await hashFile(file.path)
    let fileObject = await getFileObjectByHash(contentHash)
    const objectAbsolutePath = toAbsolutePath(fileObject?.storage_path)

    if (!fileObject || !(await exists(objectAbsolutePath))) {
      const extension = resolveFileExtension(fileName, file.mimetype)
      const storagePath = `/upload/objects/${contentHash}${extension}`
      const targetPath = toAbsolutePath(storagePath)

      await fs.promises.mkdir(path.dirname(targetPath), { recursive: true })
      if (!(await exists(targetPath))) {
        await fs.promises.rename(file.path, targetPath)
      } else {
        await fs.promises.rm(file.path, { force: true })
      }

      fileObject =
        (await getFileObjectByHash(contentHash)) ||
        (await createFileObject({
          contentHash,
          storagePath,
          fileSize: file.size,
          chunkSize: file.size,
          chunkTotal: 1,
          mimeType: file.mimetype,
        }))
    } else {
      await fs.promises.rm(file.path, { force: true })
    }

    const fileRecord = await createFileRecordFromObject(req, fileObject, fileName, uploadPerson)

    return res.send({
      status: 0,
      url: fileRecord.file_url,
      fileRecord,
    })
  } catch (error) {
    return res.cc(error)
  }
}

// 兼容旧版“上传后补绑定上传人”的调用方式。
exports.bindFileAndUser = async (req, res) => {
  try {
    const { name, url } = req.body
    if (!name || !url) {
      return res.send({
        status: 1,
        message: '绑定参数不完整',
      })
    }

    await query(
      `
        update files
        set upload_person = ?
        where file_url = ?
          and status = 'ready'
      `,
      [name, url]
    )

    return res.send({
      status: 0,
      message: '绑定成功',
    })
  } catch (error) {
    return res.cc(error)
  }
}

// 兼容旧版下载计数接口。
exports.updateDownload = async (req, res) => {
  try {
    const { id } = req.body
    await query(
      `
        update files
        set download_number = download_number + 1
        where id = ?
          and status = 'ready'
      `,
      [id]
    )

    return res.send({
      status: 0,
      message: '下载量增加',
    })
  } catch (error) {
    return res.cc(error)
  }
}

// 下载接口以业务记录为入口，便于统计下载次数并适配内容去重。
exports.downloadFile = async (req, res) => {
  try {
    const record = await getReadyFileRecordById(req.body.id)
    if (!record) {
      return res.send({
        status: 1,
        message: '文件不存在或已删除',
      })
    }

    await query(
      `
        update files
        set download_number = download_number + 1
        where id = ?
      `,
      [record.id]
    )

    return res.send({
      status: 0,
      url: buildPublicUrl(req, record.storage_path),
    })
  } catch (error) {
    return res.cc(error)
  }
}

// 获取全部文件列表。
exports.fileList = async (req, res) => {
  try {
    const rows = await query(
      `
        select ${FILE_LIST_COLUMNS}
        from files
        where status = 'ready'
        order by upload_time desc, id desc
      `
    )

    return res.send(rows)
  } catch (error) {
    return res.cc(error)
  }
}

// 获取文件总数。
exports.fileListLength = async (req, res) => {
  try {
    const rows = await query(`select count(*) as total from files where status = 'ready'`)
    return res.send({
      length: rows[0].total,
    })
  } catch (error) {
    return res.cc(error)
  }
}

// 分页获取文件列表，每页 10 条。
exports.returnFilesListData = async (req, res) => {
  try {
    const offset = (Number(req.body.pager) - 1) * 10
    const rows = await query(
      `
        select ${FILE_LIST_COLUMNS}
        from files
        where status = 'ready'
        order by upload_time desc, id desc
        limit 10 offset ?
      `,
      [Math.max(offset, 0)]
    )

    return res.send(rows)
  } catch (error) {
    return res.cc(error)
  }
}

// 按文件名模糊搜索。
exports.searchFile = async (req, res) => {
  try {
    const fileName = String(req.body.file_name || '').trim()
    const rows = await query(
      `
        select ${FILE_LIST_COLUMNS}
        from files
        where status = 'ready'
          and file_name like ?
        order by upload_time desc, id desc
      `,
      [`%${fileName}%`]
    )

    return res.send(rows)
  } catch (error) {
    return res.cc(error)
  }
}

// 删除文件记录并按引用计数回收物理文件。
exports.deleteFile = async (req, res) => {
  try {
    const record = await getReadyFileRecordById(req.body.id)
    if (!record) {
      return res.send({
        status: 1,
        message: '文件不存在或已删除',
      })
    }

    await query(`update files set status = 'deleted' where id = ?`, [record.id])

    if (record.object_id) {
      await query(
        `
          update file_objects
          set ref_count = case when ref_count > 0 then ref_count - 1 else 0 end
          where id = ?
        `,
        [record.object_id]
      )

      const fileObject = await getFileObjectById(record.object_id)
      if (fileObject && Number(fileObject.ref_count || 0) <= 0) {
        const absolutePath = toAbsolutePath(fileObject.storage_path)
        if (await exists(absolutePath)) {
          await fs.promises.rm(absolutePath, { force: true })
        }

        await query('delete from file_objects where id = ?', [record.object_id])
      }
    }

    return res.send({
      status: 0,
      message: '删除成功',
    })
  } catch (error) {
    return res.cc(error)
  }
}
