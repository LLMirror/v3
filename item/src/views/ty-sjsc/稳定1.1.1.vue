<template>
    <div class="container">
        <!-- 列表操作 -->
        <div style="margin-bottom:10px;">
            <el-button size="small" type="primary" @click="addList">新增列表</el-button>
            <el-button size="small" type="success" :disabled="!multipleSelection.length" @click="readAllSelected">
                全部开始读取
            </el-button>
        </div>

        <!-- 列表表格 -->
        <el-table :data="uploadLists" border @selection-change="handleSelectionChange" style="margin-bottom:10px;">
            <el-table-column type="selection" width="55" />
            <el-table-column prop="name" label="列表名称" />
            <el-table-column label="数据库">
                <template #default="{ row }">
                    <el-select v-model="row.dbName" size="small" @change="saveListCache">
                        <el-option v-for="db in dbOptions" :key="db" :label="db" :value="db" />
                    </el-select>
                </template>
            </el-table-column>
            <el-table-column prop="path" label="本地路径" />
            <el-table-column label="操作">
                <template #default="{ row }">
                    <el-button size="small" @click="selectFiles(row)">选择文件</el-button>
                    <el-button size="small" type="success" @click="readFiles(row)">开始读取</el-button>
                    <el-button size="small" type="primary" @click="showData(row)">查看数据</el-button>
                    <el-button size="small" type="danger" @click="removeList(row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <!-- 文件读取进度弹框 -->
        <el-dialog v-model="progressDialogVisible" title="读取文件中" :close-on-click-modal="false">
            <div style="margin-bottom: 15px;">
                <span>总体进度</span>
                <el-progress :percentage="overallProgress" :status="overallProgress < 100 ? 'active' : 'success'" />
                <span style="margin-left:10px;">剩余时间: {{ remainingTime }}</span>
            </div>

            <div v-if="!isCompleted">
                <div v-for="(f, i) in currentFileProgress" :key="i" style="margin-bottom:10px;">
                    <span>{{ f.name }} ({{ f.type }})</span>
                    <el-progress :percentage="f.progress" :status="f.progress < 100 ? 'active' : 'success'" />
                </div>
            </div>
            <div v-else>
                <p>所有任务已完成！</p>
                <el-progress :percentage="100" status="success" />
            </div>

            <template #footer>
                <el-button v-if="!isCompleted" type="danger" @click="stopReading">终止</el-button>
                <el-button v-else type="primary" @click="progressDialogVisible = false">完成</el-button>
            </template>
        </el-dialog>

        <!-- 数据展示 -->
        <div v-if="columns.length">
            <p>共 {{ tableData.length }} 条数据</p>
            <el-table :data="pagedData" border height="400">
                <el-table-column v-for="col in columns" :key="col" :prop="col" :label="col" />
            </el-table>
            <el-pagination v-if="tableData.length > pageSize" :total="tableData.length" :current-page="currentPage"
                :page-size="pageSize" @current-change="currentPage = $event" />
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import pinyin from 'pinyin'

const uploadLists = ref([])
const dbOptions = ref(['db1', 'db2', 'db3'])
const multipleSelection = ref([])

const progressDialogVisible = ref(false)
const currentFileProgress = ref([])
const isCompleted = ref(false)
const startTime = ref(0)
const remainingTime = ref('0s')

const tableData = ref([])
const columns = ref([])
const currentPage = ref(1)
const pageSize = 30
let stopFlag = false
const FILE_STREAM_THRESHOLD = 20 * 1024 * 1024 // 20MB

// ---------------- IndexedDB ----------------
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('UploadDB', 1)
        request.onupgradeneeded = e => {
            const db = e.target.result
            if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id', autoIncrement: true })
        }
        request.onsuccess = e => resolve(e.target.result)
        request.onerror = e => reject(e.target.error)
    })
}

async function saveFileData(name, data) { const db = await openDB(); return new Promise((resolve, reject) => { const tx = db.transaction('files', 'readwrite'); const store = tx.objectStore('files'); store.put({ name, data }); tx.oncomplete = () => resolve(); tx.onerror = e => reject(e.target.error) }) }
async function getFileData() { const db = await openDB(); return new Promise((resolve, reject) => { const tx = db.transaction('files', 'readonly'); const store = tx.objectStore('files'); const request = store.getAll(); request.onsuccess = e => resolve(e.target.result); request.onerror = e => reject(e.target.error) }) }
async function deleteFileData(name) { const db = await openDB(); return new Promise((resolve, reject) => { const tx = db.transaction('files', 'readwrite'); const store = tx.objectStore('files'); const request = store.getAll(); request.onsuccess = e => { const items = e.target.result; const toDelete = items.find(item => item.name === name); if (toDelete) store.delete(toDelete.id); tx.oncomplete = () => resolve(); tx.onerror = err => reject(err) }; request.onerror = err => reject(err) }) }

