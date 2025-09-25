import request from '@/utils/request'

export function addTests(data) {
	return request({
		url: "/tests/addTests",
        data
	});
}

export function getTests(data) {
	return request({
		url: "/tests/getTests",
        data
	});
}

export function upTests(data) {
	return request({
		url: "/tests/upTests",
        data
	});
}

export function delTests(data) {
	return request({
		url: "/tests/delTests",
        data
	});
}
//菜单权限接口测试
export function checkMenu(data) {
	return request({
		url: "/tests/checkMenu",
        data
	});
}

//角色权限接口测试
export function checkRole(data) {
	return request({
		url: "/tests/checkRole",
        data
	});
}

//添加文件
export function addFile(data) {
	return request({
		url: "/tests/addFile",
        data
	});
}

//查询图片
export function getImg(data) {
	return request({
		url: "/tests/getImg",
        data
	});
}
//查询文件
export function getFile(data) {
	return request({
		url: "/tests/getFile",
        data
	});
}

//修改文件
export function upFileReq(data) {
	return request({
		url: "/tests/upFile",
        data
	});
}

//删除文件
export function delFile(data) {
	return request({
		url: "/tests/delFile",
        data
	});
}

//下载模板
export function downloadTemplate(data) {
	return request({
		url: "/tests/downloadTemplate",
        data,
		responseType: "blob"
	});
}

//导出测试数据
export function exportTest(data) {
	return request({
		url: "/tests/exportTest",
        data,
		responseType: "blob"
	});
}


//添加合作联系方式
export function addCooperation(data) {
	return request({
		url: "/tests/addCooperation",
		data
	});
}
