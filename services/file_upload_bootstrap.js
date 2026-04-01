const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { URL } = require('url')
const db = require('../db')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const PUBLIC_ROOT = path.join(PROJECT_ROOT, 'public')
const UPLOAD_ROOT = path.join(PUBLIC_ROOT, 'upload')
const OBJECT_ROOT = path.join(UPLOAD_ROOT, 'objects')
const CHUNK_ROOT = path.join(UPLOAD_ROOT, 'chunks')
const SESSION_EXPIRE_HOURS = 24

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

// 处理表格数据，把当前模块的关键逻辑集中在这里。
const ensureTable = async (sql) => {
  await query(sql)
}

// 处理当前模块的核心逻辑，避免同类分支散落在多个位置。
const ensureColumn = async (tableName, columnName, columnSql) => {
  const rows = await query(
    `
      select count(*) as count
      from information_schema.columns
      where table_schema = database()
        and table_name = ?
        and column_name = ?
    `,
    [tableName, columnName]
  )

  if (Number(rows[0]?.count || 0) === 0) {
    await query(`alter table ${tableName} add column ${columnSql}`)
  }
}

// 处理当前模块的核心逻辑，避免同类分支散落在多个位置。
const ensureDirectories = () => {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true })
  fs.mkdirSync(OBJECT_ROOT, { recursive: true })
  fs.mkdirSync(CHUNK_ROOT, { recursive: true })
}

// 解析路径，让后续分支基于统一结果继续执行。
const resolveStoragePath = (record) => {
  if (record.storage_path) {
    return record.storage_path
  }

  if (record.file_url) {
    if (typeof record.file_url === 'string' && record.file_url.startsWith('http')) {
      try {
        return new URL(record.file_url).pathname
      } catch {
        return null
      }
    }

    if (typeof record.file_url === 'string' && record.file_url.startsWith('/')) {
      return record.file_url
    }
  }

  if (record.file_name) {
    return `/upload/${record.file_name}`
  }

  return null
}

