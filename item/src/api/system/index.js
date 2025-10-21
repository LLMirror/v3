import request from '@/utils/request'

export function getRouter(data) {
	return request({
		url: "/system/getRouter",
		data
	});
}
export function getRouterSystem(data) {
	return request({
		url: "/system/getRouterSystem",
		data
	});
}
export function getUserInfo(data) {
	return request({
		url: "/system/getUserInfo",
	});
}
export function getRoles(data) {
	return request({
		url: "/system/getRoles",
		data
	});
}
export function getRolesAll(data) {
	return request({
		url: "/system/getRolesAll",
		data
	});
}
export function addRoles(data) {
	return request({
		url: "/system/addRoles",
		data,
	});
}
export function upRoles(data) {
	return request({
		url: "/system/upRoles",
		data,
	});
}
export function delRoles(data) {
	return request({
		url: "/system/delRoles",
		data,
	});
}

export function addMenu(data) {
	return request({
		url: "/system/addMenu",
		data,
	});
}
export function changeMenu(data) {
	return request({
		url: "/system/changeMenu",
		data,
	});
}
export function delMenu(data) {
	return request({
		url: "/system/delMenu",
		data,
	});
}
export function getUser(data) {
	return request({
		url: "/system/getUser",
		data,
	});
}

export function addUser(data) {
	return request({
		url: "/system/addUser",
		data,
	});
}

export function upUser(data) {
	return request({
		url: "/system/upUser",
		data,
	});
}
export function upUserInfo(data) {
	return request({
		url: "/system/upUserInfo",
		data,
	});
}
export function upUserPwd(data) {
	return request({
		url: "/system/upUserPwd",
		data,
	});
}
export function upUserPwdInfo(data) {
	return request({
		url: "/system/upUserPwdInfo",
		data,
	});
}
export function delUser(data) {
	return request({
		url: "/system/delUser",
		data,
	});
}
export function upTheme(data) {
	return request({
		url: "/system/upTheme",
		data,
	});
}

export function getTheme(data) {
	return request({
		url: "/system/getTheme",
		data,
	});
}

export function getCaptcha(data) {
	return request({
		url: "/system/getCaptcha",
		data,
	});
}
export function login(data) {
	return request({
		url: "/system/login",
		data,
	});
}

export function addMore(data) {
	return request({
		url: "/system/addMore",
		data,
	});
}

export function getMore(data) {
	return request({
		url: "/system/getMore",
		data,
	});
}
export function getMoreAll(data) {
	return request({
		url: "/system/getMoreAll",
		data,
	});
}
export function upMore(data) {
	return request({
		url: "/system/upMore",
		data,
	});
}
export function delMore(data) {
	return request({
		url: "/system/delMore",
		data,
	});
}

export function addDict(data) {
	return request({
		url: "/system/addDict",
		data,
	});
}

export function getDict(data) {
	return request({
		url: "/system/getDict",
		data,
	});
}

export function upDict(data) {
	return request({
		url: "/system/upDict",
		data,
	});
}

export function delDict(data) {
	return request({
		url: "/system/delDict",
		data,
	});
}

export function getDictAll(data) {
	return request({
		url: "/system/getDictAll",
		data,
	});
}

export function addDictItem(data) {
	return request({
		url: "/system/addDictItem",
		data,
	});
}

export function getDictItem(data) {
	return request({
		url: "/system/getDictItem",
		data,
	});
}

export function upDictItem(data) {
	return request({
		url: "/system/upDictItem",
		data,
	});
}

export function delDictItem(data) {
	return request({
		url: "/system/delDictItem",
		data,
	});
}
//根据类型查询字典
export function getDictType(type = "") {
	return request({
		url: "/system/getDictType",
		data: { type },
	});
}

export function getLogs(data) {
	return request({
		url: "/system/getLogs",
		data
	});
}

export function importData(data) {
	return request({
		url: "/system/importData",
		data
	});
}
// ---------------------------------------------------------出纳开始----------------------------------------------------------------------
export function getCashRecords(data) {
	return request({
		url: "/system/getCashRecords",
		data
	});
}
export function addCashRecord(data) {
	return request({
		url: "/system/addCashRecord",
		data
	});
}
export function deleteCashRecord(data) {
	return request({
		url: "/system/deleteCashRecord",
		data
	});
}
export function updateCashRecord(data) {
	return request({
		url: "/system/updateCashRecord",
		data
	});
}
export function getCashSummary(data) {
	return request({
		url: "/system/getCashSummary",
		data
	});
}


export function getCompanyList(data) {
	return request({
		url: "/system/getCompanyList",
		data
	});
}
export function getBankList(data) {
	return request({
		url: "/system/getBankList",
		data
	});
}
export function getCashSummaryList(data) {
	return request({
		url: "/system/getCashSummaryList",
		data
	});
}


// 更新出纳结算数据
export function upSettlementData(params) {
  return request({
    url: "/system/upSettlementData",
    method: "post",
    data: params
  });
}

// 获取出纳数据
export function getSettlementData(params) {
  return request({
    url: "/system/getSettlementData",
    method: "post",
    data: params
  });
}
// ---------------------------------------------------------出纳结算----------------------------------------------------------------------
// 导入 Excel 数据
export function importExcelData(params) {
  return request({
    url: "/system/importExcelData",
    method: "post",
    data: params
  });
}


// 获取表格数据
export function getExcelData(params) {
  return request({
    url: "/system/getExcelData",
    method: "post",
    data: params
  });
}