// ---------------- 初始化 ----------------
async function loadUploadListsFromDB() {
    const allFiles = await getFileData()
    const cache = localStorage.getItem('uploadLists') ? JSON.parse(localStorage.getItem('uploadLists')) : []
    uploadLists.value = allFiles.map(f => ({ name: f.name, dbName: cache.find(l => l.name === f.name)?.dbName || '', path: cache.find(l => l.name === f.name)?.path || '', files: [], data: f.data, columns: Object.keys(f.data[0] || {}) }))
    if (allFiles.length) { const last = allFiles[allFiles.length - 1]; tableData.value = last.data; columns.value = Object.keys(last.data[0] || {}) }
}
onMounted(() => loadUploadListsFromDB())

// ---------------- 计算 ----------------
const overallProgress = computed(() => { if (!currentFileProgress.value.length) return 0; const sum = currentFileProgress.value.reduce((acc, f) => acc + f.progress, 0); return Math.floor(sum / currentFileProgress.value.length) })
const pagedData = computed(() => { const start = (currentPage.value - 1) * pageSize; return tableData.value.slice(start, start + pageSize) })
function formatTime(seconds) { seconds = Math.round(seconds); const min = Math.floor(seconds / 60); const sec = seconds % 60; return min > 0 ? `${min}分${sec}秒` : `${sec}秒` }

// ---------------- 列表操作 ----------------
function addList() { uploadLists.value.push({ name: `列表${uploadLists.value.length + 1}`, dbName: '', path: '', files: [], data: [], columns: [] }); saveListCache() }
async function removeList(row) { uploadLists.value = uploadLists.value.filter(l => l !== row); saveListCache(); await deleteFileData(row.name) }
function handleSelectionChange(val) { multipleSelection.value = val }
function selectFiles(row) { const input = document.createElement('input'); input.type = 'file'; input.webkitdirectory = true; input.multiple = true; input.onchange = e => { row.files = Array.from(e.target.files).filter(f => /\.(xlsx|csv)$/i.test(f.name)); row.path = row.files[0]?.webkitRelativePath.split('/')[0] || ''; saveListCache() }; input.click() }
function showData(row) { tableData.value = row.data; columns.value = row.columns; currentPage.value = 1 }
function saveListCache() { const simplified = uploadLists.value.map(l => ({ name: l.name, dbName: l.dbName, path: l.path, columns: l.columns })); localStorage.setItem('uploadLists', JSON.stringify(simplified)) }

// ---------------- 文件读取 ----------------
async function readSingleFile(file, progressItem = null) { return file.size < FILE_STREAM_THRESHOLD ? readWholeFile(file, progressItem) : readXLSXStream(file, progressItem) }

// 一次性读取 CSV/XLSX
async function readWholeFile(file, progressItem = null) {
    const ext = file.name.split('.').pop().toLowerCase(); let lines = []
    if (ext === 'csv') { lines = (await file.text()).split('\n').filter(l => l.trim()) }
    else if (ext === 'xlsx') { const data = await file.arrayBuffer(); const wb = XLSX.read(data, { type: 'array' }); lines = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]).split('\n').filter(l => l.trim()) }
    else throw new Error('不支持的文件类型: ' + file.name)
    if (!lines.length) return { headers: [], data: [] }

    const rawHeaders = lines[0].split(','), seen = {}, headers = rawHeaders.map(h => { let key = pinyin(h, { style: pinyin.STYLE_FIRST_LETTER }).join(''); if (seen[key]) key += ++seen[key]; else seen[key] = 1; return key })
    const data = []
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(','); const obj = {}
        headers.forEach((h, idx) => obj[h] = cols[idx] || ''); data.push(obj)
        if (progressItem && i % 50 === 0) progressItem.progress = Math.floor((i / (lines.length - 1)) * 100)
        if (stopFlag) return { headers: [], data: [] }; if (i % 500 === 0) await new Promise(r => setTimeout(r, 0))
    }
    if (progressItem) progressItem.progress = 100
    return { headers, data }
}

