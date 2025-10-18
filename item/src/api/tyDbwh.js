import request from '@/utils/request'

/**
 * 获取数据库表列表
 * @param {Object} data 查询参数
 * @returns {Promise}
 */
export function getDataList(data) {
  return request({
    url: '/ty-dbwh/data/list',
    data
  })
}

/**
 * 获取数据库表详情
 * @param {Object} data {id: 表ID}
 * @returns {Promise}
 */
export function getDataDetail(data) {
  return request({
    url: '/ty-dbwh/data/detail',
    data
  })
}

/**
 * 添加数据库表
 * @param {Object} data 表信息
 * @returns {Promise}
 */
export function addData(data) {
  return request({
    url: '/ty-dbwh/data/add',
    data
  })
}

/**
 * 修改数据库表
 * @param {Object} data 表信息
 * @returns {Promise}
 */
export function updateData(data) {
  return request({
    url: '/ty-dbwh/data/update',
    data
  })
}

/**
 * 删除数据库表
 * @param {Object} data {id: 表ID}
 * @returns {Promise}
 */
export function deleteData(data) {
  return request({
    url: '/ty-dbwh/data/delete',
    data
  })
}

/**
 * 切换数据库表状态
 * @param {Object} data {id: 表ID, status: 状态}
 * @returns {Promise}
 */
export function changeStatus(data) {
  return request({
    url: '/ty-dbwh/data/changeStatus',
    data
  })
}