import request from '@/utils/request'
//添加文件
export function addFile(data) {
    return request({
        url: "/components/addFile",
        data
    });
}

//查询图片
export function getImg(data) {
    return request({
        url: "/components/getImg",
        data
    });
}
//查询文件
export function getFile(data) {
    return request({
        url: "/components/getFile",
        data
    });
}

//修改文件
export function upFileReq(data) {
    return request({
        url: "/components/upFile",
        data
    });
}

//删除文件
export function delFile(data) {
    return request({
        url: "/components/delFile",
        data
    });
}

//添加富文本
export function addDitor(data) {
    return request({
        url: "/components/addDitor",
        data
    });
}

//查询富文本
export function getDitor(data) {
    return request({
        url: "/components/getDitor",
        data
    });
}

//修改富文本
export function upDitor(data) {
    return request({
        url: "/components/upDitor",
        data
    });
}

//删除富文本
export function delDitor(data) {
    return request({
        url: "/components/delDitor",
        data
    });
}

//添加图片管理菜单
export function addFileMenu(data) {
    return request({
        url: "/components/addFileMenu",
        data
    });
}

//查询图片管理菜单
export function getFileMenu(data) {
    return request({
        url: "/components/getFileMenu",
        data
    });
}

//修改图片管理菜单
export function upFileMenu(data) {
    return request({
        url: "/components/upFileMenu",
        data
    });
}

//删除图片管理菜单
export function delFileMenu(data) {
    return request({
        url: "/components/delFileMenu",
        data
    });
}

//查询图片管理列表
export function getFileBox(data) {
    return request({
        url: "/components/getFileBox",
        data
    });
}

//新增图片管理列表
export function addFileBox(data) {
    return request({
        url: "/components/addFileBox",
        data
    });
}
//删除图片管理列表
export function delFileBox(data) {
    return request({
        url: "/components/delFileBox",
        data
    });
}
