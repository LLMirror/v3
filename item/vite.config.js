import { defineConfig, loadEnv } from 'vite'
import fs from 'fs'
import path from 'path'
import createVitePlugins from './vite/plugins'
import postCssPxToRem from "postcss-pxtorem"
// 开源地址：https://gitee.com/MMinter/vue_node
// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd())
  const { VITE_APP_ENV } = env
  return {
    // 部署生产环境和开发环境下的URL。
    // 默认情况下，vite 会假设你的应用是被部署在一个域名的根路径上
    // 例如 https://www.node.vip/。如果应用被部署在一个子路径上，你就需要用这个选项指定这个子路径。例如，如果你的应用被部署在 https://www.vip/admin/，则设置 baseUrl 为 /admin/。
    base: VITE_APP_ENV === 'production' ? '/' : '/',
    plugins: createVitePlugins(env, command === 'build'),
    resolve: {
      // https://cn.vitejs.dev/config/#resolve-alias
      alias: {
        // 设置路径
        '~': path.resolve(__dirname, './'),
        // 设置别名
        '@': path.resolve(__dirname, './src')
      },
      // https://cn.vitejs.dev/config/#resolve-extensions
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
    },
    // vite 相关配置
    server: {
      port: 8080,
      host: true,
      https: {
        key: fs.readFileSync(path.resolve(__dirname, '../APP/certs/刘磊.com.key')),
        cert: fs.readFileSync(path.resolve(__dirname, '../APP/certs/刘磊.com_bundle.pem'))
      },
      open: false,
      proxy: {
        // https://cn.vitejs.dev/config/#server-proxy
        '/dev-api': {
          target: 'https://xn--2br465g.com:443',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/dev-api/, '')
        }
      }
    },
    //fix:error:stdin>:7356:1: warning: "@charset" must be the first rule in the file
    css: {
      postcss: {
        plugins: [
          postCssPxToRem({
            //本身应该192，为了适配，使用230；设计图一样是1920*1080
            rootValue: 192, // 设计稿尺寸 1rem大小
            propList: ['*'], // 需要转换的属性，这里选择全部都进行转换
            //selectorBlackList: ['el-','root'] //设置忽略的样式
          }),
          {
            postcssPlugin: 'internal:charset-removal',
            AtRule: {
              charset: (atRule) => {
                if (atRule.name === 'charset') {
                  atRule.remove();
                }
              }
            }
          }
        ]
      },
      // preprocessorOptions: {
      //   scss: {
      //     additionalData: `@use "@/assets/styles/overall.scss" as *;`
      //   }
      // },
      css: {
  preprocessorOptions: {
    scss: {
      additionalData: `@import "@/assets/styles/overall.scss";`
    }
  }
}

    }
  }
})