// 处理路径，把当前模块的关键逻辑集中在这里。
const toAbsolutePath = (relativePath) => {
  if (!relativePath) {
    return null
  }

  return path.join(PUBLIC_ROOT, relativePath.replace(/^\//, ''))
}

// 处理文件，把当前模块的关键逻辑集中在这里。
const fileExists = async (targetPath) => {
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

// 处理文件，把当前模块的关键逻辑集中在这里。
const hashFile = (targetPath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5')
    const stream = fs.createReadStream(targetPath)

    stream.on('error', reject)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  })

// 处理当前模块的核心逻辑，避免同类分支散落在多个位置。
const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

// 构建文件，把零散输入整理成后续可消费的结果。
const buildFileUrl = (storagePath) => {
  if (!storagePath) {
    return null
  }

  return `http://127.0.0.1:3007${storagePath}`
}

// 处理文件，把当前模块的关键逻辑集中在这里。
const ensureFileObject = async (payload) => {
  const rows = await query('select * from file_objects where content_hash = ? limit 1', [
    payload.contentHash,
  ])

  if (rows[0]) {
    const nextRefCount = Math.max(toNumber(rows[0].ref_count), payload.refCount)
    await query(
      `
        update file_objects
        set storage_path = ?,
            file_size = ?,
            chunk_size = ?,
            chunk_total = ?,
            mime_type = ?,
            ref_count = ?,
            created_at = coalesce(created_at, now())
        where id = ?
      `,
      [
        payload.storagePath,
        payload.fileSize,
        payload.chunkSize,
        payload.chunkTotal,
        payload.mimeType,
        nextRefCount,
        rows[0].id,
      ]
    )

    return rows[0].id
  }

  const result = await query(
    `
      insert into file_objects
        (content_hash, storage_path, file_size, chunk_size, chunk_total, mime_type, ref_count, created_at)
      values (?, ?, ?, ?, ?, ?, ?, now())
    `,
    [
      payload.contentHash,
      payload.storagePath,
      payload.fileSize,
      payload.chunkSize,
      payload.chunkTotal,
      payload.mimeType,
      payload.refCount,
    ]
  )

  return result.insertId
}

// 处理文件，把当前模块的关键逻辑集中在这里。
const migrateLegacyFiles = async () => {
  const rows = await query('select * from files order by id asc')

  for (const row of rows) {
    const currentStoragePath = resolveStoragePath(row)
    const currentAbsolutePath = toAbsolutePath(currentStoragePath)
    const hasSourceFile = await fileExists(currentAbsolutePath)

    let contentHash = row.content_hash
    let finalStoragePath = currentStoragePath
    let finalAbsolutePath = currentAbsolutePath
    let fileSizeBytes = Math.max(Math.round(toNumber(row.file_size) * 1024), 0)
    const fileExtension = path.extname(row.file_name || currentStoragePath || '')

    if (!contentHash) {
      if (hasSourceFile) {
        contentHash = await hashFile(currentAbsolutePath)
      } else {
        contentHash = `legacy-missing-${row.id}`
      }
    }

    if (hasSourceFile) {
      const objectStoragePath = `/upload/objects/${contentHash}${fileExtension}`
      const objectAbsolutePath = toAbsolutePath(objectStoragePath)

      if (!(await fileExists(objectAbsolutePath))) {
        await fs.promises.copyFile(currentAbsolutePath, objectAbsolutePath)
      }

      finalStoragePath = objectStoragePath
      finalAbsolutePath = objectAbsolutePath

      if (!fileSizeBytes) {
        const stats = await fs.promises.stat(finalAbsolutePath)
        fileSizeBytes = stats.size
      }
    }

    const objectId = await ensureFileObject({
      contentHash,
      storagePath: finalStoragePath || `/upload/${row.file_name || `legacy-${row.id}`}`,
      fileSize: fileSizeBytes,
      chunkSize: 0,
      chunkTotal: 0,
      mimeType: null,
      refCount: 0,
    })

    await query(
      `
        update files
        set object_id = ?,
            content_hash = ?,
            storage_path = ?,
            status = coalesce(status, 'ready'),
            file_url = ?
        where id = ?
      `,
      [objectId, contentHash, finalStoragePath, buildFileUrl(finalStoragePath), row.id]
    )
  }
}

// 同步当前状态，避免本地结果和实际数据出现偏差。
const syncObjectRefCounts = async () => {
  await query('update file_objects set ref_count = 0')
  await query(
    `
      update file_objects fo
      inner join (
        select object_id, count(*) as total
        from files
        where status = 'ready'
          and object_id is not null
        group by object_id
      ) refs on refs.object_id = fo.id
      set fo.ref_count = refs.total
    `
  )
}

// 处理当前模块的核心逻辑，避免同类分支散落在多个位置。
const cleanupExpiredSessions = async () => {
  const rows = await query(
    `
      select upload_id
      from file_upload_sessions
      where status in ('aborted')
         or expires_at < now()
    `
  )

  for (const row of rows) {
    if (!row.upload_id) {
      continue
    }

    const chunkDir = path.join(CHUNK_ROOT, row.upload_id)
    if (await fileExists(chunkDir)) {
      await fs.promises.rm(chunkDir, { recursive: true, force: true })
    }
  }

  await query(
    `
      delete from file_upload_sessions
      where status in ('aborted')
         or expires_at < now()
    `
  )
}

// 初始化文件上传，让模块在启动时具备完整运行条件。
const bootstrapFileUpload = async () => {
  ensureDirectories()

  await ensureTable(`
    create table if not exists file_objects (
      id int not null auto_increment primary key,
      content_hash varchar(64) not null unique,
      storage_path varchar(255) not null,
      file_size bigint not null default 0,
      chunk_size int not null default 0,
      chunk_total int not null default 0,
      mime_type varchar(255) null,
      ref_count int not null default 0,
      created_at datetime not null
    )
  `)

  await ensureTable(`
    create table if not exists file_upload_sessions (
      id int not null auto_increment primary key,
      upload_id varchar(64) not null unique,
      content_hash varchar(64) not null,
      file_name varchar(255) not null,
      file_size bigint not null,
      chunk_size int not null,
      chunk_total int not null,
      mime_type varchar(255) null,
      uploaded_chunks text null,
      status varchar(16) not null,
      created_by varchar(255) null,
      created_at datetime not null,
      updated_at datetime not null,
      expires_at datetime not null
    )
  `)

  await ensureColumn('files', 'object_id', 'object_id int null after id')
  await ensureColumn('files', 'content_hash', 'content_hash varchar(64) null after object_id')
  await ensureColumn('files', 'storage_path', 'storage_path varchar(255) null after content_hash')
  await ensureColumn(
    'files',
    'status',
    `status varchar(16) not null default 'ready' after storage_path`
  )

  await migrateLegacyFiles()
  await syncObjectRefCounts()
  await cleanupExpiredSessions()
}

// 导出当前模块的公共能力，方便其他业务文件按需复用。
module.exports = {
  CHUNK_ROOT,
  OBJECT_ROOT,
  PUBLIC_ROOT,
  SESSION_EXPIRE_HOURS,
  bootstrapFileUpload,
}
