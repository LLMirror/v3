import request from '@/utils/request'

export function addBiaoqian(data) {
  return request({
    url: '/system/biaoqian/add',
    data,
  });
}

export function getBiaoqian(data) {
  return request({
    url: '/system/biaoqian/get',
    data,
  });
}

export function upBiaoqian(data) {
  return request({
    url: '/system/biaoqian/up',
    data,
  });
}

export function delBiaoqian(data) {
  return request({
    url: '/system/biaoqian/del',
    data,
  });
}