// XLSX 流式解析
async function readXLSXStream(file, progressItem = null) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = async e => {
            const data = new Uint8Array(e.target.result)
            const wb = XLSX.read(data, { type: 'array', bookFiles: false })
            const sheet = wb.Sheets[wb.SheetNames[0]]
            const range = XLSX.utils.decode_range(sheet['!ref'])
            const headers = [], seen = {}, dataRows = []
            for (let c = range.s.c; c <= range.e.c; c++) { const val = sheet[XLSX.utils.encode_cell({ r: 0, c })]?.v || ''; let key = pinyin(val, { style: pinyin.STYLE_FIRST_LETTER }).join(''); if (seen[key]) key += ++seen[key]; else seen[key] = 1; headers.push(key) }
            for (let r = 1; r <= range.e.r; r++) {
                if (stopFlag) break
                const rowObj = {}
                for (let c = range.s.c; c <= range.e.c; c++) {
                    rowObj[headers[c]] = sheet[XLSX.utils.encode_cell({ r, c })]?.v || ''
                }
                dataRows.push(rowObj)
                if (progressItem && r % 50 === 0) progressItem.progress = Math.floor((r / range.e.r) * 100)
                if (r % 500 === 0) await new Promise(r => setTimeout(r, 0))
            }
            if (progressItem) progressItem.progress = 100
            resolve({ headers, data: dataRows })
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
    })
}

// 单列表读取（安全版）
async function readFiles(row) {
    if (!row.files?.length) return;

    progressDialogVisible.value = true;
    isCompleted.value = false;
    stopFlag = false;
    startTime.value = Date.now();
    remainingTime.value = '计算中...';

    currentFileProgress.value = row.files.map(f => ({ name: f.name, type: f.name.split('.').pop(), progress: 0 }));

    let allData = [], headers = [];
    const BATCH_SIZE = 1000;

    for (let i = 0; i < row.files.length; i++) {
        if (stopFlag) break;

        const file = row.files[i];
        const progressItem = currentFileProgress.value[i];

        try {
            const { headers: fileHeaders, data } = await readSingleFile(file, progressItem);
            if (!headers.length) headers = fileHeaders;

            if (Array.isArray(data)) {
                for (let j = 0; j < data.length; j += BATCH_SIZE) {
                    allData.push(...data.slice(j, j + BATCH_SIZE));
                }
            } else {
                console.warn('读取文件返回数据不是数组', file.name, data);
            }
        } catch (err) {
            console.error('读取文件失败', file.name, err);
        }
    }

    if (stopFlag) {
        tableData.value = [];
        columns.value = [];
        progressDialogVisible.value = false;
        remainingTime.value = '0s';
        return;
    }

    row.data = allData;
    row.columns = headers;
    tableData.value = allData;
    columns.value = headers;

    await saveFileData(row.name, allData);
    saveListCache();

    isCompleted.value = true;
    remainingTime.value = '0s';
}

// 批量读取（安全版）
async function readAllSelected() {
    if (!multipleSelection.value.length) return;

    progressDialogVisible.value = true;
    isCompleted.value = false;
    stopFlag = false;
    startTime.value = Date.now();
    remainingTime.value = '计算中...';

    const progressItems = [];
    multipleSelection.value.forEach(row => {
        row.files.forEach(file => {
            progressItems.push({ name: `${row.name}-${file.name}`, type: file.name.split('.').pop(), progress: 0 });
        });
    });
    currentFileProgress.value = progressItems;

    let idx = 0;
    const allDataMap = new Map();
    let finalHeaders = [];
    const BATCH_SIZE = 1000;

    for (const row of multipleSelection.value) {
        if (stopFlag) break;

        let allData = [];
        let headers = [];

        for (let i = 0; i < row.files.length; i++) {
            if (stopFlag) break;

            const file = row.files[i];
            const progressItem = currentFileProgress.value[idx];

            try {
                const { headers: fileHeaders, data } = await readSingleFile(file, progressItem);
                if (!headers.length) headers = fileHeaders;

                if (Array.isArray(data)) {
                    for (let j = 0; j < data.length; j += BATCH_SIZE) {
                        allData.push(...data.slice(j, j + BATCH_SIZE));
                    }
                } else {
                    console.warn('读取文件返回数据不是数组', file.name, data);
                }
            } catch (err) {
                console.error('读取文件失败', file.name, err);
            }

            idx++;
        }

        allDataMap.set(row.name, { data: allData, headers });
        if (!finalHeaders.length) finalHeaders = headers;
    }

    if (!stopFlag) {
        multipleSelection.value.forEach(row => {
            const { data, headers } = allDataMap.get(row.name) || { data: [], headers: [] };
            row.data = data;
            row.columns = headers;
        });

        tableData.value = Array.from(allDataMap.values())[0]?.data || [];
        columns.value = finalHeaders;

        for (const row of multipleSelection.value) {
            await saveFileData(row.name, row.data);
        }
        saveListCache();

        isCompleted.value = true;
        remainingTime.value = '0s';
    } else {
        tableData.value = [];
        columns.value = [];
        remainingTime.value = '0s';
    }
}


// 停止读取
function stopReading() { stopFlag = true; tableData.value = []; columns.value = []; progressDialogVisible.value = false; remainingTime.value = '0s' }
watch(uploadLists, () => saveListCache(), { deep: true })
</script>
