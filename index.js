#!/usr/bin/env node
const path = require('path')
const Koa = require('koa')
const send = require('koa-send')

const app = new Koa()

const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    let chunks = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    stream.on('error', reject)
  })

// 3. 加载第三方模块
app.use(async (ctx, next) => {
  // ctx.path --> /@modules/
  if (ctx.path.startsWith('/@modules/')) {
    const moduleName = ctx.path.substr(10)
    const pkgPath = path.join(
      process.cwd(),
      'node_modules',
      moduleName,
      'package.json'
    )
    const pkg = require(pkgPath)
    ctx.path = path.join('/node_modules', moduleName, pkg.module)
  }
  await next()
})

// 1. 静态文件服务器
app.use(async (ctx, next) => {
  await send(ctx, ctx.path, { root: process.cwd(), index: 'index.html' })
  await next()
})

// 2. 修改第三方模块的路径
app.use(async (ctx, next) => {
  if (ctx.type === 'application/javascript') {
    const contents = await streamToString(ctx.body)
    ctx.body = contents.replace(/(from\s+['"])(?![\.\/]))/g, '$1/@modules/')
  }
  await next()
})

app.listen(3000, () => {
  console.log('Server running @ http://localhost:3000')
})
