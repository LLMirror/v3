import fs from 'fs';
import path from 'path';
/**
 * 删除指定目录中超过指定天数的文件
 * @param {string} directoryPath 目录路径
 * @param {number} days 天数阈值（默认30天）
 * @param {boolean} dryRun 模拟运行（不实际删除）
 * @param {string[]} excludeExtensions 要排除的文件扩展名
 * @param {boolean} isLog 是否显示删除打印
 */
async function cleanOldFiles({
                               directoryPath,
                               days = 30,
                               dryRun = false,
                               excludeExtensions = [],
                               isLog = false
                             }) {
  try {
    if(isLog){
      console.log(`\n开始清理目录: ${directoryPath}`);
      console.log(`删除超过 ${days} 天的文件${dryRun ? ' (模拟运行)' : ''}`);
    }
    const files = await fs.promises.readdir(directoryPath);
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let totalSize = 0;
    let deletedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const filePath = path.join(directoryPath, file);

      try {
        const stats = await fs.promises.stat(filePath);

        // 跳过目录
        if (!stats.isFile()) {
          skippedCount++;
          continue;
        }

        // 检查是否在排除列表中
        const ext = path.extname(file).toLowerCase();
        if (excludeExtensions.includes(ext)) {
          console.log(`跳过排除文件: ${filePath}`);
          skippedCount++;
          continue;
        }

        // 检查文件时间
        if (stats.mtime < cutoffDate) {
          totalSize += stats.size;

          if (dryRun) {
            console.log(`[模拟] 将删除: ${filePath} (${formatSize(stats.size)}, 修改于: ${stats.mtime.toISOString()})`);
          } else {
            await fs.promises.unlink(filePath);
            console.log(`已删除: ${filePath} (${formatSize(stats.size)}, 修改于: ${stats.mtime.toISOString()})`);
          }

          deletedCount++;
        }
      } catch (err) {
        console.error(`处理文件 ${filePath} 时出错:`, err.message);
      }
    }
    if (isLog) {
      console.log('\n清理结果:');
      console.log(`- 扫描文件总数: ${files.length}`);
      console.log(`- 已删除文件数: ${deletedCount}`);
      console.log(`- 跳过文件数: ${skippedCount}`);
      console.log(`- 释放空间: ${formatSize(totalSize)}`);
      console.log(`- 剩余文件: ${files.length - deletedCount - skippedCount}`);
    }
  } catch (err) {
    console.error('清理过程中出错:', err);
  }
}

// 辅助函数：格式化文件大小
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
export default cleanOldFiles;
